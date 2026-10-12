// One learning engine for both apps: answers to the original app's questions
// (HB1 courses, ids "legacy:<course>:<question>") go through the same
// spaced-repetition scheduler as this app's (data/learning/scheduler.ts), one
// memory per question. A question comes back when it is due, and a question
// answered wrongly last time waits in "Fix your mistakes". True/false and
// type-the-answer versions count for the question they came from; matching
// rounds are left out (they mix four questions). Pure, for tests.
import { applyAnswer, emptyMemory, isDue, type MemoryRecord } from '@/data/learning/scheduler';
import type { QuestionAttempt } from '@/data/question-history';

export type LegacyQuestionMemory = { course: string; questionId: string; record: MemoryRecord };

/** "legacy:biochemistry:q12:tf" → { course: 'biochemistry', questionId: 'q12' } (null for matching rounds and other ids). */
export function legacyQuestionOf(id: string) {
  const parts = id.split(':');
  if (parts[0] !== 'legacy' || parts.length < 3 || parts[2] === 'match') return null;
  return { course: parts[1], questionId: parts[2] };
}

export function legacyQuestionMemory(attempts: readonly Pick<QuestionAttempt, 'questionId' | 'correct' | 'attemptedAt' | 'mode'>[]): Map<string, LegacyQuestionMemory> {
  const out = new Map<string, LegacyQuestionMemory>();
  const ordered = attempts.filter((attempt) => attempt.questionId.startsWith('legacy:')).sort((a, b) => a.attemptedAt - b.attemptedAt);
  for (const attempt of ordered) {
    const found = legacyQuestionOf(attempt.questionId);
    if (!found) continue;
    const key = `${found.course}:${found.questionId}`;
    const current = out.get(key) ?? { ...found, record: emptyMemory() };
    out.set(key, { ...current, record: applyAnswer(current.record, { at: attempt.attemptedAt, correct: attempt.correct, mode: attempt.mode }) });
  }
  return out;
}

/** A course's questions due for spaced review now (most overdue first) and those missed last time. */
export function legacyReviewFor(course: string, memory: Map<string, LegacyQuestionMemory>, now: number) {
  const own = [...memory.values()].filter((item) => item.course === course);
  const due = own.filter((item) => isDue(item.record, now)).sort((a, b) => (a.record.dueAt ?? 0) - (b.record.dueAt ?? 0)).map((item) => item.questionId);
  const missed = own.filter((item) => item.record.lastResult === 'incorrect').map((item) => item.questionId);
  return { due, missed, tracked: own.length };
}
