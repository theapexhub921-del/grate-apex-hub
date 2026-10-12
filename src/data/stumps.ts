// Stump a friend — share one quiz question to the community feed; friends
// answer it right on the post.
//
// Stored on the shared Firestore rules with no rules change:
//   posts/{id}             a normal post plus stump: { qid, note }. The body
//                          spells the question out, so the original app (which
//                          doesn't know stumps) still shows a readable post.
//   posts/{id}/replies/*   each answer is a reply carrying stump: { pick, ok }.
//                          Answers are not comments: the comment list hides
//                          them and the comment count doesn't change.
// The question always comes from this app's bank (getQuestion), so the card
// shows the current wording and explanation. Only multiple-choice questions
// can be shared. Answering is also saved in the learner's question history
// (as practice), so it counts as revision. It earns no XP.
//
// Privacy: only the sharer's card lists who got it right or wrong; everyone
// else sees just their own result. (The shared rules let any signed-in learner
// read replies, so this is a screen rule, not a database one.)
import { collection, doc, getDocs, limit, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';

import { blockedLearners, createCommunityPost, myUsername } from '@/data/community';
import { getQuestion } from '@/data/curriculum';
import { recordQuestionAttempts } from '@/data/question-history';
import { type ChoiceQuestion, type Question, stableShuffle } from '@/data/questions';
import { db } from '@/lib/firebase';

export const STUMP_NOTE_MAX = 200;
export const LETTERS = 'ABCDEFGH';

export type StumpAnswer = { userId: string; username: string | null; pick: number; ok: boolean; at: string };

/** Questions that can be shared: multiple choice with a single right answer. */
export function canStump(question: Question | undefined | null): question is ChoiceQuestion {
  return Boolean(question && question.type === 'choice' && question.options.length >= 2 && question.options.length <= LETTERS.length);
}

/** The shared question, or null when it has left the bank or can't be stumped. */
export function stumpQuestion(questionId: string): ChoiceQuestion | null {
  const question = getQuestion(questionId);
  return canStump(question) ? question : null;
}

/**
 * The order options are shown in: the same everywhere this question is shared
 * (so the letters in the post text match the card), and the authored order
 * for True/False-style questions.
 */
export function stumpOptionOrder(question: ChoiceQuestion): number[] {
  return question.fixedOrder ? question.options.map((_, index) => index) : stableShuffle(question.options.length, `stump:${question.id}`);
}

/** The post text: what the original app and reposts show. */
function stumpPostText(question: ChoiceQuestion, note: string) {
  const options = stumpOptionOrder(question).map((index, position) => `${LETTERS[position]}. ${question.options[index]}`);
  const text = [note, `Stump a friend: ${question.prompt}`, options.join('\n'), 'Answer it on GrAte Apex Hub.'].filter(Boolean).join('\n\n');
  return text.slice(0, 2000);
}

/** Shares a question to the community feed. */
export async function createStumpPost(question: ChoiceQuestion, note: string) {
  const cleanNote = note.trim().slice(0, STUMP_NOTE_MAX);
  return createCommunityPost(stumpPostText(question, cleanNote), undefined, null, { qid: question.id, note: cleanNote });
}

/** Everyone's answers to a stump, first answer per learner, oldest first. */
export async function listStumpAnswers(postId: string): Promise<StumpAnswer[]> {
  const [snap, blocked] = await Promise.all([
    getDocs(query(collection(db, 'posts', postId, 'replies'), orderBy('createdAt', 'asc'), limit(300))),
    blockedLearners(),
  ]);
  const seen = new Set<string>();
  const answers: StumpAnswer[] = [];
  for (const item of snap.docs) {
    const d = item.data();
    const userId = String(d.authorUid ?? '');
    if (!d.stump || typeof d.stump.pick !== 'number' || !userId || seen.has(userId) || blocked.has(userId)) continue;
    seen.add(userId);
    answers.push({
      userId,
      username: typeof d.authorName === 'string' ? d.authorName : null,
      pick: d.stump.pick,
      ok: d.stump.ok === true,
      at: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : new Date().toISOString(),
    });
  }
  return answers;
}

/**
 * Saves my answer (pick = the option's index in the question) and returns it.
 * One try each: if I already answered (say, on another copy of the card), that
 * answer is returned and nothing new is saved.
 */
export async function answerStump(postId: string, question: ChoiceQuestion, pick: number): Promise<StumpAnswer> {
  const me = await myUsername();
  const earlier = (await listStumpAnswers(postId)).find((answer) => answer.userId === me.uid);
  if (earlier) return earlier;
  const ok = pick === question.answer;
  await setDoc(doc(collection(db, 'posts', postId, 'replies')), {
    body: 'Answered this Stump a friend question.',
    authorUid: me.uid,
    authorName: me.username,
    createdAt: serverTimestamp(),
    stump: { pick, ok },
  });
  // Counts as revision in the learning engine (no XP).
  void recordQuestionAttempts([
    {
      questionId: question.id,
      topicId: question.topicId ?? '',
      lessonId: question.lessonId ?? '',
      concept: question.concept,
      conceptId: question.conceptId,
      correct: ok,
      attemptedAt: Date.now(),
      mode: 'practice',
    },
  ]).catch(() => undefined);
  return { userId: me.uid, username: me.username, pick, ok, at: new Date().toISOString() };
}
