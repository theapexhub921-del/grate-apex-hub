// Learning-engine tests: scheduler, memory model, selection, XP rules.
// Run with:  npm test
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 0, 5, 9, 0, 0);

const scheduler = await import('@/data/learning/scheduler');
const memoryLib = await import('@/data/learning/memory');
const selection = await import('@/data/learning/selection');
const xp = await import('@/data/learning/xp-rules');
const curriculum = await import('@/data/curriculum');

const { applyAnswer, applyLearned, classify, emptyMemory, isDue, masteryEstimate, reviewPriority } = scheduler;

function answer(record, at, correct, extra = {}) {
  return applyAnswer(record, { at, correct, mode: 'review', ...extra });
}

describe('scheduler', () => {
  it('schedules a learned concept for tomorrow', () => {
    const r = applyLearned(emptyMemory(), T0);
    assert.equal(r.dueAt, T0 + DAY);
    assert.equal(classify(r), 'learning');
  });

  it('does not grow the interval when answered again immediately (cramming guard)', () => {
    let r = applyLearned(emptyMemory(), T0);
    r = answer(r, T0 + 5 * 60 * 1000, true);
    assert.equal(r.dueAt, T0 + DAY);
    assert.equal(r.reviews, 0);
  });

  it('grows the interval on spaced correct recalls: 1 → 3 → ×ease', () => {
    let r = applyLearned(emptyMemory('intermediate'), T0);
    r = answer(r, T0 + DAY, true);
    assert.equal(r.intervalDays, 3);
    const t2 = T0 + 4 * DAY;
    r = answer(r, t2, true);
    assert.ok(r.intervalDays >= 6 && r.intervalDays <= 8, `expected ~7 days, got ${r.intervalDays}`);
    assert.equal(r.dueAt, t2 + r.intervalDays * DAY);
    assert.equal(classify(r), 'remembered');
  });

  it('a wrong answer after learning resets the interval and counts a lapse', () => {
    let r = applyLearned(emptyMemory(), T0);
    r = answer(r, T0 + DAY, true);
    r = answer(r, T0 + 4 * DAY, true);
    const easeBefore = r.ease;
    r = answer(r, T0 + 12 * DAY, false);
    assert.equal(r.intervalDays, 0);
    assert.equal(r.lapses, 1);
    assert.equal(r.dueAt, T0 + 13 * DAY);
    assert.ok(r.ease < easeBefore);
  });

  it('repeated failures mark a concept as struggling and keep it due soon', () => {
    let r = applyLearned(emptyMemory(), T0);
    r = answer(r, T0 + DAY, false);
    r = answer(r, T0 + 2 * DAY, false);
    assert.equal(classify(r), 'struggling');
    assert.equal(r.dueAt, T0 + 3 * DAY);
  });

  it('Apex misses are soft: interval kept, review brought forward', () => {
    let r = applyLearned(emptyMemory(), T0);
    r = answer(r, T0 + DAY, true);
    r = answer(r, T0 + 4 * DAY, true);
    const interval = r.intervalDays;
    r = applyAnswer(r, { at: T0 + 5 * DAY, correct: false, mode: 'apex' });
    assert.equal(r.intervalDays, interval);
    assert.equal(r.lapses, 0);
    assert.ok(r.dueAt <= T0 + 6 * DAY);
  });

  it('reaches mastered after a long run of spaced successes', () => {
    let r = applyLearned(emptyMemory(), T0);
    let t = T0;
    for (let i = 0; i < 6; i++) {
      t = r.dueAt;
      r = answer(r, t, true);
    }
    assert.ok(r.intervalDays >= 21, `interval ${r.intervalDays}`);
    assert.equal(classify(r), 'mastered');
    assert.ok(masteryEstimate(r, t) > 0.7);
  });

  it('due and overdue concepts get higher review priority', () => {
    const r = applyLearned(emptyMemory(), T0);
    assert.equal(isDue(r, T0), false);
    assert.equal(isDue(r, T0 + 2 * DAY), true);
    assert.ok(reviewPriority(r, T0 + 5 * DAY) > reviewPriority(r, T0 + DAY + 1));
  });
});

const topic = curriculum.publishedTopics[0];
const lesson = topic.lessons[0];
const lessonQuestions = curriculum.getLessonQuizBank(lesson.id);

function attemptsFor(questions, at, correct, mode = 'lesson-quiz') {
  return questions.map((question, i) => ({
    questionId: question.id,
    lessonId: question.lessonId,
    concept: question.concept,
    correct: typeof correct === 'function' ? correct(question, i) : correct,
    attemptedAt: at + i * 1000,
    mode,
  }));
}

