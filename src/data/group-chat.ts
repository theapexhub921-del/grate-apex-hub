// Group chats like WhatsApp, on the shared groups/{gid} documents (deployed
// rules): a group has a name (2–40), a description (≤200), an owner and up to
// 20 members; the owner adds members one at a time (friends who follow each
// other); a member may leave. Messages: groups/{gid}/messages =
// { authorUid, authorName, text ≤500, media?, audio?, doc?, reply?, fwd?, createdAt },
// members may set their own reaction; only the author may delete.
import { arrayRemove, collection, deleteDoc, deleteField, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';

import type { CommunityMessage } from '@/data/community';
import { auth, db } from '@/lib/firebase';
import { cleanMedia, safeUrl, type Media } from '@/lib/media';

export type GroupInfo = { id: string; name: string; description: string; ownerUid: string; memberUids: string[]; members: Record<string, string | null>; createdAt: number };
export type GroupSummary = GroupInfo & { lastText: string; lastAt: number; lastFrom: string | null; lastName: string | null };

const millis = (value: unknown) => (typeof value === 'number' ? value : (value as { toMillis?: () => number } | null)?.toMillis?.() ?? 0);
const iso = (value: unknown) => new Date(millis(value) || Date.now()).toISOString();

async function myName() {
  await auth.authStateReady();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Please sign in again.');
  const username = (await getDoc(doc(db, 'users', uid))).data()?.username as string | undefined;
  if (!username) throw new Error('Choose a username first.');
  return { uid, username };
}

function infoOf(id: string, d: Record<string, unknown>): GroupInfo {
  return {
    id,
    name: String(d.name ?? 'Group'),
    description: String(d.description ?? ''),
    ownerUid: String(d.ownerUid ?? ''),
    memberUids: Array.isArray(d.memberUids) ? (d.memberUids as string[]) : [],
    members: (d.members as Record<string, string | null>) ?? {},
    createdAt: millis(d.createdAt),
  };
}

export async function getGroup(groupId: string): Promise<GroupInfo | null> {
  const snap = await getDoc(doc(db, 'groups', groupId));
  return snap.exists() ? infoOf(snap.id, snap.data()) : null;
}

/** My groups with their latest message, newest first (for the chats list). */
export async function listMyGroups(): Promise<GroupSummary[]> {
  await auth.authStateReady();
  const uid = auth.currentUser?.uid;
  if (!uid) return [];
  const snap = await getDocs(query(collection(db, 'groups'), where('memberUids', 'array-contains', uid), limit(50)));
  const groups = await Promise.all(snap.docs.map(async (item) => {
    const info = infoOf(item.id, item.data());
    const last = await getDocs(query(collection(db, 'groups', item.id, 'messages'), orderBy('createdAt', 'desc'), limit(1))).catch(() => null);
    const d = last?.docs[0]?.data();
    const lastText = d ? (String(d.text ?? '') || (d.media ? 'Photo' : d.doc ? 'Document' : d.audio ? 'Voice note' : 'Message')) : 'Group created';
    return { ...info, lastText, lastAt: d ? millis(d.createdAt) : info.createdAt, lastFrom: d ? String(d.authorUid ?? '') : null, lastName: d ? ((d.authorName as string) ?? null) : null };
  }));
  return groups.sort((a, b) => b.lastAt - a.lastAt);
}

/** Creates a group (you are its owner) and adds the chosen friends, one at a time as the rules require. */
export async function createGroup(input: { name: string; description: string; memberUids: string[] }) {
  const name = input.name.trim();
  const description = input.description.trim();
  if (name.length < 2 || name.length > 40) throw new Error('Group names are 2–40 characters.');
  if (description.length > 200) throw new Error('Descriptions can be up to 200 characters.');
  const me = await myName();
  const ref = doc(collection(db, 'groups'));
  await setDoc(ref, { ownerUid: me.uid, memberUids: [me.uid], members: { [me.uid]: me.username }, name, description, createdAt: serverTimestamp() });
  const failed: string[] = [];
  for (const uid of input.memberUids.slice(0, 9)) {
    try { await addGroupMember(ref.id, uid); } catch { failed.push(uid); }
  }
  return { id: ref.id, failed };
}

export async function addGroupMember(groupId: string, uid: string) {
  const group = await getGroup(groupId);
  if (!group) throw new Error('This group could not be found.');
  if (group.memberUids.includes(uid)) return;
  if (group.memberUids.length >= 10) throw new Error('A group can have up to 10 members.');
  const username = ((await getDoc(doc(db, 'users', uid))).data()?.username as string) ?? null;
  try {
    await updateDoc(doc(db, 'groups', groupId), { memberUids: [...group.memberUids, uid], [`members.${uid}`]: username });
  } catch (error) {
    if ((error as { code?: string }).code === 'permission-denied') throw new Error('Only the group’s owner can add members, and only friends who follow each other.');
    throw error;
  }
}

export async function leaveGroup(groupId: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  await updateDoc(doc(db, 'groups', groupId), { memberUids: arrayRemove(uid), [`members.${uid}`]: deleteField() });
}

export async function deleteGroup(groupId: string) {
  await deleteDoc(doc(db, 'groups', groupId));
}

export async function listGroupMessages(groupId: string): Promise<(CommunityMessage & { author_name: string | null })[]> {
  const snap = await getDocs(query(collection(db, 'groups', groupId, 'messages'), orderBy('createdAt', 'asc'), limit(300)));
  return snap.docs.map((item) => {
    const d = item.data();
    return {
      id: item.id,
      conversation_id: groupId,
      sender_id: String(d.authorUid ?? ''),
      author_name: (d.authorName as string) ?? null,
      body: String(d.text ?? ''),
      created_at: iso(d.createdAt),
      audio: d.audio && typeof d.audio.url === 'string' ? { url: d.audio.url as string, seconds: Number(d.audio.d) || 0 } : null,
      reply: d.reply && typeof d.reply === 'object' ? { mid: String(d.reply.mid ?? ''), from: String(d.reply.from ?? ''), text: String(d.reply.text ?? '') } : null,
      reactions: d.reactions && typeof d.reactions === 'object' ? (d.reactions as Record<string, string>) : {},
      media: cleanMedia(d.media),
      doc: d.doc && typeof d.doc.url === 'string' && safeUrl(d.doc.url) ? { url: d.doc.url as string, name: String(d.doc.name ?? 'Document') } : null,
      fwd: d.fwd === true,
    };
  });
}

export async function sendGroupMessage(groupId: string, body: string, extras: { reply?: { mid: string; from: string; text: string } | null; fwd?: boolean; media?: Media[]; doc?: { url: string; name: string } | null; audio?: { url: string; seconds: number } | null } = {}) {
  const me = await myName();
  const text = body.trim();
  if (text.length > 500) throw new Error('Messages can be up to 500 characters.');
  if (!text && !extras.media?.length && !extras.doc && !extras.audio) throw new Error('Write a message first.');
  const data: Record<string, unknown> = { authorUid: me.uid, authorName: me.username, text, createdAt: serverTimestamp() };
  if (extras.reply) data.reply = { mid: extras.reply.mid, from: extras.reply.from, text: extras.reply.text.slice(0, 120) };
  if (extras.fwd) data.fwd = true;
  if (extras.media?.length) data.media = extras.media.slice(0, 3).map((item) => ({ t: item.t, url: item.url }));
  if (extras.doc) data.doc = { url: extras.doc.url, name: extras.doc.name.slice(0, 100) };
  if (extras.audio) data.audio = { url: extras.audio.url, d: Math.max(1, Math.min(120, Math.round(extras.audio.seconds))) };
  try {
    await setDoc(doc(collection(db, 'groups', groupId, 'messages')), data);
  } catch (error) {
    if ((error as { code?: string }).code === 'permission-denied') throw new Error('Only members can send messages in this group.');
    throw error;
  }
}

export async function reactToGroupMessage(groupId: string, messageId: string, emoji: string | null) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  await updateDoc(doc(db, 'groups', groupId, 'messages', messageId), { [`reactions.${uid}`]: emoji ?? deleteField() });
}

export async function deleteGroupMessage(groupId: string, messageId: string) {
  await deleteDoc(doc(db, 'groups', groupId, 'messages', messageId));
}
