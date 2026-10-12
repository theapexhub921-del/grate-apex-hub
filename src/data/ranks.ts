// GRATEAPEX RANKS — architecture only (not connected to any screen yet).
//
// Ranks are gamification/mastery stages inside GRATEAPEX, inspired by
// medical training. They are NOT professional qualifications and NOT an
// official promotion system.
//
// IMPORTANT: most XP thresholds are intentionally `null` (undecided).
// They will be calculated once the XP economy (lessons, quizzes,
// Apex Challenge, streaks, …) and real earning rates are known.
// Do not fill them in with guesses.
//
// Ranks are DERIVED from lifetime XP whenever needed — never stored —
// so thresholds can be changed here without migrating saved data.

// The final target: lifetime XP needed for the top rank.
export const ULTIMATE_XP_TARGET = 10_000_000;

// Planning targets used when the thresholds are calculated later.
export const PROGRESSION_TARGETS = {
  highlyActiveUserMonths: 3,
  idealDailyHourUserMonths: 6,
} as const;

// The original app's ranks (owner decision, 2026-10-10), Fresher to Immortal.
export type RankId =
  | 'fresher'
  | 'riser'
  | 'scholar'
  | 'sharp'
  | 'elite'
  | 'apex-scholar'
  | 'apex'
  | 'master'
  | 'grandmaster'
  | 'endless'
  | 'paragon'
  | 'ultimate'
  | 'immortal';

export type Rank = {
  id: RankId; // stable ID — names can change, IDs should not
  name: string; // provisional display name
  // Lifetime XP needed to reach this rank. `null` = not decided yet.
  minXp: number | null;
};

// Provisional ladder, lowest to highest. Easy to rename/reorder here.
//
// The original ranks, stretched so Immortal takes 10,000,000 lifetime XP (owner
// decision, 2026-10-10): each rank takes about 2.5× the XP of the one before.
export const RANKS: readonly Rank[] = [
  { id: 'fresher', name: 'Fresher', minXp: 0 },
  { id: 'riser', name: 'Riser', minXp: 500 },
  { id: 'scholar', name: 'Scholar', minXp: 1_250 },
  { id: 'sharp', name: 'Sharp', minXp: 3_000 },
  { id: 'elite', name: 'Elite', minXp: 7_500 },
  { id: 'apex-scholar', name: 'Apex Scholar', minXp: 18_000 },
  { id: 'apex', name: 'Apex', minXp: 45_000 },
  { id: 'master', name: 'Master', minXp: 110_000 },
  { id: 'grandmaster', name: 'Grandmaster', minXp: 275_000 },
  { id: 'endless', name: 'Endless', minXp: 675_000 },
  { id: 'paragon', name: 'Paragon', minXp: 1_650_000 },
  { id: 'ultimate', name: 'Ultimate', minXp: 4_000_000 },
  { id: 'immortal', name: 'Immortal', minXp: 10_000_000 },
];

// True only when every threshold is decided and they strictly increase.
// The rank UI should stay hidden until this is true.
export function isRankLadderReady(ranks: readonly Rank[] = RANKS) {
  return ranks.every(
    (rank, index) =>
      rank.minXp !== null &&
      (index === 0 || rank.minXp > (ranks[index - 1].minXp ?? Infinity))
  );
}

// What the student is allowed to see (see UX rules below).
export type RankProgress = {
  rank: Rank; // current rank (shown)
  lifetimeXp: number; // shown
  isTopRank: boolean;
  // XP still needed for the next rank. The NEXT RANK'S NAME is deliberately
  // not included, so screens cannot accidentally reveal it.
  xpToNextRank: number | null;
  percentToNextRank: number | null; // 0–100 for the progress bar
};

// Returns null while the ladder is not ready (thresholds undecided).
export function getRankProgress(
  lifetimeXp: number,
  ranks: readonly Rank[] = RANKS
): RankProgress | null {
  if (!isRankLadderReady(ranks)) {
    return null;
  }

  const xp = Number.isFinite(lifetimeXp) && lifetimeXp > 0 ? Math.floor(lifetimeXp) : 0;

  let index = 0;
  for (let i = 0; i < ranks.length; i++) {
    if (xp >= (ranks[i].minXp as number)) {
      index = i;
    }
  }

  const rank = ranks[index];
  const next = ranks[index + 1];

  if (!next) {
    return { rank, lifetimeXp: xp, isTopRank: true, xpToNextRank: null, percentToNextRank: null };
  }

  const start = rank.minXp as number;
  const end = next.minXp as number;

  return {
    rank,
    lifetimeXp: xp,
    isTopRank: false,
    xpToNextRank: end - xp,
    percentToNextRank: Math.round(((xp - start) / (end - start)) * 100),
  };
}

// UX RULES (product decisions — keep when building the rank UI):
// - Everyday screens show only: current rank, lifetime XP, XP to next rank,
//   and a progress bar. Never the next rank's name or the full ladder.
// - The complete ladder is revealed only in Explore ("The GRATEAPEX Journey").

// ---------------------------------------------------------------------
// WEEKLY LEAGUES — rules only (no backend yet).
//
// A league is a weekly competition between users of the SAME rank.
// It is separate from rank: finishing in the promotion zone does NOT
// grant a new rank. A rank change always requires the lifetime XP above.
// ---------------------------------------------------------------------

export const LEAGUE_RULES = {
  promotionShare: 0.2, // top 20%
  relegationShare: 0.2, // bottom 20% (middle 60% stay)
} as const;

export type LeagueOutcome = 'promoted' | 'stays' | 'relegated';

// Outcome for a finishing position (1 = best) in a league of `size` users.
export function getLeagueOutcome(position: number, size: number): LeagueOutcome {
  if (size <= 0 || position < 1 || position > size) {
    return 'stays';
  }

  const promoted = Math.floor(size * LEAGUE_RULES.promotionShare);
  const relegated = Math.floor(size * LEAGUE_RULES.relegationShare);

  if (position <= promoted) {
    return 'promoted';
  }

  if (position > size - relegated) {
    return 'relegated';
  }

  return 'stays';
}
