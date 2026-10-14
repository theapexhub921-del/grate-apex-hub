// Push notifications that arrive even when GrAte Apex Hub is closed (web app
// on phones and computers). When device alerts are on, this browser registers
// with its push service and its address is kept on the learner's account
// (users/{uid}.webPush, at most five devices). After a message is sent, the
// app asks /api/push (api/push.mjs) to alert the friend's devices.
// The key below is the public half of the push key pair; the private half is
// only in the server's settings.
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Platform } from 'react-native';

import { auth, db } from '@/lib/firebase';

export const VAPID_PUBLIC_KEY = 'BEktVvLyF3GzwpF9Yln_JEXbCp9G0_aAehyiqE24_mAANIM9bG9fQ_M6qV6iKqp40ZRFEknZbNTJyFpwGWOjVjY';

const MAX_DEVICES = 5;
const emulator = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR === '1';

const supported = () =>
  Platform.OS === 'web' && typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function keyBytes(base64: string) {
  const padded = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

type Device = { endpoint: string; keys: { p256dh: string; auth: string }; at: number };

/** Registers this browser for push and saves it on the account (call when alerts are on). */
export async function registerWebPush() {
  if (!supported() || emulator || Notification.permission !== 'granted') return false;
  // After a reload the signed-in user is restored a moment later; without waiting,
  // the phone was never re-registered and a rotated push address stayed dead.
  await auth.authStateReady();
  const uid = auth.currentUser?.uid;
  if (!uid) return false;
  try {
    const registration = await Promise.race([navigator.serviceWorker.ready, new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))]);
    if (!registration) return false;
    const subscription = (await registration.pushManager.getSubscription()) ?? (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }));
    const json = subscription.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;
    const ref = doc(db, 'users', uid);
    const existing = ((await getDoc(ref)).data()?.webPush ?? []) as Device[];
    // Already saved as this account's newest device: nothing to write.
    if (existing[0]?.endpoint === json.endpoint) return true;
    const devices = [{ endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth }, at: Date.now() }, ...existing.filter((device) => device?.endpoint && device.endpoint !== json.endpoint)].slice(0, MAX_DEVICES);
    await setDoc(ref, { webPush: devices }, { merge: true });
    return true;
  } catch {
    return false;
  }
}

/** Stops push on this browser and removes it from the account (when alerts are turned off). */
export async function unregisterWebPush() {
  if (!supported()) return;
  const uid = auth.currentUser?.uid;
  try {
    const registration = await Promise.race([navigator.serviceWorker.ready, new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))]);
    if (!registration) return false;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe().catch(() => {});
    if (!uid) return;
    const ref = doc(db, 'users', uid);
    const existing = ((await getDoc(ref)).data()?.webPush ?? []) as Device[];
    await setDoc(ref, { webPush: existing.filter((device) => device?.endpoint !== endpoint) }, { merge: true });
  } catch {
    // nothing to remove
  }
}

const SERVER = Platform.OS === 'web' ? '' : 'https://grateapex.vercel.app';

/** Asks the server to alert the friend's devices about the message just sent (best effort). */
export async function announceMessage(chatId: string, to: string | null | undefined) {
  if (emulator || !to) return;
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return;
    await fetch(`${SERVER}/api/push`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ chat: chatId, to }) });
  } catch {
    // the in-app notification still reaches them when they open the app
  }
}

/** The same for a message just sent in a group (every other member's devices are alerted). */
export async function announceGroupMessage(groupId: string) {
  await announce({ kind: 'group', group: groupId });
}

/** The same for "started following you". */
export async function announceFollow(to: string) {
  await announce({ kind: 'follow', to });
}

/** A like or a comment/reply on someone's post: { kind: 'like', post, to } or { kind: 'comment', post, comment, to }. */
export async function announceInteraction(body: Record<string, string>) {
  await announce(body);
}

async function announce(body: Record<string, string>) {
  if (emulator) return;
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return;
    await fetch(`${SERVER}/api/push`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  } catch {
    // the in-app notification still reaches them when they open the app
  }
}
