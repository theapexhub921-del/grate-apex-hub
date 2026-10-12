import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

import {
  appLessonIdsInSharedMap,
  completionWrites,
  readCompletions,
  type StoredCompletion,
  streakFromDays,
} from '@/data/lesson-completions';
import { mergeAppLessons } from '@/data/legacy-lessons';
import { isLegacyLessonId } from '@/data/legacy-ids';
import { auth, db } from '@/lib/firebase';

const LEGACY_CACHE_OWNER_KEY = 'grateapex_learning_cache_owner';

export type CloudLearningStats = {
  total_xp: number;
  current_streak: number;
  last_activity_date: string | null;
};

export type CloudLessonRow = { lessonId: string; completedAt: number | null };

export type CloudProgress = {
  stats: CloudLearningStats | null;
  completedLessons: CloudLessonRow[];
};

export type AttemptMode =
  | 'interactive'
  | 'interactive-retry'
  | 'lesson-quiz'
  | 'topic-quiz'
  | 'practice'
  | 'review'
  | 'recall'
  | 'apex'
  | 'mastery-check';

export type CloudQuestionAttempt = {
  id: string;
  questionId: string;
  topicId: string;
  lessonId: string;
  concept: string;
  correct: boolean;
  attemptedAt: number;
  mode: AttemptMode;
};

export type CloudQuizKind = 'lesson' | 'apex_challenge' | 'topic' | 'review' | 'practice';

export type CloudQuizAttempt = {
  id: string;
  attemptType: CloudQuizKind;
  courseId: string | null;
  lessonId: string | null;
  score: number;
  total: number;
  percentage: number;
  timeSeconds: number;
  wrongConcepts: string[];
  wrongQuestionIds: string[];
  practice: boolean;
  completedAt: number;
};

export type CloudReviewItem = {
  lessonId: string;
  concept: string;
  stage: number;
  dueAt: number;
  misses: number;
  lastReviewedAt: number;
  firstTrackedAt: number;
  reason: 'learned' | 'missed';
};

export type CloudLearningEvent = {
  id: string;
  type: string;
  at: number;
  topicId: string | null;
  lessonId: string | null;
  refId: string | null;
  data: Record<string, unknown> | null;
};

async function getUserId(): Promise<string | null> {
  return auth.currentUser?.uid ?? null;
}

export async function getAuthenticatedLearningUserId(): Promise<string | null> {
  return getUserId();
}

export async function readLearningCache(key: string) {
  const userId = await getUserId();
  if (!userId) return AsyncStorage.getItem(key);

  const accountKey = `${key}:${userId}`;
  const accountValue = await AsyncStorage.getItem(accountKey);
  if (accountValue !== null) return accountValue;

  const legacyOwner = await AsyncStorage.getItem(LEGACY_CACHE_OWNER_KEY);
  if (legacyOwner && legacyOwner !== userId) return null;

  if (!legacyOwner) {
    await AsyncStorage.setItem(LEGACY_CACHE_OWNER_KEY, userId);
  }
  const legacyValue = await AsyncStorage.getItem(key);
  if (legacyValue !== null) {
    await AsyncStorage.setItem(accountKey, legacyValue);
  }
  return legacyValue;
}

export async function writeLearningCache(key: string, value: string) {
  const userId = await getUserId();
  const storageKey = userId ? `${key}:${userId}` : key;
  await AsyncStorage.setItem(storageKey, value);
}

export function subscribeToLearningAuthChanges(listener: (userId: string | null) => void) {
  return onAuthStateChanged(auth, (user) => {
    listener(user?.uid ?? null);
  });
}

function toMillis(value: any): number {
  if (!value) return Date.now();
  if (typeof value === 'number') return value;
  if (value?.toMillis) return value.toMillis();
  if (value?.toDate) return value.toDate().getTime();
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : Date.now();
}

