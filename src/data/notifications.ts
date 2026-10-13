import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Href } from 'expo-router';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useSyncExternalStore } from 'react';

import type { IconName } from '@/components/ui/icon';
import { getTopic } from '@/data/curriculum';
import { getExploreItems, isNewItem } from '@/data/explore';
import type { LearningEvent } from '@/data/learning/events';
import type { MemoryModel } from '@/data/learning/memory';
import { dayKey, DAY_MS, endOfDay, startOfDay } from '@/data/learning/time';
import { getStreakStatus } from '@/data/progression';
import { getRankProgress } from '@/data/ranks';
import { auth, db } from '@/lib/firebase';
import { routes } from '@/lib/routes';

// Notifications are DERIVED from real learning state (what is due, the
// streak, milestones, new GRATEAPEX features) — nothing is invented. Only
// the "read" marks are stored: on this device and on the account, so every
// device signed in to the account agrees on what has been read.

export type NotificationGroup = 'learning' | 'updates';

export type AppNotification = {
  id: string; // stable, so read marks survive re-derivation
  group: NotificationGroup;
  title: string;
  body: string;
  at: number;
  href?: Href;
  icon: IconName;
  tone: 'primary' | 'gold' | 'warning' | 'success';
};

type Inputs = {
  memory: MemoryModel;
  events: readonly LearningEvent[];
  streak: number;
  lastActivityDate: string | null;
  xp: number;
  now: number;
};

export function buildNotifications({ memory, events, streak, lastActivityDate, xp, now }: Inputs): AppNotification[] {
  const items: AppNotification[] = [];
  const today = startOfDay(now);
  const concepts = Array.from(memory.concepts.values()).filter((concept) => concept.dueAt !== null);
  const dueToday = concepts.filter((concept) => concept.dueAt! <= endOfDay(now));
  const overdue = dueToday.filter((concept) => concept.dueAt! < today);

  if (dueToday.length > 0) {
    items.push({
      id: `due-${dayKey(now)}`,
      group: 'learning',
      title: 'Your next reinforcement is ready.',
      body: `${dueToday.length} concept${dueToday.length === 1 ? '' : 's'} due today${overdue.length ? ` · ${overdue.length} overdue` : ''}. Reviewing now protects your mastery.`,
      at: today,
      href: routes.review({ focus: 'due' }),
      icon: 'reinforce',
      tone: overdue.length ? 'warning' : 'primary',
    });
  }

  if (getStreakStatus(streak, lastActivityDate, new Date(now)) === 'continueToday') {
    items.push({
      id: `streak-${dayKey(now)}`,
      group: 'learning',
      title: 'Keep the momentum.',
      body: `Complete a lesson today to keep your ${streak}-day streak.`,
      at: today,
      href: routes.learn(),
      icon: 'streak',
      tone: 'gold',
    });
  }

  const rank = getRankProgress(xp);
  if (rank && !rank.isTopRank && rank.xpToNextRank !== null && (rank.percentToNextRank ?? 0) >= 85) {
    items.push({
      id: `rank-near-${rank.rank.id}`,
      group: 'learning',
      title: 'Your next rank is close.',
      body: `${rank.xpToNextRank.toLocaleString()} XP to go.`,
      at: today,
      href: routes.progress(),
      icon: 'rank',
      tone: 'gold',
    });
  }

  // Milestones from the last two weeks.
  const since = now - 14 * DAY_MS;
  for (const event of events) {
    if (event.at < since) break; // newest first
    const topic = event.topicId ? getTopic(event.topicId)?.title : undefined;
    const data = event.data ?? {};
    if (event.type === 'TOPIC_COMPLETED') {
      items.push({ id: `event-${event.id}`, group: 'learning', title: 'Topic completed', body: topic ? `You finished every lesson in ${topic}.` : 'You finished every lesson in a topic.', at: event.at, href: event.topicId ? routes.topic(event.topicId) : undefined, icon: 'achievement', tone: 'gold' });
    } else if (event.type === 'CONCEPT_MASTERED') {
      items.push({ id: `event-${event.id}`, group: 'learning', title: 'Concept mastered', body: topic ? `A concept in ${topic} reached mastery.` : 'A concept reached mastery.', at: event.at, icon: 'mastery', tone: 'success' });
    } else if (event.type === 'APEX_CHALLENGE_COMPLETED' && typeof data.percentage === 'number') {
      items.push({ id: `event-${event.id}`, group: 'learning', title: `Apex Challenge: ${data.percentage}%`, body: 'Your run is saved. See every answer in the results.', at: event.at, href: event.refId ? routes.results(event.refId) : undefined, icon: 'challenge', tone: 'gold' });
    } else if (event.type === 'QUIZ_COMPLETED' && typeof data.percentage === 'number' && data.percentage >= 90) {
      items.push({ id: `event-${event.id}`, group: 'learning', title: `Excellent quiz: ${data.percentage}%`, body: topic ? `Strong work in ${topic}.` : 'Strong work.', at: event.at, href: event.refId ? routes.results(event.refId) : undefined, icon: 'xp', tone: 'gold' });
    }
    if (items.length > 24) break;
  }

  // New GRATEAPEX features (the same items Explore marks "New").
  for (const item of getExploreItems()) {
    if (!isNewItem(item, new Date(now))) continue;
    items.push({
      id: `feature-${item.id}`,
      group: 'updates',
      title: `New: ${item.title}`,
      body: item.summary,
      at: new Date(`${item.publishedAt}T09:00:00`).getTime(),
      href: `/explore/discovery?id=${item.id}` as Href,
      icon: 'sparkle',
      tone: 'primary',
    });
  }

  return items.sort((a, b) => b.at - a.at);
}

