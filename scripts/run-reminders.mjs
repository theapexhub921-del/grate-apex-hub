// Runs api/reminders.mjs on YOUR computer (no Vercel), to test the streak and league reminders.
//
//   node --env-file=.env.local scripts/run-reminders.mjs streak        (dry run: counts only, sends nothing)
//   node --env-file=.env.local scripts/run-reminders.mjs league      (also: review, weekly)
//   node --env-file=.env.local scripts/run-reminders.mjs streak send   (REALLY sends the push notifications)
//
// .env.local (never commit it) needs these four lines:
//   CRON_SECRET=anything-you-like
//   VAPID_PUBLIC_KEY=...
//   VAPID_PRIVATE_KEY=...
//   FIREBASE_SERVICE_ACCOUNT=...   (the whole JSON on one line, or the base64 text)
import handler from '../api/reminders.mjs';

const job = ['league', 'review', 'weekly'].includes(process.argv[2]) ? process.argv[2] : 'streak';
const send = process.argv[3] === 'send';

const req = { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` }, query: { job, ...(send ? {} : { dry: '1' }) } };
const res = {
  status(code) { this.code = code; return this; },
  json(body) { console.log(this.code ?? 200, JSON.stringify(body, null, 2)); },
};

console.log(`Running the ${job} reminders ${send ? 'FOR REAL (notifications will be sent)' : 'as a dry run (nothing is sent)'}…`);
await handler(req, res);
