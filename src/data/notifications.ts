import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Href } from 'expo-router';
import { useSyncExternalStore } from 'react';

import type { IconName } from '@/components/ui/icon';
import { getTopic } from '@/data/curriculum';
import { getExploreItems, isNewItem } from '@/data/explore';
import type { LearningEvent } from '@/data/learning/events';
import type { MemoryModel } from '@/data/learning/memory';
import { dayKey, DAY_MS, endOfDay, startOfDay } from '@/data/learning/time';
import { getStreakStatus } from '@/data/progression';
import { getRankProgress } from '@/data/ranks';
import { routes } from '@/lib/routes';

// Notifications are DERIVED from real learning state (what is due, the
// streak, milestones, new GRATEAPEX features) — nothing is invented and
// nothing is sent anywhere. Only the "read" marks are stored, on this
// device.

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

// ── Read marks (this device) ──────────────────────────────────────────

const STORAGE_KEY = 'grateapex_notifications_read';
const LIMIT = 400;
let read = new Set<string>();
let loaded = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

async function load() {
  if (loaded) return;
  loaded = true;
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved) {
      const ids = JSON.parse(saved);
      if (Array.isArray(ids)) {
        read = new Set(ids.filter((id): id is string => typeof id === 'string'));
        notify();
      }
    }
  } catch (problem) {
    console.warn('Could not load notification read marks:', problem);
  }
}

async function save() {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(read).slice(-LIMIT)));
  } catch (problem) {
    console.warn('Could not save notification read marks:', problem);
  }
}

export function markNotificationsRead(ids: string[]) {
  let changed = false;
  for (const id of ids) {
    if (!read.has(id)) {
      read.add(id);
      changed = true;
    }
  }
  if (!changed) return;
  read = new Set(read);
  notify();
  void save();
}

export function useReadNotifications(): ReadonlySet<string> {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      void load();
      return () => listeners.delete(listener);
    },
    () => read,
    () => read
  );
}
