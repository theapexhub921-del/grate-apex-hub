import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';
import { cleanMedia, optimized, safeUrl, uploadMedia } from '@/lib/media';

export type CommunityMedia = {
  uri: string;
  type: 'image' | 'video';
  mimeType: string;
  size?: number;
  filename: string;
};

export type CommunityStory = {
  id: string;
  author_id: string;
  author_name?: string | null;
  body: string | null;
  media_path: string | null;
  media_url?: string | null;
  media_type?: 'image' | 'video' | null;
  created_at: string;
  expires_at: string;
};

export type CommunityPost = {
  id: string;
  author_id: string;
  author_name?: string | null;
  author_avatar?: string | null;
  body: string;
  media_path: string | null;
  media_type: 'image' | 'video' | null;
  media_url?: string | null;
  reshared_post_id: string | null;
  reshared_author_id?: string | null;
  reshared_body?: string | null;
  reshared_media_url?: string | null;
  reshared_media_type?: string | null;
  created_at: string;
  reactions: number;
  comments: number;
  reshares: number;
  my_reaction: 'like' | null;
};

export type StudyGroup = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  visibility: 'open' | 'friends' | 'private';
  created_at: string;
  is_member?: boolean;
  membership_status?: 'active' | 'invited' | 'declined';
  membership_role?: 'owner' | 'admin' | 'member';
};

export type GroupDiscussionPost = {
  id: string;
  group_id: string;
  author_id: string;
  author_name?: string | null;
  author_avatar?: string | null;
  body: string;
  created_at: string;
};

export type CommunityConversation = {
  id: string;
  updated_at: string;
};

export type CommunityMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  deleted_at?: string | null;
  /** A voice note (the original app's `audio`: a Cloudinary URL and its length in seconds). */
  audio?: { url: string; seconds: number } | null;
};

/** One of my chats, for the recent-messages list. */
export type ConversationSummary = {
  id: string;
  otherId: string;
  otherName: string | null;
  lastText: string;
  lastAt: number;
  lastFromMe: boolean;
  unread: boolean;
};

export type FriendChallenge = {
  id: string;
  challenger_id: string;
  opponent_id: string;
  course_id: string;
  topic_id?: string | null;
  title?: string | null;
  xp_stake: number;
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled' | 'active';
  created_at: string;
  starts_at: string | null;
  ends_at: string | null;
};

export type StreakFreezeBalance = {
  user_id: string;
  available: number;
  updated_at: string;
};

async function signedInUserId(): Promise<string> {
  // After a page reload the signed-in user is restored a moment later: wait for it.
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in to use community features.');
  return user.uid;
}



// ─── Posts (shared discussion board with the original app) ───────────────
// posts/{id} = { board, title, body, authorUid, authorName, replyCount,
// likeCount, createdAt, lastActivityAt, media? } — authorName must be the real
// username. Likes are posts/{id}/likes/{uid} with likeCount moved by one in the
// same batch; comments are posts/{id}/replies with replyCount moved by one.
// Errors are passed on: nothing is shown as posted when it wasn't.

const BLOCKED_KEY = 'grateapex_blocked_learners';

async function myUsername(): Promise<{ uid: string; username: string }> {
  const uid = await signedInUserId();
  const username = (await getDoc(doc(db, 'users', uid))).data()?.username;
  if (typeof username !== 'string' || !/^[a-z0-9_]{3,20}$/.test(username)) throw new Error('Choose a username first — posts show your username.');
  return { uid, username };
}

const iso = (value: any) => (value?.toDate ? value.toDate().toISOString() : typeof value === 'number' ? new Date(value).toISOString() : new Date(0).toISOString());

// Old-app posts have a separate title; show it above the body when it isn't just the body's start.
/** A plain repost has no words of its own; the shared rules still need 3+ characters, so it carries this. */
export const REPOST_TEXT = 'Reposted';

const postText = (d: Record<string, any>) => {
  const title = String(d.title ?? '').trim();
  const body = String(d.body ?? '').trim();
  if (d.resharedPostId && body === REPOST_TEXT) return '';
  return title && !body.startsWith(title) ? `${title}\n\n${body}` : body;
};

