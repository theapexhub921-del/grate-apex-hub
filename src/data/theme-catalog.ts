// Every theme in Appearance, in one list (owner decision, 2026-10-10): no
// "newer" / "legacy" split for the learner, distinct names for look-alikes,
// and only four free themes — Apex Legacy, System, Dark and Light. Every other
// theme unlocks with XP (the original level: 1 + every 150 XP); Christmas and
// Valentine also need their achievement, and brat stays admins-only.
//
// Under the hood a theme is still one of this app's palettes ('newer') or one
// of the original app's themes ('legacy'), so saved choices keep working.
// Pure, for tests.
import { LEGACY_STYLE_THEMES, legacyLevel } from '@/data/legacy-theme-colors';
import type { ThemeFamily } from '@/data/theme-portrayal';

export type ThemeEntry = {
  /** 'newer:apex', 'legacy:dark'… */
  key: string;
  family: ThemeFamily;
  /** The appearance value (newer) or the legacy theme id. */
  id: string;
  name: string;
  description: string;
  /** Original level needed; 1 = free. */
  level: number;
  ach?: string;
  adminOnly?: boolean;
};

// Names for the learner. Look-alikes get different names so the list is clear.
const NEWER: readonly Omit<ThemeEntry, 'key' | 'family'>[] = [
  { id: 'system', name: 'System', description: 'Follows your device: Light or Dark.', level: 1 },
  { id: 'dark', name: 'Dark', description: 'Layered charcoal for night study.', level: 1 },
  { id: 'light', name: 'Light', description: 'Soft off-white, easy in daylight.', level: 1 },
  { id: 'apex', name: 'Apex Redefined', description: 'The Apex blue, redrawn: cobalt and deep navy with gold highlights.', level: 2 },
  { id: 'black', name: 'Obsidian', description: 'True black surfaces with clean white accents.', level: 4 },
  { id: 'pink', name: 'Rosewood', description: 'A warm, dark rose palette with soft pink highlights.', level: 6 },
  { id: 'violet', name: 'Violet', description: 'A deep violet and lavender study space.', level: 7 },
  { id: 'emerald', name: 'Emerald', description: 'A deep green palette with mint highlights.', level: 9 },
];

/** Legacy themes: their names and unlock levels, where this list changes them. */
const LEGACY_OVERRIDES: Record<string, { name?: string; level?: number }> = {
  dark: { name: 'Apex Legacy', level: 1 }, // the original classic look
  light: { name: 'Daylight', level: 2 },
  pink: { name: 'Blossom', level: 3 },
  charcoal: { level: 3 },
  blackout: { level: 4 },
};

// Free themes first, then by level; achievement and admin themes last.
const rank = (entry: { level: number; ach?: string; adminOnly?: boolean }) => (entry.adminOnly ? 2000 : entry.ach ? 1000 : entry.level);

export const THEME_CATALOG: readonly ThemeEntry[] = [
  ...NEWER.map((entry) => ({ ...entry, key: `newer:${entry.id}`, family: 'newer' as const })),
  ...LEGACY_STYLE_THEMES.map((theme) => {
    const override = LEGACY_OVERRIDES[theme.id] ?? {};
    return {
      key: `legacy:${theme.id}`,
      family: 'legacy' as const,
      id: theme.id,
      name: override.name ?? theme.name,
      description: theme.desc,
      level: Math.max(1, override.level ?? theme.unlock),
      ach: theme.ach,
      adminOnly: theme.adminOnly,
    };
  }),
].sort((a, b) => rank(a) - rank(b) || (a.key === 'legacy:dark' ? -1 : b.key === 'legacy:dark' ? 1 : 0));

export type ThemeLock =
  | { unlocked: true }
  | { unlocked: false; kind: 'admin' }
  | { unlocked: false; kind: 'achievement'; name: string; desc: string }
  | { unlocked: false; kind: 'level'; level: number };

/** Is this theme open to the learner? Admin-only first, then the achievement, then the level. */
export function themeLock(
  entry: ThemeEntry,
  input: { xp: number; achievementLevels: Readonly<Record<string, number>>; isAdmin: boolean; achievement?: (id: string) => { name: string; desc: string } | undefined }
): ThemeLock {
  if (entry.adminOnly && !input.isAdmin) return { unlocked: false, kind: 'admin' };
  if (entry.ach && (input.achievementLevels[entry.ach] ?? 0) < 1) {
    const info = input.achievement?.(entry.ach);
    return { unlocked: false, kind: 'achievement', name: info?.name ?? entry.ach, desc: info?.desc ?? '' };
  }
  if (legacyLevel(input.xp) < entry.level) return { unlocked: false, kind: 'level', level: entry.level };
  return { unlocked: true };
}

/** The XP that opens a level (original levels: 1 + every 150 XP). */
export const xpForLevel = (level: number) => Math.max(0, (level - 1) * 150);

export function themeLockText(lock: Exclude<ThemeLock, { unlocked: true }>) {
  if (lock.kind === 'admin') return 'Admins only';
  if (lock.kind === 'achievement') return `Earn the “${lock.name}” achievement: ${lock.desc}`;
  return `Unlocks at Level ${lock.level} (${xpForLevel(lock.level).toLocaleString()} XP)`;
}
