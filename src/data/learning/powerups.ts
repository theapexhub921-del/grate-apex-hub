import { useSyncExternalStore } from 'react';

import {
  getAuthenticatedLearningUserId,
  readLearningCache,
  subscribeToLearningAuthChanges,
  writeLearningCache,
} from '@/data/learning-sync';
import { type ActiveBoost, boostRemainingMs, clampSeconds, pickReward } from '@/data/learning/boosts';
import type { PowerupMultiplier } from '@/data/learning/xp-rules';

export type PowerupSource = 'lesson' | 'quiz' | 'streak' | 'share' | 'achievement';
export type Powerup = {
  id: string;
  source: PowerupSource;
  sourceId: string;
  multiplier: Exclude<PowerupMultiplier, 1>;
  earnedAt: number;
  /** 'single' (default): multiplies the next lesson or quiz. 'timed': once
   *  activated, multiplies every lesson and quiz until it expires. */
  kind?: 'single' | 'timed';
  /** Timed boosts only; never more than MAX_POWERUP_SECONDS. */
  durationSeconds?: number;
};

// The one-hour cap and boost timing live in boosts.ts (pure, tested).
export { boostRemainingMs, describeBoost, MAX_POWERUP_SECONDS, pickReward, REWARD_POOL, type ActiveBoost } from '@/data/learning/boosts';

const STORAGE_KEY = 'grateapex_powerups';
const EMPTY: readonly Powerup[] = [];
let inventory: Powerup[] = [];
let earnedKeys = new Set<string>();
let active: ActiveBoost | null = null;
let loadPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function ordered(items: Powerup[]) {
  return [...items].sort((a, b) => b.multiplier - a.multiplier || a.earnedAt - b.earnedAt);
}

async function save() {
  try {
    await writeLearningCache(STORAGE_KEY, JSON.stringify({ inventory, earnedKeys: [...earnedKeys], active }));
  } catch (error) {
    console.warn('Could not save power-ups:', error);
  }
}

async function load() {
  // AsyncStorage's web adapter touches window during static rendering.
  if (typeof window === 'undefined') return;
  const requestedUserId = await getAuthenticatedLearningUserId();
  try {
    const saved = await readLearningCache(STORAGE_KEY);
    if ((await getAuthenticatedLearningUserId()) !== requestedUserId) return;
    if (!saved) return;
    const parsed: unknown = JSON.parse(saved);
    if (!parsed || typeof parsed !== 'object') return;
    const data = parsed as { inventory?: unknown; earnedKeys?: unknown; active?: unknown };
    inventory = Array.isArray(data.inventory)
      ? data.inventory.filter((item): item is Powerup => Boolean(item) && typeof item === 'object'
        && typeof (item as Powerup).id === 'string'
        && [1.5, 2, 2.5, 3].includes((item as Powerup).multiplier))
      : [];
    earnedKeys = new Set(Array.isArray(data.earnedKeys)
      ? data.earnedKeys.filter((item): item is string => typeof item === 'string')
      : inventory.map((item) => `${item.source}:${item.sourceId}`));
    // Saved timed boosts can never be longer than the cap.
    inventory = ordered(inventory.map((item) => (item.kind === 'timed' ? { ...item, durationSeconds: clampSeconds(item.durationSeconds) } : item)));
    const savedActive = data.active as ActiveBoost | null | undefined;
    active = savedActive && typeof savedActive === 'object' && boostRemainingMs(savedActive, Date.now()) > 0
      ? { ...savedActive, durationSeconds: clampSeconds(savedActive.durationSeconds) }
      : null;
    notify();
  } catch (error) {
    console.warn('Could not load power-ups:', error);
  }
}

function ensureLoaded() {
  if (!loadPromise) loadPromise = load();
  return loadPromise;
}

export function ensurePowerupsLoaded() {
  return ensureLoaded();
}

export function usePowerups(): readonly Powerup[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      void ensureLoaded();
      return () => listeners.delete(listener);
    },
    () => inventory,
    () => EMPTY
  );
}

