import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';
import { readLearningCache, writeLearningCache } from '@/data/learning-sync';

// Study plans, timetable and personal goals.
//
// Always kept on this device for the signed-in learner (account-scoped cache),
// and synced to the account at users/{uid}/planner/{kind} = { items, updatedAt }
// when the rules allow it (firestore.rules — an owner-only block). Until then,
// or offline, the device copy is used; nothing claims to have synced when it
// didn't. Two devices editing the same list: the last save wins.

export type StudyPlan = {
  id: string;
  user_id: string;
  title: string;
  topic_ids: string[];
  duration_days: number;
  starts_at: string;
  status: 'active' | 'completed' | 'archived';
  goal: 'mastery' | 'exam' | 'catchup' | 'revision' | string;
  progress_lesson_ids: string[];
  created_at: string;
  updated_at: string;
};

export type TimetableBlock = {
  id: string;
  user_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  subject: string;
  title: string;
  notes?: string | null;
  recurrence?: 'weekly';
  event_date?: string | null;
  study_plan_id?: string | null;
  created_at: string;
};

export type PersonalGoal = {
  id: string;
  user_id: string;
  title: string;
  goal_type: 'lessons' | 'xp' | 'questions' | 'streak' | 'topic' | 'study_plan';
  target: number;
  current: number;
  deadline: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type Kind = 'studyPlans' | 'timetableBlocks' | 'goals';
const KEYS: Record<Kind, string> = {
  studyPlans: 'grateapex_planner_plans',
  timetableBlocks: 'grateapex_planner_timetable',
  goals: 'grateapex_planner_goals',
};

async function currentUserId() {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in to use study planning.');
  return user.uid;
}

async function readLocal<T>(kind: Kind): Promise<T[]> {
  try {
    const saved = await readLearningCache(KEYS[kind]);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

async function readAll<T>(kind: Kind): Promise<T[]> {
  const uid = await currentUserId();
  const local = await readLocal<T>(kind);
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'planner', kind));
    if (snap.exists()) {
      const items = Array.isArray(snap.data().items) ? (snap.data().items as T[]) : [];
      await writeLearningCache(KEYS[kind], JSON.stringify(items)).catch(() => undefined);
      return items;
    }
    // First sync: the account has nothing yet, so this device's list goes up.
    if (local.length) await saveToAccount(uid, kind, local);
  } catch {
    // Not allowed yet (rules) or offline: the device copy is used.
  }
  return local;
}

async function saveToAccount<T>(uid: string, kind: Kind, items: T[]) {
  // Firestore refuses undefined values; JSON drops them.
  await setDoc(doc(db, 'users', uid, 'planner', kind), { items: JSON.parse(JSON.stringify(items)), updatedAt: serverTimestamp() });
}

async function writeAll<T>(kind: Kind, items: T[]) {
  const uid = await currentUserId();
  if (items.length > 200) throw new Error('The planner keeps up to 200 entries of each kind.');
  try {
    await writeLearningCache(KEYS[kind], JSON.stringify(items));
  } catch {
    throw new Error('Your planner could not be saved on this device.');
  }
  await saveToAccount(uid, kind, items).catch(() => undefined); // synced when the rules allow; else device only
}

async function upsert<T extends { id: string }>(kind: Kind, item: T) {
  const items = await readAll<T>(kind);
  await writeAll(kind, [...items.filter((existing) => existing.id !== item.id), item]);
  return item;
}

async function remove(kind: Kind, id: string) {
  const items = await readAll<{ id: string }>(kind);
  await writeAll(kind, items.filter((existing) => existing.id !== id));
}

export async function listStudyPlans(): Promise<StudyPlan[]> {
  return (await readAll<StudyPlan>('studyPlans').catch(() => [] as StudyPlan[])).filter((plan) => plan.status !== 'archived');
}

