// Anatomy → Upper Limb, assembled from its parts:
//   sources.ts          — slide references, concepts, discrepancies, diagrams
//   lessons.ts          — the six lessons (reading layer)
//   interactive.ts      — each lesson's interactive layer + reading extras
//   questions.ts        — the topic question bank (quiz layer)
//   assertion-reason.ts — 5 Assertion–Reason questions per lesson
import { contentTopics } from '@/data/content-catalog';
import { buildTopic } from '@/data/topics/build';
import { assertionReasonQuestions } from '@/data/topics/upper-limb/assertion-reason';
import { lessons } from '@/data/topics/upper-limb/lessons';
import { questions } from '@/data/topics/upper-limb/questions';
import { concepts, diagrams, discrepancies, TOPIC_ID } from '@/data/topics/upper-limb/sources';

export const upperLimb = buildTopic({
  id: TOPIC_ID,
  subject: 'anatomy',
  courseId: 'anatomy-lectures',
  title: 'Upper Limb',
  description:
    'Comprehensive regional anatomy of the upper limb: osteology, limb bud embryology, joints, pectoral girdle, rotator cuff, axillary spaces, arm, cubital fossa, forearm compartments, anatomical snuffbox, and neurovasculature.',
  emoji: '💪',
  source: 'Lecture: Upper limbs HB (updated)',
  sourceFileIds: contentTopics.find((topic) => topic.id === TOPIC_ID)?.sourceFileIds ?? [],
  contentVersion: 1,
  concepts,
  lessons,
  questions: [...questions, ...assertionReasonQuestions],
  discrepancies,
  diagrams,
});
