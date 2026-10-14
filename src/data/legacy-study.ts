// The original app's courses (HB1 Semester 1 and Semester 2), studied inside
// this app. Courses are kept exactly as the original app had them: a subject
// that appears in two classes (e.g. Biochemistry in HB1 S2 and HB2 S1) is two
// different courses with different content — never merged.
//
//   Lessons    read from the shared database, as the original app does:
//              lessons (titles, sections), lessonContent (the body — only for
//              the student's own class, by the deployed rules), lessonImages.
//   Questions  the original question banks, exported to public/curriculum/
//              (scripts/legacy-curriculum/export-banks.mjs), loaded on demand.
//   Progress   the original app's section counts (progress/{uid}.lessons) are
//              read, never rewritten; sections read here are kept on the device
//              and a finished lesson is recorded as a completion.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { Platform } from 'react-native';

import type { ClassSelection } from '@/data/class-curriculum';
import { auth, db } from '@/lib/firebase';
import { type BankQuestion } from '@/data/legacy-questions';
import { HB2_COURSES, hb2Course, hb2LessonById, hb2Lessons, hb2Sets, lessonBody } from '@/data/hb2-study';
import type { SubjectId } from '@/data/lesson-types';

export { buildPractice, parseRich, plainText, toQuestion, type BankQuestion, type Run } from '@/data/legacy-questions';

/** A course: the original app's (HB1), or an HB2 course built from this app's lessons (`subject` set; data/hb2-study.ts). */
export type LegacyCourse = { id: string; name: string; icon: string; desc: string; classId: 'HB1' | 'HB2'; semester: 1 | 2; gradient: readonly [string, string]; subject?: SubjectId };

// From old-reference/src/data/catalog.ts and access.json (and the course colours of the original Study screen).
export const LEGACY_COURSES: readonly LegacyCourse[] = [
  { id: 'biolchem', name: 'Biological Chemistry', icon: '⚗️', desc: 'Elements, bonds, carbohydrates, nucleic acids, proteins, enzymes, metabolism and lipids.', classId: 'HB1', semester: 1, gradient: ['#14b8a6', '#0f766e'] },
  { id: 'medgen', name: 'Basic Medical Genetics', icon: '🧬', desc: 'Cells, chromosomes, inheritance, molecular genetics and gene regulation.', classId: 'HB1', semester: 1, gradient: ['#ec4899', '#be185d'] },
  { id: 'cellstruct', name: 'Cell Structure', icon: '🔬', desc: 'Microscopy, prokaryotes vs eukaryotes, organelles and the plasma membrane.', classId: 'HB1', semester: 1, gradient: ['#06b6d4', '#0e7490'] },
  { id: 'bmc', name: 'Basic Medical Chemistry', icon: '🧫', desc: 'Organic chemistry for medicine: amines, alcohols, acids, aromatics, alkenes.', classId: 'HB1', semester: 1, gradient: ['#84cc16', '#4d7c0f'] },
  { id: 'algebra', name: 'Algebra', icon: '➗', desc: 'Sets, equations, logs, sequences, trigonometry, matrices, calculus.', classId: 'HB1', semester: 1, gradient: ['#6366f1', '#4338ca'] },
  { id: 'stats', name: 'Statistical Methods', icon: '📊', desc: 'Descriptive statistics, probability and distributions.', classId: 'HB1', semester: 1, gradient: ['#8b5cf6', '#6d28d9'] },
  { id: 'commskills', name: 'Communication Skills', icon: '🗣️', desc: 'Grammar, punctuation, concord, sentences and clear communication.', classId: 'HB1', semester: 1, gradient: ['#f97316', '#c2410c'] },
  { id: 'compapp', name: 'Computer Appreciation', icon: '💻', desc: 'Excel and PowerPoint skills for coursework and presentations.', classId: 'HB1', semester: 1, gradient: ['#0ea5e9', '#0369a1'] },
  { id: 'biochemistry', name: 'Biochemistry', icon: '🧪', desc: 'Metabolism, enzymes, and the pathways that keep cells running.', classId: 'HB1', semester: 2, gradient: ['#10b981', '#047857'] },
  { id: 'physiology', name: 'Physiology', icon: '🫀', desc: 'How the body’s systems work, from single cells to whole organs.', classId: 'HB1', semester: 2, gradient: ['#f43f5e', '#b91c3c'] },
  { id: 'anatomy', name: 'Anatomy', icon: '🩻', desc: 'Structures, regions, and how the body is put together.', classId: 'HB1', semester: 2, gradient: ['#3b82f6', '#1d4ed8'] },
  { id: 'behavioural', name: 'Behavioural Science', icon: '🧠', desc: 'Psychology, behaviour, and the mind behind medicine.', classId: 'HB1', semester: 2, gradient: ['#a855f7', '#7c3aed'] },
  { id: 'entomology', name: 'Entomology', icon: '🦟', desc: 'Insects, vectors, and the essentials of medical entomology.', classId: 'HB1', semester: 2, gradient: ['#f59e0b', '#d97706'] },
];

