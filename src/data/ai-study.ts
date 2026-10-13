// "Ask AI" and "AI Flashcards" for every lesson (pure helpers; the network
// call is in src/lib/ai-study-api.ts and the screens are in
// src/components/learning/ai-study.tsx).
//
// A lesson is turned into plain text and sent to /api/ai (api/ai.mjs), which
// asks Gemini 3.1 Flash-Lite. The model is told to stay with the lesson.
import { hash, type Flashcard } from '@/data/flashcards';
import { plainText } from '@/data/legacy-questions';
import type { Lesson } from '@/data/lesson-types';

/** The server accepts at most this much lesson text (api/ai.mjs). */
export const MAX_LESSON_CHARS = 60_000;

// Rich text with its tappable key words written out: <term d="meaning">word</term> → word (meaning).
const plain = (value: string) => plainText(value.replace(/<term\s+d="([^"]*)">([^<]*)<\/term>/g, '$2 ($1)'));

const clip = (value: string) => (value.length > MAX_LESSON_CHARS ? `${value.slice(0, MAX_LESSON_CHARS)}\n[Lesson shortened]` : value);

/** A topic lesson (data/topics) as plain study text. */
export function lessonToText(lesson: Lesson): string {
  const out: string[] = [lesson.title, lesson.description];
  if (lesson.objectives?.length) out.push('Objectives:', ...lesson.objectives.map((item) => `- ${item}`));
  for (const chunk of lesson.chunks) {
    out.push('', `## ${chunk.title}`);
    chunk.paragraphs?.forEach((paragraph) => out.push(paragraph));
    chunk.steps?.forEach((step, i) => out.push(`${i + 1}. ${step.label}${step.detail ? `: ${step.detail}` : ''}`));
    chunk.terms?.forEach((term) => out.push(`${term.term}: ${term.meaning}`));
    if (chunk.table) {
      out.push(chunk.table.columns.join(' | '));
      chunk.table.rows.forEach((row) => out.push(row.join(' | ')));
    }
    chunk.keyPoints?.forEach((point) => out.push(`- ${point}`));
  }
  if (lesson.summary?.length) out.push('', 'Key points to remember:', ...lesson.summary.map((item) => `- ${item}`));
  if (lesson.highYield?.length) out.push('', 'High-yield:', ...lesson.highYield.map((item) => `- ${item}`));
  if (lesson.confusions?.length) out.push('', 'Common confusions:', ...lesson.confusions.map((item) => `- ${item.confusion} → ${item.clarification}`));
  return clip(out.filter((line, i, all) => line !== '' || all[i - 1] !== '').join('\n').trim());
}

// Fields of an original-app lesson block that are not teaching text.
const SKIP = new Set(['k', 'id', 'src', 'href', 'url', 'icon', 'img', 'image', 'fig', 'style', 'tone', 'color', 'v']);

function collect(value: unknown, out: string[], key = '') {
  if (typeof value === 'string') {
    if (SKIP.has(key)) return;
    const text = plain(value).replace(/\s+/g, ' ').trim();
    if (text) out.push(text);
  } else if (Array.isArray(value)) {
    value.forEach((item) => collect(item, out, key));
  } else if (value && typeof value === 'object') {
    for (const [name, item] of Object.entries(value)) collect(item, out, name);
  }
}

type LegacySectionLike = { title: string; kicker?: string; blocks: readonly unknown[] };
type LegacyExtrasLike = {
  mnemonics?: readonly { h: string; lines: readonly string[] }[];
  facts?: readonly { h: string; lines: readonly string[] }[];
  steps?: { title: string; items: readonly { t: string; d: string }[] };
};

/** An original-app lesson (sections of rich blocks, plus its study aids) as plain study text. */
export function legacyToText(title: string, sections: readonly LegacySectionLike[], extras?: LegacyExtrasLike): string {
  const out: string[] = [title];
  for (const section of sections) {
    out.push('', `## ${plain(section.title)}`);
    collect(section.blocks, out);
  }
  const aids = [...(extras?.mnemonics ?? []), ...(extras?.facts ?? [])];
  for (const group of aids) out.push('', plain(group.h), ...group.lines.map((line) => `- ${plain(line)}`));
  if (extras?.steps) out.push('', plain(extras.steps.title), ...extras.steps.items.map((item, i) => `${i + 1}. ${plain(item.t)}: ${plain(item.d)}`));
  return clip(out.join('\n').trim());
}

/** AI flashcards in the shape the flashcard player uses. Same card = same id, so its schedule is kept. */
export function aiCards(lessonId: string, cards: readonly { front: string; back: string }[]): Flashcard[] {
  const seen = new Set<string>();
  const out: Flashcard[] = [];
  for (const card of cards) {
    const front = card.front.trim();
    const back = card.back.trim();
    const id = `ai:${lessonId}:${hash(front.toLowerCase())}`;
    if (!front || !back || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, front, back });
  }
  return out;
}

/** Existing cards plus new ones, without repeating a front. */
export function mergeCards(existing: readonly Flashcard[], added: readonly Flashcard[]): Flashcard[] {
  const have = new Set(existing.map((card) => card.id));
  return [...existing, ...added.filter((card) => !have.has(card.id))];
}

export const AI_CARDS_KEY = (lessonId: string) => `grateapex_ai_cards:${lessonId}`;

/** Reads saved cards back safely (anything unexpected is dropped). */
export function parseSavedCards(raw: string | null): Flashcard[] {
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as unknown;
    if (!Array.isArray(list)) return [];
    return list.filter((card): card is Flashcard => Boolean(card) && typeof card.id === 'string' && typeof card.front === 'string' && typeof card.back === 'string');
  } catch {
    return [];
  }
}
