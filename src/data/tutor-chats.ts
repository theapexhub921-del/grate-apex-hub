import { collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';
import type { ChatTurn } from '@/lib/ai-study-api';

// Study chat history, saved to the signed-in learner's account at
// users/{uid}/tutorChats/{chatId} = { title, turns, createdAt, updatedAt }.
// Only the owner can read, change or delete their chats (firestore.rules).

export type TutorChatSummary = {
  id: string;
  title: string;
  turnCount: number;
  updatedAt: string | null;
};

export type TutorChat = TutorChatSummary & {
  turns: ChatTurn[];
  createdAt: string;
};

const MAX_TURNS = 100;
const MAX_LIST = 50;

function requireUid(): string {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in to use Study chat history.');
  return user.uid;
}

function chatsCollection(uid: string) {
  return collection(db, 'users', uid, 'tutorChats');
}

function toIso(value: unknown): string | null {
  return value instanceof Timestamp ? value.toDate().toISOString() : null;
}

function summaryFrom(id: string, data: Record<string, unknown>): TutorChatSummary {
  return {
    id,
    title: typeof data.title === 'string' && data.title ? data.title : 'Study chat',
    turnCount: Array.isArray(data.turns) ? data.turns.length : 0,
    updatedAt: toIso(data.updatedAt),
  };
}

/** A new id for a chat, made once on the device when the first message is sent. */
export function newTutorChatId(): string {
  return `tc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** A short title taken from the learner's first question. */
export function tutorChatTitle(turns: readonly ChatTurn[]): string {
  const first = turns.find((turn) => turn.role === 'user')?.text.trim() ?? '';
  if (!first) return 'Study chat';
  return first.length > 60 ? `${first.slice(0, 57)}…` : first;
}

export async function listTutorChats(): Promise<TutorChatSummary[]> {
  const uid = requireUid();
  const snap = await getDocs(query(chatsCollection(uid), orderBy('updatedAt', 'desc'), limit(MAX_LIST)));
  return snap.docs.map((item) => summaryFrom(item.id, item.data()));
}

export async function getTutorChat(id: string): Promise<TutorChat | null> {
  const uid = requireUid();
  const snap = await getDoc(doc(chatsCollection(uid), id));
  if (!snap.exists()) return null;
  const data = snap.data();
  const turns = Array.isArray(data.turns) ? (data.turns as ChatTurn[]) : [];
  return {
    ...summaryFrom(snap.id, data),
    turns,
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString(),
  };
}

export async function saveTutorChat(chat: { id: string; turns: readonly ChatTurn[]; createdAt: string }): Promise<void> {
  const uid = requireUid();
  const turns = chat.turns.slice(-MAX_TURNS).map((turn) => ({ role: turn.role, text: String(turn.text) }));
  await setDoc(doc(chatsCollection(uid), chat.id), {
    title: tutorChatTitle(turns),
    turns: JSON.parse(JSON.stringify(turns)),
    createdAt: chat.createdAt,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTutorChat(id: string): Promise<void> {
  const uid = requireUid();
  await deleteDoc(doc(chatsCollection(uid), id));
}
