// POST /api/push  { chat, to }  (Authorization: Bearer <the sender's Firebase ID token>)
//
// Sends a "New message" push to the recipient's phones and computers, so it
// arrives even when GrAte Apex Hub is closed. Nothing is trusted from the
// caller except who they are:
//  - the ID token is verified against Google's keys for the grate-apex project;
//  - the chat and the two learners are read from Firestore WITH THE SENDER'S
//    TOKEN, so the deployed security rules decide what can be read;
//  - the sender must be a member of the chat and its latest message must be
//    theirs, sent in the last two minutes; the text comes from the chat itself;
//  - pushes go only to real browser push services (no other addresses).
// The private push key lives in Vercel's settings (VAPID_PRIVATE_KEY).
import { createRemoteJWKSet, jwtVerify } from 'jose';
import webpush from 'web-push';

const PROJECT = 'grate-apex';
const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const KEYS = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /\.push\.services\.mozilla\.com$/, /\.notify\.windows\.com$/, /^web\.push\.apple\.com$/, /\.push\.apple\.com$/];

function plain(value) {
  if (!value || typeof value !== 'object') return undefined;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return Date.parse(value.timestampValue);
  if ('nullValue' in value) return null;
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(plain);
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields ?? {}).map(([key, item]) => [key, plain(item)]));
  return undefined;
}

async function read(path, token) {
  const response = await fetch(`${FIRESTORE}/${path}`, { headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) return null;
  const doc = await response.json();
  return Object.fromEntries(Object.entries(doc.fields ?? {}).map(([key, value]) => [key, plain(value)]));
}

const pushAddress = (endpoint) => {
  try {
    const url = new URL(endpoint);
    return url.protocol === 'https:' && PUSH_HOSTS.some((host) => host.test(url.hostname));
  } catch {
    return false;
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only.' });
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return res.status(503).json({ error: 'Push notifications are not set up.' });

  const token = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  let sender;
  try {
    const { payload } = await jwtVerify(token, KEYS, { issuer: `https://securetoken.google.com/${PROJECT}`, audience: PROJECT });
    sender = payload.sub;
  } catch {
    return res.status(401).json({ error: 'Please sign in again.' });
  }

  let body = req.body ?? {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const chatId = String(body.chat ?? '');
  const to = String(body.to ?? '');
  if (!/^[A-Za-z0-9]{6,64}_[A-Za-z0-9]{6,64}$/.test(chatId) || !/^[A-Za-z0-9]{6,64}$/.test(to) || to === sender) return res.status(400).json({ error: 'Bad request.' });

  const chat = await read(`chats/${chatId}`, token);
  const members = Array.isArray(chat?.members) ? chat.members : [];
  if (!members.includes(sender) || !members.includes(to)) return res.status(403).json({ error: 'Not your chat.' });
  if (chat.lastFrom !== sender || !(Date.now() - Number(chat.lastAt) < 2 * 60_000)) return res.status(409).json({ error: 'No new message to announce.' });

  const [recipient, profile] = await Promise.all([read(`users/${to}`, token), read(`users/${sender}`, token)]);
  if (recipient?.preferences?.notification_preferences?.messages === false) return res.status(200).json({ sent: 0 });
  const devices = (Array.isArray(recipient?.webPush) ? recipient.webPush : [])
    .filter((device) => device && pushAddress(device.endpoint) && device.keys?.p256dh && device.keys?.auth)
    .slice(0, 5);
  if (!devices.length) return res.status(200).json({ sent: 0 });

  const username = typeof profile?.username === 'string' ? profile.username : null;
  const text = chat.lastText === 'Voice note' ? 'Sent you a recording' : String(chat.lastText ?? '').slice(0, 140);
  const payload = JSON.stringify({
    title: username ? `New message from @${username}` : 'New message',
    body: text,
    tag: `chat:${chatId}`,
    href: `/social/message?friend=${encodeURIComponent(sender)}&name=${encodeURIComponent(username ?? 'Friend')}`,
  });

  webpush.setVapidDetails('https://grateapex.vercel.app', publicKey, privateKey);
  const results = await Promise.allSettled(
    devices.map((device) => webpush.sendNotification({ endpoint: device.endpoint, keys: { p256dh: device.keys.p256dh, auth: device.keys.auth } }, payload, { TTL: 6 * 3600, urgency: 'high' }))
  );
  return res.status(200).json({ sent: results.filter((result) => result.status === 'fulfilled').length });
}