// ── Read marks (this device and the account) ──────────────────────────
// Saved on the device and on the learner's private progress/{uid} document
// (`notificationsRead`, owner-only in the live rules), so a notification read
// on one device is read on every device signed in to the account. Other
// devices pick up new marks when the app opens, comes back to the screen, or
// at most every 2 minutes while it is open.

const STORAGE_KEY = 'grateapex_notifications_read';
const LIMIT = 400;
const REMOTE_EVERY_MS = 2 * 60 * 1000;
let read = new Set<string>();
let owner: string | null | undefined; // the account `read` belongs to (undefined = not loaded)
let loading: Promise<void> | null = null;
let remoteAt = 0;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function idsOf(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
}

const keyFor = (uid: string | null) => (uid ? `${STORAGE_KEY}:${uid}` : STORAGE_KEY);

/** Adds marks; returns true when something new was added. */
function addMarks(ids: readonly string[]) {
  const fresh = ids.filter((id) => !read.has(id));
  if (!fresh.length) return false;
  read = new Set([...read, ...fresh]);
  notify();
  return true;
}

async function load() {
  await auth.authStateReady();
  const uid = auth.currentUser?.uid ?? null;
  if (owner !== uid) {
    owner = uid;
    read = new Set();
    remoteAt = 0;
    notify();
    try {
      // Marks saved before they were per account still count for this one.
      const [mine, older] = await Promise.all([AsyncStorage.getItem(keyFor(uid)), uid ? AsyncStorage.getItem(STORAGE_KEY) : null]);
      addMarks([...idsOf(JSON.parse(mine ?? '[]')), ...idsOf(JSON.parse(older ?? '[]'))]);
    } catch (problem) {
      console.warn('Could not load notification read marks:', problem);
    }
  }
  if (!uid || Date.now() - remoteAt < REMOTE_EVERY_MS) return;
  remoteAt = Date.now();
  try {
    const remote = idsOf((await getDoc(doc(db, 'progress', uid))).data()?.notificationsRead);
    if (owner !== uid) return;
    addMarks(remote);
    // This device read things the account doesn't know about yet.
    const known = new Set(remote);
    if ([...read].some((id) => !known.has(id))) void save();
  } catch {
    // Offline: the device marks still apply and are uploaded next time.
  }
}

function refresh() {
  if (!loading) loading = load().finally(() => { loading = null; });
  return loading;
}

async function save() {
  const uid = owner ?? null;
  const ids = Array.from(read).slice(-LIMIT);
  try {
    await AsyncStorage.setItem(keyFor(uid), JSON.stringify(ids));
  } catch (problem) {
    console.warn('Could not save notification read marks:', problem);
  }
  if (!uid) return;
  try {
    await setDoc(doc(db, 'progress', uid), { notificationsRead: ids }, { merge: true });
  } catch {
    // Offline: uploaded on the next load.
  }
}

export function markNotificationsRead(ids: string[]) {
  if (!addMarks(ids)) return;
  void save();
}

// Coming back to the app picks up marks made on other devices.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && listeners.size) {
      remoteAt = 0;
      void refresh();
    }
  });
}

export function useReadNotifications(): ReadonlySet<string> {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      void refresh();
      const timer = setInterval(() => void refresh(), REMOTE_EVERY_MS);
      const unsubscribe = auth.onAuthStateChanged(() => void refresh());
      return () => {
        listeners.delete(listener);
        clearInterval(timer);
        unsubscribe();
      };
    },
    () => read,
    () => read
  );
}