export const legacyCourse = (id: string | undefined): LegacyCourse | null => LEGACY_COURSES.find((course) => course.id === id) ?? hb2Course(id);

/** The courses of a class in the original study style: HB1 (the original app's) and HB2 Semester 1 (this app's lessons). */
export function legacyCoursesForClass(selection: ClassSelection | null | undefined): LegacyCourse[] {
  if (selection?.classId === 'HB2' && selection.semester === 1) return [...HB2_COURSES];
  if (!selection || selection.classId !== 'HB1') return [];
  return LEGACY_COURSES.filter((course) => course.semester === selection.semester);
}

// ── Lessons ─────────────────────────────────────────────────────────

export type LegacyLessonMeta = {
  id: string; course: string; order: number; title: string; sub?: string; icon: string; summary: string; minutes: number;
  sections: { id: string; title: string }[]; qids?: string[]; qcount?: number; extras?: string[]; v?: string;
  /** HB2 only: the topic the lesson belongs to, its subject and completion XP. */
  group?: string; subject?: SubjectId; xp?: number;
};
export type Rich = string;
export type Block =
  | { k: 'p'; x: Rich; lede?: 1 }
  | { k: 'h'; x: Rich; l: 3 | 4 }
  | { k: 'ul'; items: Rich[]; ol?: 1 }
  | { k: 'table'; head: Rich[]; rows: { c: Rich[] }[] }
  | { k: 'term'; name: Rich; def: Rich }
  | { k: 'box'; title: Rich; tone?: string; blocks: Block[] }
  | { k: 'step'; n: string; title: Rich; tone?: string; tags?: string[]; blocks?: Block[] }
  | { k: 'cards'; items: { title: Rich; blocks: Block[] }[] }
  | { k: 'video'; url: string; title: Rich; desc: Rich; tag?: string }
  | { k: 'fig'; svg?: string; img?: string; w?: number; h?: number; cap?: Rich; alt?: string };
export type LegacySection = { id: string; title: Rich; kicker?: string; blocks: Block[] };
export type LegacyExtras = { mnemonics?: { h: Rich; lines: Rich[] }[]; facts?: { h: Rich; lines: Rich[] }[]; steps?: { title: string; items: { t: Rich; d: Rich }[] } };
export type LegacyLessonBody = { sections: LegacySection[]; extras?: LegacyExtras };

let lessonList: Promise<LegacyLessonMeta[]> | null = null;

/** Every original lesson's title and sections (the list is open to any signed-in student). */
export function loadLegacyLessonList(): Promise<LegacyLessonMeta[]> {
  if (!lessonList) {
    lessonList = getDocs(collection(db, 'lessons'))
      .then((snap) => snap.docs.map((item) => ({ ...(item.data() as Omit<LegacyLessonMeta, 'id'>), id: item.id, course: item.id.split('-')[0] })).sort((a, b) => a.order - b.order))
      .catch((error) => {
        lessonList = null;
        throw error;
      });
  }
  return lessonList;
}

export async function loadLegacyLessons(courseId: string): Promise<LegacyLessonMeta[]> {
  if (hb2Course(courseId)) return hb2Lessons(courseId);
  return (await loadLegacyLessonList()).filter((lesson) => lesson.course === courseId);
}

const bodyCache = new Map<string, LegacyLessonBody>();

/** A lesson's body. Only the student's own class can read it (deployed rules); a copy is kept for offline reading. */
/** A lesson's title and sections: an original lesson, or an HB2 one. */
export async function loadLegacyLessonMeta(id: string): Promise<LegacyLessonMeta | null> {
  const local = hb2LessonById(id);
  if (local) return local.meta;
  return (await loadLegacyLessonList()).find((item) => item.id === id) ?? null;
}

