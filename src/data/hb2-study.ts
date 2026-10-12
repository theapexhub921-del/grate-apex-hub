// HB2 in the original app's study style (owner request): Anatomy, Physiology
// and Biochemistry are courses like the HB1 ones — lessons as a path, read one
// section at a time with tappable key words and study aids, then practice in
// mixed question types and an Apex Challenge. The material is this app's own
// lessons and question banks (built from the lecture files in content/), so
// nothing is invented here, and lesson and question ids stay the same: XP,
// completions and the spaced-review memory keep working across both views.
// Pure (no React Native, no Firebase), for tests.
import { getLessonQuizBank, getSubjectTopics } from '@/data/curriculum';
import type { Lesson, LessonChunk, LessonChunkKind, SubjectId, Topic } from '@/data/lesson-types';
import type { Question } from '@/data/questions';

/** The same shape as an original course (data/legacy-study.ts), marked with its subject. */
export type LocalCourse = { id: string; name: string; icon: string; desc: string; classId: 'HB2'; semester: 1; gradient: readonly [string, string]; subject: SubjectId };

export const HB2_COURSES: readonly LocalCourse[] = [
  { id: 'hb2-anatomy', name: 'Anatomy', icon: '🦴', desc: 'The structure of the human body: regions, structures and how they relate.', classId: 'HB2', semester: 1, gradient: ['#3b82f6', '#1d4ed8'], subject: 'anatomy' },
  { id: 'hb2-physiology', name: 'Physiology', icon: '🫁', desc: 'How the human body functions, system by system.', classId: 'HB2', semester: 1, gradient: ['#f43f5e', '#b91c3c'], subject: 'physiology' },
  { id: 'hb2-biochemistry', name: 'Biochemistry', icon: '🧪', desc: 'The chemistry behind life: lipids, haem, collagen, coagulation, hormones and inborn errors.', classId: 'HB2', semester: 1, gradient: ['#10b981', '#047857'], subject: 'biochemistry' },
];

export const hb2Course = (id: string | null | undefined) => HB2_COURSES.find((course) => course.id === id) ?? null;