/** Learners hidden on this device. The shared rules have no block list, so blocking is per device. */
export async function blockedLearners(): Promise<Set<string>> {
  await auth.authStateReady();
  try {
    const uid = auth.currentUser?.uid;
    const saved = uid ? await AsyncStorage.getItem(`${BLOCKED_KEY}:${uid}`) : null;
    return new Set(saved ? (JSON.parse(saved) as string[]) : []);
  } catch {
    return new Set();
  }
}

export async function listCommunityFeed(limitCount = 50): Promise<CommunityPost[]> {
  await auth.authStateReady();
  const userId = auth.currentUser?.uid ?? null;
  const [snap, blocked] = await Promise.all([getDocs(query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(limitCount))), blockedLearners()]);
  const rows = snap.docs.filter((item) => !blocked.has(String(item.data().authorUid)));
  const liked = await Promise.all(rows.map((item) => (userId ? getDoc(doc(db, 'posts', item.id, 'likes', userId)).then((like) => like.exists()).catch(() => false) : Promise.resolve(false))));
  const originals = new Map<string, Record<string, any>>();
  await Promise.all(
    [...new Set(rows.map((item) => item.data().resharedPostId).filter((id): id is string => typeof id === 'string'))].map(async (id) => {
      const original = await getDoc(doc(db, 'posts', id)).catch(() => null);
      if (original?.exists()) originals.set(id, original.data());
    })
  );
  return rows.map((item, index) => {
    const d = item.data();
    const original = typeof d.resharedPostId === 'string' ? originals.get(d.resharedPostId) : undefined;
    const media = Array.isArray(d.media) ? d.media[0] : null;
    // A reshare shows the original post's photo or video.
    const originalMedia = original && Array.isArray(original.media) ? original.media[0] : null;
    return {
      id: item.id,
      author_id: String(d.authorUid ?? ''),
      author_name: d.authorName ?? null,
      author_avatar: null,
      body: postText(d),
      media_path: null,
      media_type: media?.t === 'video' ? 'video' : media?.t === 'image' ? 'image' : null,
      media_url: safeUrl(media?.url) ? (media.t === 'image' ? optimized(media.url) : media.url) : null,
      reshared_post_id: typeof d.resharedPostId === 'string' ? d.resharedPostId : null,
      reshared_author_id: original?.authorUid ?? null,
      reshared_body: original ? postText(original) : null,
      reshared_media_url: safeUrl(originalMedia?.url) ? (originalMedia.t === 'image' ? optimized(originalMedia.url) : originalMedia.url) : null,
      reshared_media_type: originalMedia?.t === 'video' ? 'video' : originalMedia?.t === 'image' ? 'image' : null,
      created_at: iso(d.createdAt),
      reactions: Number(d.likeCount) || 0,
      comments: Number(d.replyCount) || 0,
      reshares: 0, // not counted by the shared rules
      my_reaction: liked[index] ? 'like' : null,
    };
  });
}

/** A learner's own posts, newest first (no composite index needed: sorted here). */
export async function listPostsBy(uid: string, limitCount = 30): Promise<CommunityPost[]> {
  const all = await listCommunityFeed(200);
  const own = all.filter((post) => post.author_id === uid);
  if (own.length >= Math.min(limitCount, 5) || all.length < 200) return own.slice(0, limitCount);
  // Older posts beyond the recent feed.
  const snap = await getDocs(query(collection(db, 'posts'), where('authorUid', '==', uid), limit(limitCount)));
  const ids = new Set(own.map((post) => post.id));
  const extra = snap.docs.filter((item) => !ids.has(item.id)).map((item) => ({ id: item.id, author_id: uid, author_name: item.data().authorName ?? null, author_avatar: null, body: postText(item.data()), media_path: null, media_type: null, media_url: null, reshared_post_id: null, created_at: iso(item.data().createdAt), reactions: Number(item.data().likeCount) || 0, comments: Number(item.data().replyCount) || 0, reshares: 0, my_reaction: null } as CommunityPost));
  return [...own, ...extra].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limitCount);
}

