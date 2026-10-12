// Pure helpers for the original app's lessons and questions (no React Native,
// no Firebase), so the tests can check them. Used by data/legacy-study.ts.
import type { Question } from '@/data/questions';

export type BankQuestion = { id: string; q: string; o: string[]; a: number; e: string; t: string; p?: string[]; kind?: 'input'; ans?: string };

// ── Rich text (the original mini-markup: <b> <i> <sub> <sup> <term d="…">) ──

export type Run = { t: string; b?: boolean; i?: boolean; sub?: boolean; sup?: boolean; term?: string };
const unescape = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
export const plainText = (s: string) => unescape(s.replace(/<[^>]+>/g, ''));

export function parseRich(src: string): Run[] {
  const runs: Run[] = [];
  const state = { b: 0, i: 0, sub: 0, sup: 0 };
  let term: string | undefined;
  const re = /<(\/?)(b|i|sub|sup|term)((?:\s+d="[^"]*")?)>|([^<]+)|(<)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const text = m[4] ?? m[5];
    if (text !== undefined) {
      const run: Run = { t: unescape(text) };
      if (state.b) run.b = true;
      if (state.i) run.i = true;
      if (state.sub) run.sub = true;
      if (state.sup) run.sup = true;
      if (term) run.term = term;
      runs.push(run);
    } else {
      const close = m[1] === '/';
      const tag = m[2] as 'b' | 'i' | 'sub' | 'sup' | 'term';
      if (tag === 'term') {
        if (close) term = undefined;
        else {
          const d = /d="([^"]*)"/.exec(m[3] || '');
          term = d ? unescape(d[1]) : undefined;
        }
      } else state[tag] += close ? -1 : 1;
    }
  }
  return runs;
}

/** A deterministic shuffle for a seed (the same list every time for the same seed). */
export function shuffleSeeded<T>(items: readonly T[], seed: string): T[] {
  const random = seeded(seed);
  return [...items].map((item) => ({ item, key: random() })).sort((a, b) => a.key - b.key).map((entry) => entry.item);
}

// ── Original questions as this app's question types ────────────────

const ORDER_WORDS = /\b(all|none|both|neither) of the (above|following)|\b(a|b|c|d) (and|&) (b|c|d|e)\b|^all the above|^none of the above/i;

function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

type Base = { course: string; lessonId?: string; concept: string };

/** The original question, unchanged in meaning: multiple choice, or type-the-answer. */
export function toQuestion(q: BankQuestion, base: Base): Question {
  const common = { id: `legacy:${base.course}:${q.id}`, prompt: plainText(q.q), concept: base.concept || q.t || 'General', explanation: q.e ? plainText(q.e) : undefined, topicId: base.course, lessonId: base.lessonId, usage: 'quiz' as const, reviewEligible: false };
  if (q.kind === 'input' || !q.o?.length || q.a < 0) return { ...common, type: 'type', accept: [String(q.ans ?? '')] };
  const options = q.o.map(plainText);
  const trueFalse = options.length === 2 && /^true$/i.test(options[0]) && /^false$/i.test(options[1]);
  return { ...common, type: 'choice', options, answer: q.a, fixedOrder: trueFalse || options.some((option) => ORDER_WORDS.test(option)) };
}

const short = (text: string) => text.length <= 28 && text.split(/\s+/).length <= 4 && !ORDER_WORDS.test(text) && !/^(true|false|yes|no)$/i.test(text);

/**
 * A practice set from original questions, mixing this app's question types the
 * way the original material allows: multiple choice as written, true/false and
 * type-the-answer versions of some questions, and matching rounds built from
 * short answers. Deterministic for a seed.
 */
export function buildPractice(source: readonly (BankQuestion & { setName?: string })[], base: Omit<Base, 'concept'>, count: number, seed: string): Question[] {
  const random = seeded(seed);
  const pool = [...source].sort(() => random() - 0.5).slice(0, count);
  const out: Question[] = [];
  const matchable: (BankQuestion & { setName?: string })[] = [];
  for (const q of pool) {
    const concept = q.t || q.setName || 'General';
    const original = toQuestion(q, { ...base, concept });
    const roll = random();
    if (original.type === 'choice' && q.o.length >= 3 && !/\bexcept\b|\bnot\b/i.test(q.q)) {
      const answer = plainText(q.o[q.a]);
      if (roll < 0.15 && short(answer) && !/which of the following/i.test(q.q)) {
        out.push({ ...original, id: `${original.id}:type`, type: 'type', accept: [answer], label: 'Type the answer' } as Question);
        continue;
      }
      if (roll < 0.3) {
        const showCorrect = random() < 0.5;
        const wrong = q.o.map(plainText).filter((_, index) => index !== q.a);
        const shown = showCorrect ? answer : wrong[Math.floor(random() * wrong.length)];
        out.push({ ...original, id: `${original.id}:tf`, type: 'choice', prompt: `True or false? For “${plainText(q.q)}”, the answer is “${shown}”.`, options: ['True', 'False'], answer: showCorrect ? 0 : 1, fixedOrder: true, label: 'True or false' } as Question);
        continue;
      }
      if (roll < 0.42 && short(answer) && plainText(q.q).length <= 140) {
        matchable.push(q);
        continue;
      }
    }
    out.push(original);
  }
  // Matching rounds of four short-answer questions (distinct answers); leftovers stay as asked.
  while (matchable.length >= 4) {
    const group: typeof matchable = [];
    while (group.length < 4 && matchable.length) {
      const next = matchable.shift()!;
      if (!group.some((item) => plainText(item.o[item.a]) === plainText(next.o[next.a]))) group.push(next);
      else out.push(toQuestion(next, { ...base, concept: next.t || 'General' }));
    }
    if (group.length < 4) {
      group.forEach((item) => out.push(toQuestion(item, { ...base, concept: item.t || 'General' })));
      break;
    }
    out.push({
      id: `legacy:${base.course}:match:${group.map((item) => item.id).join('-')}`,
      type: 'match',
      prompt: 'Match each question to its answer.',
      pairs: group.map((item) => ({ left: plainText(item.q), right: plainText(item.o[item.a]) })),
      concept: group[0].t || 'General',
      topicId: base.course,
      lessonId: base.lessonId,
      usage: 'quiz',
      reviewEligible: false,
      label: 'Matching',
    });
  }
  matchable.forEach((item) => out.push(toQuestion(item, { ...base, concept: item.t || 'General' })));
  return out.sort(() => random() - 0.5);
}

