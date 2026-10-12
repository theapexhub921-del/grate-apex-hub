// Achievements: every milestone of the original GRATEAPEX app (66, from its
// src/achievements.ts, names and purpose kept) plus this app's own six
// milestones — each with five levels. Pure: no storage, no Firebase, so it can
// be tested directly (npm test). Rewards and saving live in
// data/achievements-store.ts.
//
// Level design: Level 5 is the original milestone's goal. Where the original
// app had a ladder of milestones on the same measure (100 → 250 → 500
// questions…), each one's levels fill the gap above the previous goal, so the
// ladder stays continuous and one step never completes two levels at once.
// Milestones whose goal was "once" (first lesson, studying on 1 January…)
// count repeats: 1–5 times (or years). Progress counts what this app records
// plus what the original app recorded in the shared progress document, so
// legacy students keep their history.

export type AchievementGroup = 'Questions' | 'Streaks' | 'Levels' | 'Skill' | 'Lessons' | 'Mistakes' | 'Habits' | 'Special days' | 'GRATEAPEX';

export type Metric =
  | 'answered' | 'correct' | 'uniqueSeen'
  | 'streakRuns3' | 'longestStreak' | 'studyDays' | 'bestDay'
  | 'level' | 'xp'
  | 'perfectRounds' | 'accuracy80' | 'accuracy90' | 'improved' | 'quizzes' | 'testsDone'
  | 'lessonsStarted' | 'sections' | 'flashcards' | 'examDates'
  | 'fixed'
  | 'comebacks' | 'weekendDays' | 'busyDays' | 'monthsStudied'
  | 'yearsNewYear' | 'yearsValentine' | 'yearsChristmas' | 'yearsNewYearsEve'
  | 'lessonsCompleted' | 'quizzesAced' | 'topicsCompleted' | 'conceptsMastered' | 'reviewDays' | 'apexFinished';

