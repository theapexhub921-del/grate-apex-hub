// Chat features like WhatsApp, on the shared chats/{a_b}/messages documents
// (the deployed rules: a message may carry text, media (≤3 photos/videos),
// doc {url, name}, audio, reply {mid, from, text ≤120}, fwd; members may change
// only their own entry in `reactions`; only the sender may delete).
//   reply · react (one emoji each, see who reacted) · forward · delete for
//   everyone (the sender) · typing indicator (chat.typing.{me})
// Personal choices — starred, pinned and "delete for me" — are kept on this
// device, so nobody else sees them.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, deleteField, doc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { Platform } from 'react-native';
import { useSyncExternalStore } from 'react';

import { auth, db } from '@/lib/firebase';
import { CLOUDINARY, safeUrl, type Media } from '@/lib/media';

export const REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👍', '👎', '🔥', '🙏'] as const;

export type ReplyRef = { mid: string; from: string; text: string };
export type ChatDoc = { url: string; name: string };
export type ChatExtras = { reply?: ReplyRef | null; fwd?: boolean; media?: Media[]; doc?: ChatDoc | null };

const me = () => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Please sign in again.');
  return uid;
};

/** A short preview of a message for replies, the chat list and notifications. */
export function previewOf(message: { body: string; media?: Media[] | null; doc?: ChatDoc | null; audio?: unknown }) {
  if (message.body.trim()) return message.body.trim().slice(0, 120);
  if (message.media?.length) return message.media.length > 1 ? `${message.media.length} photos` : message.media[0].t === 'video' ? 'Video' : 'Photo';
  if (message.doc) return `Document: ${message.doc.name}`.slice(0, 120);
  if (message.audio) return 'Voice note';
  return 'Message';
}

/** Sends a message with text and/or a reply, photos, a document, or as a forward. */
export async function sendChatMessage(chatId: string, body: string, extras: ChatExtras = {}) {
  const uid = me();
  const text = body.trim();
  if (text.length > 500) throw new Error('Messages can be up to 500 characters.');
  if (!text && !extras.media?.length && !extras.doc) throw new Error('Write a message first.');
  const ref = doc(collection(db, 'chats', chatId, 'messages'));
  const data: Record<string, unknown> = { from: uid, text, createdAt: serverTimestamp() };
  if (extras.reply) data.reply = { mid: extras.reply.mid, from: extras.reply.from, text: extras.reply.text.slice(0, 120) };
  if (extras.fwd) data.fwd = true;
  if (extras.media?.length) data.media = extras.media.slice(0, 3).map((item) => ({ t: item.t, url: item.url, ...(item.w ? { w: item.w } : {}), ...(item.h ? { h: item.h } : {}) }));
  if (extras.doc) data.doc = { url: extras.doc.url, name: extras.doc.name.slice(0, 100) };
  const batch = writeBatch(db);
  batch.set(ref, data);
  batch.update(doc(db, 'chats', chatId), { lastText: previewOf({ body: text, media: extras.media, doc: extras.doc }), lastAt: serverTimestamp(), lastFrom: uid, [`seen.${uid}`]: serverTimestamp(), [`typing.${uid}`]: deleteField() });
  try {
    await batch.commit();
  } catch (error) {
    if ((error as { code?: string }).code === 'permission-denied') throw new Error('Messages can only be sent between friends who follow each other.');
    throw error;
  }
  return ref.id;
}

/** My reaction on a message (one emoji; the same again, or null, removes it). */
export async function reactToMessage(chatId: string, messageId: string, emoji: string | null) {
  const uid = me();
  await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), { [`reactions.${uid}`]: emoji ?? deleteField() });
}

let lastTyping = 0;
/** "typing…" for the other person (at most every 4 seconds while typing). */
export async function setTyping(chatId: string, typing: boolean) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const now = Date.now();
  if (typing && now - lastTyping < 4000) return;
  lastTyping = typing ? now : 0;
  await updateDoc(doc(db, 'chats', chatId), { [`typing.${uid}`]: typing ? now : deleteField() }).catch(() => {});
}

/** Uploads a document (PDF, Word, slides, ZIP… up to 20 MB) to Cloudinary for a chat. */
export async function uploadChatDocument(file: { uri: string; name: string; size?: number; mimeType?: string; file?: File }): Promise<ChatDoc> {
  if (file.size && file.size > 20 * 1024 * 1024) throw new Error('That file is too big. Max 20 MB.');
  const form = new FormData();
  if (Platform.OS === 'web') form.append('file', file.file ?? (await (await fetch(file.uri)).blob()), file.name);
  else form.append('file', { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' } as unknown as Blob);
  form.append('upload_preset', CLOUDINARY.uploadPreset);
  let response: Response;
  try {
    response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/auto/upload`, { method: 'POST', body: form });
  } catch {
    throw new Error('Couldn’t reach the upload server. Check your connection.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !safeUrl(data.secure_url)) throw new Error(data?.error?.message || 'Upload failed.');
  return { url: data.secure_url as string, name: file.name };
}

// ── Personal choices (this device) ──────────────────────────────────

type Prefs = { starred: string[]; hidden: string[]; pinned: Record<string, string> };
const KEY = 'grateapex_chat_prefs';
let prefs: Prefs = { starred: [], hidden: [], pinned: {} };
let loaded = false;
const listeners = new Set<() => void>();
const save = () => { listeners.forEach((listener) => listener()); void AsyncStorage.setItem(KEY, JSON.stringify(prefs)).catch(() => {}); };

async function load() {
  if (loaded) return;
  loaded = true;
  try {
    const saved = JSON.parse((await AsyncStorage.getItem(KEY)) ?? 'null');
    if (saved) prefs = { starred: saved.starred ?? [], hidden: saved.hidden ?? [], pinned: saved.pinned ?? {} };
  } catch {
    // fresh start
  }
  listeners.forEach((listener) => listener());
}

const keyOf = (chatId: string, messageId: string) => `${chatId}/${messageId}`;

export function useChatPrefs() {
  return useSyncExternalStore((listener) => { void load(); listeners.add(listener); return () => { listeners.delete(listener); }; }, () => prefs, () => prefs);
}

export function toggleStar(chatId: string, messageId: string) {
  const key = keyOf(chatId, messageId);
  prefs = { ...prefs, starred: prefs.starred.includes(key) ? prefs.starred.filter((item) => item !== key) : [key, ...prefs.starred].slice(0, 500) };
  save();
}

export function togglePin(chatId: string, messageId: string) {
  const pinned = { ...prefs.pinned };
  if (pinned[chatId] === messageId) delete pinned[chatId];
  else pinned[chatId] = messageId;
  prefs = { ...prefs, pinned };
  save();
}

/** Delete for me: hidden on this device only. */
export function hideMessage(chatId: string, messageId: string) {
  prefs = { ...prefs, hidden: [keyOf(chatId, messageId), ...prefs.hidden].slice(0, 2000) };
  save();
}

export const isStarred = (p: Prefs, chatId: string, messageId: string) => p.starred.includes(keyOf(chatId, messageId));
export const isHidden = (p: Prefs, chatId: string, messageId: string) => p.hidden.includes(keyOf(chatId, messageId));
