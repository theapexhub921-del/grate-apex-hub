import assert from 'node:assert/strict';
import { test } from 'node:test';

import { legacyQuestionMemory, legacyQuestionOf, legacyReviewFor } from '../src/data/legacy-review.ts';

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 9, 1, 9);

test('derived versions count for their original question; matching rounds are left out', () => {
  assert.deepEqual(legacyQuestionOf('legacy:biochemistry:q12:tf'), { course: 'biochemistry', questionId: 'q12' });
  assert.deepEqual(legacyQuestionOf('legacy:anatomy:q3'), { course: 'anatomy', questionId: 'q3' });
  assert.equal(legacyQuestionOf('legacy:anatomy:match:q1-q2-q3-q4'), null);
  assert.equal(legacyQuestionOf('fatty-acid-biosynthesis:q1'), null);
});

test('original questions come back when due, and wrong answers wait to be fixed', () => {
  const attempts = [
    { questionId: 'legacy:anatomy:q1', correct: true, attemptedAt: T0, mode: 'practice' },
    { questionId: 'legacy:anatomy:q2:tf', correct: false, attemptedAt: T0 + 1000, mode: 'practice' },
    { questionId: 'legacy:physiology:q9', correct: true, attemptedAt: T0, mode: 'practice' },
    { questionId: 'other:q1', correct: false, attemptedAt: T0, mode: 'practice' },
  ];
  const memory = legacyQuestionMemory(attempts);
  assert.equal(memory.size, 3);
  const soon = legacyReviewFor('anatomy', memory, T0 + 60_000);
  assert.deepEqual(soon.missed, ['q2']);
  assert.equal(soon.tracked, 2);
  const later = legacyReviewFor('anatomy', memory, T0 + 40 * DAY);
  assert.ok(later.due.includes('q1') && later.due.includes('q2'));
  assert.equal(legacyReviewFor('physiology', memory, T0).tracked, 1);
});
