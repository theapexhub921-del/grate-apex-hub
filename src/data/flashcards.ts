// Lesson flashcards, as in the original app: spaced repetition like Anki. See
// the term, say the meaning out loud, flip, then rate it — Again, Hard, Good
// or Easy. The easier a card is, the longer it waits before it comes back.
// Cards come from the lesson's own key words (term blocks and the tappable
// words in its text). Schedules are kept on this device. The scheduling and
// card extraction are pure, for tests.
import { parseRich, plainText } from '@/data/legacy-questions';

export type Rating = 'again' | 'hard' | 'good' | 'easy';
export type CardState = { due: number; interval: number; ease: number; reps: number; lapses: number; learning: boolean; last: Rating };
export type Flashcard = { id: string; front: string; back: string };

const MIN = 60_000;
const DAY = 86_400_000;

/** The next schedule for a card after a rating (simplified SM-2, Anki's steps). */
export function rateCard(state: CardState | undefined, rating: Rating, now: number): CardState {
  const base: CardState = state ?? { due: now, interval: 0, ease: 2.5, reps: 0, lapses: 0, learning: true, last: rating };
  const ease = Math.max(1.3, base.ease + (rating === 'again' ? -0.2 : rating === 'hard' ? -0.15 : rating === 'easy' ? 0.15 : 0));
  if (base.learning) {
    if (rating === 'again') return { ...base, ease: state ? ease : base.ease, due: now + MIN, interval: 0, reps: 0, last: rating };
    if (rating === 'hard') return { ...base, due: now + 6 * MIN, reps: base.reps + 1, last: rating };
    if (rating === 'good' && base.reps < 1 && base.lapses === 0) return { ...base, due: now + 10 * MIN, reps: base.reps + 1, last: rating };
    const interval = rating === 'easy' ? 4 : 1;
    return { ...base, ease: rating === 'easy' ? ease : base.ease, interval, due: now + interval * DAY, reps: base.reps + 1, learning: false, last: rating };
  }
  if (rating === 'again') return { ...base, ease, lapses: base.lapses + 1, learning: true, interval: 0, reps: 0, due: now + 10 * MIN, last: rating };
  const interval = Math.max(1, Math.round(rating === 'hard' ? base.interval * 1.2 : rating === 'good' ? base.interval * base.ease : base.interval * base.ease * 1.3));
  return { ...base, ease, interval, due: now + interval * DAY, reps: base.reps + 1, last: rating };
}

/** "1m", "10m", "1d", "4d" — shown under each rating button. */
export function nextLabel(state: CardState | undefined, rating: Rating, now: number) {
  const gap = rateCard(state, rating, now).due - now;
  if (gap < 60 * MIN) return `${Math.max(1, Math.round(gap / MIN))}m`;
  if (gap < DAY) return `${Math.round(gap / (60 * MIN))}h`;
  const days = Math.round(gap / DAY);
  return days >= 30 ? `${Math.round(days / 30)}mo` : `${days}d`;
}

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

type AnyBlock = { k: string; x?: string; items?: unknown[]; name?: string; def?: string; title?: string; blocks?: AnyBlock[]; head?: string[]; rows?: { c: string[] }[] };

/** A lesson's glossary: term blocks and tappable words, once each, A–Z. */
export function glossaryOf(sections: readonly { title: string; blocks: readonly AnyBlock[] }[]): { term: string; meaning: string }[] {
  const out = new Map<string, { term: string; meaning: string }>();
  const add = (term: string, meaning: string) => {
    const clean = term.trim();
    const key = clean.toLowerCase();
    if (clean && meaning.trim() && !out.has(key)) out.set(key, { term: clean, meaning: meaning.trim() });
  };
  const fromRich = (rich: unknown) => {
    if (typeof rich !== 'string') return;
    for (const run of parseRich(rich)) if (run.term) add(run.t, run.term);
  };
  const walk = (blocks: readonly AnyBlock[]) => {
    for (const block of blocks) {
      if (block.k === 'term' && block.name && block.def) add(plainText(block.name), plainText(block.def));
      fromRich(block.x);
      fromRich(block.title);
      block.items?.forEach((item) => {
        if (typeof item === 'string') fromRich(item);
        else if (item && typeof item === 'object' && 'blocks' in item) walk((item as { blocks: AnyBlock[] }).blocks ?? []);
      });
      block.rows?.forEach((row) => row.c.forEach(fromRich));
      if (block.blocks) walk(block.blocks);
    }
  };
  for (const section of sections) {
    fromRich(section.title);
    walk(section.blocks);
  }
  return [...out.values()].sort((a, b) => a.term.localeCompare(b.term));
}

export const cardsFor = (lessonId: string, glossary: readonly { term: string; meaning: string }[]): Flashcard[] =>
  glossary.map((entry) => ({ id: `${lessonId}:${hash(entry.term.toLowerCase())}`, front: entry.term, back: entry.meaning }));

/** New, learning and due counts for a set of cards. */
export function cardCounts(cards: readonly Flashcard[], states: Readonly<Record<string, CardState>>, now: number) {
  let fresh = 0;
  let learning = 0;
  let due = 0;
  for (const card of cards) {
    const state = states[card.id];
    if (!state) fresh++;
    else if (state.learning) learning++;
    else if (state.due <= now) due++;
  }
  return { fresh, learning, due };
}

/** "Study now": cards that are due (learning first, then reviews), then up to 20 new ones. */
export function studyQueue(cards: readonly Flashcard[], states: Readonly<Record<string, CardState>>, now: number, newLimit = 20): Flashcard[] {
  const learning = cards.filter((card) => states[card.id]?.learning && states[card.id].due <= now + 20 * MIN);
  const reviews = cards.filter((card) => states[card.id] && !states[card.id].learning && states[card.id].due <= now).sort((a, b) => states[a.id].due - states[b.id].due);
  const fresh = cards.filter((card) => !states[card.id]).slice(0, newLimit);
  return [...learning, ...reviews, ...fresh];
}
