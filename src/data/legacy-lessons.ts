// progress/{uid} is shared with the original GRATEAPEX app (same Firebase
// project). Its `lessons` map holds both apps' entries:
//   - the original app: a NUMBER per old lesson (how many sections were finished)
//   - this app: an object { completedAt, xp } per completed lesson
// These rules keep the two apart: the original app's numbers are never read
// as completions and never overwritten.
//
// Kept free of Firebase imports so it can be tested directly (npm test).

type LessonsMap = Record<string, unknown>;

function asLessonsMap(value: unknown): LessonsMap {
  return value && typeof value === 'object' ? (value as LessonsMap) : {};
}

/** This app's entries in a progress.lessons map (the original app's numbers are skipped). */
export function appLessonEntries(lessons: unknown): [string, unknown][] {
  if (!lessons || typeof lessons !== 'object' || Array.isArray(lessons)) return [];
  return Object.entries(lessons).filter(([, value]) => typeof value !== 'number');
}

/** The lessons map to save: this app's completions added, the original app's numbers untouched. */
export function mergeAppLessons(
  existing: unknown,
  completed: { lessonId: string; xp: number; completedAt?: number }[],
  now = Date.now()
): LessonsMap {
  const current = asLessonsMap(existing);
  const merged: LessonsMap = { ...current };
  for (const lesson of completed) {
    if (typeof current[lesson.lessonId] === 'number') continue;
    merged[lesson.lessonId] = { completedAt: lesson.completedAt || now, xp: lesson.xp };
  }
  return merged;
}
