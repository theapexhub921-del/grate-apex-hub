import type { Href } from 'expo-router';
import { useEffect, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';

import { subscribeToLearningAuthChanges } from '@/data/learning-sync';
import { rankSuggestions, relationshipOf } from '@/data/friend-suggestions';
import type { AppNotification } from '@/data/notifications';
import { chooseUsername } from '@/lib/accounts';
import { auth, db } from '@/lib/firebase';

export type Relationship = 'none' | 'friends' | 'outgoing' | 'incoming';

export type SocialPerson = {
  userId: string;
  friendshipId: string | null;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  relationship: Relationship;
  totalXp: number | null;
  weeklyXp: number | null;
  streak: number | null;
  since: number | null;
  isOnline: boolean;
};

export type SocialRecommendation = SocialPerson & {
  sameClass: boolean;
  sharedConnections: number;
  /** Why it is suggested, e.g. "Follows you" or "Same class: HB1". */
  reason?: string;
};

export type SocialActivity = {
  id: string;
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  type: string;
  eventType?: 'lesson' | 'topic' | 'apex' | string;
  name: string;
  at: number;
  title: string;
  subtitle: string;
  xpEarned: number;
  occurredAt: number;
  topicId?: string;
  lessonId?: string;
};

export type FriendActivity = SocialActivity;

export type SocialNotification = {
  id: string;
  type: string;
  actorName: string;
  actorAvatarUrl: string | null;
  readAt: number | null;
  createdAt: number;
  title: string;
  body: string;
  href: Href;
};

type State = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  userId: string | null;
  username: string | null;
  shareActivity: boolean;
  people: SocialPerson[];
  activity: SocialActivity[];
  activityError: string | null;
  notifications: SocialNotification[];
};

const EMPTY: State = {
  status: 'idle',
  error: null,
  userId: null,
  username: null,
  shareActivity: true,
  people: [],
  activity: [],
  activityError: null,
  notifications: [],
};

let state: State = EMPTY;
const listeners = new Set<() => void>();

