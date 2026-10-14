// POST /api/push  (Authorization: Bearer <the sender's Firebase ID token>)
//   { chat, to }              a new 1:1 message          (kind "dm", the default)
//   { kind: 'group', group }  a new message in a group   (sent to every other member)
//   { kind: 'follow', to }    "started following you"
//   { kind: 'like', post, to }               someone liked your post
//   { kind: 'comment', post, comment, to }   a comment on your post, or a reply to your comment
//
// Sends a push to the recipient's phones and computers, so it
// arrives even when GrAte Apex Hub is closed. Nothing is trusted from the
// caller except who they are:
//  - the ID token is verified against Google's keys for the grate-apex project;
//  - the chat and the two learners are read from Firestore WITH THE SENDER'S
//    TOKEN, so the deployed security rules decide what can be read;
//  - the sender must be a member of the chat (or group) and its latest message
//    must be theirs, sent in the last two minutes; the text comes from the chat itself.
//    A follow must be a follow document by the sender, created in the last two minutes;
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

const fieldsOf = (doc) => Object.fromEntries(Object.entries(doc?.fields ?? {}).map(([key, value]) => [key, plain(value)]));

async function read(path, token) {
  const response = await fetch(`${FIRESTORE}/${path}`, { headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) return null;
  return fieldsOf(await response.json());
}

/** Like read(), but also says when the document was created (set by Firestore, so it can't be faked). */
async function readWithTime(path, token) {
  const response = await fetch(`${FIRESTORE}/${path}`, { headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) return null;
  const doc = await response.json();
  return { ...fieldsOf(doc), __created: Date.parse(doc.createTime) };
}

/** The newest message of a group (read with the sender's token, so only a member gets one). */
async function latestGroupMessage(groupId, token) {
  const response = await fetch(`${FIRESTORE}/groups/${groupId}:runQuery`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'messages' }], orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }], limit: 1 } }),
  });
  if (!response.ok) return null;
  const rows = await response.json();
  const doc = rows?.[0]?.document;
  return doc ? fieldsOf(doc) : null;
}

const pushAddress = (endpoint) => {
  try {
    const url = new URL(endpoint);
    return url.protocol === 'https:' && PUSH_HOSTS.some((host) => host.test(url.hostname));
  } catch {
    return false;
  }
};

