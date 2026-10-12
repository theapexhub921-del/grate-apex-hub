// Course practice modes, from the original app (in this app's look):
//   practice   the whole course, mixed question types (20)
//   lesson     a lesson's own questions (15)
//   set        one of the course's quizzes (30), or a whole paper as an exam
//   apex       the Apex Challenge (30 questions, 10 seconds each)
//   review     spaced review: due questions or last time's mistakes (20)
//   mock       Predicted test N: a 70-question mock exam, answers at the end
//   drill      Timed drill: rapid fire, a countdown on every question (20 × 15 s)
//   prepost    Pre-test / post-test: 10 questions before studying, 10 different ones after
//   custom     Custom quiz: chosen lessons or sets, size, timer and feedback
// Pure, for tests.
import { APEX } from '@/data/learning/apex';

export type CustomSettings = { lessons: string[]; sets: string[]; count: number; seconds?: number; feedback: 'instant' | 'submit' };
export type PracticeMode =
  | { kind: 'practice' }
  | { kind: 'lesson'; lessonId: string }
  | { kind: 'set'; setId: string; exam: boolean }
  | { kind: 'apex' }
  | { kind: 'review'; which: 'due' | 'missed' }
  | { kind: 'mock'; n: number }
  | { kind: 'drill' }
  | { kind: 'prepost'; phase: 'pre' | 'post' }
  | { kind: 'custom'; custom: CustomSettings };

export const MOCK_TESTS = 5;
export const MOCK_SIZE = 70;
export const DRILL = { questions: 20, seconds: 15 } as const;
export const PREPOST_SIZE = 10;
export const CUSTOM_COUNTS = [10, 20, 30, 50] as const;
export const CUSTOM_SECONDS = [0, 10, 20, 30] as const;

const list = (value: string | undefined) => (value ? value.split(',').map((item) => item.trim()).filter(Boolean) : []);

/** The mode a practice link asks for (unknown values fall back to plain practice). */
export function parsePracticeMode(get: (key: string) => string | undefined): PracticeMode {
  const lesson = get('lesson');
  const set = get('set');
  const mock = Number(get('mock'));
  if (get('apex') === '1') return { kind: 'apex' };
  if (get('review') === 'due' || get('review') === 'missed') return { kind: 'review', which: get('review') as 'due' | 'missed' };
  if (Number.isInteger(mock) && mock >= 1 && mock <= MOCK_TESTS) return { kind: 'mock', n: mock };
  if (get('drill') === '1') return { kind: 'drill' };
  if (get('prepost') === 'pre' || get('prepost') === 'post') return { kind: 'prepost', phase: get('prepost') as 'pre' | 'post' };
  if (get('custom') === '1') {
    const count = Number(get('count'));
    const seconds = Number(get('seconds'));
    return {
      kind: 'custom',
      custom: {
        lessons: list(get('lessons')),
        sets: list(get('sets')),
        count: (CUSTOM_COUNTS as readonly number[]).includes(count) ? count : 20,
        seconds: (CUSTOM_SECONDS as readonly number[]).includes(seconds) && seconds > 0 ? seconds : undefined,
        feedback: get('feedback') === 'submit' ? 'submit' : 'instant',
      },
    };
  }
  if (lesson) return { kind: 'lesson', lessonId: lesson };
  if (set) return { kind: 'set', setId: set, exam: get('exam') === '1' };
  return { kind: 'practice' };
}

export type ModeSettings = {
  /** How many questions (Infinity = the whole source). */
  count: number;
  feedback: 'instant' | 'submit';
  seconds?: number;
  /** Mix in true/false, typing and matching versions (false for exams: questions as written). */
  variants: boolean;
  /** Same questions every time (mock exams), or new ones each attempt. */
  fixed: boolean;
  xp: 'apex' | 'practice';
  /** For the once-a-day XP key. */
  key: string;
};

export function modeSettings(mode: PracticeMode): ModeSettings {
  switch (mode.kind) {
    // Apex: single-answer questions as written, so each answer locks instantly in the arena.
    case 'apex': return { count: APEX.questionsPerRun, feedback: 'instant', seconds: APEX.secondsPerQuestion, variants: false, fixed: false, xp: 'apex', key: 'apex' };
    case 'mock': return { count: MOCK_SIZE, feedback: 'submit', variants: false, fixed: true, xp: 'practice', key: `mock${mode.n}` };
    case 'drill': return { count: DRILL.questions, feedback: 'instant', seconds: DRILL.seconds, variants: true, fixed: false, xp: 'practice', key: 'drill' };
    case 'prepost': return { count: PREPOST_SIZE, feedback: 'submit', variants: false, fixed: false, xp: 'practice', key: mode.phase };
    case 'custom': return { count: mode.custom.count, feedback: mode.custom.feedback, seconds: mode.custom.seconds, variants: true, fixed: false, xp: 'practice', key: 'custom' };
    case 'review': return { count: 20, feedback: 'instant', variants: true, fixed: false, xp: 'practice', key: `review-${mode.which}` };
    case 'set': return mode.exam
      ? { count: Infinity, feedback: 'submit', variants: false, fixed: false, xp: 'practice', key: `paper-${mode.setId}` }
      : { count: 30, feedback: 'instant', variants: true, fixed: false, xp: 'practice', key: mode.setId };
    case 'lesson': return { count: 15, feedback: 'instant', variants: true, fixed: false, xp: 'practice', key: mode.lessonId };
    default: return { count: 20, feedback: 'instant', variants: true, fixed: false, xp: 'practice', key: 'all' };
  }
}

/** The page title for a mode. */
export function modeTitle(mode: PracticeMode, courseName: string, names: { lesson?: string; set?: string } = {}) {
  switch (mode.kind) {
    case 'apex': return `${courseName} · Apex Challenge`;
    case 'mock': return `${courseName} · Predicted test ${mode.n}`;
    case 'drill': return `${courseName} · Timed drill`;
    case 'prepost': return `${courseName} · ${mode.phase === 'pre' ? 'Pre-test' : 'Post-test'}`;
    case 'custom': return `${courseName} · Custom quiz`;
    case 'review': return `${courseName} · ${mode.which === 'due' ? 'Due for review' : 'Fix your mistakes'}`;
    case 'set': return names.set ? `${courseName} · ${names.set}` : `${courseName} · practice`;
    case 'lesson': return names.lesson ? `${names.lesson} · practice` : `${courseName} · practice`;
    default: return `${courseName} · practice`;
  }
}

/** Groups a course's question sets the way the original app labelled them. */
export function setKind(name: string): 'predicted' | 'past' | 'test' | 'quiz' {
  if (/^predicted paper/i.test(name)) return 'predicted';
  if (/^past questions/i.test(name)) return 'past';
  if (/^practice test/i.test(name)) return 'test';
  return 'quiz';
}
