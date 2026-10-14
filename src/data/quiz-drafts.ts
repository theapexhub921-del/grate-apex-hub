import { onAuthStateChanged } from 'firebase/auth';
import { collection, deleteDoc, doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';

// A quiz the learner has started but not finished. One document per quiz,
// progress/{uid}/quizDrafts/{key}, owner only (firestore.rules). The quiz's details are
// kept as one JSON string so the document stays simple.

export type QuizDraft = {
  key: string; // which quiz this is: its kind and what it covers
  lessonId: string | null;
  title: string;
  query: string; // the quiz link's parameters, so the quiz can be reopened
  path?: string; // which screen the quiz opens on (default /learn/quiz)
  seed: string;
  mode: 'instant' | 'submit';
  itemIds: string[]; // the questions, in order
  index: number; // the question the learner is on
  answers: Record<string, unknown>;
  checked: string[];
  skipped: string[];
  recorded: string[];
  timedOut: string[];
  elapsed?: number; // seconds already spent, so the timer carries on
  savedAt: number;
};

const MAX_DATA = 300000;

function uid(): string {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in to save your quiz.');
  return user.uid;
}

function draftRef(owner: string, key: string) {
  return doc(collection(db, 'progress', owner, 'quizDrafts'), encodeURIComponent(key));
}

function parse(raw: unknown): QuizDraft | null {
  if (typeof raw !== 'string') return null;
  try {
    const value = JSON.parse(raw) as QuizDraft;
    return value && Array.isArray(value.itemIds) ? value : null;
  } catch {
    return null;
  }
}

export async function saveQuizDraft(input: Omit<QuizDraft, 'savedAt'>): Promise<void> {
  const owner = uid();
  const draft: QuizDraft = { ...input, savedAt: Date.now() };
  const data = JSON.stringify(draft);
  if (data.length > MAX_DATA) throw new Error('This quiz is too long to save.');
  await setDoc(draftRef(owner, draft.key), {
    lessonId: draft.lessonId,
    title: draft.title.slice(0, 200),
    data,
    savedAt: serverTimestamp(),
  });
}

export async function getQuizDraft(key: string): Promise<QuizDraft | null> {
  const snap = await getDoc(draftRef(uid(), key));
  return snap.exists() ? parse(snap.data().data) : null;
}

// A quiz belongs to a lesson if it was saved for that lesson, or its link names that lesson.
// A topic quiz is matched by the topic in its link.
type DraftScope = { lessonId?: string; topicId?: string; all?: boolean };

function belongsTo(draft: QuizDraft, scope: DraftScope): boolean {
  if (scope.all) return true;
  const parts = draft.query.split('&');
  if (scope.lessonId) {
    return draft.lessonId === scope.lessonId || parts.includes(`lesson=${encodeURIComponent(scope.lessonId)}`);
  }
  if (scope.topicId) return parts.includes(`topic=${encodeURIComponent(scope.topicId)}`);
  return false;
}

function watchDrafts(
  scope: DraftScope,
  onChange: (drafts: QuizDraft[]) => void,
  onError: (message: string) => void
): () => void {
  let stopCollection: (() => void) | null = null;
  const stopAuth = onAuthStateChanged(auth, (user) => {
    stopCollection?.();
    stopCollection = null;
    if (!user) {
      onChange([]);
      return;
    }
    stopCollection = onSnapshot(
      collection(db, 'progress', user.uid, 'quizDrafts'),
      (snap) => {
        const drafts = snap.docs
          .map((item) => parse(item.data().data))
          .filter((item): item is QuizDraft => item !== null && belongsTo(item, scope))
          .sort((a, b) => b.savedAt - a.savedAt);
        onChange(drafts);
      },
      (problem) => onError(problem.message)
    );
  });
  return () => {
    stopAuth();
    stopCollection?.();
  };
}

/**
 * Keeps up to date the list of unfinished quizzes for one lesson: it calls onChange now, and again
 * whenever one is saved or cleared. Returns a function that stops listening.
 */
export function watchQuizDraftsForLesson(
  lessonId: string,
  onChange: (drafts: QuizDraft[]) => void,
  onError: (message: string) => void
): () => void {
  return watchDrafts({ lessonId }, onChange, onError);
}

/** The same, for the cumulative quiz of one topic. */
export function watchQuizDraftsForTopic(
  topicId: string,
  onChange: (drafts: QuizDraft[]) => void,
  onError: (message: string) => void
): () => void {
  return watchDrafts({ topicId }, onChange, onError);
}

export async function deleteQuizDraft(key: string): Promise<void> {
  await deleteDoc(draftRef(uid(), key));
}

/** Every unfinished quiz of the learner (used to show "Resume" on lesson cards). */
export function watchAllQuizDrafts(
  onChange: (drafts: QuizDraft[]) => void,
  onError: (message: string) => void
): () => void {
  return watchDrafts({ all: true }, onChange, onError);
}
