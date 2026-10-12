// Question of the Day — cloud part, shared with the original app's rules:
// - users/{uid}/qotd/{YYYY-MM-DD} = { ok, pick, at }: one answer per learner per
//   day, written once and never changed (the original app uses the same
//   document, so answering in either app counts for the day).
// - qotd/{YYYY-MM-DD}_grateapex = { total, correct }: this app's tally. It can
//   only go up by one, in the same batch as a new answer document. (The
//   original app tallies its own, different question under its class keys.)
// The day is the UTC date (Ghana time), as in the original app.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, increment, writeBatch } from 'firebase/firestore';

import { getTopicQuestions, publishedTopics } from '@/data/curriculum';
import type { Question } from '@/data/questions';
import { auth, db } from '@/lib/firebase';

const LOCAL_KEY = 'grateapex_qotd';

export const qotdDay = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);
const tallyId = (day: string) => `${day}_grateapex`;

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** The same single-answer question for every learner on a given day. */
export function pickQuestion(day: string): Question | null {
  const pool = publishedTopics
    .flatMap((topic) => getTopicQuestions(topic.id))
    .filter((question) => question.type === 'choice' && question.usage !== 'learn' && question.options.length > 2);
  if (pool.length === 0) return null;
  return pool[hash(day) % pool.length];
}

export type LocalAnswer = { day: string; questionId: string; pick: number; synced: boolean };
export type Tally = { total: number; correct: number };

export async function readLocalAnswer(day: string): Promise<LocalAnswer | null> {
  try {
    const saved = await AsyncStorage.getItem(LOCAL_KEY);
    const parsed = saved ? (JSON.parse(saved) as LocalAnswer) : null;
    return parsed && parsed.day === day && typeof parsed.pick === 'number' ? parsed : null;
  } catch {
    return null;
  }
}

async function writeLocalAnswer(answer: LocalAnswer) {
  await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(answer)).catch(() => undefined);
}

/** Today's answer document in the cloud (from either app), or null. Throws when it can't be read. */
export async function readCloudAnswer(day: string): Promise<{ ok: boolean; pick: number } | null> {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;
  const snap = await getDoc(doc(db, 'users', uid, 'qotd', day));
  return snap.exists() ? (snap.data() as { ok: boolean; pick: number }) : null;
}

export async function readTally(day: string): Promise<Tally | null> {
  const snap = await getDoc(doc(db, 'qotd', tallyId(day)));
  if (!snap.exists()) return null;
  const d = snap.data();
  return { total: Number(d.total) || 0, correct: Number(d.correct) || 0 };
}

export type SaveResult = 'saved' | 'already-answered' | 'not-saved' | 'signed-out';

/**
 * Saves today's answer: on the device first, then the answer document and the
 * tally together. The rules count an answer only once, so a retry can never
 * count twice. Returns what happened, for the screen to say.
 */
export async function saveAnswer(day: string, questionId: string, pick: number, ok: boolean): Promise<SaveResult> {
  await writeLocalAnswer({ day, questionId, pick, synced: false });
  const uid = auth.currentUser?.uid;
  if (!uid) return 'signed-out';
  const batch = writeBatch(db);
  batch.set(doc(db, 'users', uid, 'qotd', day), { ok, pick, at: Date.now() });
  batch.set(doc(db, 'qotd', tallyId(day)), { total: increment(1), correct: increment(ok ? 1 : 0) }, { merge: true });
  try {
    await batch.commit();
    await writeLocalAnswer({ day, questionId, pick, synced: true });
    return 'saved';
  } catch (error) {
    if ((error as { code?: string }).code === 'permission-denied') {
      // An answer for today already exists (another device or the original app).
      const existing = await readCloudAnswer(day).catch(() => null);
      if (existing) {
        await writeLocalAnswer({ day, questionId, pick, synced: true });
        return 'already-answered';
      }
    }
    return 'not-saved';
  }
}
