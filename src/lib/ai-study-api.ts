// Talks to /api/ai (api/ai.mjs) — the server that holds the Gemini key. The
// learner's sign-in token proves who is asking; the key itself never reaches the app.
import { Platform } from 'react-native';

import { auth } from '@/lib/firebase';

const SERVER = process.env.EXPO_PUBLIC_API_BASE || (Platform.OS === 'web' ? '' : 'https://grateapex.vercel.app');

export type ChatTurn = { role: 'user' | 'model'; text: string };
export class AiError extends Error {}

async function call<T>(payload: Record<string, unknown>): Promise<T> {
  const token = await auth.currentUser?.getIdToken().catch(() => undefined);
  if (!token) throw new AiError('Sign in to use AI study help.');
  let response: Response;
  try {
    response = await fetch(`${SERVER}/api/ai`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
  } catch {
    throw new AiError('Could not reach the AI. Check your connection and try again.');
  }
  const data = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok || !data) {
    if (response.status === 404 && !data) throw new AiError('AI study help runs on the live app (grateapex.vercel.app). It is not available in this local preview.');
    throw new AiError(data?.error || 'The AI could not answer right now. Please try again.');
  }
  return data;
}

export async function askLessonAi(lesson: { title: string; text: string }, question: string, history: readonly ChatTurn[]): Promise<string> {
  const data = await call<{ answer: string }>({ mode: 'ask', lesson, question, history: history.slice(-8) });
  return data.answer;
}

export async function makeLessonCards(lesson: { title: string; text: string }, count: number, avoid: readonly string[]): Promise<{ front: string; back: string }[]> {
  const data = await call<{ cards: { front: string; back: string }[] }>({ mode: 'flashcards', lesson, count, avoid });
  return data.cards;
}
