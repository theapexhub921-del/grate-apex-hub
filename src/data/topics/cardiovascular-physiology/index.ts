// Physiology → Cardiovascular Physiology, assembled from its parts:
//   sources.ts      — slide references, concepts, discrepancies, diagrams
//   lessons.ts      — the nine lessons (reading layer)
//   interactive.ts  — each lesson's interactive layer + reading extras
//   questions.ts    — the topic question bank (quiz layer)
import { contentTopics } from '@/data/content-catalog';
import { buildTopic } from '@/data/topics/build';
import { lessons } from '@/data/topics/cardiovascular-physiology/lessons';
import { questions } from '@/data/topics/cardiovascular-physiology/questions';
import { concepts, diagrams, discrepancies, TOPIC_ID } from '@/data/topics/cardiovascular-physiology/sources';

export const cardiovascularPhysiology = buildTopic({
  id: TOPIC_ID,
  subject: 'physiology',
  courseId: 'physiology-lectures',
  title: 'Cardiovascular Physiology',
  description:
    'The cardiac cycle, heart sounds, cardiac output, haemodynamics, capillaries and oedema, regulation of BP, shock, regional circulations and the ECG.',
  emoji: '🫀',
  source: 'Lectures: Circulation 1–5',
  sourceFileIds: contentTopics.find((topic) => topic.id === TOPIC_ID)?.sourceFileIds ?? [],
  contentVersion: 1,
  concepts,
  lessons,
  questions,
  discrepancies,
  diagrams,
});
