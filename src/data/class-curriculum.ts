import { getSubjectTopics } from '@/data/curriculum';
import type { SubjectId } from '@/data/lesson-types';

export const CLASS_IDS = ['HB1', 'HB2', 'HB3', 'MB1', 'MB2', 'MB3'] as const;
export const SEMESTERS = [1, 2] as const;
export const ACADEMIC_TRIAL_DAYS = 7;

export type ClassId = (typeof CLASS_IDS)[number];
export type Semester = (typeof SEMESTERS)[number];
export type ClassSelection = { classId: ClassId; semester: Semester };

const SELECTION_KEY = 'grateapex_academic_selection';
const TRIAL_KEY = 'grateapex_academic_trial';

export function isClassId(value: unknown): value is ClassId {
  return typeof value === 'string' && CLASS_IDS.includes(value as ClassId);
}

export function isSemester(value: unknown): value is Semester {
  return typeof value === 'number' && SEMESTERS.includes(value as Semester);
}

export function makeClassSelection(classId: unknown, semester: unknown): ClassSelection | null {
  return isClassId(classId) && isSemester(semester) ? { classId, semester } : null;
}

export function readClassSelection(userMetadata: unknown): ClassSelection | null {
  if (!userMetadata || typeof userMetadata !== 'object') return null;
  const profile = userMetadata as Record<string, unknown>;
  const saved = profile[SELECTION_KEY];
  if (saved && typeof saved === 'object') {
    const value = saved as Record<string, unknown>;
    const selection = makeClassSelection(value.classId, value.semester);
    if (selection) return selection;
  }
  // The original app's (and the deployed rules') fields: a locked hall + semester.
  if (profile.classLocked === true) return makeClassSelection(profile.hall, profile.semester);
  return null;
}

export function classSelectionMetadata(selection: ClassSelection) {
  return { [SELECTION_KEY]: { classId: selection.classId, semester: selection.semester } };
}

export function classPosition(selection: ClassSelection) {
  return CLASS_IDS.indexOf(selection.classId) * SEMESTERS.length + SEMESTERS.indexOf(selection.semester);
}

export function isClassAhead(target: ClassSelection, current: ClassSelection) {
  return classPosition(target) > classPosition(current);
}

export function isClassBefore(target: ClassSelection, current: ClassSelection) {
  return classPosition(target) < classPosition(current);
}

export function classSelectionAt(position: number): ClassSelection | null {
  if (!Number.isInteger(position) || position < 0 || position >= CLASS_IDS.length * SEMESTERS.length) return null;
  return { classId: CLASS_IDS[Math.floor(position / SEMESTERS.length)], semester: SEMESTERS[position % SEMESTERS.length] };
}

export function subjectsForClass(selection: ClassSelection): SubjectId[] {
  if (selection.classId === 'HB2' && selection.semester === 1) return ['anatomy', 'physiology', 'biochemistry'];
  return [];
}

export function firstClassOffering(subject: SubjectId): ClassSelection | null {
  for (let position = 0; position < CLASS_IDS.length * SEMESTERS.length; position += 1) {
    const selection = classSelectionAt(position);
    if (selection && isSubjectOffered(selection, subject)) return selection;
  }
  return null;
}
export function isSubjectOffered(selection: ClassSelection, subject: SubjectId) {
  return subjectsForClass(selection).includes(subject);
}

export function classLessonIds(selection: ClassSelection) {
  return [...new Set(subjectsForClass(selection).flatMap((subject) => getSubjectTopics(subject).flatMap((topic) => topic.lessons.map((lesson) => lesson.id))))];
}

export function classLessonCompletion(selection: ClassSelection, completedAt: Record<string, number>) {
  const lessonIds = classLessonIds(selection);
  const completed = lessonIds.filter((id) => Boolean(completedAt[id])).length;
  return { completed, total: lessonIds.length, complete: lessonIds.length > 0 && completed === lessonIds.length };
}

/** Find the first class between the learner's selection and a target that is not complete. */
export function firstIncompleteClassBefore(target: ClassSelection, current: ClassSelection, completedAt: Record<string, number>) {
  if (!isClassAhead(target, current)) return null;
  for (let position = classPosition(current); position < classPosition(target); position += 1) {
    const required = classSelectionAt(position);
    if (!required) continue;
    const completion = classLessonCompletion(required, completedAt);
    if (!completion.complete) return { selection: required, ...completion };
  }
  return null;
}

export type AcademicTrial = { startedAt: number; expiresAt: number; active: boolean; used: boolean };
export function readAcademicTrial(userMetadata: unknown, now = Date.now()): AcademicTrial {
  const value = userMetadata && typeof userMetadata === 'object' ? (userMetadata as Record<string, unknown>)[TRIAL_KEY] : null;
  const startedAt = value && typeof value === 'object' && typeof (value as Record<string, unknown>).startedAt === 'number'
    ? (value as Record<string, number>).startedAt
    : 0;
  if (!startedAt) return { startedAt: 0, expiresAt: 0, active: false, used: false };
  const expiresAt = startedAt + ACADEMIC_TRIAL_DAYS * 24 * 60 * 60 * 1000;
  return { startedAt, expiresAt, active: now < expiresAt, used: true };
}

export function academicTrialMetadata(startedAt: number) {
  return { [TRIAL_KEY]: { startedAt } };
}

export function sameClassSelection(a: ClassSelection | null, b: ClassSelection | null) {
  return Boolean(a && b && a.classId === b.classId && a.semester === b.semester);
}