export async function resetPowerups() {
  await ensureLoaded();
  inventory = [];
  earnedKeys = new Set();
  active = null;
  await save();
  notify();
}

export async function grantPowerup(
  source: PowerupSource,
  sourceId: string,
  multiplier: Exclude<PowerupMultiplier, 1> = 1.5,
  durationSeconds?: number
) {
  await ensureLoaded();
  const key = `${source}:${sourceId}`;
  if (!sourceId || earnedKeys.has(key)) return false;
  earnedKeys.add(key);
  const item: Powerup = durationSeconds
    ? { id: key, source, sourceId, multiplier, earnedAt: Date.now(), kind: 'timed', durationSeconds: clampSeconds(durationSeconds) }
    : { id: key, source, sourceId, multiplier, earnedAt: Date.now() };
  inventory = ordered([...inventory, item]);
  await save();
  notify();
  return true;
}

/**
 * Award one random timed boost for an achievement level. The pick is made
 * only here, once: the key (one per level) makes repeats a no-op, and the
 * saved item keeps its multiplier, so reloading never rerolls it.
 */
export async function grantAchievementBoost(levelKey: string, random: () => number = Math.random) {
  await ensureLoaded();
  if (earnedKeys.has(`achievement:${levelKey}`)) return null;
  const pick = pickReward(random);
  const granted = await grantPowerup('achievement', levelKey, pick.multiplier, pick.durationSeconds);
  return granted ? pick : null;
}

/** Start a timed boost from the inventory. One at a time: others wait (queued), so an effect is never extended. */
export async function activatePowerup(id: string): Promise<ActiveBoost> {
  await ensureLoaded();
  const now = Date.now();
  const left = boostRemainingMs(active, now);
  if (left > 0) throw new Error(`A boost is already running (${Math.ceil(left / 60000)} min left). Your other boosts stay in your inventory.`);
  const item = inventory.find((candidate) => candidate.id === id && candidate.kind === 'timed');
  if (!item) throw new Error('That boost is not in your inventory.');
  active = { id: item.id, multiplier: item.multiplier, activatedAt: now, durationSeconds: clampSeconds(item.durationSeconds), seenAt: now };
  inventory = inventory.filter((candidate) => candidate.id !== id);
  await save();
  notify();
  return active;
}

/** The inventory, outside React (emulator checks). */
export function powerupInventory(): readonly Powerup[] {
  return inventory;
}

export function activeBoostNow(now = Date.now()): ActiveBoost | null {
  return boostRemainingMs(active, now) > 0 ? active : null;
}

export function useActiveBoost(): ActiveBoost | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      void ensureLoaded();
      return () => listeners.delete(listener);
    },
    () => active,
    () => null
  );
}

export async function consumePowerup(): Promise<Powerup | null> {
  await ensureLoaded();
  // A running timed boost applies to every lesson and quiz until it expires.
  const now = Date.now();
  if (active && boostRemainingMs(active, now) > 0) {
    active = { ...active, seenAt: now };
    await save();
    return { id: `${active.id}:active`, source: 'achievement', sourceId: active.id, multiplier: active.multiplier, earnedAt: active.activatedAt, kind: 'timed' };
  }
  if (active) {
    active = null; // expired (or the clock went back): stop applying it
    await save();
    notify();
  }
  // Otherwise the strongest single-use power-up. Timed boosts wait for activation.
  const powerup = inventory.find((item) => item.kind !== 'timed');
  if (!powerup) return null;
  inventory = inventory.filter((item) => item.id !== powerup.id);
  await save();
  notify();
  return powerup;
}

export async function returnPowerup(powerup: Powerup) {
  await ensureLoaded();
  if (powerup.id.endsWith(':active')) return; // a running boost was not used up
  if (inventory.some((item) => item.id === powerup.id)) return;
  inventory = ordered([powerup, ...inventory]);
  await save();
  notify();
}

subscribeToLearningAuthChanges(() => {
  inventory = [];
  earnedKeys = new Set();
  active = null;
  loadPromise = null;
  notify();
  void ensureLoaded();
});
