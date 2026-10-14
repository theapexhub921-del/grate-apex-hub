import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  battleResultMessage, battleWinner, inReminderHours, leagueNudge, leagueOutcome, leagueWeek, localDay, LEAGUE_NAMES, pushAddress, streakAtRisk,
} from '../api/_push-logic.mjs';
import { getLeagueOutcome } from '../src/data/ranks.ts';
import { getStreakStatus } from '../src/data/progression.ts';

// ── The server's copies of the app's rules must not drift ─────────────
// (leagues.ts and battles.ts talk to Firebase, so they are read as text, not imported.)
test('league names match the app’s tiers', () => {
  const source = readFileSync(new URL('../src/data/leagues.ts', import.meta.url), 'utf8');
  const tiers = [...source.matchAll(/\{ name: '(\w+)', emoji/g)].map((match) => match[1]);
  assert.deepEqual(LEAGUE_NAMES, tiers);
});

test('battle rules in the app are still the ones the server copies', () => {
  const source = readFileSync(new URL('../src/data/battles.ts', import.meta.url), 'utf8');
  assert.match(source, /a\.score !== b\.score/);
  assert.match(source, /Math\.abs\(a\.seconds - b\.seconds\) >= 1/);
});

test('league outcome matches the app for every position of leagues up to 40', () => {
  for (let size = 1; size <= 40; size++) {
    for (let position = 1; position <= size; position++) assert.equal(leagueOutcome(position, size), getLeagueOutcome(position, size), `${position}/${size}`);
  }
});

test('battle winner: higher score, then the faster time, otherwise a draw', () => {
  const s = (score, seconds) => ({ score, total: 10, seconds });
  assert.equal(battleWinner(null, s(7, 40)), null);
  assert.equal(battleWinner(s(9, 90), s(7, 40)), 'challenger');
  assert.equal(battleWinner(s(6, 20), s(7, 90)), 'opponent');
  assert.equal(battleWinner(s(7, 40), s(7, 60)), 'challenger'); // same score, faster wins
  assert.equal(battleWinner(s(7, 60), s(7, 40)), 'opponent');
  assert.equal(battleWinner(s(7, 40), s(7, 40.4)), 'draw'); // under a second apart
});

test('streak at risk agrees with the app’s "continue today" status', () => {
  const now = new Date(2026, 9, 14, 18).getTime(); // local time, as the app computes it
  const tz = new Date(now).getTimezoneOffset();
  for (const [streak, last] of [[3, '2026-10-14'], [3, '2026-10-13'], [3, '2026-10-12'], [0, '2026-10-13'], [5, null]]) {
    assert.equal(streakAtRisk(streak, last, now, tz), getStreakStatus(streak, last, new Date(now)) === 'continueToday', `${streak} ${last}`);
  }
});

test('the league week is the Monday of the week (UTC)', () => {
  assert.equal(leagueWeek(Date.UTC(2026, 9, 14, 12)), '2026-10-12'); // a Wednesday
  assert.equal(leagueWeek(Date.UTC(2026, 9, 18, 23, 59)), '2026-10-12'); // Sunday night
  assert.equal(leagueWeek(Date.UTC(2026, 9, 19, 0, 0)), '2026-10-19'); // Monday
});

// ── Streak reminders ──────────────────────────────────────────────────
test('the learner’s local day and hour follow their time zone', () => {
  const t = Date.UTC(2026, 9, 14, 23, 30);
  assert.deepEqual(localDay(t, 0), { key: '2026-10-14', hour: 23 });
  assert.deepEqual(localDay(t, -60), { key: '2026-10-15', hour: 0 }); // UTC+1
  assert.deepEqual(localDay(t, 300), { key: '2026-10-14', hour: 18 }); // UTC-5
});

test('a streak is at risk only when the last lesson was yesterday (their day)', () => {
  const t = Date.UTC(2026, 9, 14, 18);
  assert.equal(streakAtRisk(4, '2026-10-13', t, 0), true);
  assert.equal(streakAtRisk(4, '2026-10-14', t, 0), false); // done today
  assert.equal(streakAtRisk(4, '2026-10-12', t, 0), false); // already lost
  assert.equal(streakAtRisk(0, '2026-10-13', t, 0), false);
  // 23:30 UTC is already the 15th for UTC+1, so "yesterday" there is the 14th
  const late = Date.UTC(2026, 9, 14, 23, 30);
  assert.equal(streakAtRisk(4, '2026-10-14', late, -60), true);
  assert.equal(streakAtRisk(4, '2026-10-14', late, 0), false);
});

test('streak reminders stay inside the learner’s evening hours', () => {
  assert.equal(inReminderHours(3), false);
  assert.equal(inReminderHours(15), true);
  assert.equal(inReminderHours(21), true);
  assert.equal(inReminderHours(22), false);
});

// ── League nudges ─────────────────────────────────────────────────────
const league = (...xp) => xp.map((weeklyXp, i) => ({ uid: `u${i + 1}`, weeklyXp }));

test('the top 20% hear they are in the promotion zone', () => {
  const rows = league(500, 400, 300, 200, 100, 90, 80, 70, 60, 50); // 10 learners: 2 promoted, 2 relegated
  assert.match(leagueNudge(rows, 'u1', 2).title, /promotion zone/);
  assert.match(leagueNudge(rows, 'u1', 2).body, /#1 of 10 in Gold League/);
  assert.match(leagueNudge(rows, 'u2', 2).title, /promotion zone/);
});

test('the bottom 20% hear how much XP gets them out of the drop zone (not in Bronze)', () => {
  const rows = league(500, 400, 300, 200, 100, 90, 80, 70, 60, 50);
  const nudge = leagueNudge(rows, 'u10', 2);
  assert.match(nudge.title, /dropping/);
  assert.match(nudge.body, /21 XP/); // 70 (the last safe learner, 8th) − 50 + 1
  assert.doesNotMatch(leagueNudge(rows, 'u10', 0)?.title ?? '', /dropping/); // Bronze cannot be relegated
});

test('the middle hears how far the promotion zone is', () => {
  const rows = league(500, 400, 300, 200, 100, 90, 80, 70, 60, 50);
  assert.match(leagueNudge(rows, 'u4', 1).body, /201 XP to reach the promotion zone/); // 400 − 200 + 1
});

test('no nudge for tiny leagues, learners with no XP in the middle, or someone not in the league', () => {
  assert.equal(leagueNudge(league(10, 5, 1), 'u1', 0), null); // 3 people: nobody can be promoted
  assert.equal(leagueNudge(league(500, 400, 300, 200, 0, 0, 0, 0, 0, 0), 'u5', 1), null); // 5th of 10 with 0 XP: middle, nothing to say
  assert.equal(leagueNudge(league(500, 400, 300, 200, 100), 'someone-else', 1), null);
});

test('a promotion spot with 0 XP is not promotion', () => {
  const rows = league(0, 0, 0, 0, 0);
  assert.equal(leagueNudge(rows, 'u1', 1), null);
});

// ── Battle messages ───────────────────────────────────────────────────
const side = (score, seconds) => ({ score, total: 10, seconds });

test('the challenger hears who won, with both scores', () => {
  const lost = battleResultMessage({ recipientIsChallenger: true, senderName: 'ama', course: 'Anatomy', challenger: side(6, 80), opponent: side(8, 90) });
  assert.equal(lost.title, '@ama won the battle');
  assert.match(lost.body, /you 6\/10 \(80s\) · @ama 8\/10 \(90s\)/);
  const won = battleResultMessage({ recipientIsChallenger: true, senderName: 'ama', course: 'Anatomy', challenger: side(9, 80), opponent: side(8, 90) });
  assert.equal(won.title, 'You won the battle against @ama');
});

test('the opponent hears the result when the challenger finishes second', () => {
  const message = battleResultMessage({ recipientIsChallenger: false, senderName: 'kofi', course: 'Anatomy', challenger: side(9, 80), opponent: side(8, 90) });
  assert.equal(message.title, '@kofi won the battle');
});

test('draws, declines and "played your battle" are worded for the right person', () => {
  assert.match(battleResultMessage({ recipientIsChallenger: true, senderName: 'ama', course: 'x', challenger: side(7, 50), opponent: side(7, 50.4) }).title, /drawn/);
  assert.match(battleResultMessage({ recipientIsChallenger: true, senderName: 'ama', course: 'x', declined: true }).title, /declined/);
  assert.match(battleResultMessage({ recipientIsChallenger: true, senderName: 'ama', course: 'x', challenger: null, opponent: side(7, 50) }).title, /played your battle/);
  // nothing to say to the opponent until the challenger has played too
  assert.equal(battleResultMessage({ recipientIsChallenger: false, senderName: 'kofi', course: 'x', challenger: side(7, 50), opponent: null }), null);
});

// ── Safety ────────────────────────────────────────────────────────────
test('only real browser push services are accepted', () => {
  assert.equal(pushAddress('https://fcm.googleapis.com/fcm/send/abc'), true);
  assert.equal(pushAddress('https://updates.push.services.mozilla.com/wpush/v2/abc'), true);
  assert.equal(pushAddress('https://evil.example.com/steal'), false);
  assert.equal(pushAddress('http://fcm.googleapis.com/x'), false);
  assert.equal(pushAddress('not a url'), false);
});