export async function createCommunityPost(body: string, media?: CommunityMedia, resharedPostId?: string | null): Promise<CommunityPost> {
  const text = body.trim() || (resharedPostId ? REPOST_TEXT : '');
  if (text.length < 3) throw new Error('Posts need at least 3 characters.');
  if (text.length > 2000) throw new Error('Posts can be up to 2,000 characters.');
  const me = await myUsername();
  // Uploaded to the original app's Cloudinary account first (lib/media.ts);
  // nothing is posted if the upload fails.
  const uploaded = media ? cleanMedia([await uploadMedia(media)]) : [];
  // The shared board needs a title (3–120 characters): the first line.
  const firstLine = text.split('\n')[0].trim();
  const title = (firstLine.length >= 3 ? firstLine : text).slice(0, 120);
  const ref = doc(collection(db, 'posts'));
  await setDoc(ref, {
    board: 'general',
    title,
    body: text,
    authorUid: me.uid,
    authorName: me.username,
    replyCount: 0,
    likeCount: 0,
    createdAt: serverTimestamp(),
    lastActivityAt: serverTimestamp(),
    ...(resharedPostId ? { resharedPostId } : {}),
    ...(uploaded.length ? { media: uploaded } : {}),
  });
  return {
    id: ref.id, author_id: me.uid, author_name: me.username, body: text, media_path: null,
    media_type: uploaded[0]?.t ?? null, media_url: uploaded[0]?.url ?? null,
    reshared_post_id: resharedPostId ?? null, created_at: new Date().toISOString(), reactions: 0, comments: 0, reshares: 0, my_reaction: null,
  };
}

/** Only the author can delete their post (rules). */
export async function deleteCommunityPost(postId: string) {
  await deleteDoc(doc(db, 'posts', postId));
}

/** Like or unlike; returns whether the post is now liked. */
export async function togglePostLike(postId: string): Promise<boolean> {
  const me = await myUsername();
  const likeRef = doc(db, 'posts', postId, 'likes', me.uid);
  const liked = (await getDoc(likeRef)).exists();
  const batch = writeBatch(db);
  if (liked) batch.delete(likeRef);
  else batch.set(likeRef, { username: me.username, createdAt: serverTimestamp() });
  batch.update(doc(db, 'posts', postId), { likeCount: increment(liked ? -1 : 1) });
  await batch.commit();
  return !liked;
}

export async function addPostComment(postId: string, body: string) {
  const text = body.trim();
  if (text.length < 1) throw new Error('Write a comment first.');
  if (text.length > 1000) throw new Error('Comments can be up to 1,000 characters.');
  const me = await myUsername();
  const batch = writeBatch(db);
  batch.set(doc(collection(db, 'posts', postId, 'replies')), { body: text, authorUid: me.uid, authorName: me.username, createdAt: serverTimestamp() });
  batch.update(doc(db, 'posts', postId), { replyCount: increment(1), lastActivityAt: serverTimestamp() });
  await batch.commit();
}

/**
 * A report becomes a support ticket for the admins (the shared rules' review
 * channel): only the reporter and admins can read it.
 */
export async function reportCommunityContent(
  targetType: 'post' | 'comment' | 'user' | 'group' | 'message',
  targetId: string,
  reason = 'Reported for review'
) {
  const me = await myUsername();
  await setDoc(doc(collection(db, 'supportTickets')), {
    uid: me.uid,
    username: me.username,
    category: targetType === 'user' ? 'other' : 'content',
    message: `Report · ${targetType} ${targetId}: ${reason}`.slice(0, 1000),
    status: 'open',
    createdAt: serverTimestamp(),
  });
}

