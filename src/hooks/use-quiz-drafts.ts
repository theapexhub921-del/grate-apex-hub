import type { Href } from 'expo-router';
import { useEffect, useState } from 'react';

import { type QuizDraft, watchAllQuizDrafts } from '@/data/quiz-drafts';

// The learner's unfinished quizzes, kept up to date. Empty while signed out or if they cannot be loaded.
export function useQuizDrafts(): QuizDraft[] {
  const [drafts, setDrafts] = useState<QuizDraft[]>([]);
  useEffect(() => watchAllQuizDrafts(setDrafts, () => setDrafts([])), []);
  return drafts;
}

/** The unfinished practice for one lesson of an original course, if there is one. */
export function findLessonPractice(drafts: QuizDraft[], courseId: string, lessonId: string): QuizDraft | undefined {
  return drafts.find((draft) => draft.key === `hb:${courseId}:${lessonId}`);
}

/** The unfinished practice of an original course by its practice key (e.g. `paper-<set id>`, `mock2`, `custom`, `drill`). */
export function findPractice(drafts: QuizDraft[], courseId: string, practiceKey: string): QuizDraft | undefined {
  return drafts.find((draft) => draft.key === `hb:${courseId}:${practiceKey}`);
}

/** The link that reopens an unfinished quiz exactly where it was left. */
export function resumeHref(draft: QuizDraft): Href {
  return `${draft.path ?? '/learn/quiz'}?${draft.query}&continue=1` as Href;
}

/** "Question 12 of 75" for a saved quiz. */
export function resumeLabel(draft: QuizDraft): string {
  return `Question ${Math.min(draft.index + 1, draft.itemIds.length)} of ${draft.itemIds.length}`;
}
