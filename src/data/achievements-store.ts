// Achievement levels for the signed-in learner: measured from both apps'
// records (data/achievements.ts), claimed on the account, and rewarded with one
// timed boost per newly completed level.
//
// No double rewards:
// - Levels are claimed in a Firestore transaction on users/{uid}.achievements
//   ({ [achievementId]: level }). Only levels above the recorded one are new,
//   so a reload, a retry or a second device can't claim a level twice.
// - The boost key is the level itself (achievement:<id>:<level>), so the
//   inventory refuses a repeat and a saved boost is never rerolled.
// Safe backfill: the first check on an account (no achievementsBaseline yet)
// only RECORDS the levels already reached — earned before rewards existed — so
// existing students are recognised but not flooded with boosts.
import { useMemo, useSyncExternalStore } from 'react';
import { doc, getDoc, runTransaction } from 'firebase/firestore';

import {
  type AchievementState,
  computeMetrics,
  evaluateAchievements,
  levelTitle,
  legacyStats,
  type LegacyStats,
  newLevels,
  NO_LEGACY,
  ACHIEVEMENTS,
} from '@/data/achievements';
import { subscribeToLearningAuthChanges } from '@/data/learning-sync';
import { describeBoost, grantAchievementBoost } from '@/data/learning/powerups';
import { curriculumProgress } from '@/data/learning/progress-model';
import { useLearning } from '@/data/learning/use-learning';
import { auth, db } from '@/lib/firebase';

type Store = {
  /** The original app's records for the signed-in learner, or null until read. */
  legacy: LegacyStats | null;
  legacyFor: string | null;
  /** Levels recorded on the account (from the last claim). */
  recorded: Record<string, number>;
  announcements: Announcement[];
};

export type Announcement = { key: string; title: string; detail: string; reward: string | null };

let store: Store = { legacy: null, legacyFor: null, recorded: {}, announcements: [] };
const listeners = new Set<() => void>();
function setStore(patch: Partial<Store>) {
  store = { ...store, ...patch };
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let legacyLoading: string | null = null;
/** Reads the original app's fields of progress/{uid} once per sign-in. Failure leaves it null (no claims meanwhile). */
export async function loadLegacyAchievementStats(uid: string) {
  if (store.legacyFor === uid || legacyLoading === uid) return;
  legacyLoading = uid;
  try {
    const snap = await getDoc(doc(db, 'progress', uid));
    if (auth.currentUser?.uid === uid) setStore({ legacy: legacyStats(snap.data()), legacyFor: uid });
  } catch (error) {
    console.warn('Could not read earlier achievement progress:', error);
  } finally {
    if (legacyLoading === uid) legacyLoading = null;
  }
}

/**
 * Claim newly reached levels on the account, in one transaction. Returns the
 * levels that are new (empty for the first, recognition-only check).
 */
export async function claimNewLevels(uid: string, states: readonly AchievementState[]) {
  const ref = doc(db, 'users', uid);
  const result = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return { baseline: false, recorded: {} as Record<string, number>, claimed: [] as { id: string; level: number }[] };
    const data = snap.data();
    const saved: Record<string, number> = data.achievements && typeof data.achievements === 'object' ? data.achievements : {};
    const merged: Record<string, number> = { ...saved };
    for (const state of states) merged[state.def.id] = Math.max(Number(saved[state.def.id]) || 0, state.level);
    if (data.achievementsBaseline !== true) {
      tx.update(ref, { achievements: merged, achievementsBaseline: true });
      return { baseline: true, recorded: merged, claimed: [] };
    }
    const claimed = newLevels(saved, states);
    if (claimed.length > 0) tx.update(ref, { achievements: merged });
    return { baseline: false, recorded: merged, claimed };
  });
  if (auth.currentUser?.uid === uid) setStore({ recorded: result.recorded });
  return result;
}

/** Grant one boost per claimed level and announce it. */
export async function rewardLevels(claimed: readonly { id: string; level: number }[], random?: () => number) {
  const fresh: Announcement[] = [];
  for (const { id, level } of claimed) {
    const def = ACHIEVEMENTS.find((item) => item.id === id);
    if (!def) continue;
    const pick = await grantAchievementBoost(`${id}:${level}`, random);
    fresh.push({
      key: `${id}:${level}`,
      title: levelTitle(def, level),
      detail: def.goal(def.levels[level - 1]),
      reward: pick ? describeBoost(pick) : null,
    });
  }
  if (fresh.length) setStore({ announcements: [...store.announcements, ...fresh] });
  return fresh;
}

export function dismissAnnouncement(key: string) {
  setStore({ announcements: store.announcements.filter((item) => item.key !== key) });
}

/** The current state, outside React (emulator checks). */
export function achievementStoreState() {
  return store;
}

export function useAchievementStore() {
  return useSyncExternalStore(subscribe, () => store, () => store);
}

/** Every achievement's level for the signed-in learner, plus whether the data is complete enough to claim. */
export function useAchievements() {
  const { progress, attempts, quizzes, inputs, historyReady } = useLearning();
  const { legacy, legacyFor } = useAchievementStore();
  const uid = auth.currentUser?.uid ?? null;
  const overall = useMemo(() => curriculumProgress(inputs), [inputs]);
  const legacyReady = Boolean(uid && legacyFor === uid && legacy);
  const states = useMemo(
    () =>
      evaluateAchievements(
        computeMetrics(
          {
            answers: attempts,
            quizzes,
            xp: progress.xp,
            lessonsCompleted: progress.lessonsCompleted,
            lessonCompletedAt: Object.values(progress.lessonCompletedAt),
            topicsCompleted: overall.topicsCompleted,
            conceptsMastered: overall.counts.mastered,
          },
          legacyReady && legacy ? legacy : NO_LEGACY
        )
      ),
    [attempts, quizzes, progress.xp, progress.lessonsCompleted, progress.lessonCompletedAt, overall.topicsCompleted, overall.counts.mastered, legacy, legacyReady]
  );
  return { states, ready: historyReady && legacyReady };
}

subscribeToLearningAuthChanges(() => {
  setStore({ legacy: null, legacyFor: null, recorded: {}, announcements: [] });
});
