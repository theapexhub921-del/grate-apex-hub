// "What should I do next?" — derived from real learning state, never
// hard-coded. Used by Home, Learn and topic pages.
//
//   lesson left half-way          → Continue lesson
//   concepts recently failed      → Review weak concepts
//   reviews due                   → Review now (a big backlog outranks
//                                   new learning)
//   lesson done, quiz not taken   → Take the quiz
//   last quiz below the pass mark → Retake / practise
//   otherwise                     → Start the next lesson / next topic
//   everything done, nothing due  → Apex Challenge
// Pure — no React, no storage.
import type { Href } from 'expo-router';

import { getCourseInfo, getCourseTopics, getTopic, publishedTopics } from '@/data/curriculum';
import { describeAgo } from '@/data/learning/time';
import { dueConcepts, weakConcepts } from '@/data/learning/memory';
import { type LearningInputs, topicProgress, type TopicProgress } from '@/data/learning/progress-model';
import { XP_RULES } from '@/data/learning/xp-rules';
import { routes } from '@/lib/routes';

export type NextActionKind =
  | 'resume-lesson'
  | 'review-weak'
  | 'review-due'
  | 'take-quiz'
  | 'retake-quiz'
  | 'start-lesson'
  | 'next-topic'
  | 'apex'
  | 'explore-learn';

export type NextAction = {
  id: string;
  kind: NextActionKind;
  title: string;
  detail: string;
  cta: string;
  href: Href;
  priority: number;
  topicId?: string;
  lessonId?: string;
  count?: number;
};

