// GET /api/reminders   (run once a day by Vercel Cron, see vercel.json)
//   Authorization: Bearer <CRON_SECRET>      (Vercel adds this itself when CRON_SECRET is set)
//   ?job=streak | league   run only one job (for testing); default: streak every day, league on Sundays
//   ?dry=1                 count who WOULD be alerted, send nothing
//
// Two scheduled pushes that no learner's app can send for itself, because the
// app is closed when they are due:
//  - STREAK: "your N-day streak is at risk" for learners whose last lesson was
//    yesterday, sent in their own late afternoon or evening (their browser's time
//    zone is saved with the device in registerWebPush; UTC if unknown).
//  - LEAGUE (Sundays): where they stand in this week's league, whether they are in
//    the promotion zone, close to dropping, or how many XP from promotion.
//
// Unlike api/push.mjs this does not act for a signed-in learner, so it needs
// permission to read every learner's data: a Firebase service account, saved in
// Vercel as FIREBASE_SERVICE_ACCOUNT (the whole JSON file, or that JSON in base64).
// Learners' notification switches (Settings → Notifications: Streak reminders,
// League) are honoured. Deliveries use the same push keys as api/push.mjs.
import { importPKCS8, SignJWT } from 'jose';
import webpush from 'web-push';

import { inReminderHours, leagueNudge, leagueWeek, localDay, pushAddress, streakAtRisk } from './_push-logic.mjs';

const PROJECT = 'grate-apex';
const DB = `projects/${PROJECT}/databases/(default)/documents`;
const FIRESTORE = `https://firestore.googleapis.com/v1/${DB}`;
const MAX_PUSHES = 2000; // a safety stop for one run

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
const idOf = (doc) => String(doc.name).split('/').pop();

// ── Permission to read everything (service account → short-lived token) ──
function serviceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    const account = JSON.parse(text);
    return account.client_email && account.private_key ? account : null;
  } catch {
    return null;
  }
}

async function adminToken(account) {
  const key = await importPKCS8(account.private_key, 'RS256');
  const assertion = await new SignJWT({ scope: 'https://www.googleapis.com/auth/datastore' })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(account.client_email)
    .setSubject(account.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(key);
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  if (!response.ok) throw new Error(`Google refused the service account (${response.status}).`);
  return (await response.json()).access_token;
}

const api = (token, path, init = {}) => fetch(`${FIRESTORE}${path}`, { ...init, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' } });

/** Every document of a collection, only the named fields, a page at a time. */
async function listAll(token, collection, fields) {
  const out = [];
  let pageToken = '';
  do {
    const mask = fields.map((field) => `mask.fieldPaths=${encodeURIComponent(field)}`).join('&');
    const response = await api(token, `/${collection}?pageSize=300&${mask}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`);
    if (!response.ok) throw new Error(`Could not read ${collection} (${response.status}).`);
    const page = await response.json();
    out.push(...(page.documents ?? []));
    pageToken = page.nextPageToken ?? '';
  } while (pageToken && out.length < 20000);
  return out;
}

/** Some documents by id (up to 100 per request), as Map<id, fields>. */
async function getMany(token, collection, ids, fields) {
  const out = new Map();
  for (let i = 0; i < ids.length; i += 100) {
    const response = await api(token, ':batchGet', {
      method: 'POST',
      body: JSON.stringify({ documents: ids.slice(i, i + 100).map((id) => `${DB}/${collection}/${id}`), mask: { fieldPaths: fields } }),
    });
    if (!response.ok) throw new Error(`Could not read ${collection} (${response.status}).`);
    for (const row of await response.json()) if (row.found) out.set(idOf(row.found), fieldsOf(row.found));
  }
  return out;
}

async function leagueMembers(token, week, tier) {
  const response = await api(token, ':runQuery', {
    method: 'POST',
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'users' }],
        where: { compositeFilter: { op: 'AND', filters: [
          { fieldFilter: { field: { fieldPath: 'league.week' }, op: 'EQUAL', value: { stringValue: week } } },
          { fieldFilter: { field: { fieldPath: 'league.tier' }, op: 'EQUAL', value: { integerValue: String(tier) } } },
        ] } },
        select: { fields: ['league', 'webPush', 'preferences.notification_preferences'].map((fieldPath) => ({ fieldPath })) },
        limit: 200, // the same size the app shows
      },
    }),
  });
  if (!response.ok) throw new Error(`Could not read league tier ${tier} (${response.status}).`);
  return (await response.json()).filter((row) => row.document).map((row) => ({ id: idOf(row.document), ...fieldsOf(row.document) }));
}

// ── Sending ───────────────────────────────────────────────────────────
/** Devices to alert for this learner, or [] when they switched this kind off. */
function devicesFor(user, preference) {
  if (user?.preferences?.notification_preferences?.[preference] === false) return [];
  return (Array.isArray(user?.webPush) ? user.webPush : [])
    .filter((device) => device && pushAddress(device.endpoint) && device.keys?.p256dh && device.keys?.auth)
    .slice(0, 5);
}

async function send(devices, payload) {
  const results = await Promise.allSettled(
    devices.map((device) => webpush.sendNotification({ endpoint: device.endpoint, keys: { p256dh: device.keys.p256dh, auth: device.keys.auth } }, JSON.stringify(payload), { TTL: 4 * 3600, urgency: 'normal' }))
  );
  return results.filter((result) => result.status === 'fulfilled').length;
}

