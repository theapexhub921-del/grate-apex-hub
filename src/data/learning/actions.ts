// Learning services — the ONLY place where learning side-effects happen.
// Screens call these; they never write progress, history or XP directly.
//
// Order of operations is always:
//   1. record the learning outcome (answers → history → memory model)
//   2. then the game reward (XP, milestones) — rewards never alter what
//      was recorded as correct or incorrect
//   3. then the event log (timeline / analytics)
import {
  conceptKey,
  findLesson,
  getConceptEntry,
  getTopic,
  isTrackableConcept,
} from '@/data/curriculum';
import type { AttemptMode } from '@/data/learning-sync';
import { logLearningEvent } from '@/data/learning/events';
import {
  getLessonSession,
  newLessonSession,
  saveLessonSession,
  type LessonSession,
} from '@/data/learning/lesson-sessions';
import type { MemoryModel } from '@/data/learning/memory';
import { currentMemoryModel } from '@/data/learning/state';
import { touchClock } from '@/data/learning/use-learning';
import {
  apexXp,
  lessonCompletionXp,
  milestoneXp,
  quizXp,
  reviewXp,
  XP_RULES,
  type XpBreakdown,
} from '@/data/learning/xp-rules';
import { awardXp, completeLesson, getProgressSnapshot, hasAward, type XpSourceType } from '@/data/progress';
import { awardApexCoins } from '@/data/apex-coins';
import { consumePowerup, grantPowerup, returnPowerup } from '@/data/learning/powerups';
import { type Answer, isAnswerComplete, isAnswerCorrect, type Question } from '@/data/questions';
import { type QuestionAttempt, recordQuestionAttempts } from '@/data/question-history';
import { type AttemptKind, type CustomQuizSettings, type QuizAttempt, recordQuizAttempt, syncQuizAttemptToCloud } from '@/data/quiz-history';
import type { RecallPrompt } from '@/data/lesson-types';

export function attemptFor(
  question: Question,
  correct: boolean,
  mode: AttemptMode,
  sessionId?: string,
  at = Date.now()
): QuestionAttempt {
  return {
    questionId: question.id,
    topicId: question.topicId ?? 'unknown',
    lessonId: question.lessonId ?? '',
    concept: question.concept,
    conceptId: question.conceptId,
    correct,
    attemptedAt: at,
    mode,
    sessionId,
  };
}

// One answered question (instant feedback, interactive checkpoints).
export async function recordAnswer(
  question: Question,
  answer: Answer | undefined,
  mode: AttemptMode,
  sessionId?: string
) {
  const correct = isAnswerCorrect(question, answer);
  await recordQuestionAttempts([attemptFor(question, correct, mode, sessionId)]);
  touchClock();
  return correct;
}

// A self-rated open-recall prompt.
export async function recordRecall(recall: RecallPrompt, rating: 'yes' | 'partial' | 'no', sessionId?: string) {
  await recordQuestionAttempts([
    {
      questionId: recall.id,
      topicId: recall.topicId ?? 'unknown',
      lessonId: recall.lessonId ?? '',
      concept: recall.concept,
      conceptId: recall.conceptId,
      correct: rating !== 'no',
      partial: rating === 'partial',
      attemptedAt: Date.now(),
      mode: 'recall',
      sessionId,
    },
  ]);
  touchClock();
}

// ─── Lessons ─────────────────────────────────────────────────────────

export async function beginLesson(lessonId: string, options: { restart?: boolean } = {}): Promise<LessonSession | null> {
  const found = findLesson(lessonId);
  if (!found) return null;
  const existing = getLessonSession(lessonId);
  const steps = found.lesson.interactive?.length ?? 0;
  const stale = existing && existing.contentVersion !== found.topic.contentVersion;
  if (existing && !options.restart && !stale && existing.phase !== 'complete') return existing;

  const session = newLessonSession(lessonId, steps, found.topic.contentVersion);
  saveLessonSession(session);
  void logLearningEvent('LESSON_STARTED', {
    topicId: found.topic.id,
    lessonId,
    data: { restart: Boolean(options.restart || existing) },
  });
  return session;
}

export type MilestoneAward = { label: string; xp: number };

async function awardTopicMilestone(topicId: string): Promise<MilestoneAward | null> {
  const topic = getTopic(topicId);
  if (!topic) return null;
  const completed = getProgressSnapshot().completedLessons;
  if (!topic.lessons.every((lesson) => completed.includes(lesson.id))) return null;
  const sourceId = `topic-completed:${topicId}`;
  if (hasAward(`milestone:${sourceId}`)) return null;
  const xp = await awardXp({
    sourceType: 'milestone',
    sourceId,
    amount: milestoneXp('topicCompleted'),
    label: `Topic completed · ${topic.title}`,
  });
  await logLearningEvent('TOPIC_COMPLETED', { topicId, refId: topicId });
  void awardApexCoins('topic_completion', topicId).catch((error) => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('Could not award Apex Coins for topic completion.', error);
  });
  return { label: `Topic completed · ${topic.title}`, xp };
}

