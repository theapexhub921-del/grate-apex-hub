# Push notifications (phone and computer alerts, even when the app is closed)

Two functions send them. Both use the same push keys (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`) and
honour each learner's switches in Settings → Notifications.

| Push | Who sends it | When | Switch |
| --- | --- | --- | --- |
| New message, group message | `api/push.mjs` (the sender's app asks for it) | right after sending | Messages |
| Follow, like, comment | `api/push.mjs` | right after the action | Friend requests / Social engagement |
| **Battle challenge** ("@x challenged you") | `api/push.mjs`, `kind: 'battle'` | when the challenge is sent | Battles |
| **Battle result** (won / lost / drawn / declined / "played your battle") | `api/push.mjs`, `kind: 'battle-result'` | when the other player finishes or declines | Battles |
| **Streak at risk** ("Your 5-day streak is at risk") | `api/reminders.mjs` (Vercel Cron) | every day, in the learner's 15:00–21:00 | Streak reminders |
| **Review due** ("12 topics are ready to review") | `api/reminders.mjs` (Vercel Cron) | daily, 15:00–21:00 local, when at least 5 topics are due, they have not studied today, no streak reminder is needed, and not two days in a row | Learning reminders |
| **League standing** (promotion zone / close to dropping / XP to promotion) | `api/reminders.mjs` (Vercel Cron) | Sundays, same run | League |
| **Weekly summary** ("1,240 XP · 86 questions answered · 5-day streak") | `api/reminders.mjs` (Vercel Cron) | Sundays: once a week, in the learner's own Sunday 15:00–21:00, only if they studied that week | Weekly summary |

`api/push.mjs` acts for a signed-in learner and checks everything with that learner's own token.
Streaks and leagues cannot work that way (the app is closed when they are due), so `api/reminders.mjs`
runs on a schedule and reads every learner's data with a Firebase **service account**.

## One-time setup for streak and league reminders

1. Firebase console → Project settings → Service accounts → **Generate new private key** (a JSON file).
2. Vercel → Settings → Environment Variables, add (then redeploy):
   * `FIREBASE_SERVICE_ACCOUNT` = the whole JSON file (or that JSON in base64)
   * `CRON_SECRET` = any long random text (Vercel sends it to the cron itself)
3. `vercel.json` already schedules `/api/reminders` daily at 18:00 UTC (Vercel's free plan runs a
   cron once a day, within about an hour of that time). Change the time in `vercel.json` to suit
   your learners; streak reminders only go out when it is 15:00–21:00 where the learner is, so a
   learner far from the cron's time zone may miss that day's reminder.

Keep the service account private: it can read and write the whole database. Never put it in the app.

### Trying it without alerting anyone

```
curl -H "Authorization: Bearer <CRON_SECRET>" "https://grateapex.vercel.app/api/reminders?job=streak&dry=1"
curl -H "Authorization: Bearer <CRON_SECRET>" "https://grateapex.vercel.app/api/reminders?job=league&dry=1"
curl -H "Authorization: Bearer <CRON_SECRET>" "https://grateapex.vercel.app/api/reminders?job=weekly&dry=1"
```

`dry=1` only counts who would be alerted. Leave it out to really send. Leave `job` out to run what
the cron runs (streak daily, league on Sundays).

## Rules the server copies from the app

`api/_push-logic.mjs` copies a few rules (who wins a battle, the top/bottom 20% of a league, what
counts as "streak at risk", league names). `tests/push-logic.test.mjs` compares them with the app
(`ranks.ts`, `progression.ts`, `leagues.ts`, `battles.ts`) and fails if the app changes and the copy
does not. If it fails, update `api/_push-logic.mjs` to match.

## What the weekly summary says

* **Questions answered**: the sum of the sizes of the learner's quiz attempts since their Monday
  (`progress/{uid}/attempts`, `completedAt` and `total`).
* **XP**: lifetime XP minus the start-of-week point in their league entry, so it is only known once the
  learner has opened the League this week. When it is unknown the XP is left out, never guessed.
* **Streak**: the current streak, only while it is alive (studied today or yesterday).
* Parts that are zero or unknown are left out, and a learner with nothing to report gets no message.
* Sent once per learner per week (`users/{uid}.weeklyPushWeek` remembers the Monday it was sent for).
  It is checked per learner against their own time zone, so the daily cron can run it safely.

## Known limits

* A learner's time zone is saved with their device when they turn alerts on (older devices are
  updated the next time the app opens). Unknown time zone counts as UTC.
* The league job uses the Monday-to-Sunday week in UTC; for learners far from UTC the week can
  differ by a few hours around the weekend.
* Scores and battle results are written by each player's own app (as before), so the push says
  what the stored results say; it does not make them tamper-proof.