describe('memory model', () => {
  it('derives concept memory from lesson completions', () => {
    const model = memoryLib.buildMemoryModel({
      attempts: [],
      completions: [{ lessonId: lesson.id, completedAt: T0 }],
      now: T0 + 2 * DAY,
    });
    const trackable = lesson.concepts.filter(curriculum.isTrackableConcept).length;
    assert.equal(model.concepts.size, trackable);
    for (const concept of model.concepts.values()) {
      assert.equal(concept.due, true);
      assert.equal(concept.state, 'learning');
    }
  });

  it('is deterministic: the same history gives the same model', () => {
    const attempts = attemptsFor(lessonQuestions.slice(0, 10), T0, (q, i) => i % 3 !== 0);
    const a = memoryLib.buildMemoryModel({ attempts, completions: [], now: T0 + DAY });
    const b = memoryLib.buildMemoryModel({ attempts, completions: [], now: T0 + DAY });
    assert.deepEqual(JSON.stringify(Array.from(a.concepts.entries())), JSON.stringify(Array.from(b.concepts.entries())));
  });

  it('maps older history (concept names only) to concept keys', () => {
    const q = lessonQuestions[0];
    const model = memoryLib.buildMemoryModel({
      attempts: [{ questionId: 'unknown:removed', lessonId: q.lessonId, concept: q.concept, correct: false, attemptedAt: T0, mode: 'review' }],
      completions: [],
      now: T0 + DAY,
    });
    assert.equal(model.concepts.size, 1);
  });

  it('carries over legacy schedules only for concepts with no history', () => {
    const concept = lesson.concepts.find(curriculum.isTrackableConcept);
    const model = memoryLib.buildMemoryModel({
      attempts: [],
      completions: [],
      legacy: [{ lessonId: lesson.id, concept: concept.name, stage: 2, dueAt: T0 + 3 * DAY, misses: 1, lastReviewedAt: T0 }],
      now: T0,
    });
    const memory = Array.from(model.concepts.values())[0];
    assert.equal(memory.intervalDays, 7);
    assert.equal(memory.dueAt, T0 + 3 * DAY);
  });
});

describe('selection', () => {
  const empty = memoryLib.buildMemoryModel({ attempts: [], completions: [], now: T0 });

  it('never repeats a question within a session', () => {
    const picked = selection.selectQuestions({ scope: { kind: 'lesson', lessonId: lesson.id }, size: 25, seed: 's1', now: T0 }, empty);
    const ids = picked.map((item) => item.question.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.length > 0);
  });

  it('two attempts with different seeds differ', () => {
    const a = selection.selectQuestions({ scope: { kind: 'lesson', lessonId: lesson.id }, size: 15, seed: 'a', now: T0 }, empty);
    const b = selection.selectQuestions({ scope: { kind: 'lesson', lessonId: lesson.id }, size: 15, seed: 'b', now: T0 }, empty);
    assert.notDeepEqual(a.map((x) => x.question.id), b.map((x) => x.question.id));
  });

  it('is reproducible for the same seed and history', () => {
    const a = selection.selectQuestions({ scope: { kind: 'lesson', lessonId: lesson.id }, size: 15, seed: 'same', now: T0 }, empty);
    const b = selection.selectQuestions({ scope: { kind: 'lesson', lessonId: lesson.id }, size: 15, seed: 'same', now: T0 }, empty);
    assert.deepEqual(a.map((x) => x.question.id), b.map((x) => x.question.id));
  });

  it('covers every concept of the lesson before doubling up', () => {
    const picked = selection.selectQuestions({ scope: { kind: 'lesson', lessonId: lesson.id }, size: 25, seed: 'cover', now: T0 }, empty);
    const conceptsInBank = new Set(lessonQuestions.map((q) => q.conceptId));
    const covered = new Set(picked.map((item) => item.question.conceptId));
    for (const concept of conceptsInBank) assert.ok(covered.has(concept), `concept ${concept} not covered`);
  });

  it('prioritises questions answered wrongly last time', () => {
    const wrong = lessonQuestions.slice(0, 3);
    const attempts = attemptsFor(lessonQuestions, T0, (q) => !wrong.includes(q));
    const model = memoryLib.buildMemoryModel({ attempts, completions: [{ lessonId: lesson.id, completedAt: T0 - DAY }], now: T0 + 2 * DAY });
    let hits = 0;
    for (let i = 0; i < 20; i++) {
      const picked = selection.selectQuestions(
        { scope: { kind: 'lesson', lessonId: lesson.id }, size: 8, seed: `w${i}`, now: T0 + 2 * DAY },
        model
      );
      hits += picked.filter((item) => wrong.some((q) => q.id === item.question.id)).length;
    }
    // 3 of the bank's questions were missed; they should appear far more
    // often than chance (~8/bank per question per run).
    assert.ok(hits / 20 >= 2, `missed questions appeared ${hits / 20} times per run`);
  });

  it('review only uses learned material and marks reasons', () => {
    const model = memoryLib.buildMemoryModel({ attempts: [], completions: [{ lessonId: lesson.id, completedAt: T0 }], now: T0 + 2 * DAY });
    const picked = selection.selectQuestions(
      { scope: { kind: 'review' }, filters: { learnedOnly: true }, size: 10, seed: 'r', now: T0 + 2 * DAY },
      model
    );
    assert.ok(picked.length > 0);
    for (const item of picked) {
      assert.equal(item.question.lessonId, lesson.id);
      assert.ok(['due', 'new', 'missed', 'weak', 'reinforce', 'cumulative'].includes(item.reason));
    }
  });

  it('Apex selection only uses short single-answer questions', () => {
    const picked = selection.selectQuestions(
      { scope: { kind: 'challenge', courseId: topic.courseId }, filters: { apexEligible: true }, size: 30, seed: 'apex', now: T0 },
      empty
    );
    for (const item of picked) assert.equal(item.question.type, 'choice');
    assert.equal(new Set(picked.map((item) => item.question.id)).size, picked.length);
  });
});

