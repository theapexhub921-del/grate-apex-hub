// Pre-test and post-test (from the original app): take 10 questions before
// studying a course, study, then 10 different ones to see how much you've
// improved. Kept on this device, per course.
import AsyncStorage from '@react-native-async-storage/async-storage';

export type TestResult = { correct: number; total: number; ids: string[]; at: number };
export type PrePost = { pre?: TestResult; post?: TestResult };

const KEY = 'grateapex_prepost';

async function readAll(): Promise<Record<string, PrePost>> {
  try {
    return JSON.parse((await AsyncStorage.getItem(KEY)) ?? '{}') as Record<string, PrePost>;
  } catch {
    return {};
  }
}

export async function loadPrePost(courseId: string): Promise<PrePost> {
  return (await readAll())[courseId] ?? {};
}

/** Saves a result; a new pre-test starts over (it clears the old post-test). */
export async function savePrePost(courseId: string, phase: 'pre' | 'post', result: TestResult) {
  const all = await readAll();
  const current = all[courseId] ?? {};
  all[courseId] = phase === 'pre' ? { pre: result } : { ...current, post: result };
  await AsyncStorage.setItem(KEY, JSON.stringify(all)).catch(() => {});
}

export const percentOf = (result: TestResult | undefined) => (result && result.total ? Math.round((result.correct / result.total) * 100) : null);
