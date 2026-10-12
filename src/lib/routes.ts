import type { Href } from 'expo-router';

import type { SubjectId } from '@/data/lesson-types';

// Every learning URL in the app is built here.
//
// IDs are always URL-encoded, and a missing ID never produces a broken
// link such as "/learn/lesson?lesson=undefined": the builder falls back
// to a safe parent page instead (and warns in development). Screens must
// not assemble learning URLs by hand.

function enc(value: string) {
  return encodeURIComponent(value);
}

function valid(id: string | null | undefined): id is string {
  return typeof id === 'string' && id.trim() !== '' && id !== 'undefined' && id !== 'null';
}

function fallback(kind: string, href: string): Href {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn(`routes.${kind}: missing id — falling back to ${href}`);
  }
  return href as Href;
}

function query(params: Record<string, string | number | boolean | undefined | null>) {
  const parts = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== false && value !== '')
    .map(([key, value]) => `${enc(key)}=${enc(String(value))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

export const routes = {
  home: () => '/' as Href,
  onboarding: (options: { replay?: boolean } = {}) => `/onboarding${query({ replay: options.replay ? 1 : undefined })}` as Href,
  classSelection: () => '/class-selection' as Href,
  learn: () => '/learn' as Href,
  learnEnvironment: (selection: { classId: string; semester: number }) =>
    `/learn${query({ viewClass: selection.classId, viewSemester: selection.semester })}` as Href,
  progress: () => '/progress' as Href,
  explore: () => '/explore' as Href,

  subject: (subject: SubjectId, selection?: { classId: string; semester: number }) =>
    `/learn/${subject}${query({ viewClass: selection?.classId, viewSemester: selection?.semester })}` as Href,

  /** A learner's profile (your own goes to You). */
  profile: (userId: string | null | undefined) => (valid(userId) ? (('/social/person' + query({ user: userId })) as Href) : ('/profile' as Href)),

  // The original app's courses (HB1), studied in this app (data/legacy-study.ts).
  legacyCourse: (courseId: string | null | undefined, selection?: { classId: string; semester: number }) =>
    valid(courseId)
      ? (`/learn/hb-course${query({ course: courseId, viewClass: selection?.classId, viewSemester: selection?.semester })}` as Href)
      : fallback('legacyCourse', '/learn'),
  legacyLesson: (lessonId: string | null | undefined, section?: number, tab?: 'cards' | 'glossary') =>
    valid(lessonId) ? (`/learn/hb-lesson${query({ lesson: lessonId, section, tab })}` as Href) : fallback('legacyLesson', '/learn'),
  legacyPractice: (options: {
    course: string; lesson?: string; set?: string; apex?: boolean; review?: 'due' | 'missed';
    exam?: boolean; mock?: number; drill?: boolean; prepost?: 'pre' | 'post';
    custom?: { lessons: string[]; sets: string[]; count: number; seconds?: number; feedback: 'instant' | 'submit' };
  }) =>
    valid(options.course)
      ? (`/learn/hb-practice${query({
          course: options.course, lesson: options.lesson, set: options.set, apex: options.apex ? 1 : undefined, review: options.review,
          exam: options.exam ? 1 : undefined, mock: options.mock, drill: options.drill ? 1 : undefined, prepost: options.prepost,
          custom: options.custom ? 1 : undefined, lessons: options.custom?.lessons.join(',') || undefined, sets: options.custom?.sets.join(',') || undefined,
          count: options.custom?.count, seconds: options.custom?.seconds, feedback: options.custom ? options.custom.feedback : undefined,
          attempt: Date.now(),
        })}` as Href)
      : fallback('legacyPractice', '/learn'),

  course: (courseId: string | null | undefined) =>
    valid(courseId) ? (`/learn/course${query({ course: courseId })}` as Href) : fallback('course', '/learn'),

  topic: (topicId: string | null | undefined) =>
    valid(topicId) ? (`/learn/topic${query({ topic: topicId })}` as Href) : fallback('topic', '/learn'),

  lesson: (lessonId: string | null | undefined, options: { layer?: 'learn' | 'read'; restart?: boolean } = {}) =>
    valid(lessonId)
      ? (`/learn/lesson${query({ lesson: lessonId, layer: options.layer, restart: options.restart ? 1 : undefined, t: options.restart ? Date.now() : undefined })}` as Href)
      : fallback('lesson', '/learn'),

  lessonQuiz: (lessonId: string | null | undefined, options: { masteryCheck?: boolean } = {}) =>
    valid(lessonId)
      ? (`/learn/quiz${query({ lesson: lessonId, masteryCheck: options.masteryCheck ? 'true' : undefined, attempt: Date.now() })}` as Href)
      : fallback('lessonQuiz', '/learn'),

  topicQuiz: (topicId: string | null | undefined) =>
    valid(topicId)
      ? (`/learn/quiz${query({ topic: topicId, attempt: Date.now() })}` as Href)
      : fallback('topicQuiz', '/learn'),

  practice: (questionIds: string[], from: { lessonId?: string; topicId?: string } = {}) =>
    questionIds.length > 0
      ? (`/learn/quiz${query({
          practice: questionIds.join(','),
          lesson: valid(from.lessonId) ? from.lessonId : undefined,
          topic: valid(from.topicId) ? from.topicId : undefined,
          attempt: Date.now(),
        })}` as Href)
      : fallback('practice', '/learn'),

  customQuizBuilder: () => '/learn/custom-quiz' as Href,

  customQuiz: (options: { lessonIds: string[]; size: number; feedback: 'instant' | 'submit'; secondsPerQuestion?: number }) =>
    options.lessonIds.length > 0
      ? (`/learn/quiz${query({
          custom: 1,
          lessons: options.lessonIds.join(','),
          size: options.size,
          feedback: options.feedback,
          seconds: options.secondsPerQuestion,
          attempt: Date.now(),
        })}` as Href)
      : fallback('customQuiz', '/learn/custom-quiz'),

  results: (attemptId: string | null | undefined) =>
    valid(attemptId) ? (`/learn/results${query({ attempt: attemptId })}` as Href) : fallback('results', '/progress'),

  review: (
    options: { topicId?: string; courseId?: string; lessonId?: string; focus?: 'mixed' | 'due' | 'weak'; size?: number } = {}
  ) =>
    `/learn/review${query({
      topic: valid(options.topicId) ? options.topicId : undefined,
      course: valid(options.courseId) ? options.courseId : undefined,
      lesson: valid(options.lessonId) ? options.lessonId : undefined,
      focus: options.focus,
      size: options.size,
      t: Date.now(),
    })}` as Href,

  apex: (courseId?: string | null) =>
    `/learn/apex${query({ course: valid(courseId) ? courseId : undefined })}` as Href,
};

// Reads one string value from an expo-router search param.
export function param(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return valid(raw) ? raw : undefined;
}
