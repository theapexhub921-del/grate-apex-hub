import { isLegacyLessonId } from '@/data/legacy-ids';
// Where this app keeps lesson completions in the cloud, and how it reads them.
//
// progress/{uid} is shared with the original GRATEAPEX app, which saves the
// whole document (no merge) and turns anything that is not a number in its
// `lessons` map into NaN. So this app stores each completion as its own
// document, progress/{uid}/completions/{lessonId} — the original app never
// touches subcollections.
//
// Reading stays backward compatible: completions this app wrote earlier as
// objects in the shared `lessons` map are still read (the original app's
// numbers never are — see legacy-lessons.ts).
//
// Kept free of Firebase imports so it can be tested directly (npm test).

import { appLessonEntries } from '@/data/legacy-lessons';

export type CompletionRow = { lessonId: string; completedAt: number | null };
export type StoredCompletion = { completedAt: number; xp: number };
export type CompletionWrite = { lessonId: string; completedAt: number; xp: number };

export const MAX_COMPLETION_XP = 1000;

const toTime = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.round(value);
  const maybe = value as { toMillis?: () => number } | null;
  if (maybe && typeof maybe.toMillis === 'function') return maybe.toMillis();
  return null;
};

/**
 * Every completion this app knows about in the cloud: the completions
 * subcollection plus earlier object entries in the shared `lessons` map. The
 * earliest completion time wins when a lesson appears in both.
 */
export function readCompletions(
  subcollection: { id: string; data: Record<string, unknown> }[],
  legacyLessons: unknown
): CompletionRow[] {
  const rows = new Map<string, CompletionRow>();
  const add = (lessonId: string, completedAt: number | null) => {
    const current = rows.get(lessonId);
    if (!current) rows.set(lessonId, { lessonId, completedAt });
    else if (completedAt !== null && (current.completedAt === null || completedAt < current.completedAt)) current.completedAt = completedAt;
  };
  // The shared map is the original app's: an original lesson id there is its
  // section count (or damaged), never a completion made here.
  for (const [lessonId, value] of appLessonEntries(legacyLessons)) {
    if (isLegacyLessonId(lessonId)) continue;
    add(lessonId, toTime((value as { completedAt?: unknown } | null)?.completedAt));
  }
  if (Array.isArray(legacyLessons)) {
    for (const item of legacyLessons) {
      if (typeof item === 'string') { if (!isLegacyLessonId(item)) add(item, null); }
      else if (item && typeof item === 'object') {
        const id = (item as { lessonId?: unknown; id?: unknown }).lessonId ?? (item as { id?: unknown }).id;
        if (typeof id === 'string' && !isLegacyLessonId(id)) add(id, toTime((item as { completedAt?: unknown }).completedAt));
      }
    }
  }
  for (const { id, data } of subcollection) add(id, toTime(data.completedAt));
  return [...rows.values()];
}

/**
 * The completion documents to write: only lessons that are missing or whose
 * time or XP differs. A lesson without a local time keeps its stored time
 * (so a sync never rewrites the same document again and again).
 */
export function completionWrites(
  completed: { lessonId: string; xp: number; completedAt?: number }[],
  stored: Map<string, StoredCompletion>,
  now = Date.now()
): CompletionWrite[] {
  const writes: CompletionWrite[] = [];
  for (const lesson of completed) {
    const have = stored.get(lesson.lessonId);
    const completedAt = toTime(lesson.completedAt) ?? have?.completedAt ?? now;
    const xp = Math.min(MAX_COMPLETION_XP, Math.max(0, Math.round(Number(lesson.xp) || 0)));
    if (have && have.completedAt === completedAt && have.xp === xp) continue;
    writes.push({ lessonId: lesson.lessonId, completedAt, xp });
  }
  return writes;
}

/** Ids of this app's completions in the shared `lessons` map (the original app's numbers excluded). */
export function appLessonIdsInSharedMap(legacyLessons: unknown): string[] {
  return appLessonEntries(legacyLessons).map(([id]) => id);
}

const DAY = 86_400_000;
const dayKey = (time: number) => new Date(time).toISOString().slice(0, 10);

/**
 * The current streak from the original app's `days` map ("2026-10-04" →
 * questions answered that day): consecutive active days ending today or
 * yesterday (UTC). Not the number of days ever studied.
 */
export function streakFromDays(days: unknown, now = Date.now()): number {
  if (!days || typeof days !== 'object' || Array.isArray(days)) return 0;
  const active = new Set(
    Object.entries(days as Record<string, unknown>)
      .filter(([, count]) => typeof count === 'number' && count > 0)
      .map(([key]) => key)
  );
  let cursor = active.has(dayKey(now)) ? now : now - DAY;
  let streak = 0;
  while (active.has(dayKey(cursor))) {
    streak += 1;
    cursor -= DAY;
  }
  return streak;
}