export function getNextActions(
  input: LearningInputs,
  scope: { topicId?: string; courseId?: string } = {}
): NextAction[] {
  const actions: NextAction[] = [];
  const { now } = input;

  const topics = scope.topicId
    ? [getTopic(scope.topicId)].filter((topic): topic is NonNullable<typeof topic> => Boolean(topic))
    : scope.courseId
      ? getCourseTopics(scope.courseId)
      : publishedTopics;
  const progressList: TopicProgress[] = topics.map((topic) => topicProgress(topic, input));
  const inScope = (topicId: string) => topics.some((topic) => topic.id === topicId);

  // 1. A lesson left half-way.
  const sessions = Object.values(input.sessions)
    .filter((session) => session.phase !== 'complete' && input.completedAt[session.lessonId] === undefined)
    .filter((session) => progressList.some((item) => item.lessons.some((lesson) => lesson.lessonId === session.lessonId)))
    .sort((a, b) => b.updatedAt - a.updatedAt);
  for (const session of sessions.slice(0, 1)) {
    const item = progressList.find((p) => p.lessons.some((lesson) => lesson.lessonId === session.lessonId))!;
    const lesson = item.lessons.find((l) => l.lessonId === session.lessonId)!;
    const where = session.phase === 'reading' ? 'the reading summary' : `step ${Math.min(session.position + 1, session.queue.length)} of ${session.queue.length}`;
    actions.push({
      id: `resume:${lesson.lessonId}`,
      kind: 'resume-lesson',
      title: `Continue: ${lesson.lesson.title}`,
      detail: `${item.topic.title} · you stopped at ${where} ${describeAgo(session.updatedAt, now)}.`,
      cta: 'Continue lesson',
      href: routes.lesson(lesson.lessonId),
      priority: 90,
      topicId: item.topic.id,
      lessonId: lesson.lessonId,
    });
  }

  // 2. Weak concepts.
  const weak = weakConcepts(input.memory, 20).filter((concept) => inScope(concept.topicId));
  if (weak.length > 0) {
    const first = weak[0];
    actions.push({
      id: 'review-weak',
      kind: 'review-weak',
      title: weak.length === 1 ? `Strengthen “${first.name}”` : `${weak.length} concepts need attention`,
      detail:
        first.lastReviewedAt !== null
          ? `You struggled with “${first.name}” ${describeAgo(first.lastReviewedAt, now)}.`
          : `You struggled with “${first.name}”.`,
      cta: 'Review weak concepts',
      href: routes.review({ focus: 'weak', topicId: scope.topicId, courseId: scope.courseId }),
      priority: weak.length >= 3 ? 85 : 70,
      count: weak.length,
      topicId: first.topicId,
    });
  }

  // 3. Due reviews.
  const due = dueConcepts(input.memory).filter((concept) => inScope(concept.topicId));
  if (due.length > 0) {
    const topicCounts = new Map<string, number>();
    due.forEach((concept) => topicCounts.set(concept.topicId, (topicCounts.get(concept.topicId) ?? 0) + 1));
    const [topTopicId] = Array.from(topicCounts.entries()).sort((a, b) => b[1] - a[1])[0];
    const topTopic = getTopic(topTopicId);
    const lastRevised = due
      .map((concept) => concept.lastReviewedAt ?? concept.learnedAt)
      .filter((value): value is number => value !== null)
      .sort((a, b) => a - b)[0];
    actions.push({
      id: 'review-due',
      kind: 'review-due',
      title: `${due.length} concept${due.length === 1 ? '' : 's'} due for review`,
      detail: topTopic
        ? `${topTopic.title} is due${lastRevised ? ` — last revised ${describeAgo(lastRevised, now)}` : ''}.`
        : 'Spaced review keeps what you learned from fading.',
      cta: 'Review now',
      href: routes.review({ focus: 'due', topicId: scope.topicId, courseId: scope.courseId }),
      priority: due.length >= 8 ? 88 : due.length >= 3 ? 75 : 60,
      count: due.length,
      topicId: topTopicId,
    });
  }

  for (const item of progressList) {
    // 4. Lesson completed but its quiz never taken.
    const untested = item.lessons.find((lesson) => lesson.completedAt !== null && lesson.quizAttempts === 0);
    if (untested) {
      actions.push({
        id: `quiz:${untested.lessonId}`,
        kind: 'take-quiz',
        title: `Quiz: ${untested.lesson.title}`,
        detail: `You completed this lesson — test it while it is fresh.`,
        cta: 'Take the quiz',
        href: routes.lessonQuiz(untested.lessonId),
        priority: 72,
        topicId: item.topic.id,
        lessonId: untested.lessonId,
      });
    }

    // 5. Last quiz below the pass mark.
    const failed = item.lessons.find(
      (lesson) => lesson.lastQuizPercent !== null && lesson.lastQuizPercent < XP_RULES.passPercent && lesson.status !== 'quiz-passed'
    );
    if (failed) {
      actions.push({
        id: `retake:${failed.lessonId}`,
        kind: 'retake-quiz',
        title: `Retake: ${failed.lesson.title}`,
        detail: `Your last score was ${failed.lastQuizPercent}%. The pass mark is ${XP_RULES.passPercent}%.`,
        cta: 'Retake quiz',
        href: routes.lessonQuiz(failed.lessonId),
        priority: 64,
        topicId: item.topic.id,
        lessonId: failed.lessonId,
      });
    }
  }

  // 6. Next lesson: continue the most recently active topic first.
  const active = [...progressList]
    .filter((item) => item.nextLesson && item.nextLesson.status === 'not-started')
    .sort((a, b) => (b.lastRevisedAt ?? (b.started > 0 ? 1 : 0)) - (a.lastRevisedAt ?? (a.started > 0 ? 1 : 0)));
  const startedTopic = active.find((item) => item.started > 0) ?? active[0];
  if (startedTopic?.nextLesson) {
    const lesson = startedTopic.nextLesson;
    actions.push({
      id: `start:${lesson.lessonId}`,
      kind: startedTopic.started > 0 ? 'start-lesson' : 'next-topic',
      title: startedTopic.started > 0 ? `Next: ${lesson.lesson.title}` : `Start ${startedTopic.topic.title}`,
      detail: `${startedTopic.topic.title} · lesson ${lesson.index + 1} of ${startedTopic.total}`,
      cta: startedTopic.started > 0 ? 'Start lesson' : 'Begin topic',
      href: routes.lesson(lesson.lessonId),
      priority: 50,
      topicId: startedTopic.topic.id,
      lessonId: lesson.lessonId,
    });
  }

  // 7. Everything done and nothing due.
  if (actions.length === 0) {
    const courseId = scope.courseId ?? topics[0]?.courseId;
    const course = getCourseInfo(courseId);
    actions.push(
      course
        ? {
            id: 'apex',
            kind: 'apex',
            title: 'Nothing due — take on the Apex Challenge',
            detail: `A timed, whole-course mastery run across ${course.title}.`,
            cta: 'Enter Apex Challenge',
            href: routes.apex(course.id),
            priority: 30,
          }
        : {
            id: 'learn',
            kind: 'explore-learn',
            title: 'Choose what to learn',
            detail: 'Pick a subject and topic to begin.',
            cta: 'Go to Study',
            href: routes.learn(),
            priority: 20,
          }
    );
  }

  return actions.sort((a, b) => b.priority - a.priority);
}