/** Hides a learner on this device and stops following them (the shared rules have no block list). */
export async function blockCommunityUser(blockedId: string, friendshipId?: string | null) {
  const uid = await signedInUserId();
  const blocked = await blockedLearners();
  blocked.add(blockedId);
  await AsyncStorage.setItem(`${BLOCKED_KEY}:${uid}`, JSON.stringify([...blocked]));
  await deleteDoc(doc(db, 'follows', `${uid}_${blockedId}`)).catch(() => undefined);
  void friendshipId;
}

export async function listPostComments(postId: string) {
  const [snap, blocked] = await Promise.all([getDocs(query(collection(db, 'posts', postId, 'replies'), orderBy('createdAt', 'asc'), limit(200))), blockedLearners()]);
  return snap.docs
    .filter((item) => !blocked.has(String(item.data().authorUid)))
    .map((item) => {
      const d = item.data();
      return { id: item.id, author_id: String(d.authorUid ?? ''), author_name: d.authorName ?? null, body: String(d.body ?? ''), created_at: iso(d.createdAt) };
    });
}

// ─── Study groups (shared with the original app) ─────────────────────────
// groups/{gid} = { ownerUid, memberUids, members: { uid: username }, name,
// description, createdAt }. Only members can see a group. It starts with its
// creator; the owner adds one mutual friend at a time; a member can leave.
// Messages: groups/{gid}/messages = { authorUid, authorName, text, createdAt }.

function toGroup(id: string, d: Record<string, any>, me: string | null): StudyGroup {
  const members: string[] = Array.isArray(d.memberUids) ? d.memberUids : [];
  return {
    id,
    owner_id: String(d.ownerUid ?? ''),
    title: String(d.name ?? ''),
    description: String(d.description ?? ''),
    visibility: 'private', // the shared rules: only members can see a group
    created_at: iso(d.createdAt),
    is_member: me ? members.includes(me) : false,
    membership_status: 'active',
    membership_role: me && d.ownerUid === me ? 'owner' : 'member',
  };
}

/** The groups I belong to (the only ones the rules let me see). */
// ─── Stories (shared with the original app) ──────────────────────────────
// users/{uid}/stories/{id} = { username, kind: 'media' | 'text', media?, text?,
// bg?, createdAt } — live for 24 hours. Media is uploaded to the original
// app's Cloudinary account first (lib/media.ts). Like the original app, your
// own expired stories are removed when stories load; the file itself stays in
// Cloudinary (an unsigned preset can't delete).

export const STORY_MS = 24 * 60 * 60 * 1000;
const storyTime = (value: any) => (value?.toMillis ? value.toMillis() : typeof value === 'number' ? value : 0);

function toStory(uid: string, id: string, d: Record<string, any>): CommunityStory {
  const at = storyTime(d.createdAt) || Date.now();
  const media = d.media && safeUrl(d.media.url) ? d.media : null;
  return {
    id,
    author_id: uid,
    author_name: typeof d.username === 'string' ? d.username : null,
    body: typeof d.text === 'string' ? d.text : null,
    media_path: null,
    media_url: media ? (media.t === 'image' ? optimized(media.url) : media.url) : null,
    media_type: media ? (media.t === 'video' ? 'video' : 'image') : null,
    created_at: new Date(at).toISOString(),
    expires_at: new Date(at + STORY_MS).toISOString(),
  };
}

/** Live stories from me and the people I follow, oldest first per person. */
export async function listLiveStories(): Promise<CommunityStory[]> {
  await auth.authStateReady();
  const me = await signedInUserId();
  const [following, blocked] = await Promise.all([
    getDocs(query(collection(db, 'follows'), where('follower', '==', me), limit(50))).then((snap) => snap.docs.map((item) => String(item.data().followee))),
    blockedLearners(),
  ]);
  const people = [me, ...following.filter((uid) => uid !== me && !blocked.has(uid))];
  const now = Date.now();
  const lists = await Promise.all(
    people.map(async (uid) => {
      const snap = await getDocs(query(collection(db, 'users', uid, 'stories'), orderBy('createdAt', 'desc'), limit(15))).catch(() => null);
      if (!snap) return [];
      // Decide once per story, by time (snap.docs makes new objects on every read).
      const docs = snap.docs;
      const isLive = (item: (typeof docs)[number]) => now - storyTime(item.data().createdAt) < STORY_MS;
      if (uid === me) {
        docs.filter((item) => !isLive(item)).forEach((item) => void deleteDoc(item.ref).catch(() => undefined));
      }
      return docs.filter(isLive).map((item) => toStory(uid, item.id, item.data()));
    })
  );
  return lists.flat().sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
}