export async function saveStudyPlan(
  input:
    | Pick<StudyPlan, 'id' | 'title' | 'topic_ids' | 'duration_days' | 'goal' | 'status'>
    | Omit<StudyPlan, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'progress_lesson_ids' | 'starts_at'>
): Promise<StudyPlan> {
  const userId = await currentUserId();
  const id = 'id' in input && input.id ? input.id : `plan_${Date.now()}`;
  const now = new Date().toISOString();
  const existing = (await readAll<StudyPlan>('studyPlans')).find((plan) => plan.id === id);
  const plan: StudyPlan = {
    id,
    user_id: userId,
    title: input.title,
    topic_ids: input.topic_ids,
    duration_days: input.duration_days,
    starts_at: existing?.starts_at ?? now.slice(0, 10),
    status: input.status,
    goal: input.goal,
    progress_lesson_ids: existing?.progress_lesson_ids ?? [],
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
  return upsert('studyPlans', plan);
}

export async function updateStudyPlanProgress(lessonIds: string[]) {
  try {
    const plans = await readAll<StudyPlan>('studyPlans');
    const active = plans.find((p) => p.status === 'active');
    if (!active) return;

    const { publishedTopics } = await import('@/data/curriculum');
    const path = active.topic_ids.flatMap(
      (topicId: string) => publishedTopics.find((t) => t.id === topicId)?.lessons.map((l) => l.id) ?? []
    );
    const completed = [...new Set(lessonIds.filter((id) => path.includes(id)))];
    await upsert('studyPlans', {
      ...active,
      progress_lesson_ids: completed,
      status: path.length > 0 && completed.length >= path.length ? 'completed' : 'active',
      updated_at: new Date().toISOString(),
    });
  } catch {}
}

export async function listTimetableBlocks(): Promise<TimetableBlock[]> {
  return readAll<TimetableBlock>('timetableBlocks').catch(() => [] as TimetableBlock[]);
}

export async function createTimetableBlock(input: Omit<TimetableBlock, 'id' | 'user_id' | 'created_at'>): Promise<TimetableBlock> {
  const userId = await currentUserId();
  return upsert('timetableBlocks', { id: `block_${Date.now()}`, user_id: userId, ...input, created_at: new Date().toISOString() });
}

export async function deleteTimetableBlock(id: string) {
  await remove('timetableBlocks', id);
}

export async function updateTimetableBlock(
  id: string,
  input: Partial<Omit<TimetableBlock, 'id' | 'user_id' | 'created_at'>>
): Promise<TimetableBlock> {
  const existing = (await readAll<TimetableBlock>('timetableBlocks')).find((block) => block.id === id);
  if (!existing) throw new Error('That timetable entry no longer exists.');
  return upsert('timetableBlocks', { ...existing, ...input });
}

export async function listPersonalGoals(): Promise<PersonalGoal[]> {
  return readAll<PersonalGoal>('goals').catch(() => [] as PersonalGoal[]);
}

export async function createPersonalGoal(input: Pick<PersonalGoal, 'title' | 'goal_type' | 'target' | 'deadline'>): Promise<PersonalGoal> {
  const userId = await currentUserId();
  const now = new Date().toISOString();
  return upsert('goals', { id: `goal_${Date.now()}`, user_id: userId, ...input, current: 0, completed_at: null, created_at: now, updated_at: now });
}

export async function deletePersonalGoal(id: string) {
  await remove('goals', id);
}

export async function updatePersonalGoal(id: string, current: number) {
  const existing = (await readAll<PersonalGoal>('goals')).find((goal) => goal.id === id);
  if (!existing) return;
  const now = new Date().toISOString();
  await upsert('goals', { ...existing, current, completed_at: current >= existing.target ? now : null, updated_at: now });
}

export async function refreshProgressGoals(progress: { lessonsCompleted: number; xp: number; streak: number }) {
  try {
    const supported: Record<string, number> = { lessons: progress.lessonsCompleted, xp: progress.xp, streak: progress.streak };
    const goals = await readAll<PersonalGoal>('goals');
    let changed = false;
    const next = goals.map((goal) => {
      if (!(goal.goal_type in supported)) return goal;
      const current = Math.max(0, supported[goal.goal_type]);
      if (Number(goal.current) === current) return goal;
      changed = true;
      return { ...goal, current, completed_at: current >= Number(goal.target) ? new Date().toISOString() : null, updated_at: new Date().toISOString() };
    });
    if (changed) await writeAll('goals', next);
  } catch {}
}