export type LessonFinish = {
  awarded: boolean;
  xp: number;
  milestones: MilestoneAward[];
};

export async function finishLesson(lessonId: string, via: 'lesson' | 'mastery-check' = 'lesson'): Promise<LessonFinish> {
  const found = findLesson(lessonId);
  if (!found) return { awarded: false, xp: 0, milestones: [] };
  const alreadyComplete = getProgressSnapshot().completedLessons.includes(lessonId);
  const powerup = alreadyComplete ? null : await consumePowerup();
  const xp = Math.round(lessonCompletionXp(found.lesson.xp) * (powerup?.multiplier ?? 1));
  let awarded: boolean;
  try {
    awarded = await completeLesson(lessonId, found.topic.subject, xp);
  } catch (error) {
    if (powerup) await returnPowerup(powerup);
    throw error;
  }
  if (!awarded && powerup) await returnPowerup(powerup);

  const session = getLessonSession(lessonId);
  if (session) saveLessonSession({ ...session, phase: 'complete' });

  const milestones: MilestoneAward[] = [];
  if (awarded) {
    void logLearningEvent('LESSON_COMPLETED', { topicId: found.topic.id, lessonId, data: { via, xp } });
    await grantPowerup('lesson', lessonId, 1.5);
    const milestone = await awardTopicMilestone(found.topic.id);
    if (milestone) milestones.push(milestone);
  }
  touchClock();
  return { awarded, xp: awarded ? xp : 0, milestones };
}

// ─── Quizzes, reviews and Apex runs ──────────────────────────────────

export type QuizSubmission = {
  kind: AttemptKind;
  mode: AttemptMode; // how answers are recorded in history
  sessionId: string;
  lessonId?: string;
  topicId?: string;
  courseId?: string;
  questions: Question[];
  answers: Record<string, Answer>;
  recordedIds: ReadonlySet<string>; // already recorded (instant feedback)
  timeSeconds: number;
  feedbackMode: 'instant' | 'submit' | 'timed';
  practice?: boolean;
  customQuiz?: CustomQuizSettings;
};

export type QuizOutcome = {
  attempt: QuizAttempt;
  xp: XpBreakdown;
  xpApplied: number;
  masteredNow: string[]; // concept names newly mastered
  milestones: MilestoneAward[];
  lessonCompleted: LessonFinish | null; // mastery check passed
  dueRecalled: number;
};

function newlyMastered(before: MemoryModel, after: MemoryModel, keys: Set<string>) {
  const out: string[] = [];
  for (const key of keys) {
    const now = after.concepts.get(key);
    const was = before.concepts.get(key);
    if (now?.state === 'mastered' && was?.state !== 'mastered') out.push(key);
  }
  return out;
}