export async function createCommunityStory(body: string, media?: CommunityMedia): Promise<CommunityStory> {
  const text = body.trim();
  if (!media && text.length < 1) throw new Error('Add text, a photo or a video.');
  if (text.length > 200) throw new Error('Story text can be up to 200 characters.');
  const me = await myUsername();
  const uploaded = media ? cleanMedia([await uploadMedia(media)])[0] : null;
  if (media && !uploaded) throw new Error('Upload failed.');
  const ref = doc(collection(db, 'users', me.uid, 'stories'));
  await setDoc(ref, {
    username: me.username,
    kind: uploaded ? 'media' : 'text',
    ...(uploaded ? { media: uploaded } : {}),
    ...(text ? { text } : {}),
    createdAt: serverTimestamp(),
  });
  return toStory(me.uid, ref.id, { username: me.username, media: uploaded, text: text || undefined, createdAt: Date.now() });
}

/** Removes my story from the app (the file stays in Cloudinary). */
export async function deleteCommunityStory(storyId: string, mediaPath: string | null) {
  void mediaPath;
  const me = await signedInUserId();
  await deleteDoc(doc(db, 'users', me, 'stories', storyId));
}

export async function listOpenStudyGroups(): Promise<StudyGroup[]> {
  const me = await signedInUserId();
  const snap = await getDocs(query(collection(db, 'groups'), where('memberUids', 'array-contains', me), limit(100)));
  return snap.docs.map((item) => toGroup(item.id, item.data(), me));
}

export async function listVisibleStudyGroups(): Promise<StudyGroup[]> {
  return listOpenStudyGroups();
}

export async function createStudyGroup(input: { title: string; description?: string; visibility?: StudyGroup['visibility'] }): Promise<string> {
  const name = input.title.trim();
  const description = (input.description ?? '').trim();
  if (name.length < 2 || name.length > 40) throw new Error('Group names are 2–40 characters.');
  if (description.length > 200) throw new Error('Descriptions can be up to 200 characters.');
  const me = await myUsername();
  const ref = doc(collection(db, 'groups'));
  await setDoc(ref, { ownerUid: me.uid, memberUids: [me.uid], members: { [me.uid]: me.username }, name, description, createdAt: serverTimestamp() });
  return ref.id;
}

/** Groups can't be joined by asking: the owner adds members (shared rules). */
export async function joinStudyGroup(groupId: string): Promise<boolean> {
  void groupId;
  throw new Error('Ask the group’s owner to add you. Owners can add friends who follow each other.');
}

/** The owner adds a friend (you must follow each other). */
export async function inviteFriendToGroup(groupId: string, friendId: string) {
  const me = await signedInUserId();
  const ref = doc(db, 'groups', groupId);
  const group = await getDoc(ref);
  const data = group.data();
  if (!data) throw new Error('This group could not be found.');
  if (data.ownerUid !== me) throw new Error('Only the group’s owner can add members.');
  const members: string[] = Array.isArray(data.memberUids) ? data.memberUids : [];
  if (members.includes(friendId)) return;
  if (members.length >= 20) throw new Error('A group can have up to 20 members.');
  const friendName = (await getDoc(doc(db, 'users', friendId))).data()?.username ?? null;
  try {
    await updateDoc(ref, { memberUids: [...members, friendId], [`members.${friendId}`]: friendName });
  } catch (error) {
    if ((error as { code?: string }).code === 'permission-denied') throw new Error('You can add friends who follow you back.');
    throw error;
  }
}

