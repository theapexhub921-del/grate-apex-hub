// Battles: two learners answer the SAME questions (same course, same seed);
// the higher score wins, then the faster time; equal is a draw. No XP moves
// between players (owner rule) — the winner gets a small reward from the app.
//
// Works with the rules deployed today, without a server: each player keeps
// their side on their own users/{uid} document (the owner may write it; any
// signed-in learner may read it):
//   challenger → battlesOut.<id> = { opponent, course, seed, count, score?, … }
//                battleTo        = [opponent uids]   (so the opponent can find it)
//   opponent   → battleResults.<id> = { score, total, seconds } | { declined: true }
// Scores are written by each player's own app, so — like XP in both apps —
// they are not tamper-proof; a server referee would be needed for that.
import { arrayUnion, collection, doc, getDoc, getDocs, limit, query, setDoc, where } from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';

export type BattleCourse = { kind: 'hb' | 'topic'; id: string; name: string };
export type BattleSide = { score: number; total: number; seconds: number };

export type Battle = {
  id: string;
  challengerId: string;
  challengerName: string | null;
  opponentId: string;
  opponentName: string | null;
  course: BattleCourse;
  seed: string;
  count: number;
  createdAt: number;
  challenger: BattleSide | null;
  opponent: BattleSide | null;
  declined: boolean;
};

export type BattleStatus = 'waiting-for-you' | 'waiting-for-them' | 'declined' | 'won' | 'lost' | 'draw';

export const BATTLE_QUESTIONS = 10;
export const BATTLE_SECONDS = 15;
export const BATTLE_WIN_XP = 20;
const KEEP = 20;

async function me() {
  await auth.authStateReady();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sign in to battle.');
  return uid;
}

/** Who won: higher score, then less time. Null until both have played. */
export function battleWinner(battle: Pick<Battle, 'challenger' | 'opponent'>): 'challenger' | 'opponent' | 'draw' | null {
  const a = battle.challenger;
  const b = battle.opponent;
  if (!a || !b) return null;
  if (a.score !== b.score) return a.score > b.score ? 'challenger' : 'opponent';
  if (Math.abs(a.seconds - b.seconds) >= 1) return a.seconds < b.seconds ? 'challenger' : 'opponent';
  return 'draw';
}

export function battleStatus(battle: Battle, uid: string): BattleStatus {
  const mine = battle.challengerId === uid ? 'challenger' : 'opponent';
  if (battle.declined) return 'declined';
  const winner = battleWinner(battle);
  if (winner) return winner === 'draw' ? 'draw' : winner === mine ? 'won' : 'lost';
  return (mine === 'challenger' ? battle.challenger : battle.opponent) ? 'waiting-for-them' : 'waiting-for-you';
}

export function battleRecord(battles: readonly Battle[], uid: string) {
  const record = { wins: 0, losses: 0, draws: 0 };
  for (const battle of battles) {
    const status = battleStatus(battle, uid);
    if (status === 'won') record.wins++;
    else if (status === 'lost') record.losses++;
    else if (status === 'draw') record.draws++;
  }
  return record;
}

const side = (value: unknown): BattleSide | null => {
  const v = value as Partial<BattleSide> | null | undefined;
  return v && typeof v.score === 'number' && typeof v.total === 'number' ? { score: v.score, total: v.total, seconds: Number(v.seconds) || 0 } : null;
};

function fromOut(id: string, challengerId: string, challengerName: string | null, out: Record<string, unknown>, results: Record<string, unknown> | undefined): Battle {
  const course = out.course as BattleCourse;
  const reply = (results?.[id] ?? null) as Record<string, unknown> | null;
  return {
    id,
    challengerId,
    challengerName,
    opponentId: String(out.opponent),
    opponentName: (out.opponentName as string) ?? null,
    course,
    seed: String(out.seed),
    count: Number(out.count) || BATTLE_QUESTIONS,
    createdAt: Number(out.createdAt) || 0,
    challenger: side(out.result),
    opponent: reply && !reply.declined ? side(reply) : null,
    declined: Boolean(reply?.declined),
  };
}

/** My battles: the ones I sent, and the ones sent to me. Newest first. */
export async function listBattles(): Promise<Battle[]> {
  const uid = await me();
  const mine = (await getDoc(doc(db, 'users', uid))).data() ?? {};
  const out: Battle[] = [];
  // Sent by me: their replies are on the opponent's document.
  const sent = Object.entries((mine.battlesOut ?? {}) as Record<string, Record<string, unknown>>);
  const opponents = [...new Set(sent.map(([, value]) => String(value.opponent)))];
  const opponentDocs = new Map(await Promise.all(opponents.map(async (id) => [id, (await getDoc(doc(db, 'users', id)).catch(() => null))?.data() ?? {}] as const)));
  for (const [id, value] of sent) out.push(fromOut(id, uid, mine.username ?? null, value, opponentDocs.get(String(value.opponent))?.battleResults));
  // Sent to me: on the challengers' documents.
  const incoming = await getDocs(query(collection(db, 'users'), where('battleTo', 'array-contains', uid), limit(40))).catch(() => null);
  for (const item of incoming?.docs ?? []) {
    const data = item.data();
    for (const [id, value] of Object.entries((data.battlesOut ?? {}) as Record<string, Record<string, unknown>>)) {
      if (String(value.opponent) === uid) out.push(fromOut(id, item.id, data.username ?? null, value, mine.battleResults));
    }
  }
  return out.sort((a, b) => b.createdAt - a.createdAt);
}

/** Sends a challenge: same course, same questions for both. */
export async function createBattle(opponent: { userId: string; username: string | null }, course: BattleCourse): Promise<Battle> {
  const uid = await me();
  if (opponent.userId === uid) throw new Error('Challenge someone else.');
  const ref = doc(db, 'users', uid);
  const data = (await getDoc(ref)).data() ?? {};
  const id = `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const entry = { opponent: opponent.userId, opponentName: opponent.username, course, seed: id, count: BATTLE_QUESTIONS, createdAt: Date.now() };
  // Keep the newest few (the document is shared with the original app — stay small).
  const kept = Object.entries((data.battlesOut ?? {}) as Record<string, { createdAt?: number }>)
    .sort((a, b) => (b[1].createdAt ?? 0) - (a[1].createdAt ?? 0))
    .slice(0, KEEP - 1);
  await setDoc(ref, { battlesOut: { ...Object.fromEntries(kept), [id]: entry }, battleTo: arrayUnion(opponent.userId) }, { merge: true });
  return fromOut(id, uid, data.username ?? null, entry, undefined);
}

/** Saves my result for a battle (challenger or opponent), once. */
export async function submitBattleResult(battle: Battle, result: BattleSide) {
  const uid = await me();
  const ref = doc(db, 'users', uid);
  if (battle.challengerId === uid) {
    const data = (await getDoc(ref)).data() ?? {};
    const current = (data.battlesOut ?? {})[battle.id];
    if (!current || current.result) return;
    await setDoc(ref, { battlesOut: { [battle.id]: { ...current, result } } }, { merge: true });
  } else {
    await setDoc(ref, { battleResults: { [battle.id]: result } }, { merge: true });
  }
}

export async function declineBattle(battle: Battle) {
  const uid = await me();
  await setDoc(doc(db, 'users', uid), { battleResults: { [battle.id]: { declined: true } } }, { merge: true });
}

export async function getBattle(id: string): Promise<Battle | null> {
  return (await listBattles()).find((battle) => battle.id === id) ?? null;
}
