// Shared, side-effect-free helpers for the push functions (api/push.mjs and
// api/reminders.mjs). The leading underscore keeps Vercel from turning this
// file into a route. Everything here is plain logic with no network calls, so
// tests/push-logic.test.mjs can check it.
//
// Some rules are copies of the app's own (src/data/battles.ts, ranks.ts,
// leagues.ts, progression.ts). The test compares them with the real ones, so
// if the app's rules change the test fails and tells you to update this file.

// ── Push addresses ────────────────────────────────────────────────────
// Only real browser push services are ever contacted.
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /\.push\.services\.mozilla\.com$/, /\.notify\.windows\.com$/, /^web\.push\.apple\.com$/, /\.push\.apple\.com$/];

export const pushAddress = (endpoint) => {
  try {
    const url = new URL(endpoint);
    return url.protocol === 'https:' && PUSH_HOSTS.some((host) => host.test(url.hostname));
  } catch {
    return false;
  }
};

export const USER_ID = /^[A-Za-z0-9]{6,64}$/;
export const BATTLE_ID = /^b[a-z0-9]{6,30}$/;

// ── Battles ───────────────────────────────────────────────────────────

/** A side of a battle as stored by the app: { score, total, seconds }, or null. */
export function battleSide(value) {
  return value && typeof value.score === 'number' && typeof value.total === 'number'
    ? { score: value.score, total: value.total, seconds: Number(value.seconds) || 0 }
    : null;
}

/** Higher score wins, then the faster time (1 second or more); otherwise a draw. Null until both played. */
export function battleWinner(challenger, opponent) {
  if (!challenger || !opponent) return null;
  if (challenger.score !== opponent.score) return challenger.score > opponent.score ? 'challenger' : 'opponent';
  if (Math.abs(challenger.seconds - opponent.seconds) >= 1) return challenger.seconds < opponent.seconds ? 'challenger' : 'opponent';
  return 'draw';
}

/**
 * What to tell a player about a battle the OTHER player just played (or declined).
 * Returns { title, body } or null when there is nothing worth a push.
 */
export function battleResultMessage({ recipientIsChallenger, senderName, course, challenger, opponent, declined }) {
  const them = senderName ? `@${senderName}` : 'Your friend';
  const where = String(course ?? 'Battle').slice(0, 40);
  if (declined) return recipientIsChallenger ? { title: `${them} declined your battle`, body: where } : null;
  if (challenger && opponent) {
    const winner = battleWinner(challenger, opponent);
    const mine = recipientIsChallenger ? challenger : opponent;
    const theirs = recipientIsChallenger ? opponent : challenger;
    const line = `${where} · you ${mine.score}/${mine.total} (${mine.seconds}s) · ${them} ${theirs.score}/${theirs.total} (${theirs.seconds}s)`;
    if (winner === 'draw') return { title: `Battle drawn with ${them}`, body: line };
    const iWon = (winner === 'challenger') === recipientIsChallenger;
    return { title: iWon ? `You won the battle against ${them}` : `${them} won the battle`, body: line };
  }
  // The opponent has played and the challenger has not (yet).
  if (recipientIsChallenger && opponent) return { title: `${them} played your battle`, body: `Play yours to see who wins · ${where}` };
  return null;
}

// ── Streaks ───────────────────────────────────────────────────────────

const pad = (n) => String(n).padStart(2, '0');

/**
 * The learner's local calendar day ('YYYY-MM-DD', the same format the app saves
 * in lastActivityDate) and hour, from a time and their browser's time zone offset
 * (Date.getTimezoneOffset(): minutes behind UTC, so 0 in UTC and -60 in UTC+1).
 */
export function localDay(time, tzOffsetMinutes = 0) {
  const d = new Date(time - (Number(tzOffsetMinutes) || 0) * 60_000);
  return { key: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`, hour: d.getUTCHours() };
}

/**
 * True when the streak is alive but today's lesson is still missing: the last
 * activity was yesterday (the app's own "continueToday" status).
 */
export function streakAtRisk(streak, lastActivityDate, now, tzOffsetMinutes = 0) {
  if (!(streak > 0) || typeof lastActivityDate !== 'string') return false;
  return lastActivityDate === localDay(now - 86_400_000, tzOffsetMinutes).key;
}

/** Streak reminders go out in the learner's late afternoon or evening, never at night. */
export const REMINDER_HOURS = { from: 15, to: 21 };
export const inReminderHours = (hour) => hour >= REMINDER_HOURS.from && hour <= REMINDER_HOURS.to;

// ── Leagues ───────────────────────────────────────────────────────────

export const LEAGUE_NAMES = ['Bronze', 'Silver', 'Gold', 'Sapphire', 'Ruby', 'Emerald', 'Amethyst', 'Pearl', 'Obsidian', 'Diamond'];
export const LEAGUE_SHARE = { promotion: 0.2, relegation: 0.2 };

/** Monday 00:00 UTC of the week containing `time`, as 'YYYY-MM-DD' (the week the league rows are filed under). */
export function leagueWeek(time) {
  const d = new Date(time);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** 'promoted' | 'stays' | 'relegated' for a position (1 = best) among `size` learners. */
export function leagueOutcome(position, size, weeklyXp = 1) {
  if (size <= 0 || position < 1 || position > size) return 'stays';
  const promoted = Math.floor(size * LEAGUE_SHARE.promotion);
  const relegated = Math.floor(size * LEAGUE_SHARE.relegation);
  if (position <= promoted) return weeklyXp <= 0 ? 'stays' : 'promoted';
  if (position > size - relegated) return 'relegated';
  return 'stays';
}

/**
 * The end-of-week league push for one learner, or null.
 * `rows` is everyone in the learner's tier: [{ uid, weeklyXp }].
 */
export function leagueNudge(rows, uid, tier) {
  const ordered = [...rows].sort((a, b) => b.weeklyXp - a.weeklyXp); // stable: ties keep their order
  const size = ordered.length;
  const index = ordered.findIndex((row) => row.uid === uid);
  if (index < 0) return null;
  const promotedCount = Math.floor(size * LEAGUE_SHARE.promotion);
  const relegatedCount = Math.floor(size * LEAGUE_SHARE.relegation);
  if (promotedCount === 0 && relegatedCount === 0) return null; // too small a league to promote anyone
  const position = index + 1;
  const mine = ordered[index].weeklyXp;
  const name = `${LEAGUE_NAMES[tier] ?? 'League'} League`;
  const place = `#${position} of ${size} in ${name}`;

  if (position <= promotedCount && mine > 0) {
    return { title: 'You are in the promotion zone', body: `${place}. Keep your place until the week ends to move up.` };
  }
  if (tier > 0 && relegatedCount > 0 && position > size - relegatedCount) {
    const safe = ordered[size - relegatedCount - 1]?.weeklyXp ?? 0;
    return { title: 'You are close to dropping a league', body: `${place}. ${Math.max(1, safe - mine + 1)} XP lifts you out of the drop zone before the week ends.` };
  }
  if (promotedCount > 0 && mine > 0) {
    const cutoff = ordered[promotedCount - 1].weeklyXp;
    return { title: 'Your league week is almost over', body: `${place}. ${Math.max(1, cutoff - mine + 1)} XP to reach the promotion zone.` };
  }
  return null;
}
