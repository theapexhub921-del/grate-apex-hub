// Saved Study chats. Kept on this device (AsyncStorage), one list per signed-in
// learner, like the saved AI flashcards. Nothing here is sent to a server.
import type { ChatTurn } from '@/lib/ai-study-api';

export type StoredChat = { id: string; title: string; updatedAt: number; turns: ChatTurn[] };

export const STUDY_CHATS_KEY = (uid: string) => `grateapex_study_chats:${uid}`;

const MAX_CHATS = 30;
const MAX_TURNS = 100;
const MAX_TURN_CHARS = 8_000;

export function newChatId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function chatTitle(turns: readonly ChatTurn[]): string {
  const first = turns.find((turn) => turn.role === 'user')?.text.replace(/\s+/g, ' ').trim() ?? '';
  if (!first) return 'New chat';
  return first.length > 48 ? `${first.slice(0, 47).trimEnd()}…` : first;
}

// Reads whatever was saved, dropping anything malformed so a bad value never breaks the screen.
export function parseStoredChats(raw: string | null): StoredChat[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const chats: StoredChat[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue;
    const { id, title, updatedAt, turns } = item as Partial<StoredChat>;
    if (typeof id !== 'string' || !id || !Array.isArray(turns)) continue;
    const clean = turns
      .filter((turn): turn is ChatTurn => Boolean(turn) && (turn.role === 'user' || turn.role === 'model') && typeof turn.text === 'string' && turn.text.length > 0)
      .map((turn) => ({ role: turn.role, text: turn.text.slice(0, MAX_TURN_CHARS) }));
    if (!clean.length) continue;
    chats.push({ id, title: typeof title === 'string' && title ? title : chatTitle(clean), updatedAt: typeof updatedAt === 'number' ? updatedAt : 0, turns: clean });
  }
  return chats.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_CHATS);
}

// Adds or replaces one chat, newest first, within the size limits.
export function upsertChat(chats: readonly StoredChat[], id: string, turns: readonly ChatTurn[], now = Date.now()): StoredChat[] {
  const kept = turns.slice(-MAX_TURNS);
  const entry: StoredChat = { id, title: chatTitle(turns), updatedAt: now, turns: [...kept] };
  return [entry, ...chats.filter((chat) => chat.id !== id)].slice(0, MAX_CHATS);
}

export function removeChat(chats: readonly StoredChat[], id: string): StoredChat[] {
  return chats.filter((chat) => chat.id !== id);
}