export type AchievementDef = {
  id: string; // the original app's id where there is one
  name: string;
  group: AchievementGroup;
  metric: Metric;
  levels: readonly [number, number, number, number, number];
  /** How a level reads, given its threshold. */
  goal: (n: number) => string;
  /** Present when this app can't measure it yet (only the original app's records count). */
  pending?: string;
};

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en')} ${n === 1 ? one : many}`;
const answer = (n: number) => `Answer ${plural(n, 'question')}`;
const PENDING_TESTS = 'Pre- and post-tests are not in this app yet; only the original app’s tests count.';

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  // ── Questions (original app) ─────────────────────────────────────────────
  { id: 'q1', name: 'First steps', group: 'Questions', metric: 'answered', levels: [1, 5, 10, 25, 50], goal: answer },
  { id: 'q100', name: 'Warming up', group: 'Questions', metric: 'answered', levels: [60, 70, 80, 90, 100], goal: answer },
  { id: 'q250', name: 'Getting serious', group: 'Questions', metric: 'answered', levels: [130, 160, 190, 220, 250], goal: answer },
  { id: 'q500', name: 'Bookworm', group: 'Questions', metric: 'answered', levels: [300, 350, 400, 450, 500], goal: answer },
  { id: 'q1000', name: 'Thousand club', group: 'Questions', metric: 'answered', levels: [600, 700, 800, 900, 1000], goal: answer },
  { id: 'q2500', name: 'Question machine', group: 'Questions', metric: 'answered', levels: [1300, 1600, 1900, 2200, 2500], goal: answer },
  { id: 'q5000', name: 'Living library', group: 'Questions', metric: 'answered', levels: [3000, 3500, 4000, 4500, 5000], goal: answer },
  { id: 'q10000', name: 'Ten thousand strong', group: 'Questions', metric: 'answered', levels: [6000, 7000, 8000, 9000, 10000], goal: answer },
  { id: 'right100', name: 'On the money', group: 'Questions', metric: 'correct', levels: [20, 40, 60, 80, 100], goal: (n) => `Get ${plural(n, 'question')} right` },
  { id: 'right1000', name: 'Brain trust', group: 'Questions', metric: 'correct', levels: [280, 460, 640, 820, 1000], goal: (n) => `Get ${plural(n, 'question')} right` },
  { id: 'fresh500', name: 'Fresh eyes', group: 'Questions', metric: 'uniqueSeen', levels: [100, 200, 300, 400, 500], goal: (n) => `See ${plural(n, 'different question')}` },
  { id: 'fresh1500', name: 'Question hunter', group: 'Questions', metric: 'uniqueSeen', levels: [700, 900, 1100, 1300, 1500], goal: (n) => `See ${plural(n, 'different question')}` },

  // ── Streaks ──────────────────────────────────────────────────────────────
  { id: 's3', name: 'On a roll', group: 'Streaks', metric: 'streakRuns3', levels: [1, 2, 3, 4, 5], goal: (n) => (n === 1 ? 'Study 3 days in a row' : `Have ${n} separate 3-day streaks`) },
  { id: 's7', name: 'Week warrior', group: 'Streaks', metric: 'longestStreak', levels: [3, 4, 5, 6, 7], goal: (n) => `Study ${n} days in a row` },
  { id: 's14', name: 'Fortnight focus', group: 'Streaks', metric: 'longestStreak', levels: [8, 10, 11, 12, 14], goal: (n) => `Study ${n} days in a row` },
  { id: 's30', name: 'Unstoppable', group: 'Streaks', metric: 'longestStreak', levels: [17, 20, 24, 27, 30], goal: (n) => `Study ${n} days in a row` },
  { id: 's60', name: 'Iron habit', group: 'Streaks', metric: 'longestStreak', levels: [36, 42, 48, 54, 60], goal: (n) => `Study ${n} days in a row` },
  { id: 's100', name: 'Centurion', group: 'Streaks', metric: 'longestStreak', levels: [68, 76, 84, 92, 100], goal: (n) => `Study ${n} days in a row` },
  { id: 's365', name: 'Year of grind', group: 'Streaks', metric: 'longestStreak', levels: [150, 200, 250, 300, 365], goal: (n) => `Study ${n} days in a row` },
  { id: 'd10', name: 'Regular', group: 'Streaks', metric: 'studyDays', levels: [2, 4, 6, 8, 10], goal: (n) => `Study on ${plural(n, 'different day')}` },
  { id: 'd50', name: 'Dedicated', group: 'Streaks', metric: 'studyDays', levels: [18, 26, 34, 42, 50], goal: (n) => `Study on ${plural(n, 'different day')}` },
  { id: 'd100', name: 'Hundred-day scholar', group: 'Streaks', metric: 'studyDays', levels: [60, 70, 80, 90, 100], goal: (n) => `Study on ${plural(n, 'different day')}` },
  { id: 'day50', name: 'Power day', group: 'Streaks', metric: 'bestDay', levels: [10, 20, 30, 40, 50], goal: (n) => `${answer(n)} in one day` },
  { id: 'day100', name: 'Marathon day', group: 'Streaks', metric: 'bestDay', levels: [60, 70, 80, 90, 100], goal: (n) => `${answer(n)} in one day` },

  // ── Levels (this app's level: 1 + every 100 XP) ──────────────────────────
  { id: 'l5', name: 'Level 5', group: 'Levels', metric: 'level', levels: [1, 2, 3, 4, 5], goal: (n) => `Reach level ${n}` },
  { id: 'l10', name: 'Level 10', group: 'Levels', metric: 'level', levels: [6, 7, 8, 9, 10], goal: (n) => `Reach level ${n}` },
  { id: 'l15', name: 'Level 15', group: 'Levels', metric: 'level', levels: [11, 12, 13, 14, 15], goal: (n) => `Reach level ${n}` },
  { id: 'l25', name: 'Level 25', group: 'Levels', metric: 'level', levels: [17, 19, 21, 23, 25], goal: (n) => `Reach level ${n}` },
  { id: 'l50', name: 'Level 50', group: 'Levels', metric: 'level', levels: [30, 35, 40, 45, 50], goal: (n) => `Reach level ${n}` },
  { id: 'l75', name: 'Level 75', group: 'Levels', metric: 'level', levels: [55, 60, 65, 70, 75], goal: (n) => `Reach level ${n}` },
  { id: 'l100', name: 'Grandmaster', group: 'Levels', metric: 'level', levels: [80, 85, 90, 95, 100], goal: (n) => `Reach level ${n}` },
  { id: 'xp1k', name: '1,000 XP', group: 'Levels', metric: 'xp', levels: [200, 400, 600, 800, 1000], goal: (n) => `Earn ${plural(n, 'XP', 'XP')}` },
  { id: 'xp10k', name: '10,000 XP', group: 'Levels', metric: 'xp', levels: [2800, 4600, 6400, 8200, 10000], goal: (n) => `Earn ${plural(n, 'XP', 'XP')}` },

  // ── Skill ────────────────────────────────────────────────────────────────
  { id: 'perfect', name: 'Flawless', group: 'Skill', metric: 'perfectRounds', levels: [1, 2, 3, 4, 5], goal: (n) => (n === 1 ? 'Score 100% in a round' : `Score 100% in ${n} rounds`) },
  { id: 'acc80', name: 'Sharpshooter', group: 'Skill', metric: 'accuracy80', levels: [20, 40, 60, 80, 100], goal: (n) => `Keep 80% accuracy over ${plural(n, 'question')}` },
  { id: 'acc90', name: 'Marksman', group: 'Skill', metric: 'accuracy90', levels: [50, 100, 150, 200, 250], goal: (n) => `Keep 90% accuracy over ${plural(n, 'question')}` },
  { id: 'improve', name: 'Level up', group: 'Skill', metric: 'improved', levels: [1, 2, 3, 4, 5], goal: (n) => `Beat your pre-test score in ${plural(n, 'post-test')}`, pending: PENDING_TESTS },
  { id: 'quiz10', name: 'Quiz taker', group: 'Skill', metric: 'quizzes', levels: [2, 4, 6, 8, 10], goal: (n) => `Finish ${plural(n, 'quiz', 'quizzes')}` },
  { id: 'quiz50', name: 'Quiz regular', group: 'Skill', metric: 'quizzes', levels: [18, 26, 34, 42, 50], goal: (n) => `Finish ${plural(n, 'quiz', 'quizzes')}` },
  { id: 'quiz200', name: 'Quiz legend', group: 'Skill', metric: 'quizzes', levels: [80, 110, 140, 170, 200], goal: (n) => `Finish ${plural(n, 'quiz', 'quizzes')}` },
  { id: 'pretest', name: 'Baseline', group: 'Skill', metric: 'testsDone', levels: [1, 2, 3, 4, 5], goal: (n) => `Take ${plural(n, 'pre- or post-test')}`, pending: PENDING_TESTS },

  // ── Lessons ──────────────────────────────────────────────────────────────
  { id: 'les1', name: 'Reader', group: 'Lessons', metric: 'lessonsStarted', levels: [1, 2, 3, 4, 5], goal: (n) => (n === 1 ? 'Start your first lesson' : `Start ${plural(n, 'lesson')}`) },
  { id: 'les10', name: 'Scholar', group: 'Lessons', metric: 'lessonsStarted', levels: [6, 7, 8, 9, 10], goal: (n) => `Start ${plural(n, 'lesson')}` },
  { id: 'les25', name: 'Bookish', group: 'Lessons', metric: 'lessonsStarted', levels: [13, 16, 19, 22, 25], goal: (n) => `Start ${plural(n, 'lesson')}` },
  { id: 'les50', name: 'Professor in training', group: 'Lessons', metric: 'lessonsStarted', levels: [30, 35, 40, 45, 50], goal: (n) => `Start ${plural(n, 'lesson')}` },
  { id: 'sec50', name: 'Section sprinter', group: 'Lessons', metric: 'sections', levels: [10, 20, 30, 40, 50], goal: (n) => `Finish ${plural(n, 'lesson section')}`, pending: 'This app’s lessons are not split into sections; only the original app’s sections count.' },
  { id: 'sec200', name: 'Deep reader', group: 'Lessons', metric: 'sections', levels: [80, 110, 140, 170, 200], goal: (n) => `Finish ${plural(n, 'lesson section')}`, pending: 'This app’s lessons are not split into sections; only the original app’s sections count.' },
  { id: 'fc50', name: 'Card shark', group: 'Lessons', metric: 'flashcards', levels: [10, 20, 30, 40, 50], goal: (n) => `Review ${plural(n, 'flashcard')}`, pending: 'This app does not record flashcard reviews yet; only the original app’s count.' },
  { id: 'fc200', name: 'Flashcard fiend', group: 'Lessons', metric: 'flashcards', levels: [80, 110, 140, 170, 200], goal: (n) => `Review ${plural(n, 'flashcard')}`, pending: 'This app does not record flashcard reviews yet; only the original app’s count.' },
  { id: 'fc500', name: 'Memory palace', group: 'Lessons', metric: 'flashcards', levels: [260, 320, 380, 440, 500], goal: (n) => `Review ${plural(n, 'flashcard')}`, pending: 'This app does not record flashcard reviews yet; only the original app’s count.' },
  { id: 'exam', name: 'Planner', group: 'Lessons', metric: 'examDates', levels: [1, 2, 3, 4, 5], goal: (n) => (n === 1 ? 'Set your exam date' : `Set ${n} exam dates`), pending: 'Exam dates are not in this app yet; the original app keeps one.' },

  // ── Mistakes ─────────────────────────────────────────────────────────────
  { id: 'fix10', name: 'Mistake fixer', group: 'Mistakes', metric: 'fixed', levels: [2, 4, 6, 8, 10], goal: (n) => `Master ${plural(n, 'question')} you got wrong` },
  { id: 'fix50', name: 'Redemption arc', group: 'Mistakes', metric: 'fixed', levels: [18, 26, 34, 42, 50], goal: (n) => `Master ${plural(n, 'question')} you got wrong` },
  { id: 'fix200', name: 'Never wrong twice', group: 'Mistakes', metric: 'fixed', levels: [80, 110, 140, 170, 200], goal: (n) => `Master ${plural(n, 'question')} you got wrong` },
  { id: 'fix500', name: 'Zero weak spots', group: 'Mistakes', metric: 'fixed', levels: [260, 320, 380, 440, 500], goal: (n) => `Master ${plural(n, 'question')} you got wrong` },

  // ── Habits ───────────────────────────────────────────────────────────────
  { id: 'back', name: 'Comeback kid', group: 'Habits', metric: 'comebacks', levels: [1, 2, 3, 4, 5], goal: (n) => (n === 1 ? 'Return to studying after a break of 7+ days' : `Come back after a 7+ day break ${n} times`) },
  { id: 'wknd10', name: 'Weekend warrior', group: 'Habits', metric: 'weekendDays', levels: [2, 4, 6, 8, 10], goal: (n) => `Study on ${plural(n, 'weekend day')}` },
  { id: 'wknd30', name: 'No days off', group: 'Habits', metric: 'weekendDays', levels: [14, 18, 22, 26, 30], goal: (n) => `Study on ${plural(n, 'weekend day')}` },
  { id: 'busy10', name: 'Serious business', group: 'Habits', metric: 'busyDays', levels: [2, 4, 6, 8, 10], goal: (n) => `Answer 20+ questions on ${plural(n, 'different day')}` },
  { id: 'busy30', name: 'Built different', group: 'Habits', metric: 'busyDays', levels: [14, 18, 22, 26, 30], goal: (n) => `Answer 20+ questions on ${plural(n, 'different day')}` },
  { id: 'mon3', name: 'Season ticket', group: 'Habits', metric: 'monthsStudied', levels: [1, 2, 3, 4, 5], goal: (n) => `Study in ${plural(n, 'different month')}` },
  { id: 'mon6', name: 'Half-year hero', group: 'Habits', metric: 'monthsStudied', levels: [6, 7, 8, 10, 12], goal: (n) => `Study in ${plural(n, 'different month')}` },

  // ── Special days (once a year each) ──────────────────────────────────────
  { id: 'ny', name: 'New year, new me', group: 'Special days', metric: 'yearsNewYear', levels: [1, 2, 3, 4, 5], goal: (n) => (n === 1 ? 'Study on 1 January' : `Study on 1 January in ${n} different years`) },
  { id: 'val', name: 'Hopelessly devoted', group: 'Special days', metric: 'yearsValentine', levels: [1, 2, 3, 4, 5], goal: (n) => (n === 1 ? 'Study on 14 February' : `Study on 14 February in ${n} different years`) },
  { id: 'xmas', name: 'Christmas cram', group: 'Special days', metric: 'yearsChristmas', levels: [1, 2, 3, 4, 5], goal: (n) => (n === 1 ? 'Study on 25 December' : `Study on 25 December in ${n} different years`) },
  { id: 'nye', name: 'Last one of the year', group: 'Special days', metric: 'yearsNewYearsEve', levels: [1, 2, 3, 4, 5], goal: (n) => (n === 1 ? 'Study on 31 December' : `Study on 31 December in ${n} different years`) },

  // ── This app's milestones (reconciled from the profile page) ─────────────
  { id: 'first-lesson', name: 'First lesson', group: 'GRATEAPEX', metric: 'lessonsCompleted', levels: [1, 3, 5, 10, 20], goal: (n) => `Complete ${plural(n, 'lesson')}` },
  { id: 'quiz-ace', name: 'Quiz ace', group: 'GRATEAPEX', metric: 'quizzesAced', levels: [1, 3, 5, 10, 20], goal: (n) => `Score 90%+ on ${plural(n, 'quiz', 'quizzes')}` },
  { id: 'topic-complete', name: 'Topic complete', group: 'GRATEAPEX', metric: 'topicsCompleted', levels: [1, 2, 3, 5, 8], goal: (n) => `Finish every lesson in ${plural(n, 'topic')}` },
  { id: 'first-mastery', name: 'First mastery', group: 'GRATEAPEX', metric: 'conceptsMastered', levels: [1, 5, 10, 25, 50], goal: (n) => `Master ${plural(n, 'concept')}` },
  { id: 'consistent-reviewer', name: 'Consistent reviewer', group: 'GRATEAPEX', metric: 'reviewDays', levels: [5, 10, 20, 40, 60], goal: (n) => `Review on ${plural(n, 'different day')}` },
  { id: 'apex-contender', name: 'Apex Challenge', group: 'GRATEAPEX', metric: 'apexFinished', levels: [1, 3, 5, 10, 20], goal: (n) => `Finish ${plural(n, 'Apex Challenge')}` },
];