/** There are no invitations in the shared model: members are added directly. */
export async function respondToGroupInvite(membershipId: string, accept: boolean) {
  void membershipId;
  void accept;
}

/** A member (not the owner) leaves, with the "left the group" notice the original app shows. */
export async function leaveStudyGroup(groupId: string) {
  const me = await myUsername();
  const ref = doc(db, 'groups', groupId);
  const data = (await getDoc(ref)).data();
  if (!data) return;
  if (data.ownerUid === me.uid) throw new Error('Owners can’t leave their own group.');
  const batch = writeBatch(db);
  batch.set(doc(collection(db, 'groups', groupId, 'messages')), { text: `@${me.username} left the group`, system: true, authorUid: me.uid, authorName: me.username, createdAt: serverTimestamp() });
  batch.update(ref, { memberUids: (data.memberUids as string[]).filter((uid) => uid !== me.uid), [`members.${me.uid}`]: deleteField() });
  await batch.commit();
}

export async function listGroupDiscussion(groupId: string): Promise<GroupDiscussionPost[]> {
  const snap = await getDocs(query(collection(db, 'groups', groupId, 'messages'), orderBy('createdAt', 'asc'), limit(200)));
  return snap.docs.map((item) => {
    const d = item.data();
    return { id: item.id, group_id: groupId, author_id: String(d.authorUid ?? ''), author_name: d.authorName ?? null, body: String(d.text ?? ''), created_at: iso(d.createdAt) };
  });
}

export async function postToGroupDiscussion(groupId: string, body: string): Promise<GroupDiscussionPost> {
  const text = body.trim();
  if (text.length < 1) throw new Error('Write a message first.');
  if (text.length > 500) throw new Error('Messages can be up to 500 characters.');
  const me = await myUsername();
  const ref = doc(collection(db, 'groups', groupId, 'messages'));
  await setDoc(ref, { authorUid: me.uid, authorName: me.username, text, createdAt: serverTimestamp() });
  return { id: ref.id, group_id: groupId, author_id: me.uid, author_name: me.username, body: text, created_at: new Date().toISOString() };
}

// ─── Direct messages (shared with the original app) ──────────────────────
// chats/{a_b} (the two uids sorted, joined with "_") = { members, names,
// lastText, lastAt, lastFrom, seen }; messages = { from, text, createdAt }.
// Only friends (who follow each other) can start or keep chatting.

/** The conversation id with a friend; the chat document is created the first time. */
export async function getOrCreateFriendConversation(friendId: string): Promise<string> {
  const me = await myUsername();
  const members = [me.uid, friendId].sort();
  const id = members.join('_');
  const ref = doc(db, 'chats', id);
  if ((await getDoc(ref)).exists()) return id;
  try {
    await setDoc(ref, { members, names: { [me.uid]: me.username }, lastText: '', lastAt: serverTimestamp(), lastFrom: me.uid, seen: { [me.uid]: serverTimestamp() } });
  } catch (error) {
    if ((error as { code?: string }).code === 'permission-denied') throw new Error('You can message friends who follow you back.');
    throw error;
  }
  return id;
}

export async function listConversationMessages(conversationId: string): Promise<CommunityMessage[]> {
  const snap = await getDocs(query(collection(db, 'chats', conversationId, 'messages'), orderBy('createdAt', 'asc'), limit(200)));
  return snap.docs.map((item) => {
    const d = item.data();
    const audio = d.audio && typeof d.audio.url === 'string' ? { url: d.audio.url as string, seconds: Number(d.audio.d) || 0 } : null;
    return { id: item.id, conversation_id: conversationId, sender_id: String(d.from ?? ''), body: String(d.text ?? ''), created_at: iso(d.createdAt), audio };
  });
}