async function markStreakPush(token, uid, key) {
  try {
    await api(token, `/users/${uid}?updateMask.fieldPaths=streakPushDay`, { method: 'PATCH', body: JSON.stringify({ fields: { streakPushDay: { stringValue: key } } }) });
  } catch {
    // worst case the learner is reminded again on the next run
  }
}

/** Sends in small groups so one slow push service cannot stall the run. */
async function sendAll(jobs, dry) {
  let learners = 0;
  let pushes = 0;
  for (let i = 0; i < jobs.length && pushes < MAX_PUSHES; i += 25) {
    const group = jobs.slice(i, i + 25);
    learners += group.length;
    if (dry) continue;
    const counts = await Promise.all(group.map((job) => send(job.devices, job.payload)));
    pushes += counts.reduce((total, count) => total + count, 0);
    // Remember that today's reminder went out, so a later run the same day does not send it again.
    await Promise.all(group.map((job, index) => (job.mark && counts[index] > 0 ? markStreakPush(job.mark.token, job.mark.uid, job.mark.key) : null)));
  }
  return { learners, pushes };
}

// ── The two jobs ──────────────────────────────────────────────────────
async function streakJob(token, now) {
  const progress = await listAll(token, 'progress', ['streak', 'lastActivityDate']);
  // Only learners whose last lesson was within the last few days can have a streak at risk
  // ('YYYY-MM-DD' dates compare correctly as text; 3 days leaves room for every time zone).
  const since = localDay(now - 3 * 86_400_000, 0).key;
  const candidates = progress
    .map((doc) => ({ id: idOf(doc), ...fieldsOf(doc) }))
    .filter((item) => item.streak > 0 && typeof item.lastActivityDate === 'string' && item.lastActivityDate >= since);
  const users = await getMany(token, 'users', candidates.map((item) => item.id), ['webPush', 'preferences.notification_preferences', 'streakPushDay']);
  const jobs = [];
  for (const item of candidates) {
    const user = users.get(item.id);
    const devices = devicesFor(user, 'streakReminders');
    if (!devices.length) continue;
    const tz = typeof devices[0].tz === 'number' ? devices[0].tz : 0;
    const { key, hour } = localDay(now, tz);
    const wanted = typeof devices[0].hour === 'number' ? devices[0].hour : undefined; // the learner's chosen hour, if any
    if (!inReminderHours(hour, wanted) || !streakAtRisk(item.streak, item.lastActivityDate, now, tz) || user?.streakPushDay === key) continue;
    jobs.push({
      devices,
      mark: { token, uid: item.id, key },
      payload: {
        title: `Your ${item.streak}-day streak is at risk`,
        body: 'Complete a lesson today to keep it going.',
        tag: `streak:${key}`,
        href: '/learn',
      },
    });
  }
  return { candidates: candidates.length, jobs };
}

async function leagueJob(token, now) {
  const week = leagueWeek(now);
  const jobs = [];
  let members = 0;
  for (let tier = 0; tier < 10; tier++) {
    const people = await leagueMembers(token, week, tier);
    if (people.length < 2) continue;
    members += people.length;
    const scores = await getMany(token, 'scores', people.map((person) => person.id), ['xp']);
    // Weekly XP the way the league screen counts it for everyone else: lifetime XP − the week's start point.
    const rows = people.map((person) => {
      const entry = person.league ?? {};
      const trusted = Number(entry.startXp) > 0 || typeof entry.weeklyXp === 'number';
      return { uid: person.id, weeklyXp: trusted ? Math.max(0, (Number(scores.get(person.id)?.xp) || 0) - (Number(entry.startXp) || 0)) : 0 };
    });
    for (const person of people) {
      const devices = devicesFor(person, 'league');
      if (!devices.length) continue;
      const message = leagueNudge(rows, person.id, tier);
      if (message) jobs.push({ devices, payload: { ...message, tag: `league:${week}`, href: '/social' } });
    }
  }
  return { week, members, jobs };
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(503).json({ error: 'Set CRON_SECRET in Vercel first.' });
  if (req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: 'Not allowed.' });
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return res.status(503).json({ error: 'Push notifications are not set up.' });
  const account = serviceAccount();
  if (!account) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    return res.status(503).json({ error: raw ? `FIREBASE_SERVICE_ACCOUNT is set (${raw.length} characters) but could not be read as a service account.` : 'Set FIREBASE_SERVICE_ACCOUNT in Vercel first (the running deployment does not have it).' });
  }

  const now = Date.now();
  const dry = req.query?.dry === '1';
  const only = typeof req.query?.job === 'string' ? req.query.job : '';
  const runStreak = only ? only === 'streak' : true;
  const runLeague = only ? only === 'league' : new Date(now).getUTCDay() === 0; // Sundays
  webpush.setVapidDetails('https://grateapex.vercel.app', publicKey, privateKey);

  const report = { dry };
  try {
    const token = await adminToken(account);
    if (runStreak) {
      const { candidates, jobs } = await streakJob(token, now);
      report.streak = { checked: candidates, ...(await sendAll(jobs, dry)) };
    }
    if (runLeague) {
      const { week, members, jobs } = await leagueJob(token, now);
      report.league = { week, members, ...(await sendAll(jobs, dry)) };
    }
  } catch (problem) {
    return res.status(500).json({ error: problem instanceof Error ? problem.message : 'The reminders failed.', ...report });
  }
  return res.status(200).json(report);
}