// ── Rich text: this app's plain text in the original mini-markup ──────

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = (text: string) => escape(text).replace(/"/g, '&quot;');

/** Plain text with the section's key words made tappable (first mention of each). */
export function richWithTerms(text: string, terms: readonly { term: string; meaning: string }[], used: Set<string>) {
  let out = escape(text);
  for (const { term, meaning } of terms) {
    const key = term.toLowerCase();
    if (used.has(key) || term.length < 3) continue;
    const safe = escape(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = new RegExp(`(^|[^\\w>])(${safe})(?![\\w<])`, 'i').exec(out);
    if (!match) continue;
    const start = match.index + match[1].length;
    out = `${out.slice(0, start)}<term d="${attr(meaning)}">${match[2]}</term>${out.slice(start + match[2].length)}`;
    used.add(key);
  }
  return out;
}

const KIND_LABEL: Record<LessonChunkKind, string> = {
  overview: 'Overview', definitions: 'Definitions', pathway: 'Pathway', mechanism: 'Mechanism', structure: 'Structure',
  regulation: 'Regulation', comparison: 'Comparison', clinical: 'Clinical link', classification: 'Classification',
};

const NOTE_LABEL = { check: 'Check with your lecturer', clarified: 'Clarified from the textbook', textbook: 'From the textbook', annotation: 'Added to the slides later', supplementary: 'Extra (not in the lecture)', lecturer: 'Your lecturer stresses' } as const;

// Section and block shapes of data/legacy-study.ts (kept structural so this file stays pure).
type Block =
  | { k: 'p'; x: string; lede?: 1 }
  | { k: 'ul'; items: string[]; ol?: 1 }
  | { k: 'table'; head: string[]; rows: { c: string[] }[] }
  | { k: 'term'; name: string; def: string }
  | { k: 'box'; title: string; tone?: string; blocks: Block[] }
  | { k: 'step'; n: string; title: string; tone?: string; blocks?: Block[] };
export type LocalSection = { id: string; title: string; kicker?: string; blocks: Block[] };
export type LocalExtras = { facts?: { h: string; lines: string[] }[] };

function sectionOf(chunk: LessonChunk, index: number, lesson: Lesson): LocalSection {
  const terms = chunk.terms ?? [];
  const used = new Set<string>();
  const blocks: Block[] = [];
  if (index === 0 && lesson.objectives?.length) {
    blocks.push({ k: 'box', title: 'What you’ll learn', tone: 'recall', blocks: [{ k: 'ul', items: lesson.objectives.map(escape) }] });
  }
  for (const paragraph of chunk.paragraphs ?? []) blocks.push({ k: 'p', x: richWithTerms(paragraph, terms, used) });
  chunk.steps?.forEach((step, n) => {
    blocks.push({ k: 'step', n: String(n + 1), title: richWithTerms(step.label, terms, used), blocks: step.detail ? [{ k: 'p', x: richWithTerms(step.detail, terms, used) }] : undefined });
  });
  if (chunk.table) blocks.push({ k: 'table', head: chunk.table.columns.map(escape), rows: chunk.table.rows.map((row) => ({ c: row.map(escape) })) });
  // Key words not already tappable in the text get their own definition rows.
  for (const term of terms) if (!used.has(term.term.toLowerCase())) blocks.push({ k: 'term', name: escape(term.term), def: escape(term.meaning) });
  if (chunk.keyPoints?.length) blocks.push({ k: 'box', title: 'Key points', tone: 'gold', blocks: [{ k: 'ul', items: chunk.keyPoints.map((point) => richWithTerms(point, terms, used)) }] });
  for (const note of chunk.notes ?? []) blocks.push({ k: 'box', title: NOTE_LABEL[note.kind] ?? 'Note', tone: note.kind === 'check' ? 'red' : undefined, blocks: [{ k: 'p', x: escape(note.text) }] });
  const kicker = [chunk.kind ? KIND_LABEL[chunk.kind] : null, chunk.origin === 'textbook' ? 'From the textbook' : null].filter(Boolean).join(' · ');
  return { id: `s${index + 1}`, title: escape(chunk.title), kicker: kicker || undefined, blocks };
}

/** A lesson as the original reader's sections plus its study aids. */
export function lessonBody(lesson: Lesson): { sections: LocalSection[]; extras?: LocalExtras } {
  const facts: { h: string; lines: string[] }[] = [];
  if (lesson.summary?.length) facts.push({ h: 'Key points to remember', lines: lesson.summary.map(escape) });
  if (lesson.highYield?.length) facts.push({ h: 'High-yield for revision', lines: lesson.highYield.map(escape) });
  if (lesson.confusions?.length) facts.push({ h: 'Common confusions', lines: lesson.confusions.map((item) => `<b>${escape(item.confusion)}</b> — ${escape(item.clarification)}`) });
  return { sections: lesson.chunks.map((chunk, index) => sectionOf(chunk, index, lesson)), extras: facts.length ? { facts } : undefined };
}

export type LocalLessonMeta = {
  id: string; course: string; order: number; title: string; sub?: string; icon: string; summary: string; minutes: number;
  sections: { id: string; title: string }[]; qids: string[]; qcount: number; group: string; subject: SubjectId; xp: number;
};

const topicsOf = (course: LocalCourse): Topic[] => getSubjectTopics(course.subject);

/** The course's lessons in course order (topic by topic), with their quiz questions. */
export function hb2Lessons(courseId: string): LocalLessonMeta[] {
  const course = hb2Course(courseId);
  if (!course) return [];
  let order = 0;
  return topicsOf(course).flatMap((topic) =>
    topic.lessons.map((lesson) => {
      const qids = getLessonQuizBank(lesson.id).map((question) => question.id);
      return {
        id: lesson.id,
        course: course.id,
        order: order++,
        title: lesson.title,
        sub: topic.title,
        icon: course.icon,
        summary: escape(lesson.description),
        minutes: lesson.estimatedMinutes ?? Math.max(5, lesson.chunks.length * 3),
        sections: lesson.chunks.map((chunk, index) => ({ id: `s${index + 1}`, title: escape(chunk.title) })),
        qids,
        qcount: qids.length,
        group: topic.title,
        subject: course.subject,
        xp: lesson.xp,
      };
    })
  );
}

export function hb2LessonById(lessonId: string | null | undefined) {
  for (const course of HB2_COURSES) {
    for (const topic of topicsOf(course)) {
      const lesson = topic.lessons.find((item) => item.id === lessonId);
      if (lesson) return { course, topic, lesson, meta: hb2Lessons(course.id).find((item) => item.id === lesson.id)! };
    }
  }
  return null;
}

/** The course's question sets: one per topic, its lessons' quiz questions. */
export function hb2Sets(courseId: string): { id: string; name: string; questions: Question[] }[] {
  const course = hb2Course(courseId);
  if (!course) return [];
  return topicsOf(course)
    .map((topic) => ({ id: topic.id, name: topic.title, questions: topic.lessons.flatMap((lesson) => getLessonQuizBank(lesson.id)) }))
    .filter((set) => set.questions.length > 0);
}

// ── Practice in the original style, from this app's questions ─────────

function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const ORDER_WORDS = /\b(all|none|both|neither) of the (above|following)|^all the above|^none of the above/i;
const short = (text: string) => text.length <= 28 && text.split(/\s+/).length <= 4 && !ORDER_WORDS.test(text) && !/^(true|false|yes|no)$/i.test(text);

/**
 * A practice set mixing question types the way the original app did:
 * questions as written (multiple choice, select-all, type, order, match), plus
 * true/false and type-the-answer versions of some multiple-choice questions
 * and matching rounds of four short answers. The original questions keep their
 * ids (so spaced review counts them); derived ones keep the concept and lesson.
 */
export function buildLocalPractice(source: readonly Question[], count: number, seed: string): Question[] {
  const random = seeded(seed);
  const pool = [...source].sort(() => random() - 0.5).slice(0, count);
  const out: Question[] = [];
  const matchable: (Question & { type: 'choice' })[] = [];
  for (const question of pool) {
    if (question.type === 'choice' && question.options.length >= 3 && !question.fixedOrder && !/\bexcept\b|\bnot\b/i.test(question.prompt)) {
      const answer = question.options[question.answer];
      const roll = random();
      if (roll < 0.15 && short(answer) && !/which of the following/i.test(question.prompt) && !question.prompt.includes('____')) {
        out.push({ ...question, id: `${question.id}:type`, type: 'type', accept: [answer], label: 'Type the answer', reviewEligible: false } as Question);
        continue;
      }
      if (roll < 0.3) {
        const showCorrect = random() < 0.5;
        const wrong = question.options.filter((_, index) => index !== question.answer);
        const shown = showCorrect ? answer : wrong[Math.floor(random() * wrong.length)];
        out.push({ ...question, id: `${question.id}:tf`, type: 'choice', prompt: `True or false? For “${question.prompt}”, the answer is “${shown}”.`, options: ['True', 'False'], answer: showCorrect ? 0 : 1, fixedOrder: true, label: 'True or false', reviewEligible: false } as Question);
        continue;
      }
      if (roll < 0.42 && short(answer) && question.prompt.length <= 140) {
        matchable.push(question);
        continue;
      }
    }
    out.push(question);
  }
  while (matchable.length >= 4) {
    const group: typeof matchable = [];
    while (group.length < 4 && matchable.length) {
      const next = matchable.shift()!;
      if (!group.some((item) => item.options[item.answer] === next.options[next.answer])) group.push(next);
      else out.push(next);
    }
    if (group.length < 4) {
      out.push(...group);
      break;
    }
    out.push({
      id: `match:${group.map((item) => item.id).join('|')}`,
      type: 'match',
      prompt: 'Match each question to its answer.',
      pairs: group.map((item) => ({ left: item.prompt, right: item.options[item.answer] })),
      concept: group[0].concept,
      conceptId: group[0].conceptId,
      topicId: group[0].topicId,
      lessonId: group[0].lessonId,
      subject: group[0].subject,
      usage: 'quiz',
      reviewEligible: false,
      label: 'Matching',
    } as Question);
  }
  out.push(...matchable);
  return out.sort(() => random() - 0.5);
}