export function createLearningRecordId() {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();

  const bytes = new Uint8Array(16);
  if (cryptoApi?.getRandomValues) {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// ─── Progress ────────────────────────────────────────────────────────

export async function loadCloudProgress(): Promise<CloudProgress | null> {
  const userId = await getUserId();
  if (!userId) return null;

  try {
    const progressDocRef = doc(db, 'progress', userId);
    const snap = await getDoc(progressDocRef);

    if (!snap.exists()) {
      return null;
    }

    const d = snap.data() || {};
    const totalXp = Number(d.xp ?? 0);
    // This app's own streak field, else the current streak from the original
    // app's daily activity (not the number of days ever studied).
    const streak = typeof d.streak === 'number' ? d.streak : streakFromDays(d.days);

    const lastActivity = d.savedAt?.toDate
      ? d.savedAt.toDate().toISOString().split('T')[0]
      : (d.lastActivityDate ?? null);

    // Completions subcollection + earlier object entries in the shared map
    // (lesson-completions.ts); the original app's numbers are never read.
    const stored = await readCompletionDocs(userId);
    const completedLessons: CloudLessonRow[] = readCompletions(
      stored ? [...stored].map(([id, value]) => ({ id, data: value })) : [],
      d.lessons
    );

    return {
      stats: {
        total_xp: totalXp,
        current_streak: streak,
        last_activity_date: lastActivity,
      },
      completedLessons,
    };
  } catch (error) {
    console.warn('Could not load learning progress from Firestore:', error);
    return null;
  }
}

// progress/{uid}/completions as a map, or null when it can't be read — for
// example while its rule is not deployed (then nothing can be stored there).
async function readCompletionDocs(userId: string): Promise<Map<string, StoredCompletion> | null> {
  try {
    const snap = await getDocs(collection(db, 'progress', userId, 'completions'));
    const stored = new Map<string, StoredCompletion>();
    snap.docs.forEach((item) => {
      const data = item.data();
      stored.set(item.id, { completedAt: Number(data.completedAt) || 0, xp: Number(data.xp) || 0 });
    });
    return stored;
  } catch {
    return null;
  }
}

const isPermissionDenied = (error: unknown) => (error as { code?: string } | null)?.code === 'permission-denied';

// Deletes every document in one of the learner's own subcollections. A path
// the rules don't open can't hold anything, so "permission denied" on the
// listing means there is nothing to delete.
async function deleteOwnSubcollection(userId: string, name: 'completions' | 'attempts') {
  let snap;
  try {
    snap = await getDocs(collection(db, 'progress', userId, name));
  } catch (error) {
    if (isPermissionDenied(error)) return;
    throw error;
  }
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = writeBatch(db);
    snap.docs.slice(i, i + 400).forEach((item) => batch.delete(item.ref));
    await batch.commit();
  }
}

/**
 * Clear this app's learning records for the signed-in learner: its lesson
 * completions, quiz attempts, XP and streak. The original app's own fields in
 * the shared document (cards, seen, terms, days, its lesson section counts…)
 * are left untouched. XP is one shared number, so it is reset too.
 */
export async function resetCloudLearningProgress() {
  const userId = await getUserId();
  if (!userId) throw new Error('Sign in before resetting your learning progress.');

  await deleteOwnSubcollection(userId, 'completions');
  await deleteOwnSubcollection(userId, 'attempts');

  const progressDocRef = doc(db, 'progress', userId);
  const snap = await getDoc(progressDocRef);
  const update: Record<string, unknown> = {
    xp: 0,
    streak: 0,
    lastActivityDate: null,
    savedAt: serverTimestamp(),
    updatedAt: Date.now(),
  };
  // Earlier completions this app stored in the shared map (objects only).
  for (const lessonId of appLessonIdsInSharedMap(snap.data()?.lessons)) {
    update[`lessons.${lessonId}`] = deleteField();
  }
  if (snap.exists()) await updateDoc(progressDocRef, update);
}

/**
 * The learner's public leaderboard entry, scores/{uid} — the same entry the
 * original app shows. Only fields both apps agree on are written (merged, so
 * the original app's answered/accuracy/courseXp stay as they are); the rules
 * require the real username. Skipped until the learner has a username.
 */
async function saveLeaderboardSummary(userId: string, totalXp: number) {
  try {
    const profile = (await getDoc(doc(db, 'users', userId))).data();
    const username = profile?.username;
    if (typeof username !== 'string' || !/^[a-z0-9_]{3,20}$/.test(username)) return;
    await setDoc(
      doc(db, 'scores', userId),
      {
        username,
        xp: Math.min(1_000_000, Math.max(0, Math.round(totalXp))),
        hall: typeof profile?.hall === 'string' ? profile.hall : '',
        semester: profile?.semester === 2 ? 2 : 1,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn('Could not update the leaderboard entry:', error);
  }
}

export async function saveCloudProgress(
  completedLessons: { lessonId: string; xp: number; completedAt?: number }[],
  stats: CloudLearningStats
) {
  const userId = await getUserId();
  if (!userId) return;
  const progressDocRef = doc(db, 'progress', userId);
  void saveLeaderboardSummary(userId, stats.total_xp);

  try {
    // Only this app's own fields, merged: the shared `lessons` map is not written.
    await setDoc(
      progressDocRef,
      {
        xp: stats.total_xp,
        streak: stats.current_streak,
        lastActivityDate: stats.last_activity_date,
        savedAt: serverTimestamp(),
        updatedAt: Date.now(),
      },
      { merge: true }
    );
    if (completedLessons.length === 0) return;

    const stored = await readCompletionDocs(userId);
    if (stored) {
      const writes = completionWrites(completedLessons, stored);
      for (let i = 0; i < writes.length; i += 400) {
        const batch = writeBatch(db);
        writes.slice(i, i + 400).forEach((write) =>
          batch.set(doc(db, 'progress', userId, 'completions', write.lessonId), { ...write, savedAt: serverTimestamp() })
        );
        await batch.commit();
      }
      return;
    }

    // The completions rule is not deployed yet: keep the earlier, protected
    // behaviour (this app's objects in the shared map; numbers never replaced).
    const snap = await getDoc(progressDocRef);
    // Never the original app's own lessons: that map holds its section counts.
    await setDoc(progressDocRef, { lessons: mergeAppLessons(snap.data()?.lessons, completedLessons.filter((lesson) => !isLegacyLessonId(lesson.lessonId))) }, { merge: true });
  } catch (error) {
    console.warn('Could not save learning progress to Firestore:', error);
  }
}

export async function saveCloudXpEvent(
  sourceType: 'lesson' | 'quiz',
  sourceId: string,
  amount: number,
  stats: CloudLearningStats
) {
  if (amount <= 0) return;
  const userId = await getUserId();
  if (!userId) return;

  try {
    const progressDocRef = doc(db, 'progress', userId);
    await setDoc(
      progressDocRef,
      {
        xp: stats.total_xp,
        streak: stats.current_streak,
        lastActivityDate: stats.last_activity_date,
        savedAt: serverTimestamp(),
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn('Could not save XP event to Firestore:', error);
  }
}

export async function recordCloudXpAdjustment(amount: number, sourceId: string): Promise<boolean> {
  const userId = await getUserId();
  if (!userId || amount === 0) return false;

  try {
    const progressDocRef = doc(db, 'progress', userId);
    const snap = await getDoc(progressDocRef);
    const currentXp = Number(snap.data()?.xp ?? 0);
    await updateDoc(progressDocRef, {
      xp: Math.max(0, currentXp + amount),
      updatedAt: Date.now(),
    });
    return true;
  } catch (error) {
    console.warn('Could not adjust XP in Firestore:', error);
    return false;
  }
}

// ─── Quiz attempts ───────────────────────────────────────────────────
// One document per attempt at progress/{uid}/attempts/{attemptId}, private to
// the learner (firestore.rules). `scores/{uid}` is only the public leaderboard
// summary and never holds attempts.

export async function loadCloudQuizAttempts(): Promise<CloudQuizAttempt[]> {
  const userId = await getUserId();
  if (!userId) return [];

  try {
    const attemptsQuery = query(
      collection(db, 'progress', userId, 'attempts'),
      orderBy('completedAt', 'desc'),
      limit(200)
    );
    const snap = await getDocs(attemptsQuery);

    return snap.docs.map((docSnap) => {
      const d = docSnap.data();
      return {
        id: docSnap.id,
        attemptType: d.attemptType || d.attempt_type || 'lesson',
        courseId: d.courseId || d.course_id || null,
        lessonId: d.lessonId || d.lesson_id || null,
        score: Number(d.score || 0),
        total: Number(d.total || 0),
        percentage: Number(d.percentage || 0),
        timeSeconds: Number(d.timeSeconds || d.time_seconds || 0),
        wrongConcepts: d.wrongConcepts || d.wrong_concepts || [],
        wrongQuestionIds: d.wrongQuestionIds || d.wrong_question_ids || [],
        practice: Boolean(d.practice),
        completedAt: toMillis(d.completedAt || d.completed_at),
      };
    });
  } catch (error) {
    console.warn('Could not load quiz attempts from Firestore:', error);
    return [];
  }
}

export async function saveCloudQuizAttempt(attempt: CloudQuizAttempt): Promise<boolean> {
  const userId = await getUserId();
  if (!userId || attempt.total <= 0) return false;

  const attemptRef = doc(db, 'progress', userId, 'attempts', attempt.id);
  try {
    // Create only: the rules never let an attempt change, so sending the same
    // attempt again (retry, second device) can't make a copy or alter it.
    // Exactly the fields the rules allow — no XP.
    await setDoc(attemptRef, {
      id: attempt.id,
      userId,
      attemptType: attempt.attemptType,
      courseId: attempt.courseId,
      lessonId: attempt.lessonId,
      score: attempt.score,
      total: attempt.total,
      percentage: attempt.percentage,
      timeSeconds: attempt.timeSeconds,
      wrongConcepts: attempt.wrongConcepts,
      wrongQuestionIds: attempt.wrongQuestionIds,
      practice: attempt.practice,
      completedAt: attempt.completedAt,
      savedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    // Already saved earlier counts as saved.
    try {
      if ((await getDoc(attemptRef)).exists()) return true;
    } catch {
      // fall through
    }
    console.warn('Could not save quiz attempt to Firestore:', error);
    return false;
  }
}

// ─── Question attempts ───────────────────────────────────────────────

export async function loadCloudQuestionAttempts(): Promise<CloudQuestionAttempt[]> {
  const userId = await getUserId();
  if (!userId) return [];

  try {
    const progressDocRef = doc(db, 'progress', userId);
    const snap = await getDoc(progressDocRef);
    const d = snap.data();
    const attempts = d?.questionAttempts || [];
    return attempts.map((a: any) => ({
      ...a,
      attemptedAt: toMillis(a.attemptedAt),
    }));
  } catch (error) {
    console.warn('Could not load question attempts from Firestore:', error);
    return [];
  }
}

export async function saveCloudQuestionAttempts(attempts: CloudQuestionAttempt[]) {
  if (attempts.length === 0) return;
  const userId = await getUserId();
  if (!userId) return;

  try {
    const progressDocRef = doc(db, 'progress', userId);
    const snap = await getDoc(progressDocRef);
    const existing = snap.data()?.questionAttempts || [];
    const merged = [...existing, ...attempts].slice(-2000);

    await setDoc(
      progressDocRef,
      {
        questionAttempts: merged,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn('Could not save question attempts to Firestore:', error);
  }
}

// ─── Review schedule (projection of the memory model) ────────────────

export async function loadCloudReviewItems(): Promise<CloudReviewItem[]> {
  const userId = await getUserId();
  if (!userId) return [];

  try {
    const progressDocRef = doc(db, 'progress', userId);
    const snap = await getDoc(progressDocRef);
    const d = snap.data();
    const items = d?.reviewSchedule || [];
    return items.map((item: any) => ({
      ...item,
      dueAt: toMillis(item.dueAt),
      lastReviewedAt: toMillis(item.lastReviewedAt),
      firstTrackedAt: toMillis(item.firstTrackedAt),
    }));
  } catch (error) {
    console.warn('Could not load review items from Firestore:', error);
    return [];
  }
}

export async function saveCloudReviewItems(items: CloudReviewItem[]) {
  if (items.length === 0) return;
  const userId = await getUserId();
  if (!userId) return;

  try {
    const progressDocRef = doc(db, 'progress', userId);
    await setDoc(
      progressDocRef,
      {
        reviewSchedule: items,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn('Could not save review items to Firestore:', error);
  }
}

// ─── Learning events ─────────────────────────────────────────────────

export async function loadCloudLearningEvents(): Promise<CloudLearningEvent[]> {
  const userId = await getUserId();
  if (!userId) return [];

  try {
    const progressDocRef = doc(db, 'progress', userId);
    const snap = await getDoc(progressDocRef);
    const d = snap.data();
    const events = d?.learningEvents || [];
    return events.map((event: any) => ({
      ...event,
      at: toMillis(event.at),
    }));
  } catch (error) {
    console.warn('Could not load learning events from Firestore:', error);
    return [];
  }
}

export async function saveCloudLearningEvents(events: CloudLearningEvent[]) {
  if (events.length === 0) return;
  const userId = await getUserId();
  if (!userId) return;

  try {
    const progressDocRef = doc(db, 'progress', userId);
    const snap = await getDoc(progressDocRef);
    const existing = snap.data()?.learningEvents || [];
    const merged = [...existing, ...events].slice(-500);

    await setDoc(
      progressDocRef,
      {
        learningEvents: merged,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn('Could not save learning events to Firestore:', error);
  }
}
