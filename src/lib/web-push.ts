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

export const VAPID_PUBLIC_KEY = 'BCk5aBexMixVfqDa-M2BoJzVIhYj2lQwkGfVFvu9977rvGTmrJ0A96VGT9V8HgOSjDa4Qj7J6mG-96n9L-uQ4HQ';

const MAX_DEVICES = 5;
const emulator = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR === '1';

const supported = () =>
  Platform.OS === 'web' && typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function keyBytes(base64: string) {
  const padded = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

/** Why the last registerWebPush() failed (null when it worked or was skipped). */
export let webPushError: string | null = null;

type Device = { endpoint: string; keys: { p256dh: string; auth: string }; at: number; tz?: number };

/** Minutes behind UTC (e.g. 0 in UTC, -60 in UTC+1): lets the server send streak reminders at a sensible local hour. */
const timeZoneOffset = () => new Date().getTimezoneOffset();

/** Registers this browser for push and saves it on the account (call when alerts are on). */
export async function registerWebPush() {
  webPushError = null;
  if (!supported() || emulator || Notification.permission !== 'granted') return false;
  // After a reload the signed-in user is restored a moment later; without waiting,
  // the phone was never re-registered and a rotated push address stayed dead.
  await auth.authStateReady();
  const uid = auth.currentUser?.uid;
  if (!uid) return false;
  try {
    const registration = await Promise.race([navigator.serviceWorker.ready, new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))]);
    if (!registration) { webPushError = 'The background service is not ready yet. Close and reopen the app, then try again.'; return false; }
    const serverKey = keyBytes(VAPID_PUBLIC_KEY);
    let subscription = await registration.pushManager.getSubscription();
    // A subscription made with an older push key can never be reached by the server's current key,
    // so replace it quietly (learners do not have to turn alerts off and on again).
    const savedKey = subscription?.options?.applicationServerKey;
    if (subscription && savedKey) {
      const saved = new Uint8Array(savedKey);
      const same = saved.length === serverKey.length && saved.every((byte, index) => byte === serverKey[index]);
      if (!same) {
        await subscription.unsubscribe();
        subscription = null;
      }
    }
    subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: serverKey });
    const json = subscription.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) { webPushError = 'This device returned an incomplete push address.'; return false; }
    const ref = doc(db, 'users', uid);
    const existing = ((await getDoc(ref)).data()?.webPush ?? []) as Device[];
    // Already saved as this account's newest device: nothing to write.
    if (existing[0]?.endpoint === json.endpoint && existing[0]?.tz === timeZoneOffset()) return true;
    const devices = [{ endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth }, at: Date.now(), tz: timeZoneOffset() }, ...existing.filter((device) => device?.endpoint && device.endpoint !== json.endpoint)].slice(0, MAX_DEVICES);
    await setDoc(ref, { webPush: devices }, { merge: true });
    return true;
  } catch (error) {
    webPushError = error instanceof Error ? error.message : 'Could not register this device for push.';
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
    await subscription.unsubscribe().catch(() => { });
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

/** A battle challenge I just sent to `to` (their phone is alerted). */
export async function announceBattle(battleId: string, to: string) {
  await announce({ kind: 'battle', battle: battleId, to });
}

/** I just played (or declined) a battle: tell the other player how it went. */
export async function announceBattleResult(battleId: string, to: string) {
  await announce({ kind: 'battle-result', battle: battleId, to });
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
/** Sends a test push to this account's devices; returns a plain-words result. */
export async function sendTestPush(): Promise<string> {
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return 'Please sign in again.';
    const response = await fetch(`${SERVER}/api/push`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ kind: 'test' }) });
    const data = (await response.json().catch(() => ({}))) as { error?: string; sent?: number; registered?: number; devices?: { host: string; status: number; detail?: string }[] };
    if (!response.ok) return data.error ?? `The server answered ${response.status}.`;
    if (!data.registered) return 'No device is registered on your account yet. Turn notifications off and on again in this app.';
    const failed = (data.devices ?? []).filter((device) => device.status < 200 || device.status >= 300);
    if (!failed.length) return `Sent to ${data.sent} device(s). If nothing arrives within a minute, check iPhone Settings → Notifications → GrAte Apex Hub.`;
    return `Push failed: ${failed.map((device) => `${device.host} ${device.status}${device.detail ? ` (${device.detail})` : ''}`).join('; ')}`;
  } catch {
    return 'Could not reach the server.';
  }
}