function setState(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

export function personName(
  person: { username?: string | null; displayName?: string | null } | null | undefined
): string {
  if (!person) return 'Learner';
  return person.displayName?.trim() || person.username?.trim() || 'Learner';
}

// ─── Follows (shared with the original app) ──────────────────────────────
// follows/{followerUid}_{followeeUid} = { follower, followee, followerName,
// followeeName, createdAt }. Only the follower can create or delete it; it is
// never edited. Two people who follow each other are friends.

const followId = (follower: string, followee: string) => `${follower}_${followee}`;
const millis = (value: any): number | null => (value?.toMillis ? value.toMillis() : typeof value === 'number' ? value : null);
const DISMISSED_KEY = 'grateapex_dismissed_follow_requests';

type FollowEdge = { uid: string; username: string | null; since: number | null };

async function followEdges(uid: string, direction: 'following' | 'followers'): Promise<FollowEdge[]> {
  const mine = direction === 'following';
  const snap = await getDocs(query(collection(db, 'follows'), where(mine ? 'follower' : 'followee', '==', uid), limit(500)));
  return snap.docs.map((item) => {
    const d = item.data();
    return {
      uid: String(mine ? d.followee : d.follower),
      username: (mine ? d.followeeName : d.followerName) || null,
      since: millis(d.createdAt),
    };
  });
}

// Requests "declined" on this device. The rules let only the follower delete a
// follow, so declining hides the request here; they still follow you.
async function readDismissed(userId: string): Promise<Set<string>> {
  try {
    const saved = await AsyncStorage.getItem(`${DISMISSED_KEY}:${userId}`);
    return new Set(saved ? (JSON.parse(saved) as string[]) : []);
  } catch {
    return new Set();
  }
}

type PersonData = { profile: Record<string, any>; score: Record<string, any> };

async function readPeople(uids: string[]): Promise<Map<string, PersonData>> {
  const unique = [...new Set(uids)];
  const [profiles, scores] = await Promise.all([
    Promise.all(unique.map((uid) => getDoc(doc(db, 'users', uid)).catch(() => null))),
    Promise.all(unique.map((uid) => getDoc(doc(db, 'scores', uid)).catch(() => null))),
  ]);
  const people = new Map<string, PersonData>();
  unique.forEach((uid, i) => people.set(uid, { profile: profiles[i]?.data() ?? {}, score: scores[i]?.data() ?? {} }));
  return people;
}

function toPerson(uid: string, relationship: Relationship, friendshipId: string | null, since: number | null, fallbackName: string | null, data?: PersonData): SocialPerson {
  const profile = data?.profile ?? {};
  const score = data?.score ?? {};
  const username = profile.username || score.username || fallbackName || null;
  return {
    userId: uid,
    friendshipId,
    username,
    displayName: profile.displayName || username,
    avatarUrl: profile.avatar_url || profile.photo || null,
    relationship,
    totalXp: typeof score.xp === 'number' ? score.xp : null,
    weeklyXp: null, // not stored by either app
    streak: typeof score.streak === 'number' ? score.streak : null,
    since,
    isOnline: profile.isOnline === true,
  };
}

async function loadSocial(userId: string) {
  try {
    const [userSnap, following, followers, dismissed] = await Promise.all([
      getDoc(doc(db, 'users', userId)),
      followEdges(userId, 'following'),
      followEdges(userId, 'followers'),
      readDismissed(userId),
    ]);
    const userData = userSnap.data() || {};
    const iFollow = new Map(following.map((edge) => [edge.uid, edge]));
    const followsMe = new Map(followers.map((edge) => [edge.uid, edge]));
    const uids = [...new Set([...iFollow.keys(), ...followsMe.keys()])].filter((uid) => uid !== userId);
    const details = await readPeople(uids);

    const people = uids.flatMap((uid) => {
      const mine = iFollow.get(uid);
      const theirs = followsMe.get(uid);
      const relationship = relationshipOf(Boolean(mine), Boolean(theirs));
      if (relationship === 'incoming' && dismissed.has(uid)) return [];
      // The follow the actions work on: mine when I follow them, theirs for a request.
      const friendshipId = mine ? followId(userId, uid) : followId(uid, userId);
      const since = relationship === 'friends' ? Math.max(mine?.since ?? 0, theirs?.since ?? 0) || null : (mine ?? theirs)?.since ?? null;
      return [toPerson(uid, relationship, friendshipId, since, mine?.username ?? theirs?.username ?? null, details.get(uid))];
    });

    setState({
      status: 'ready',
      error: null,
      username: userData.username || null,
      shareActivity: userData.share_activity !== false,
      people,
      activity: [],
      notifications: [],
    });
  } catch (err) {
    console.warn('Could not load friends:', err);
    setState({ status: 'error', error: 'Your friends could not be loaded. Check your connection and try again.' });
  }
}

export async function refreshSocial() {
  if (!state.userId) return;
  await loadSocial(state.userId);
}

export async function refreshFriendPresence() {}

function startFor(userId: string | null) {
  if (userId === state.userId) return;
  state = { ...EMPTY, userId };
  listeners.forEach((listener) => listener());
  if (!userId) return;

  setState({ status: 'loading' });
  void loadSocial(userId);
}

let started = false;
function ensureStarted() {
  if (started) return;
  started = true;
  subscribeToLearningAuthChanges((userId) => startFor(userId));
  startFor(auth.currentUser?.uid ?? null);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Starts the store without React (used by the emulator checks). */
export function startSocial() {
  ensureStarted();
}

/** The current social state, outside React. */
export function socialState(): State {
  return state;
}

export function useSocial(): State {
  useEffect(ensureStarted, []);
  return useSyncExternalStore(subscribe, () => state, () => state);
}

export function useSocialUsername(): string | null {
  const social = useSocial();
  return social.username;
}

export function useFriendList(): SocialPerson[] {
  const social = useSocial();
  return social.people;
}

/** Follow someone (a "friend request" until they follow back). Also tells them, as the original app does. */
export async function sendFriendRequest(targetUserId: string) {
  const me = auth.currentUser?.uid;
  if (!me) throw new Error('Sign in to add friends.');
  if (targetUserId === me) throw new Error('You can’t follow yourself.');
  const [mine, theirs] = await Promise.all([getDoc(doc(db, 'users', me)), getDoc(doc(db, 'users', targetUserId))]);
  const myName = mine.data()?.username ?? null;
  await setDoc(doc(db, 'follows', followId(me, targetUserId)), {
    follower: me,
    followee: targetUserId,
    followerName: myName,
    followeeName: theirs.data()?.username ?? null,
    createdAt: serverTimestamp(),
  });
  if (myName) {
    // Their bell (both apps). Best effort: the follow above is what matters.
    await setDoc(doc(collection(db, 'users', targetUserId, 'notifications')), {
      type: 'follow', from: me, fromName: myName, read: false, createdAt: Date.now(),
    }).catch(() => undefined);
  }
  await refreshSocial();
}

/** Accept = follow them back. Decline = hide the request on this device (only they can remove their follow). */
export async function respondToFriendRequest(friendshipId: string, accept: boolean) {
  const me = auth.currentUser?.uid;
  if (!me) throw new Error('Sign in to manage friends.');
  const follower = friendshipId.split('_')[0];
  if (accept) {
    await sendFriendRequest(follower);
    return;
  }
  const dismissed = await readDismissed(me);
  dismissed.add(follower);
  await AsyncStorage.setItem(`${DISMISSED_KEY}:${me}`, JSON.stringify([...dismissed])).catch(() => undefined);
  await refreshSocial();
}

/** Unfollow: cancels a request, or ends a friendship from my side. Only my own follow can be removed. */
export async function removeFriendship(friendshipId: string) {
  const me = auth.currentUser?.uid;
  if (!me) throw new Error('Sign in to manage friends.');
  const [follower, followee] = friendshipId.split('_');
  if (follower !== me && followee !== me) throw new Error('That connection isn’t yours to remove.');
  const other = follower === me ? followee : follower;
  await deleteDoc(doc(db, 'follows', followId(me, other)));
  await refreshSocial();
}

// Reserves the name and updates the profile in one batch, as the shared rules
// require (lib/accounts.ts). Throws a plain-language error when it can't.
export async function setUsername(username: string) {
  const saved = await chooseUsername(username);
  setState({ username: saved });
}

export async function setShareActivity(share: boolean) {
  const currentUid = auth.currentUser?.uid;
  if (!currentUid) return;
  await setDoc(doc(db, 'users', currentUid), { share_activity: share }, { merge: true });
  setState({ shareActivity: share });
}

/** Every way a typed search may be stored (Firestore matches exactly): as typed, lower case, Capitalised. */
const searchSpellings = (text: string) => [...new Set([text, text.toLowerCase(), text[0].toUpperCase() + text.slice(1).toLowerCase()])];

let directory: { at: number; docs: Promise<{ id: string; data: Record<string, unknown> }[]> } | null = null;

/** Learner accounts for name search (cached for a few minutes; users is readable by every signed-in learner). */
function learnerDirectory() {
  if (!directory || Date.now() - directory.at > 5 * 60_000) {
    directory = {
      at: Date.now(),
      docs: getDocs(query(collection(db, 'users'), limit(2000)))
        .then((snap) => snap.docs.map((item) => ({ id: item.id, data: item.data() as Record<string, unknown> })))
        .catch(() => []),
    };
  }
  return directory.docs;
}

/**
 * Learners by username or name: usernames and names that start with the typed
 * text (as in the original app), plus those that contain it anywhere. People
 * who turned off "Let students find me" are left out (unless you know them).
 */
export async function searchLearners(searchQuery: string): Promise<SocialPerson[]> {
  const typed = searchQuery.trim().replace(/^@/, '');
  if (typed.length < 2) return [];
  await auth.authStateReady();
  const me = auth.currentUser?.uid ?? null;
  if (!me) throw new Error('Sign in to search for learners.');
  const term = typed.toLowerCase();
  const prefixQueries = searchSpellings(typed).flatMap((spelling) =>
    ['username', 'displayName'].map((field) =>
      getDocs(query(collection(db, 'users'), where(field, '>=', spelling), where(field, '<=', `${spelling}`), limit(10)))
        .then((snap) => snap.docs.map((item) => ({ id: item.id, data: item.data() as Record<string, unknown> })))
        .catch(() => [])
    )
  );
  // Older accounts may only have their username on the leaderboard (scores).
  const scoreQuery = getDocs(query(collection(db, 'scores'), where('username', '>=', term), where('username', '<=', term + ''), limit(10)))
    .then((snap) => snap.docs.map((item) => ({ id: item.id, data: item.data() as Record<string, unknown> })))
    .catch(() => []);
  const [everyone, ...prefixed] = await Promise.all([learnerDirectory(), scoreQuery, ...prefixQueries]);
  const found = new Map<string, Record<string, unknown>>();
  for (const item of prefixed.flat()) found.set(item.id, { ...item.data, ...(found.get(item.id) ?? {}) });
  for (const item of everyone) {
    const username = String(item.data.username ?? '').toLowerCase();
    const name = String(item.data.displayName ?? '').toLowerCase();
    if (username.includes(term) || name.includes(term)) found.set(item.id, item.data);
  }
  const hidden = (data: Record<string, unknown>) => {
    const privacy = (data.preferences as { privacy_preferences?: { discoverable?: boolean } } | undefined)?.privacy_preferences;
    return data.discoverable === false || privacy?.discoverable === false;
  };
  const rank = (data: Record<string, unknown>) => {
    const username = String(data.username ?? '').toLowerCase();
    const name = String(data.displayName ?? '').toLowerCase();
    return username === term ? 0 : username.startsWith(term) ? 1 : name.startsWith(term) ? 2 : 3;
  };
  const known = new Map(state.people.map((person) => [person.userId, person]));
  return [...found.entries()]
    .filter(([uid, data]) => uid !== me && (known.has(uid) || !hidden(data)) && (data.username || data.displayName))
    .sort((a, b) => rank(a[1]) - rank(b[1]) || String(a[1].username ?? '').localeCompare(String(b[1].username ?? '')))
    .slice(0, 20)
    .map(([uid, data]) => known.get(uid) ?? toPerson(uid, 'none', null, null, null, { profile: data, score: {} }));
}

/**
 * Suggestions, recovered from the original app: people who follow you, people
 * your follows follow, classmates in your hall, and top students (scores).
 * People you already follow and yourself are left out.
 */
export async function getRecommendedFriends(): Promise<SocialRecommendation[]> {
  const me = auth.currentUser?.uid;
  if (!me) return [];
  const [mine, following, followers, top] = await Promise.all([
    getDoc(doc(db, 'users', me)),
    followEdges(me, 'following'),
    followEdges(me, 'followers'),
    getDocs(query(collection(db, 'scores'), orderBy('xp', 'desc'), limit(60)))
      .then((snap) => snap.docs.map((item) => ({ uid: item.id, ...(item.data() as { username?: string; hall?: string; semester?: number }) })))
      .catch(() => []),
  ]);
  const secondDegree = await Promise.all(
    following.slice(0, 6).map((via) => followEdges(via.uid, 'following').then((follows) => ({ via, follows })).catch(() => ({ via, follows: [] })))
  );
  const profile = mine.data() ?? {};
  const ranked = rankSuggestions({ me: { uid: me, hall: profile.hall || null, semester: profile.semester ?? null }, following, followers, secondDegree, top });
  const details = await readPeople(ranked.map((suggestion) => suggestion.uid));
  const followsMe = new Set(followers.map((edge) => edge.uid));
  return ranked.map((suggestion) => ({
    ...toPerson(
      suggestion.uid,
      followsMe.has(suggestion.uid) ? 'incoming' : 'none',
      followsMe.has(suggestion.uid) ? followId(suggestion.uid, me) : null,
      null,
      suggestion.username,
      details.get(suggestion.uid)
    ),
    sameClass: suggestion.sameClass,
    sharedConnections: suggestion.sharedConnections,
    reason: suggestion.reason,
  }));
}

export function toAppNotification(n: SocialNotification): AppNotification {
  return {
    id: n.id,
    group: 'updates',
    title: n.title,
    body: n.body,
    at: n.createdAt,
    href: n.href,
    icon: 'bell',
    tone: 'primary',
  };
}

export async function markNotificationRead(id: string) {}
export async function markAllNotificationsRead() {}
export function markSocialNotificationsRead(ids: string[]) {}
export function readSocialNotificationIds(records?: any): string[] {
  return [];
}
export function socialAppNotifications(records?: any): AppNotification[] {
  return [];
}

// ── Public profiles (any signed-in learner can view one) ────────────

export type PublicProfile = {
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  classLabel: string | null;
  totalXp: number | null;
  followers: number;
  following: number;
  posts: number;
  /** I follow them / they follow me. */
  iFollow: boolean;
  followsMe: boolean;
};

/** A learner's profile with real follower and following counts (users, scores, follows — all readable when signed in). */
export async function getPublicProfile(uid: string): Promise<PublicProfile> {
  const me = auth.currentUser?.uid ?? null;
  const [people, followers, following, posts] = await Promise.all([
    readPeople([uid]),
    followEdges(uid, 'followers'),
    followEdges(uid, 'following'),
    getCountFromServer(query(collection(db, 'posts'), where('authorUid', '==', uid))).then((snap) => snap.data().count).catch(() => 0),
  ]);
  const data = people.get(uid);
  const profile = data?.profile ?? {};
  const score = data?.score ?? {};
  const username = profile.username || score.username || null;
  const hall = typeof profile.hall === 'string' && profile.hall ? profile.hall : null;
  const semester = typeof profile.semester === 'number' ? profile.semester : null;
  return {
    userId: uid,
    username,
    displayName: profile.displayName || username,
    avatarUrl: profile.avatar_url || profile.photo || null,
    bio: typeof profile.bio === 'string' && profile.bio.trim() ? profile.bio.trim() : null,
    classLabel: hall ? `${hall}${semester ? ` · Semester ${semester}` : ''}` : null,
    totalXp: typeof score.xp === 'number' ? score.xp : null,
    followers: followers.length,
    following: following.length,
    posts,
    iFollow: Boolean(me && followers.some((edge) => edge.uid === me)),
    followsMe: Boolean(me && following.some((edge) => edge.uid === me)),
  };
}

/** Stops following someone (only the follower can remove their follow — the shared rules). */
export async function unfollowLearner(targetUserId: string) {
  const me = auth.currentUser?.uid;
  if (!me) throw new Error('Sign in first.');
  await deleteDoc(doc(db, 'follows', followId(me, targetUserId)));
  await refreshSocial();
}