// ─── Inputs ────────────────────────────────────────────────────────────────

/** What the original app recorded in the shared progress document (see legacyStats). */
export type LegacyStats = {
  answered: number; correct: number; quizzes: number; perfectRounds: number; seen: number;
  lessonsStarted: number; sections: number; flashcards: number; testsDone: number; improved: number;
  fixed: number; examDate: boolean; days: Record<string, number>;
  /** The shared XP total in the cloud document. */
  xp: number;
};

export const NO_LEGACY: LegacyStats = {
  answered: 0, correct: 0, quizzes: 0, perfectRounds: 0, seen: 0, lessonsStarted: 0, sections: 0,
  flashcards: 0, testsDone: 0, improved: 0, fixed: 0, examDate: false, days: {}, xp: 0,
};

const num = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
const record = (value: unknown): Record<string, any> => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, any>) : {});

/** Reads the original app's fields of a progress/{uid} document. Missing fields count as 0. */
export function legacyStats(doc: unknown): LegacyStats {
  const d = record(doc);
  const subjects = Object.values(record(d.subjects)).map(record);
  const tests = Object.values(record(d.tests)).map(record);
  const lessons = Object.values(record(d.lessons)).filter((value) => typeof value === 'number' && Number.isFinite(value)) as number[];
  const days: Record<string, number> = {};
  for (const [key, value] of Object.entries(record(d.days))) if (/^\d{4}-\d{2}-\d{2}$/.test(key) && num(value) > 0) days[key] = num(value);
  return {
    answered: subjects.reduce((n, s) => n + num(s.answered), 0),
    correct: subjects.reduce((n, s) => n + num(s.correct), 0),
    quizzes: subjects.reduce((n, s) => n + num(s.quizzes), 0),
    perfectRounds: subjects.filter((s) => num(s.best) >= 100).length,
    seen: Object.values(record(d.seen)).reduce((n: number, ids) => n + (Array.isArray(ids) ? ids.length : 0), 0),
    lessonsStarted: lessons.filter((n) => n > 0).length,
    sections: lessons.reduce((n, v) => n + Math.max(0, v), 0),
    flashcards: Object.keys(record(d.terms)).length,
    testsDone: tests.filter((t) => t.pre || t.post).length,
    improved: tests.filter((t) => t.pre && t.post && num(t.post.c) / Math.max(1, num(t.post.t)) > num(t.pre.c) / Math.max(1, num(t.pre.t))).length,
    fixed: Object.values(record(d.cards)).filter((c) => record(c).g).length,
    examDate: typeof d.examDate === 'string' && d.examDate.length > 0,
    days,
    xp: Math.max(0, num(d.xp)),
  };
}

