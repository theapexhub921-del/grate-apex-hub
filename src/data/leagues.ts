// Weekly leagues with everyone (not only friends), with promotion and
// relegation — like other learning apps. Tiers are separate from ranks.
//
// Each learner keeps their league entry on their own users/{uid} document
// (allowed by the deployed rules; readable by any signed-in learner):
//   league = { week, tier, startXp, prev? }
// Weekly XP = current lifetime XP (scores/{uid}.xp, the shared leaderboard)
// − startXp. At the first visit of a new week, each learner settles their own
// last week: their position in their tier → promoted (top 20%), relegated
// (bottom 20%) or stays, and they join the new week in their new tier.
// Like XP in both apps, this is computed by each learner's own app.
import { collection, doc, getDoc, getDocs, limit, query, setDoc, where } from 'firebase/firestore';

import { getLeagueOutcome, type LeagueOutcome } from '@/data/ranks';
import { auth, db } from '@/lib/firebase';
import { getProgressSnapshot, waitForProgressSync } from '@/data/progress';

export const LEAGUE_TIERS = [
  { name: 'Bronze', emoji: '🥉', color: '#C07A3C' },
  { name: 'Silver', emoji: '🥈', color: '#9AA5B8' },
  { name: 'Gold', emoji: '🥇', color: '#E8B21E' },
  { name: 'Sapphire', emoji: '💙', color: '#3B6FE0' },
  { name: 'Ruby', emoji: '❤️', color: '#D63A4A' },
  { name: 'Emerald', emoji: '💚', color: '#1EA672' },
  { name: 'Amethyst', emoji: '💜', color: '#8B5CF6' },
  { name: 'Pearl', emoji: '🤍', color: '#C8C2D8' },
  { name: 'Obsidian', emoji: '🖤', color: '#3A3A44' },
  { name: 'Diamond', emoji: '💎', color: '#4FD1E8' },
] as const;

export type LeagueEntry = { week: string; tier: number; startXp: number; weeklyXp?: number; prev?: { week: string; tier: number; weeklyXp: number; position: number; size: number; outcome: LeagueOutcome } };
export type LeagueRow = { userId: string; username: string | null; weeklyXp: number; isMe: boolean };

/** Monday 00:00 (local) of the week containing `time`, as 'YYYY-MM-DD'. */
export function weekKey(time = Date.now()) {
  const d = new Date(time);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** When this week's league ends (next Monday 00:00 local). */
export function weekEnds(time = Date.now()) {
  const d = new Date(time);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 7);
  return d.getTime();
}

const clampTier = (tier: number) => Math.max(0, Math.min(LEAGUE_TIERS.length - 1, Math.round(tier)));

/** The tier after a finish: one up when promoted, one down when relegated. */
export function nextTier(tier: number, outcome: LeagueOutcome) {
  return clampTier(tier + (outcome === 'promoted' ? 1 : outcome === 'relegated' ? -1 : 0));
}

/** Positions by weekly XP (ties: earlier join keeps order). Promotion needs some XP that week. */
export function standings(rows: readonly LeagueRow[]) {
  return [...rows].sort((a, b) => b.weeklyXp - a.weeklyXp);
}

export function outcomeFor(position: number, size: number, weeklyXp: number): LeagueOutcome {
  const outcome = getLeagueOutcome(position, size);
  return outcome === 'promoted' && weeklyXp <= 0 ? 'stays' : outcome;
}

async function lifetimeXp(uids: readonly string[]) {
  const values = await Promise.all(uids.map((uid) => getDoc(doc(db, 'scores', uid)).then((snap) => ({ uid, xp: Number(snap.data()?.xp) || 0, username: (snap.data()?.username as string) ?? null })).catch(() => ({ uid, xp: 0, username: null }))));
  return new Map(values.map((value) => [value.uid, value]));
}