/** My chats, most recent first (members contains me; sorted here so no extra index is needed). */
export async function listMyConversations(max = 8): Promise<ConversationSummary[]> {
  const me = await signedInUserId();
  const snap = await getDocs(query(collection(db, 'chats'), where('members', 'array-contains', me), limit(100)));
  const millis = (value: unknown) => (value as { toMillis?: () => number } | null)?.toMillis?.() ?? 0;
  return snap.docs
    .map((item) => {
      const d = item.data();
      const otherId = ((d.members ?? []) as string[]).find((member) => member !== me) ?? '';
      const lastAt = millis(d.lastAt);
      const seenAt = millis((d.seen ?? {})[me]);
      return { id: item.id, otherId, otherName: ((d.names ?? {})[otherId] as string) ?? null, lastText: String(d.lastText ?? ''), lastAt, lastFromMe: d.lastFrom === me, unread: d.lastFrom !== me && Boolean(d.lastText) && lastAt > seenAt };
    })
    .filter((chat) => chat.otherId && chat.lastText)
    .sort((a, b) => b.lastAt - a.lastAt)
    .slice(0, max);
}

export const VOICE_NOTE_MAX_SECONDS = 120;

/** Sends a voice note (already uploaded to Cloudinary), as the original app does: an empty text with `audio`. */
export async function sendVoiceNote(conversationId: string, url: string, seconds: number): Promise<CommunityMessage> {
  const me = await signedInUserId();
  const d = Math.max(1, Math.min(VOICE_NOTE_MAX_SECONDS, Math.round(seconds)));
  const ref = doc(collection(db, 'chats', conversationId, 'messages'));
  const batch = writeBatch(db);
  batch.set(ref, { from: me, text: '', createdAt: serverTimestamp(), audio: { url, d } });
  batch.update(doc(db, 'chats', conversationId), { lastText: 'Voice note', lastAt: serverTimestamp(), lastFrom: me, [`seen.${me}`]: serverTimestamp() });
  try {
    await batch.commit();
  } catch (error) {
    if ((error as { code?: string }).code === 'permission-denied') throw new Error('Voice notes can only be sent between friends who follow each other.');
    throw error;
  }
  return { id: ref.id, conversation_id: conversationId, sender_id: me, body: '', created_at: new Date().toISOString(), audio: { url, seconds: d } };
}

export async function sendCommunityMessage(conversationId: string, body: string): Promise<CommunityMessage> {
  const text = body.trim();
  if (text.length < 1) throw new Error('Write a message first.');
  if (text.length > 500) throw new Error('Messages can be up to 500 characters.');
  const me = await signedInUserId();
  const ref = doc(collection(db, 'chats', conversationId, 'messages'));
  const batch = writeBatch(db);
  batch.set(ref, { from: me, text, createdAt: serverTimestamp() });
  batch.update(doc(db, 'chats', conversationId), { lastText: text.slice(0, 120), lastAt: serverTimestamp(), lastFrom: me, [`seen.${me}`]: serverTimestamp() });
  try {
    await batch.commit();
  } catch (error) {
    if ((error as { code?: string }).code === 'permission-denied') throw new Error('Messages can only be sent between friends who follow each other.');
    throw error;
  }
  return { id: ref.id, conversation_id: conversationId, sender_id: me, body: text, created_at: new Date().toISOString() };
}

/** Only the sender can delete their own message. */
export async function deleteCommunityMessage(conversationId: string, messageId: string) {
  await deleteDoc(doc(db, 'chats', conversationId, 'messages', messageId));
}