/** What this app records (question history, quiz history, progress, memory). */
export type AppStats = {
  answers: readonly { questionId: string; correct: boolean; attemptedAt: number; mode?: string }[];
  quizzes: readonly { kind: string; percentage: number; practice?: boolean; completedAt: number }[];
  xp: number;
  lessonsCompleted: number;
  /** Completion time per completed lesson (for study days). */
  lessonCompletedAt: readonly number[];
  topicsCompleted: number;
  conceptsMastered: number;
};

const DAY = 86_400_000;
const dayKey = (time: number) => {
  const d = new Date(time);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const dayIndex = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / DAY;
};

/** Every measure the achievements use, from both apps' records. */
export function computeMetrics(app: AppStats, legacy: LegacyStats = NO_LEGACY): Record<Metric, number> {
  // XP is one shared number: the device may not have caught up with the cloud yet.
  const xp = Math.max(0, app.xp, legacy.xp);
  // Questions answered per day: this app's answers + the original app's daily counts.
  const perDay = new Map<string, number>(Object.entries(legacy.days));
  for (const item of app.answers) perDay.set(dayKey(item.attemptedAt), (perDay.get(dayKey(item.attemptedAt)) ?? 0) + 1);
  const studied = new Set(perDay.keys());
  for (const time of app.lessonCompletedAt) if (time > 0) studied.add(dayKey(time));
  for (const quiz of app.quizzes) studied.add(dayKey(quiz.completedAt));
  const days = [...studied].sort();
  const indexes = days.map(dayIndex);

  let longest = 0;
  let run = 0;
  let runs3 = 0;
  let comebacks = 0;
  indexes.forEach((day, i) => {
    run = i > 0 && day - indexes[i - 1] === 1 ? run + 1 : 1;
    if (run === 3) runs3 += 1;
    if (i > 0 && day - indexes[i - 1] - 1 >= 7) comebacks += 1;
    longest = Math.max(longest, run);
  });

  const answered = app.answers.length + legacy.answered;
  const correct = app.answers.filter((item) => item.correct).length + legacy.correct;
  const accuracy = answered > 0 ? (correct / answered) * 100 : 0;

  // A mistake is "fixed" when a question answered wrong was later answered right.
  const wrongFirst = new Set<string>();
  const fixed = new Set<string>();
  for (const item of [...app.answers].sort((a, b) => a.attemptedAt - b.attemptedAt)) {
    if (!item.correct) wrongFirst.add(item.questionId);
    else if (wrongFirst.has(item.questionId)) fixed.add(item.questionId);
  }

  const counted = app.quizzes.filter((quiz) => !quiz.practice);
  const years = (monthDay: string) => new Set(days.filter((key) => key.slice(5) === monthDay).map((key) => key.slice(0, 4))).size;
  const reviewDays = new Set(app.answers.filter((item) => item.mode === 'review' || item.mode === 'recall').map((item) => dayKey(item.attemptedAt))).size;

  return {
    answered,
    correct,
    uniqueSeen: new Set(app.answers.map((item) => item.questionId)).size + legacy.seen,
    streakRuns3: runs3,
    longestStreak: longest,
    studyDays: days.length,
    bestDay: Math.max(0, ...perDay.values()),
    level: Math.floor(xp / 100) + 1,
    xp,
    perfectRounds: counted.filter((quiz) => quiz.percentage >= 100).length + legacy.perfectRounds,
    accuracy80: accuracy >= 80 ? answered : 0,
    accuracy90: accuracy >= 90 ? answered : 0,
    improved: legacy.improved,
    quizzes: counted.length + legacy.quizzes,
    testsDone: legacy.testsDone,
    lessonsStarted: app.lessonsCompleted + legacy.lessonsStarted,
    sections: legacy.sections,
    flashcards: legacy.flashcards,
    examDates: legacy.examDate ? 1 : 0,
    fixed: fixed.size + legacy.fixed,
    comebacks,
    weekendDays: days.filter((key) => [0, 6].includes(new Date(dayIndex(key) * DAY).getUTCDay())).length,
    busyDays: [...perDay.values()].filter((count) => count >= 20).length,
    monthsStudied: new Set(days.map((key) => key.slice(0, 7))).size,
    yearsNewYear: years('01-01'),
    yearsValentine: years('02-14'),
    yearsChristmas: years('12-25'),
    yearsNewYearsEve: years('12-31'),
    lessonsCompleted: app.lessonsCompleted,
    quizzesAced: counted.filter((quiz) => (quiz.kind === 'lesson' || quiz.kind === 'topic') && quiz.percentage >= 90).length,
    topicsCompleted: app.topicsCompleted,
    conceptsMastered: app.conceptsMastered,
    reviewDays,
    apexFinished: app.quizzes.filter((quiz) => quiz.kind === 'apex').length,
  };
}

