// "Save for offline": downloads what a learner needs to revise without data —
// their class's question banks, original lessons (text and pictures), the lesson
// list and the lecture diagrams — into the device (src/lib/offline-study.ts).
// Lessons written in this app (HB2 and the topic lessons) are part of the app
// itself, which the service worker keeps after the first visit.
import type { ClassSelection } from '@/data/class-curriculum';
import { allFigures } from '@/data/figures';
import { legacyCoursesForClass, loadLegacyImage, loadLegacyLessonBody, loadLegacyLessons } from '@/data/legacy-study';
import { hb2Course } from '@/data/hb2-study';
import { clearOffline, offlineSupported, type OfflineManifest, readManifest, saveFiles, writeManifest } from '@/lib/offline-study';

export const classKey = (selection: ClassSelection) => `${selection.classId}-S${selection.semester}`;

export type OfflineProgress = { done: number; total: number; label: string };
export type OfflineResult = { ok: boolean; manifest: OfflineManifest | null; problems: number };

/** The saved copy's details for this class, or null when nothing (or another class) is saved. */
export async function savedForClass(selection: ClassSelection | null): Promise<OfflineManifest | null> {
  if (!selection || !offlineSupported()) return null;
  const manifest = await readManifest();
  return manifest && manifest.classKey === classKey(selection) ? manifest : null;
}

const imageNames = (body: unknown): string[] => [...JSON.stringify(body).matchAll(/"img":"([^"]+)"/g)].map((match) => match[1]);

/** Downloads everything for the class. Safe to run again: it refreshes the saved copy. */
export async function saveClassForOffline(selection: ClassSelection, onProgress?: (progress: OfflineProgress) => void): Promise<OfflineResult> {
  const courses = legacyCoursesForClass(selection);
  const bankPaths = courses.map((course) => `/curriculum/${course.id}.json`);
  const figurePaths = [...new Set(allFigures.map((figure) => figure.src))];
  // Original lessons (not the app's own HB2 ones, which are bundled) are read from the database.
  const lessons = (await Promise.all(courses.filter((course) => !hb2Course(course.id)).map((course) => loadLegacyLessons(course.id).catch(() => [])))).flat();
  const total = bankPaths.length + figurePaths.length + lessons.length;
  let done = 0;
  let problems = 0;
  let bytes = 0;
  const step = (label: string) => onProgress?.({ done, total, label });

  step('Question banks');
  const banks = await saveFiles(bankPaths, (count) => { done = count; step('Question banks'); });
  bytes += banks.bytes;
  problems += banks.failed.length;

  const baseDone = done;
  const figures = await saveFiles(figurePaths, (count) => { done = baseDone + count; step('Lecture diagrams'); });
  bytes += figures.bytes;
  problems += figures.failed.length;

  let lessonsSaved = 0;
  let lessonsTried = 0;
  const lessonBase = done;
  for (const lesson of lessons) {
    try {
      const body = await loadLegacyLessonBody(lesson.id); // saves the text for offline as it loads
      await Promise.all(imageNames(body).map((name) => loadLegacyImage(name))); // and its pictures
      bytes += JSON.stringify(body).length;
      lessonsSaved += 1;
    } catch {
      problems += 1;
    }
    lessonsTried += 1;
    done = lessonBase + lessonsTried;
    step('Lessons');
  }

  const manifest: OfflineManifest = { savedAt: Date.now(), classKey: classKey(selection), bytes, courses: courses.length, lessons: lessonsSaved };
  const ok = (await writeManifest(manifest)) && problems === 0;
  return { ok, manifest, problems };
}

export const removeOfflineCopy = clearOffline;
