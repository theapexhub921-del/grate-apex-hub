// The question-selection engine — one reusable layer for every mode.
//
//   scope     lesson | topic | course | subject | curriculum | review |
//             challenge | questions (practise specific questions)
//   filters   due / weak / missed / difficulty / type / concept / usage
//   strategy  random | weighted (default) | targeted (need-only)
//
// Selection never uses a fixed list or a fixed order:
// - Weighted sampling WITHOUT replacement (no repeats within a session),
//   seeded per attempt, so every attempt differs but stays reproducible
//   for debugging (same seed + same history → same questions).
// - Weights come from the learner's memory model: unseen questions,
//   recent misses, due and struggling concepts rise; questions answered
//   correctly recently "rest"; mastered concepts still appear now and then
//   (reinforcement) so nothing is avoided forever.
// - A coverage pass makes sure a quiz samples every concept it can before
//   doubling up, and a spacing pass keeps same-concept questions apart.
// - Option order is shuffled per attempt by the question card, so answer
//   position is never predictable.
// Pure — no React, no storage.
import {
  conceptKeyForItem,
  findLesson,
  getCourseTopics,
  getLessonQuestions,
  getQuestionsByIds,
  getSubjectTopics,
  getTopic,
  getTopicQuestions,
  publishedTopics,
} from '@/data/curriculum';
import type { DifficultyLevel, SubjectId } from '@/data/lesson-types';
import type { ConceptMemory, MemoryModel } from '@/data/learning/memory';
import { isApexEligible, type Question } from '@/data/questions';
import { DAY_MS } from '@/data/learning/time';

export type SelectionScope =
  | { kind: 'lesson'; lessonId: string }
  | { kind: 'topic'; topicId: string; uptoLessonId?: string }
  | { kind: 'course'; courseId: string }
  | { kind: 'subject'; subject: SubjectId }
  | { kind: 'curriculum' }
  | { kind: 'review'; topicId?: string; courseId?: string; conceptKeys?: string[] }
  | { kind: 'challenge'; courseId: string }
  | { kind: 'questions'; questionIds: string[] };

export type SelectionFilters = {
  due?: boolean; // only concepts that are due
  weak?: boolean; // only struggling / last-missed concepts
  missed?: boolean; // only questions last answered wrongly
  difficulty?: DifficultyLevel[];
  types?: Question['type'][];
  conceptKeys?: string[];
  usage?: ('quiz' | 'learn')[];
  apexEligible?: boolean;
  learnedOnly?: boolean; // only concepts the learner has met
};

export type SelectionStrategy = 'random' | 'weighted' | 'targeted';

export type SelectionReason =
  | 'missed' // answered wrongly last time
  | 'due' // its concept is due for review
  | 'weak' // its concept is struggling
  | 'new' // never answered
  | 'cumulative' // from an earlier lesson / the wider topic
  | 'reinforce' // keeping a known concept fresh
  | 'challenge'
  | 'practice';

export type SelectedQuestion = {
  question: Question;
  reason: SelectionReason;
  conceptKey?: string;
};

export type SelectionRequest = {
  scope: SelectionScope;
  filters?: SelectionFilters;
  strategy?: SelectionStrategy;
  size: number;
  seed: string;
  now: number;
  excludeIds?: Iterable<string>;
  // Questions asked in this learner's previous attempt of the same quiz,
  // so a retake meaningfully differs.
  recentIds?: Iterable<string>;
  coverConcepts?: boolean; // default true except for challenge/questions
};

// ─── Seeded randomness ───────────────────────────────────────────────