export async function listFriendChallenges(): Promise<FriendChallenge[]> {
  try {
    const snap = await getDocs(collection(db, 'battles'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as FriendChallenge);
  } catch {
    return [];
  }
}

export async function createFriendChallenge(
  inputOrOpponentId: string | { opponentId: string; courseId: string; xpStake: number },
  courseId?: string,
  xpStake?: any
): Promise<string> {
  const challengerId = await signedInUserId();
  const id = `battle_${Date.now()}`;
  const opponentId = typeof inputOrOpponentId === 'string' ? inputOrOpponentId : inputOrOpponentId.opponentId;
  const course = typeof inputOrOpponentId === 'string' ? (courseId || '') : inputOrOpponentId.courseId;
  const stake = typeof inputOrOpponentId === 'string' ? (typeof xpStake === 'number' ? xpStake : 50) : inputOrOpponentId.xpStake;

  const battle: FriendChallenge = {
    id,
    challenger_id: challengerId,
    opponent_id: opponentId,
    course_id: course,
    xp_stake: stake,
    status: 'pending',
    created_at: new Date().toISOString(),
    starts_at: null,
    ends_at: null,
  };
  await setDoc(doc(db, 'battles', id), battle);
  return id;
}

export async function respondToFriendChallenge(challengeId: string, accept: boolean) {
  await updateDoc(doc(db, 'battles', challengeId), {
    status: accept ? 'accepted' : 'declined',
  });
}

export async function readStreakFreezeBalance(): Promise<StreakFreezeBalance | null> {
  return {
    user_id: auth.currentUser?.uid || '',
    available: 0,
    updated_at: new Date().toISOString(),
  };
}

export async function getStreakFreezeBalance(): Promise<{ available: number }> {
  return { available: 0 };
}

export async function recordStreakActivityWithFreeze(todayKey: any): Promise<number> {
  return 1;
}

// ─── Read receipts and presence (sent ✓ · delivered ✓✓ · read ✓✓ blue) ─────
// The chat document's `seen` map (the original app's read receipts) says when
// each member last opened the chat; the other member's `appActiveAt` (written
// by their app while it is open) says whether a message could have arrived.

export type MessageStatus = 'sent' | 'delivered' | 'read';
export type ConversationMeta = {
  otherId: string | null;
  /** When the other member last opened this chat (ms), if read receipts apply. */
  otherSeenAt: number | null;
  /** When the other member's app was last open (ms). */
  otherActiveAt: number | null;
  /** Shown only when they share it (Settings → Privacy). */
  otherOnline: boolean;
  otherLastSeen: number | null;
};

const millisOf = (value: unknown) => {
  const v = value as { toMillis?: () => number } | number | null | undefined;
  if (typeof v === 'number') return v;
  return v && typeof v.toMillis === 'function' ? v.toMillis() : null;
};

export async function loadConversationMeta(conversationId: string, mine: { readReceipts: boolean; shareOnlineStatus: boolean }): Promise<ConversationMeta> {
  const me = await signedInUserId();
  const chat = (await getDoc(doc(db, 'chats', conversationId)).catch(() => null))?.data() ?? {};
  const otherId = ((chat.members ?? []) as string[]).find((member) => member !== me) ?? null;
  const other = otherId ? (await getDoc(doc(db, 'users', otherId)).catch(() => null))?.data() ?? {} : {};
  const theirReceipts = other.readReceipts !== false;
  const lastSeen = typeof other.lastSeen === 'number' ? other.lastSeen : null;
  return {
    otherId,
    // Like other messaging apps: read receipts show only when both share them.
    otherSeenAt: mine.readReceipts && theirReceipts && otherId ? millisOf((chat.seen ?? {})[otherId]) : null,
    otherActiveAt: typeof other.appActiveAt === 'number' ? other.appActiveAt : null,
    // Online and last seen are shown only to learners who share their own.
    otherOnline: mine.shareOnlineStatus && other.isOnline === true && lastSeen !== null && Date.now() - lastSeen < 2 * 60_000,
    otherLastSeen: mine.shareOnlineStatus ? lastSeen : null,
  };
}

export function messageStatus(message: { created_at: string }, meta: ConversationMeta): MessageStatus {
  const at = Date.parse(message.created_at);
  if (meta.otherSeenAt !== null && meta.otherSeenAt >= at) return 'read';
  if ((meta.otherActiveAt !== null && meta.otherActiveAt >= at) || meta.otherOnline) return 'delivered';
  return 'sent';
}

/** Marks the chat as read by me (only when my read receipts are on). */
export async function markConversationSeen(conversationId: string, readReceipts: boolean) {
  if (!readReceipts) return;
  const me = await signedInUserId();
  await updateDoc(doc(db, 'chats', conversationId), { [`seen.${me}`]: serverTimestamp() }).catch(() => {});
}