/** Everyone in a tier for a week, with their weekly XP (live for this week; final for those already moved on). */
async function tierRows(week: string, tier: number, me: string): Promise<LeagueRow[]> {
  const [current, moved] = await Promise.all([
    getDocs(query(collection(db, 'users'), where('league.week', '==', week), where('league.tier', '==', tier), limit(200))).catch(() => null),
    getDocs(query(collection(db, 'users'), where('league.prev.week', '==', week), where('league.prev.tier', '==', tier), limit(200))).catch(() => null),
  ]);
  const live = current?.docs ?? [];
  const xp = await lifetimeXp(live.map((item) => item.id));
  const rows = new Map<string, LeagueRow>();
  for (const item of live) {
    const entry = item.data().league as LeagueEntry;
    const now = xp.get(item.id);
    // A start point of 0 with no weekly figure is an entry made before XP had loaded: count 0 until that learner's app corrects it, never their lifetime XP.
    const trusted = Number(entry.startXp) > 0 || typeof entry.weeklyXp === 'number';
    rows.set(item.id, { userId: item.id, username: (item.data().username as string) ?? now?.username ?? null, weeklyXp: trusted ? Math.max(0, (now?.xp ?? 0) - (Number(entry.startXp) || 0)) : 0, isMe: item.id === me });
  }
  for (const item of moved?.docs ?? []) {
    const prev = (item.data().league as LeagueEntry).prev!;
    if (!rows.has(item.id)) rows.set(item.id, { userId: item.id, username: (item.data().username as string) ?? null, weeklyXp: Math.max(0, Number(prev.weeklyXp) || 0), isMe: item.id === me });
  }
  return [...rows.values()];
}

export type LeagueView = { week: string; tier: number; endsAt: number; rows: LeagueRow[]; prev: LeagueEntry['prev'] | null };

/** This week's league for the signed-in learner (joins Bronze, or settles last week first). */
export async function loadLeague(): Promise<LeagueView> {
  await auth.authStateReady();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sign in to see your league.');
  const week = weekKey();
  const ref = doc(db, 'users', uid);
  const mine = (await getDoc(ref)).data() ?? {};
  let entry = mine.league as LeagueEntry | undefined;
  const myXp = (await lifetimeXp([uid])).get(uid)?.xp ?? 0;

  if (!entry || typeof entry.week !== 'string') {
    entry = { week, tier: 0, startXp: myXp };
    await setDoc(ref, { league: entry }, { merge: true });
  } else if (entry.week !== week) {
    // Settle the week that ended: my place in my tier then.
    const rows = standings(await tierRows(entry.week, entry.tier, uid));
    if (!rows.some((row) => row.isMe)) rows.push({ userId: uid, username: mine.username ?? null, weeklyXp: Math.max(0, myXp - (Number(entry.startXp) || 0)), isMe: true });
    const ordered = standings(rows);
    const position = ordered.findIndex((row) => row.isMe) + 1;
    const weeklyXp = ordered[position - 1]?.weeklyXp ?? 0;
    const outcome = outcomeFor(position, ordered.length, weeklyXp);
    entry = { week, tier: nextTier(entry.tier, outcome), startXp: myXp, prev: { week: entry.week, tier: entry.tier, weeklyXp, position, size: ordered.length, outcome } };
    await setDoc(ref, { league: entry }, { merge: true });
  }
  // My weekly XP comes from my own XP history (earned since Monday), so it is
  // never mixed up with lifetime XP; the start point others use is corrected to
  // match (it was 0 for anyone who joined before their XP had loaded).
  await waitForProgressSync().catch(() => {});
  const monday = new Date(); monday.setHours(0, 0, 0, 0); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const ledgerWeekly = getProgressSnapshot().xpLedger.filter((item) => item.at >= monday.getTime()).reduce((sum, item) => sum + Math.max(0, item.amount), 0);
  const fixedStart = Math.max(0, myXp - ledgerWeekly);
  if (myXp > 0 && (fixedStart !== entry.startXp || entry.weeklyXp !== ledgerWeekly)) {
    entry = { ...entry, startXp: fixedStart, weeklyXp: ledgerWeekly };
    await setDoc(ref, { league: entry }, { merge: true }).catch(() => {});
  }
  const rows = standings((await tierRows(week, entry.tier, uid)).map((row) => (row.isMe ? { ...row, weeklyXp: ledgerWeekly } : row)));
  if (!rows.some((row) => row.isMe)) rows.push({ userId: uid, username: mine.username ?? null, weeklyXp: ledgerWeekly, isMe: true });
  return { week, tier: entry.tier, endsAt: weekEnds(), rows: standings(rows), prev: entry.prev && entry.prev.week !== week ? entry.prev : null };
}