export async function submitQuiz(submission: QuizSubmission): Promise<QuizOutcome> {
  const { questions, answers, sessionId } = submission;
  const at = Date.now();
  const before = currentMemoryModel(at, sessionId);

  // 1. Learning outcome: record every answered question not yet recorded.
  const pending = questions.filter(
    (question) => !submission.recordedIds.has(question.id) && isAnswerComplete(question, answers[question.id])
  );
  await recordQuestionAttempts(
    pending.map((question) => attemptFor(question, isAnswerCorrect(question, answers[question.id]), submission.mode, sessionId, at))
  );

  const answered = questions.filter((question) => isAnswerComplete(question, answers[question.id]));
  const correctQuestions = answered.filter((question) => isAnswerCorrect(question, answers[question.id]));
  const wrongQuestions = answered.filter((question) => !isAnswerCorrect(question, answers[question.id]));
  const total = questions.length;
  const percentage = total > 0 ? Math.round((correctQuestions.length / total) * 100) : 0;
  const earnsPowerup = answered.length > 0 && !submission.practice
    && (submission.kind === 'lesson' || submission.kind === 'topic' || submission.kind === 'mastery-check');
  const powerup = earnsPowerup ? await consumePowerup() : null;

  const after = currentMemoryModel(Date.now());
  const touched = new Set(
    answered
      .map((question) => (question.conceptId && question.topicId ? conceptKey(question.topicId, question.conceptId) : null))
      .filter((key): key is string => Boolean(key))
  );
  const masteredKeys = newlyMastered(before, after, touched);
  const dueRecalled = new Set(
    correctQuestions
      .map((question) => (question.conceptId && question.topicId ? conceptKey(question.topicId, question.conceptId) : null))
      .filter((key): key is string => Boolean(key && before.concepts.get(key)?.due))
  ).size;

  // 2. Reward.
  let xp: XpBreakdown;
  let sourceType: XpSourceType;
  switch (submission.kind) {
    case 'review':
      xp = reviewXp({ recalledDue: dueRecalled, answered: answered.length });
      sourceType = 'review';
      break;
    case 'apex':
      xp = apexXp({ correct: correctQuestions.length, total });
      sourceType = 'apex';
      break;
    default: {
      const kind = submission.practice ? 'practice' : submission.kind === 'topic' ? 'topic' : submission.kind === 'mastery-check' ? 'mastery-check' : 'lesson';
      xp = quizXp({ kind, correct: correctQuestions.length, answered: answered.length, total, multiplier: powerup?.multiplier ?? 1 });
      sourceType = submission.practice ? 'practice' : 'quiz';
    }
  }

  const attempt = await recordQuizAttempt({
    kind: submission.practice ? 'practice' : submission.kind,
    lessonId: submission.lessonId ?? '',
    topicId: submission.topicId ?? questions[0]?.topicId ?? '',
    courseId: submission.courseId ?? questions[0]?.courseId ?? '',
    score: correctQuestions.length,
    total,
    answered: answered.length,
    percentage,
    timeSeconds: Math.max(0, Math.round(submission.timeSeconds)),
    wrongConcepts: Array.from(new Set(wrongQuestions.map((question) => question.concept))),
    wrongQuestionIds: wrongQuestions.map((question) => question.id),
    questionIds: questions.map((question) => question.id),
    answers,
    feedbackMode: submission.feedbackMode,
    customQuiz: submission.customQuiz,
    practice: Boolean(submission.practice),
    xp: { net: xp.net, lines: xp.lines },
    completedAt: Date.now(),
  });

  const label =
    submission.kind === 'review'
      ? 'Review session'
      : submission.kind === 'apex'
        ? 'Apex Challenge'
        : submission.practice
          ? 'Practice'
          : submission.kind === 'topic'
            ? `Topic quiz · ${getTopic(submission.topicId)?.title ?? ''}`
            : `Quiz · ${findLesson(submission.lessonId)?.lesson.title ?? ''}`;
  const xpApplied = answered.length > 0 ? await awardXp({ sourceType, sourceId: attempt.id, amount: xp, label }) : 0;
  if (earnsPowerup) await grantPowerup('quiz', attempt.id, 1.5);

  const milestones: MilestoneAward[] = [];
  for (const key of masteredKeys) {
    const entry = getConceptEntry(key);
    if (!entry || !isTrackableConcept(entry.concept)) continue;
    const sourceId = `concept-mastered:${key}`;
    if (hasAward(`milestone:${sourceId}`)) continue;
    const gained = await awardXp({
      sourceType: 'milestone',
      sourceId,
      amount: milestoneXp('conceptMastered'),
      label: `Mastered · ${entry.concept.name}`,
    });
    if (gained > 0) milestones.push({ label: `Mastered · ${entry.concept.name}`, xp: gained });
    void logLearningEvent('CONCEPT_MASTERED', { topicId: entry.topic.id, lessonId: entry.lesson.id, refId: key });
  }

  // Mastery check: proving a lesson you already know completes it.
  let lessonCompleted: LessonFinish | null = null;
  if (submission.kind === 'mastery-check' && submission.lessonId && percentage >= XP_RULES.masteryCheckPercent) {
    lessonCompleted = await finishLesson(submission.lessonId, 'mastery-check');
    milestones.push(...lessonCompleted.milestones);
  }

  // 3. Timeline.
  const eventType =
    submission.kind === 'review'
      ? 'REVIEW_COMPLETED'
      : submission.kind === 'apex'
        ? 'APEX_CHALLENGE_COMPLETED'
        : 'QUIZ_COMPLETED';
  void logLearningEvent(eventType, {
    topicId: attempt.topicId || null,
    lessonId: attempt.lessonId || null,
    refId: attempt.id,
    data: { kind: attempt.kind, score: attempt.score, total, percentage, xp: xp.net },
  });

  if (attempt.kind === 'apex' && !attempt.practice) {
    try {
      const attemptSynced = await syncQuizAttemptToCloud(attempt);
      if (attemptSynced) await awardApexCoins('apex_challenge', attempt.id);
    } catch (error) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('Could not award Apex Coins for Apex Challenge completion.', error);
    }
  }

  touchClock();
  return {
    attempt,
    xp,
    xpApplied,
    masteredNow: masteredKeys.map((key) => getConceptEntry(key)?.concept.name ?? key),
    milestones,
    lessonCompleted,
    dueRecalled,
  };
}

export function logSessionStart(kind: 'quiz' | 'review' | 'apex', fields: { topicId?: string; lessonId?: string; refId?: string; data?: Record<string, unknown> }) {
  const type = kind === 'review' ? 'REVIEW_STARTED' : kind === 'apex' ? 'APEX_CHALLENGE_STARTED' : 'QUIZ_STARTED';
  void logLearningEvent(type, {
    topicId: fields.topicId ?? null,
    lessonId: fields.lessonId ?? null,
    refId: fields.refId ?? null,
    data: fields.data ?? null,
  });
}