export async function loadLegacyLessonBody(id: string): Promise<LegacyLessonBody> {
  const local = hb2LessonById(id);
  if (local) return lessonBody(local.lesson) as LegacyLessonBody;
  const hit = bodyCache.get(id);
  if (hit) return hit;
  const key = `grateapex_legacy_lesson_${id}`;
  try {
    const snap = await getDoc(doc(db, 'lessonContent', id));
    if (!snap.exists()) throw new Error('This lesson has not been published yet.');
    const data = snap.data() as LegacyLessonBody;
    const body = { sections: data.sections ?? [], extras: data.extras };
    bodyCache.set(id, body);
    AsyncStorage.setItem(key, JSON.stringify(body)).catch(() => {});
    return body;
  } catch (error) {
    const saved = await AsyncStorage.getItem(key).catch(() => null);
    if (saved) {
      const body = JSON.parse(saved) as LegacyLessonBody;
      bodyCache.set(id, body);
      return body;
    }
    if ((error as { code?: string })?.code === 'permission-denied') throw new Error('This lesson belongs to another class. Choose that class to study it.');
    throw error;
  }
}

const images = new Map<string, Promise<string | null>>();

/** A lesson picture (stored in the shared database as base64), as a data address. */
export function loadLegacyImage(name: string): Promise<string | null> {
  const hit = images.get(name);
  if (hit) return hit;
  const promise = getDoc(doc(db, 'lessonImages', name.replace(/\.[a-z]+$/i, '')))
    .then((snap) => {
      const rec = snap.data() as { mime?: string; data?: string } | undefined;
      return rec?.mime && rec.data ? `data:${rec.mime};base64,${rec.data}` : null;
    })
    .catch(() => null);
  images.set(name, promise);
  return promise;
}

// ── Question banks ──────────────────────────────────────────────────

export type LegacyBank = { id: string; name: string; sets: { id: string; name: string; questions: BankQuestion[] }[] };

const banks = new Map<string, Promise<LegacyBank>>();
const BASE = Platform.OS === 'web' ? '' : 'https://grateapex.vercel.app';

export function loadLegacyBank(courseId: string): Promise<LegacyBank> {
  const hit = banks.get(courseId);
  if (hit) return hit;
  const promise = fetch(`${BASE}/curriculum/${courseId}.json`)
    .then((response) => {
      if (!response.ok) throw new Error('The question bank could not be loaded.');
      return response.json() as Promise<LegacyBank>;
    })
    .catch((error) => {
      banks.delete(courseId);
      throw error;
    });
  banks.set(courseId, promise);
  return promise;
}

/** A course's question sets for the course page (name and size). */
export async function loadCourseSets(courseId: string): Promise<{ id: string; name: string; count: number }[]> {
  if (hb2Course(courseId)) {
    const topicSets = hb2Sets(courseId).map((set) => ({ id: set.id, name: set.name, count: set.questions.length }));
    // Also load the supplementary past-question bank for this HB2 course (e.g. hb2-biochemistry.json).
    const extraSets = await loadLegacyBank(courseId)
      .then((bank) => bank.sets.map((set) => ({ id: set.id, name: set.name, count: set.questions.length })))
      .catch(() => [] as { id: string; name: string; count: number }[]);
    return [...topicSets, ...extraSets];
  }
  return (await loadLegacyBank(courseId)).sets.map((set) => ({ id: set.id, name: set.name, count: set.questions.length }));
}

export const bankQuestions = (bank: LegacyBank) => bank.sets.flatMap((set) => set.questions.map((q) => ({ ...q, set: set.id, setName: set.name })));

// ── Progress ────────────────────────────────────────────────────────

const SECTIONS_KEY = 'grateapex_legacy_sections';

/** Sections read per original lesson: the original app's own counts (read-only) and this device's, whichever is higher. */
export async function loadLegacySectionProgress(): Promise<Record<string, number>> {
  const local = JSON.parse((await AsyncStorage.getItem(SECTIONS_KEY).catch(() => null)) ?? '{}') as Record<string, number>;
  const uid = auth.currentUser?.uid;
  if (!uid) return local;
  try {
    const snap = await getDoc(doc(db, 'progress', uid));
    const lessons = (snap.data()?.lessons ?? {}) as Record<string, unknown>;
    const merged = { ...local };
    for (const [id, value] of Object.entries(lessons)) if (typeof value === 'number' && Number.isFinite(value) && value < 1000) merged[id] = Math.max(merged[id] ?? 0, value);
    return merged;
  } catch {
    return local;
  }
}

/** Remembers how many sections of an original lesson this learner has read (this device). */
export async function saveLegacySectionProgress(lessonId: string, sectionsRead: number) {
  const current = JSON.parse((await AsyncStorage.getItem(SECTIONS_KEY).catch(() => null)) ?? '{}') as Record<string, number>;
  if ((current[lessonId] ?? 0) >= sectionsRead) return;
  current[lessonId] = sectionsRead;
  await AsyncStorage.setItem(SECTIONS_KEY, JSON.stringify(current)).catch(() => {});
}
