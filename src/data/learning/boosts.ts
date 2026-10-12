// Timed XP boosts (achievement rewards): the rules that keep every effect
// within one hour. Pure so they can be tested directly (npm test); the
// inventory itself is in powerups.ts.
import type { PowerupMultiplier } from '@/data/learning/xp-rules';

/** No power-up effect may last longer than one hour, under any circumstances. */
export const MAX_POWERUP_SECONDS = 3600;

/** The timed boosts an achievement level can award (one picked at random). */
export const REWARD_POOL: readonly { multiplier: Exclude<PowerupMultiplier, 1>; durationSeconds: number }[] = [
  { multiplier: 1.5, durationSeconds: 3600 },
  { multiplier: 2, durationSeconds: 2700 },
  { multiplier: 2.5, durationSeconds: 1800 },
  { multiplier: 3, durationSeconds: 900 },
];

export type ActiveBoost = {
  id: string;
  multiplier: Exclude<PowerupMultiplier, 1>;
  activatedAt: number;
  durationSeconds: number;
  /** Latest device time seen while active. If the clock ever goes back past it, the boost ends. */
  seenAt: number;
};

export const clampSeconds = (value: unknown) => Math.max(0, Math.min(MAX_POWERUP_SECONDS, Math.round(Number(value) || 0)));

/**
 * Milliseconds left on a boost. 0 when expired, when the device clock reads
 * earlier than the activation, or when it went back after the boost was last
 * seen — so changing the clock or reloading can never extend an effect.
 */
export function boostRemainingMs(active: ActiveBoost | null, now: number): number {
  if (!active) return 0;
  if (now < active.activatedAt || now < active.seenAt) return 0;
  const end = active.activatedAt + clampSeconds(active.durationSeconds) * 1000;
  return Math.max(0, end - now);
}

/** A reward pick; deterministic when a random source is given (tests). */
export function pickReward(random: () => number = Math.random) {
  return REWARD_POOL[Math.min(REWARD_POOL.length - 1, Math.max(0, Math.floor(random() * REWARD_POOL.length)))];
}

/** "×2 XP for 45 minutes" */
export function describeBoost(boost: { multiplier: number; durationSeconds?: number }) {
  const minutes = Math.round(clampSeconds(boost.durationSeconds) / 60);
  return `×${boost.multiplier} XP for ${minutes} minutes`;
}
