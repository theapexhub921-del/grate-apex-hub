// Explore → this week's picks, refreshed every Monday so Explore never goes
// stale. Medical concepts and Connections come from the course's own lessons
// (lecture material in content/, never invented here): mechanism, pathway and
// regulation sections become concepts, clinical sections become connections.
// The choice is fixed for the week (Monday 00:00 local) and changes the next.
// Pure, for tests (data/explore.ts stays independent of the course modules).
import { publishedTopics } from '@/data/curriculum';
import type { ExploreItem } from '@/data/explore';
import type { LessonChunk } from '@/data/lesson-types';

/** Monday 00:00 (local) of the week containing `time`. */
export function mondayOf(time = Date.now()) {
  const d = new Date(time);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

export const mondayKey = (time = Date.now()) => {
  const d = mondayOf(time);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

const CONCEPT_KINDS = new Set<LessonChunk['kind']>(['mechanism', 'pathway', 'regulation']);

/** Lecture text without its slide/page pointers ("(slide 12)"), which only make sense inside the lesson. */
const withoutRefs = (text: string) => text.replace(/\s*\((?:slides?|pages?|p\.)\s*[\d,–\- ]+\)/gi, '').replace(/\s+/g, ' ').trim();

/** The first sentence or two of a section, for a card. */
function summaryOf(chunk: LessonChunk) {
  const text = withoutRefs(chunk.paragraphs?.[0] ?? chunk.keyPoints?.[0] ?? chunk.steps?.map((step) => step.label).join(' → ') ?? '');
  if (text.length <= 220) return text;
  const cut = text.slice(0, 220);
  const end = cut.lastIndexOf('. ');
  return end > 80 ? cut.slice(0, end + 1) : `${cut.trimEnd()}…`;
}

type Candidate = { item: ExploreItem; topicId: string };

function candidates(): Candidate[] {
  const out: Candidate[] = [];
  for (const topic of publishedTopics) {
    for (const lesson of topic.lessons) {
      lesson.chunks.forEach((chunk, index) => {
        const kind = chunk.kind === 'clinical' ? 'connection' : CONCEPT_KINDS.has(chunk.kind) ? 'concept' : null;
        const summary = summaryOf(chunk);
        if (!kind || !summary) return;
        const steps = chunk.steps?.length ? chunk.steps.slice(0, 5).map((step) => ({ label: withoutRefs(step.label), detail: withoutRefs(step.detail ?? '') })) : undefined;
        out.push({
          topicId: topic.id,
          item: {
            id: `weekly-${kind}-${lesson.id}-${index}`,
            category: kind,
            topic: topic.title,
            title: chunk.title,
            summary,
            basicIdea: withoutRefs((chunk.paragraphs ?? chunk.keyPoints ?? [summary]).slice(0, 2).join(' ')),
            whyItMatters: chunk.keyPoints?.[0] && withoutRefs(chunk.keyPoints[0]) !== summary ? withoutRefs(chunk.keyPoints[0]) : undefined,
            provenance: { status: 'reviewed', note: 'From your course lessons (lecture material).' },
            sources: [],
            publishedAt: mondayKey(),
            featured: false,
            tags: [topic.subject],
            action: { label: `Open the lesson: ${lesson.title}`, href: `/learn/lesson?lesson=${encodeURIComponent(lesson.id)}` },
            connectionSteps: kind === 'connection' ? steps : undefined,
          },
        });
      });
    }
  }
  return out;
}

/** This week's course concepts and connections: `count` of each, from different topics where possible. */
export function weeklyCoursePicks(time = Date.now(), count = 3) {
  const week = mondayKey(time);
  const all = candidates();
  const pick = (category: 'concept' | 'connection') => {
    const ranked = all.filter((entry) => entry.item.category === category).sort((a, b) => hash(`${week}|${a.item.id}`) - hash(`${week}|${b.item.id}`));
    const chosen: ExploreItem[] = [];
    const topics = new Set<string>();
    for (const entry of ranked) {
      if (chosen.length >= count) break;
      if (topics.has(entry.topicId) && ranked.some((other) => !topics.has(other.topicId) && !chosen.includes(other.item))) continue;
      topics.add(entry.topicId);
      chosen.push({ ...entry.item, publishedAt: week });
    }
    return chosen;
  };
  return { week, concepts: pick('concept'), connections: pick('connection') };
}