// ─── Evaluation ───────────────────────────────────────────────────────────

export type AchievementState = {
  def: AchievementDef;
  /** 0 = nothing yet; 5 = mastered. */
  level: number;
  value: number;
  /** Threshold of the next level, or null when all five are complete. */
  next: number | null;
  /** 0–1 towards the next level. */
  progress: number;
};

export function levelFor(def: AchievementDef, value: number): number {
  return def.levels.filter((threshold) => value >= threshold).length;
}

export function evaluateAchievements(metrics: Record<Metric, number>): AchievementState[] {
  return ACHIEVEMENTS.map((def) => {
    const value = metrics[def.metric] ?? 0;
    const level = levelFor(def, value);
    const next = level < 5 ? def.levels[level] : null;
    const floor = level > 0 ? def.levels[level - 1] : 0;
    return { def, level, value, next, progress: next === null ? 1 : Math.max(0, Math.min(1, (value - floor) / Math.max(1, next - floor))) };
  });
}

/** Levels reached now that are above what was recorded: [{ id, level }] for each new level, in order. */
export function newLevels(recorded: Readonly<Record<string, number>>, states: readonly AchievementState[]) {
  const fresh: { id: string; level: number }[] = [];
  for (const state of states) {
    for (let level = (recorded[state.def.id] ?? 0) + 1; level <= state.level; level += 1) fresh.push({ id: state.def.id, level });
  }
  return fresh;
}

export function levelTitle(def: AchievementDef, level: number) {
  return `${def.name} · Level ${level}`;
}
