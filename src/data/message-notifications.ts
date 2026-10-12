// New messages as notifications (the bell, device alerts and the in-app
// toast): every unread chat — its last message is from the other person and
// came after I last opened it. Checked every 30 seconds while signed in, and
// whenever the app comes back to the screen. Opening the chat marks it seen,
// so the notification goes away by itself.
import type { Href } from 'expo-router';
import { useSyncExternalStore } from 'react';

import { listMyConversations } from '@/data/community';
import type { AppNotification } from '@/data/notifications';
import { auth } from '@/lib/firebase';

let items: AppNotification[] = [];
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const notify = () => listeners.forEach((listener) => listener());

export async function refreshMessageNotifications() {
  if (!auth.currentUser) {
    if (items.length) { items = []; notify(); }
    return;
  }
  try {
    const chats = await listMyConversations(20);
    const next: AppNotification[] = chats
      .filter((chat) => chat.unread)
      .map((chat) => ({
        id: `msg:${chat.id}:${chat.lastAt}`,
        group: 'updates',
        title: chat.otherName ? `New message from @${chat.otherName}` : 'New message',
        body: chat.lastText === 'Voice note' ? 'Sent you a recording' : chat.lastText,
        at: chat.lastAt,
        href: `/social/message?friend=${encodeURIComponent(chat.otherId)}&name=${encodeURIComponent(chat.otherName ?? 'Friend')}` as Href,
        icon: 'comment',
        tone: 'primary',
      }));
    if (next.map((item) => item.id).join('|') !== items.map((item) => item.id).join('|')) {
      items = next;
      notify();
    }
  } catch {
    // offline: keep the last list
  }
}

let timer: ReturnType<typeof setInterval> | null = null;

/** Starts checking (idempotent); stops when the last screen using it goes away. */
function start() {
  if (timer) return;
  void refreshMessageNotifications();
  timer = setInterval(() => void refreshMessageNotifications(), 30_000);
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible);
}

function onVisible() {
  if (document.visibilityState === 'visible') void refreshMessageNotifications();
}

export function useMessageNotifications(): AppNotification[] {
  return useSyncExternalStore(
    (listener) => {
      start();
      return subscribe(listener);
    },
    () => items,
    () => items
  );
}