describe('xp rules', () => {
  it('quiz rewards stay within the 10–50 task range and deduct for wrong answers', () => {
    const perfect = xp.quizXp({ kind: 'lesson', correct: 25, answered: 25, total: 25, multiplier: 1 });
    assert.equal(perfect.net, 40);
    const poor = xp.quizXp({ kind: 'lesson', correct: 10, answered: 25, total: 25, multiplier: 1 });
    assert.equal(poor.penalty, -30);
    assert.equal(poor.net, -10);
  });

  it('practice and review are never penalised', () => {
    assert.equal(xp.quizXp({ kind: 'practice', correct: 0, answered: 5, total: 5, multiplier: 1 }).penalty, 0);
    assert.equal(xp.reviewXp({ recalledDue: 0, answered: 10, multiplier: 1 }).penalty, 0);
  });

  it('powerups multiply gains only, never penalties', () => {
    const doubled = xp.quizXp({ kind: 'lesson', correct: 20, answered: 25, total: 25, multiplier: 2 });
    const plain = xp.quizXp({ kind: 'lesson', correct: 20, answered: 25, total: 25, multiplier: 1 });
    assert.equal(doubled.penalty, plain.penalty);
    assert.equal(doubled.gained, plain.gained * 2);
  });

  it('lesson completion XP is clamped to the task range', () => {
    assert.equal(xp.lessonCompletionXp(5), 10);
    assert.equal(xp.lessonCompletionXp(500), 50);
  });
});

const calendar = await import('@/data/learning/calendar');

describe('review calendar', () => {
  // A lesson learned at T0: its concepts first come due one day later.
  const now = T0 + 3 * DAY;
  const model = memoryLib.buildMemoryModel({ attempts: [], completions: [{ lessonId: lesson.id, completedAt: T0 }], now });

  it('builds a Monday-first month grid of 6 weeks that covers the month', () => {
    const month = calendar.reviewMonth(model, [], now);
    assert.equal(month.weeks.length, 6);
    for (const week of month.weeks) assert.equal(week.length, 7);
    assert.equal(new Date(month.weeks[0][0].start).getDay(), 1);
    assert.ok(month.weeks.flat().some((day) => day.inMonth && day.date === 1));
  });

  it('shows overdue concepts on today, never on past days', () => {
    const days = calendar.reviewMonth(model, [], now).weeks.flat();
    const today = days.find((day) => day.isToday);
    assert.ok(today);
    assert.equal(today.due.length, model.concepts.size);
    assert.equal(today.overdue, model.concepts.size);
    assert.ok(days.filter((day) => day.isPast).every((day) => day.due.length === 0));
  });

  it('logs review answers on the day they were given', () => {
    const attempts = [
      { questionId: 'q1', lessonId: lesson.id, concept: 'x', correct: true, attemptedAt: T0 + 2 * DAY + 60 * 60 * 1000, mode: 'review' },
      { questionId: 'q2', lessonId: lesson.id, concept: 'x', correct: false, attemptedAt: T0 + 2 * DAY + 2 * 60 * 60 * 1000, mode: 'lesson-quiz' },
    ];
    const strip = calendar.reviewStrip(model, attempts, now, 3, 5);
    assert.equal(strip.length, 9);
    const reviewed = strip.filter((day) => day.reviewed.total > 0);
    assert.equal(reviewed.length, 1); // quiz answers are not review answers
    assert.equal(reviewed[0].reviewed.correct, 1);
  });

  it('agrees with the agenda about what is due today', () => {
    const agenda = calendar.reviewAgenda(model, [], now);
    const today = calendar.reviewStrip(model, [], now).find((day) => day.isToday);
    assert.equal(today.due.length, agenda.dueToday.length);
  });
});
