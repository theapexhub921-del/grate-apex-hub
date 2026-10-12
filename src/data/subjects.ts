import type { Href } from 'expo-router';

import { contentTopics } from '@/data/content-catalog';
import { getSubjectTopics } from '@/data/curriculum';
import type { SubjectId } from '@/data/lesson-types';

// What a learner can currently do in a subject:
//   available      — has published topics (lessons + quizzes)
//   in-preparation — lecture material received, lessons not built yet
//   awaiting       — no lecture material supplied yet
export type SubjectStatus = 'available' | 'in-preparation' | 'awaiting';

export type SubjectInfo = {
  id: SubjectId;
  name: string;
  emoji: string;
  tagline: string;
  href: Href;
};

export const subjects: SubjectInfo[] = [
  {
    id: 'biochemistry',
    name: 'Biochemistry',
    emoji: '🧪',
    tagline: 'The chemistry behind life.',
    href: '/learn/biochemistry',
  },
  {
    id: 'physiology',
    name: 'Physiology',
    emoji: '🫁',
    tagline: 'How the human body functions.',
    href: '/learn/physiology',
  },
  {
    id: 'anatomy',
    name: 'Anatomy',
    emoji: '🦴',
    tagline: 'The structure of the human body.',
    href: '/learn/anatomy',
  },
];

export function getSubjectInfo(subject: SubjectId) {
  return subjects.find((item) => item.id === subject)!;
}

export function getSubjectStatus(subject: SubjectInfo | SubjectId): SubjectStatus {
  const id = typeof subject === 'string' ? subject : subject.id;
  if (getSubjectTopics(id).length > 0) return 'available';
  if (contentTopics.some((topic) => topic.subject === id && topic.status !== 'empty')) return 'in-preparation';
  return 'awaiting';
}

// Short label for places without room for a sentence.
export function getSubjectStatusLabel(status: SubjectStatus, percent: number) {
  if (status === 'awaiting') return 'Awaiting materials';
  if (status === 'in-preparation') return 'Lessons in preparation';
  return `${percent}% complete`;
}