export function createRng(seed: string) {
  let state = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    state ^= seed.charCodeAt(i);
    state = Math.imul(state, 16777619) >>> 0;
  }
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const random = createRng(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ─── Candidate pools ─────────────────────────────────────────────────

type Candidate = {
  question: Question;
  conceptKey?: string;
  origin: 'primary' | 'cumulative';
};

const isQuizUsage = (question: Question) => question.usage !== 'learn';

function poolFor(scope: SelectionScope): Candidate[] {
  const wrap = (questions: Question[], origin: Candidate['origin'] = 'primary') =>
    questions.map((question) => ({
      question,
      origin,
      conceptKey: conceptKeyForItem(question.id),
    }));

  switch (scope.kind) {
    case 'lesson': {
      const found = findLesson(scope.lessonId);
      if (!found) return [];
      const own = getLessonQuestions(scope.lessonId);
      const earlier = found.topic.lessons
        .slice(0, found.index)
        .flatMap((lesson) => getLessonQuestions(lesson.id).filter(isQuizUsage));
      return [...wrap(own.filter(isQuizUsage)), ...wrap(earlier, 'cumulative'), ...wrap(own.filter((q) => !isQuizUsage(q)), 'cumulative')];
    }
    case 'topic': {
      const topic = getTopic(scope.topicId);
      if (!topic) return [];
      const limit = scope.uptoLessonId
        ? topic.lessons.findIndex((lesson) => lesson.id === scope.uptoLessonId)
        : topic.lessons.length - 1;
      const allowed = new Set(topic.lessons.slice(0, Math.max(0, limit) + 1).map((lesson) => lesson.id));
      return wrap(getTopicQuestions(topic.id).filter((q) => allowed.has(q.lessonId ?? '')));
    }
    case 'course':
    case 'challenge':
      return wrap(getCourseTopics(scope.courseId).flatMap((topic) => getTopicQuestions(topic.id)));
    case 'subject':
      return wrap(getSubjectTopics(scope.subject).flatMap((topic) => getTopicQuestions(topic.id)));
    case 'curriculum':
      return wrap(publishedTopics.flatMap((topic) => getTopicQuestions(topic.id)));
    case 'review': {
      const topics = scope.topicId
        ? [getTopic(scope.topicId)].filter(Boolean)
        : scope.courseId
          ? getCourseTopics(scope.courseId)
          : publishedTopics;
      return wrap(topics.flatMap((topic) => getTopicQuestions(topic!.id)));
    }
    case 'questions':
      return wrap(getQuestionsByIds(scope.questionIds));
  }
}

function passesFilters(
  candidate: Candidate,
  filters: SelectionFilters,
  memory: MemoryModel,
  scope: SelectionScope
): boolean {
  const { question, conceptKey } = candidate;
  const concept = conceptKey ? memory.concepts.get(conceptKey) : undefined;
  const qm = memory.questions.get(question.id);

  if (question.reviewEligible === false && (scope.kind === 'review' || scope.kind === 'challenge')) return false;
  if (filters.usage && !filters.usage.includes(question.usage ?? 'quiz')) return false;
  if (filters.types && !filters.types.includes(question.type)) return false;
  if (filters.difficulty && !filters.difficulty.includes(question.difficulty ?? 'introductory')) return false;
  if (filters.conceptKeys && (!conceptKey || !filters.conceptKeys.includes(conceptKey))) return false;
  if (filters.apexEligible && !isApexEligible(question)) return false;
  if (filters.learnedOnly && !concept) return false;
  if (filters.due && !concept?.due) return false;
  if (filters.weak && !(concept && (concept.state === 'struggling' || concept.lastResult === 'incorrect'))) return false;
  if (filters.missed && !(qm && !qm.lastCorrect)) return false;
  return true;
}

// ─── Weights ─────────────────────────────────────────────────────────

const STATE_WEIGHT: Record<ConceptMemory['state'], number> = {
  new: 1,
  learning: 1.5,
  struggling: 3,
  remembered: 1,
  mastered: 0.5,
};

// Recent accuracy of the learner on this scope's concepts → nudge the
// difficulty mix (adaptive, but never exclusive).
function difficultyBias(candidates: Candidate[], memory: MemoryModel): Record<DifficultyLevel, number> {
  let attempts = 0;
  let correct = 0;
  for (const candidate of candidates) {
    const qm = memory.questions.get(candidate.question.id);
    if (!qm) continue;
    attempts += qm.attempts;
    correct += qm.correct;
  }
  if (attempts < 8) return { introductory: 1, intermediate: 1, advanced: 1 };
  const accuracy = correct / attempts;
  if (accuracy >= 0.8) return { introductory: 0.7, intermediate: 1.1, advanced: 1.6 };
  if (accuracy < 0.5) return { introductory: 1.5, intermediate: 1.1, advanced: 0.7 };
  return { introductory: 1, intermediate: 1, advanced: 1 };
}

function weigh(
  candidate: Candidate,
  memory: MemoryModel,
  request: SelectionRequest,
  recent: Set<string>,
  bias: Record<DifficultyLevel, number>
): { weight: number; reason: SelectionReason } {
  const { question, conceptKey } = candidate;
  const qm = memory.questions.get(question.id);
  const concept = conceptKey ? memory.concepts.get(conceptKey) : undefined;
  const scope = request.scope.kind;
  const strategy = request.strategy ?? 'weighted';

  if (scope === 'questions') return { weight: 1, reason: 'practice' };
  if (strategy === 'random') return { weight: 1, reason: scope === 'challenge' ? 'challenge' : 'new' };

  let weight = 1;
  let reason: SelectionReason = scope === 'challenge' ? 'challenge' : candidate.origin === 'cumulative' ? 'cumulative' : 'reinforce';

  if (!qm) {
    weight *= scope === 'review' ? 1.2 : scope === 'challenge' ? 1 : 3;
    if (reason === 'reinforce') reason = 'new';
  } else if (!qm.lastCorrect) {
    weight *= 4 + Math.min(3, qm.wrongCount);
    reason = 'missed';
  } else if (request.now < qm.restUntil) {
    weight *= 0.15;
  }

  if (concept) {
    weight *= STATE_WEIGHT[concept.state];
    if (concept.due) {
      const overdue = concept.dueAt === null ? 0 : (request.now - concept.dueAt) / DAY_MS;
      weight *= 2 + Math.min(3, overdue / Math.max(1, concept.intervalDays));
      if (reason !== 'missed') reason = 'due';
    } else if (concept.state === 'struggling' && reason !== 'missed') {
      reason = 'weak';
    }
  } else if (scope === 'review') {
    // Never met in a lesson: not review material.
    weight *= 0.05;
  }

  if (candidate.origin === 'cumulative') weight *= scope === 'lesson' ? 0.6 : 1;
  if (recent.has(question.id)) weight *= 0.2;
  weight *= bias[question.difficulty ?? 'introductory'];

  if (strategy === 'targeted' && !(reason === 'missed' || reason === 'due' || reason === 'weak')) {
    weight *= 0.05;
  }

  return { weight: Math.max(weight, 0.0001), reason };
}

// ─── Selection ───────────────────────────────────────────────────────

export function selectQuestions(request: SelectionRequest, memory: MemoryModel): SelectedQuestion[] {
  const filters = request.filters ?? {};
  const exclude = new Set(request.excludeIds ?? []);
  const recent = new Set(request.recentIds ?? []);
  const seen = new Set<string>();

  const candidates = poolFor(request.scope).filter((candidate) => {
    if (seen.has(candidate.question.id) || exclude.has(candidate.question.id)) return false;
    seen.add(candidate.question.id);
    return passesFilters(candidate, filters, memory, request.scope);
  });

  const size = Math.max(0, Math.min(request.size, candidates.length));
  if (size === 0) return [];

  if (request.scope.kind === 'questions') {
    return seededShuffle(candidates, `${request.seed}:practice`).map((candidate) => ({
      question: candidate.question,
      reason: 'practice',
      conceptKey: candidate.conceptKey,
    }));
  }

  const random = createRng(`${request.seed}:keys`);
  const bias = difficultyBias(candidates, memory);
  const keyed = candidates.map((candidate) => {
    const { weight, reason } = weigh(candidate, memory, request, recent, bias);
    // Efraimidis–Spirakis: key = u^(1/w); highest keys win.
    const key = Math.pow(random(), 1 / weight);
    return { candidate, weight, reason, key };
  });
  keyed.sort((a, b) => b.key - a.key);

  const cover = request.coverConcepts ?? request.scope.kind !== 'challenge';
  const chosen: typeof keyed = [];
  const chosenIds = new Set<string>();

  if (cover) {
    // One question per concept first (best key per concept).
    const firstByConcept = new Map<string, (typeof keyed)[number]>();
    for (const item of keyed) {
      const key = item.candidate.conceptKey ?? item.candidate.question.id;
      if (!firstByConcept.has(key)) firstByConcept.set(key, item);
    }
    const primaryFirst = Array.from(firstByConcept.values()).sort(
      (a, b) =>
        Number(b.candidate.origin === 'primary') - Number(a.candidate.origin === 'primary') || b.key - a.key
    );
    for (const item of primaryFirst) {
      if (chosen.length >= size) break;
      chosen.push(item);
      chosenIds.add(item.candidate.question.id);
    }
  }

  const conceptCount = new Map<string, number>();
  for (const item of chosen) {
    const key = item.candidate.conceptKey ?? '';
    conceptCount.set(key, (conceptCount.get(key) ?? 0) + 1);
  }
  const distinctConcepts = new Set(keyed.map((item) => item.candidate.conceptKey ?? item.candidate.question.id)).size;
  const perConceptCap = Math.max(2, Math.ceil(size / Math.max(1, distinctConcepts)) + 1);

  for (const pass of [true, false]) {
    for (const item of keyed) {
      if (chosen.length >= size) break;
      if (chosenIds.has(item.candidate.question.id)) continue;
      const key = item.candidate.conceptKey ?? '';
      if (pass && (conceptCount.get(key) ?? 0) >= perConceptCap) continue;
      chosen.push(item);
      chosenIds.add(item.candidate.question.id);
      conceptCount.set(key, (conceptCount.get(key) ?? 0) + 1);
    }
  }

  const ordered = spaceOutConcepts(
    seededShuffle(chosen, `${request.seed}:order`),
    (item) => item.candidate.conceptKey ?? item.candidate.question.id
  );

  // Open gently: avoid starting a quiz on a hard question when an easier
  // one is available.
  if (request.scope.kind !== 'challenge' && ordered.length > 1 && ordered[0].candidate.question.difficulty === 'advanced') {
    const swap = ordered.findIndex((item) => item.candidate.question.difficulty !== 'advanced');
    if (swap > 0) [ordered[0], ordered[swap]] = [ordered[swap], ordered[0]];
  }

  return ordered.map((item) => ({
    question: item.candidate.question,
    reason: item.reason,
    conceptKey: item.candidate.conceptKey,
  }));
}

// Greedy pass: avoid two questions on the same concept back-to-back
// (interleaving) when another order is possible.
export function spaceOutConcepts<T>(items: T[], keyOf: (item: T) => string): T[] {
  const remaining = [...items];
  const out: T[] = [];
  while (remaining.length > 0) {
    const lastKey = out.length > 0 ? keyOf(out[out.length - 1]) : null;
    const index = remaining.findIndex((item) => keyOf(item) !== lastKey);
    out.push(...remaining.splice(index >= 0 ? index : 0, 1));
  }
  return out;
}

// How many questions a lesson quiz will ask (its lesson bank, topped up
// from earlier lessons of the topic).
export function plannedQuizSize(scope: SelectionScope, target: number) {
  return Math.min(target, poolFor(scope).filter((candidate) => isQuizUsage(candidate.question) || scope.kind === 'lesson').length);
}

export function poolSize(scope: SelectionScope) {
  return poolFor(scope).length;
}
