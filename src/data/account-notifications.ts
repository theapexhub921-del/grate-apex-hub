// Notifications written to my account by other learners (both apps write them):
// users/{uid}/notifications = { type, from, fromName, text?, read, createdAt }.
// like · comment · reply · reshare · follow · message · support. Shown in the
// bell (and as device alerts); follows come with a Follow back button. Read
// marks are saved on the account (the rules let me change only `read`).
import type { Href } from 'expo-router';
import { collection, doc, getDocs, limit, orderBy, query, updateDoc } from 'firebase/firestore';
import { useSyncExternalStore } from 'react';

import type { AppNotification } from '@/data/notifications';
import { auth, db } from '@/lib/firebase';

export type AccountNotification = AppNotification & { kind: string; from: string; fromName: string | null; read: boolean; docId: string };

let items: AccountNotification[] = [];
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

const TITLES: Record<string, (name: string) => string> = {
  follow: (name) => `${name} started following you`,
  like: (name) => `${name} liked your post`,
  comment: (name) => `${name} commented on your post`,
  reply: (name) => `${name} replied to you`,
  reshare: (name) => `${name} reposted your post`,
  message: (name) => `New message from ${name}`,
  support: () => 'Reply from GrAte Apex Hub support',
};

const millis = (value: unknown) => (typeof value === 'number' ? value : (value as { toMillis?: () => number } | null)?.toMillis?.() ?? 0);

export async function refreshAccountNotifications() {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    if (items.length) { items = []; notify(); }
    return;
  }
  try {
    const snap = await getDocs(query(collection(db, 'users', uid, 'notifications'), orderBy('createdAt', 'desc'), limit(40)));
    const next: AccountNotification[] = snap.docs.map((item) => {
      const d = item.data();
      const kind = String(d.type ?? '');
      const name = d.fromName ? `@${d.fromName}` : 'Someone';
      return {
        id: `acct:${item.id}`,
        docId: item.id,
        kind,
        from: String(d.from ?? ''),
        fromName: (d.fromName as string) ?? null,
        read: d.read === true,
        group: 'updates',
        title: (TITLES[kind] ?? (() => `${name} sent you a notification`))(name),
        body: kind === 'follow' ? 'Follow back to become friends — then you can message and battle.' : String(d.text ?? ''),
        at: millis(d.createdAt),
        href: (kind === 'message' ? '/social/messages' : kind === 'follow' ? `/social/person?user=${encodeURIComponent(String(d.from ?? ''))}` : '/') as Href,
        icon: kind === 'follow' ? 'profile' : kind === 'like' ? 'heart' : kind === 'reshare' ? 'repost' : kind === 'message' ? 'comment' : 'comment',
        tone: kind === 'follow' ? 'gold' : 'primary',
      };
    });
    if (JSON.stringify(next.map((n) => [n.id, n.read])) !== JSON.stringify(items.map((n) => [n.id, n.read]))) {
      items = next;
      notify();
    }
  } catch {
    // offline: keep the last list
  }
}

/** Marks notifications read on the account. */
export async function markAccountNotificationsRead(ids: readonly string[]) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const targets = items.filter((item) => ids.includes(item.id) && !item.read);
  if (!targets.length) return;
  items = items.map((item) => (targets.includes(item) ? { ...item, read: true } : item));
  notify();
  await Promise.all(targets.map((item) => updateDoc(doc(db, 'users', uid, 'notifications', item.docId), { read: true }).catch(() => {})));
}

let timer: ReturnType<typeof setInterval> | null = null;
function start() {
  if (timer) return;
  // Right after sign-in too (the first check may run before the account is ready).
  auth.onAuthStateChanged(() => void refreshAccountNotifications());
  void refreshAccountNotifications();
  timer = setInterval(() => void refreshAccountNotifications(), 30_000);
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void refreshAccountNotifications(); });
}

export function useAccountNotifications(): AccountNotification[] {
  return useSyncExternalStore((listener) => { start(); listeners.add(listener); return () => { listeners.delete(listener); }; }, () => items, () => items);
}