// Best-effort brake against a client calling again and again (one server instance remembers it for a short while).
const recent = new Map();
function tooSoon(key, ms) {
  const now = Date.now();
  if (recent.size > 500) for (const [k, at] of recent) if (now - at > 60_000) recent.delete(k);
  if (now - (recent.get(key) ?? 0) < ms) return true;
  recent.set(key, now);
  return false;
}

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
  const kind = String(body.kind ?? 'dm');
  const FRESH = 2 * 60_000;
  webpush.setVapidDetails('https://grateapex.vercel.app', publicKey, privateKey);

  /** Sends one payload to everything a person has registered; returns how many pushes went out. */
  async function deliver(recipient, preference, payload) {
    if (recipient?.preferences?.notification_preferences?.[preference] === false) return 0;
    const devices = (Array.isArray(recipient?.webPush) ? recipient.webPush : [])
      .filter((device) => device && pushAddress(device.endpoint) && device.keys?.p256dh && device.keys?.auth)
      .slice(0, 5);
    const results = await Promise.allSettled(
      devices.map((device) => webpush.sendNotification({ endpoint: device.endpoint, keys: { p256dh: device.keys.p256dh, auth: device.keys.auth } }, JSON.stringify(payload), { TTL: 6 * 3600, urgency: 'high' }))
    );
    return results.filter((result) => result.status === 'fulfilled').length;
  }

  if (kind === 'group') {
    const groupId = String(body.group ?? '');
    if (!/^[A-Za-z0-9]{6,64}$/.test(groupId)) return res.status(400).json({ error: 'Bad request.' });
    if (tooSoon(`${sender}:group:${groupId}`, 3_000)) return res.status(429).json({ error: 'Slow down.' });
    // Both reads use the sender's token: the rules only let a member see the group and its messages.
    const group = await read(`groups/${groupId}`, token);
    const members = Array.isArray(group?.memberUids) ? group.memberUids.map(String).slice(0, 20) : [];
    if (!members.includes(sender)) return res.status(403).json({ error: 'Not your group.' });
    const message = await latestGroupMessage(groupId, token);
    if (!message || message.system === true || message.authorUid !== sender || !(Date.now() - Number(message.createdAt) < FRESH)) return res.status(409).json({ error: 'No new message to announce.' });

    const name = typeof message.authorName === 'string' ? message.authorName : 'Someone';
    const text = String(message.text ?? '').slice(0, 140)
      || (message.audio ? 'Sent a recording' : message.doc ? 'Sent a document' : message.media ? 'Sent a photo' : 'Sent a message');
    const payload = {
      title: `@${name} in ${String(group.name ?? 'your group').slice(0, 40)}`,
      body: text,
      tag: `group:${groupId}`,
      href: `/social/message?group=${encodeURIComponent(groupId)}&name=${encodeURIComponent(String(group.name ?? 'Group'))}`,
    };
    const others = members.filter((uid) => uid !== sender && /^[A-Za-z0-9]{6,64}$/.test(uid));
    const counts = await Promise.all(others.map(async (uid) => deliver(await read(`users/${uid}`, token), 'messages', payload)));
    return res.status(200).json({ sent: counts.reduce((total, count) => total + count, 0) });
  }

  if (kind === 'follow') {
    const to = String(body.to ?? '');
    if (!/^[A-Za-z0-9]{6,64}$/.test(to) || to === sender) return res.status(400).json({ error: 'Bad request.' });
    if (tooSoon(`${sender}:follow:${to}`, 60_000)) return res.status(429).json({ error: 'Slow down.' });
    // The follow document's id is "<follower>_<followee>"; its creation time is Firestore's own.
    const follow = await readWithTime(`follows/${sender}_${to}`, token);
    if (!follow || follow.follower !== sender || follow.followee !== to || !(Date.now() - follow.__created < FRESH)) return res.status(409).json({ error: 'No new follow to announce.' });
    const [recipient, profile] = await Promise.all([read(`users/${to}`, token), read(`users/${sender}`, token)]);
    const username = typeof profile?.username === 'string' ? profile.username : null;
    const sent = await deliver(recipient, 'friendRequests', {
      title: username ? `@${username} started following you` : 'New follower',
      body: 'Follow back to become friends, then you can message and battle.',
      tag: `follow:${sender}`,
      href: `/social/person?user=${encodeURIComponent(sender)}`,
    });
    return res.status(200).json({ sent });
  }

  if (kind === 'like' || kind === 'comment') {
    const postId = String(body.post ?? '');
    const to = String(body.to ?? '');
    const ID = /^[A-Za-z0-9]{6,64}$/;
    if (!ID.test(postId) || !ID.test(to) || to === sender) return res.status(400).json({ error: 'Bad request.' });
    if (tooSoon(`${sender}:${kind}:${postId}:${to}`, 30_000)) return res.status(429).json({ error: 'Slow down.' });
    const post = await read(`posts/${postId}`, token);
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    const [recipient, profile] = await Promise.all([read(`users/${to}`, token), read(`users/${sender}`, token)]);
    const username = typeof profile?.username === 'string' ? `@${profile.username}` : 'Someone';
    const subject = String(post.title || post.body || '').slice(0, 100);

    if (kind === 'like') {
      // The like is a document the sender wrote, on a post that belongs to the recipient.
      const like = await readWithTime(`posts/${postId}/likes/${sender}`, token);
      if (post.authorUid !== to || !like || !(Date.now() - like.__created < FRESH)) return res.status(409).json({ error: 'No new like to announce.' });
      const sent = await deliver(recipient, 'socialEngagement', { title: `${username} liked your post`, body: subject, tag: `like:${postId}`, href: '/' });
      return res.status(200).json({ sent });
    }

    // A comment: the sender's own, new, and the recipient is the post's author or the person replied to.
    const commentId = String(body.comment ?? '');
    if (!ID.test(commentId)) return res.status(400).json({ error: 'Bad request.' });
    const comment = await readWithTime(`posts/${postId}/replies/${commentId}`, token);
    if (!comment || comment.authorUid !== sender || !(Date.now() - comment.__created < FRESH)) return res.status(409).json({ error: 'No new comment to announce.' });
    const parent = typeof comment.parentId === 'string' && ID.test(comment.parentId) ? await read(`posts/${postId}/replies/${comment.parentId}`, token) : null;
    const isReply = Boolean(parent) && parent.authorUid === to;
    if (!isReply && post.authorUid !== to) return res.status(403).json({ error: 'Not for them.' });
    const text = String(comment.body ?? '').slice(0, 140) || 'Sent a voice comment';
    const sent = await deliver(recipient, 'socialEngagement', { title: isReply ? `${username} replied to you` : `${username} commented on your post`, body: text, tag: `comment:${postId}`, href: '/' });
    return res.status(200).json({ sent });
  }

  if (kind !== 'dm') return res.status(400).json({ error: 'Bad request.' });
  const chatId = String(body.chat ?? '');
  const to = String(body.to ?? '');
  if (!/^[A-Za-z0-9]{6,64}_[A-Za-z0-9]{6,64}$/.test(chatId) || !/^[A-Za-z0-9]{6,64}$/.test(to) || to === sender) return res.status(400).json({ error: 'Bad request.' });

  const chat = await read(`chats/${chatId}`, token);
  const members = Array.isArray(chat?.members) ? chat.members : [];
  if (!members.includes(sender) || !members.includes(to)) return res.status(403).json({ error: 'Not your chat.' });
  if (chat.lastFrom !== sender || !(Date.now() - Number(chat.lastAt) < FRESH)) return res.status(409).json({ error: 'No new message to announce.' });

  const [recipient, profile] = await Promise.all([read(`users/${to}`, token), read(`users/${sender}`, token)]);
  const username = typeof profile?.username === 'string' ? profile.username : null;
  const text = chat.lastText === 'Voice note' ? 'Sent you a recording' : String(chat.lastText ?? '').slice(0, 140);
  const sent = await deliver(recipient, 'messages', {
    title: username ? `New message from @${username}` : 'New message',
    body: text,
    tag: `chat:${chatId}`,
    href: `/social/message?friend=${encodeURIComponent(sender)}&name=${encodeURIComponent(username ?? 'Friend')}`,
  });
  return res.status(200).json({ sent });
}
