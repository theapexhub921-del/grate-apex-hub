// The Originals: the original app's theme colours, exactly, expressed as this
// app's colour tokens so every screen renders in them. Values come only from
// legacyColorsOf() (the original app's own derived colours) and the original
// app's fixed shell colours (tab bar, sidebar). Nothing is blended with this
// app's palettes. Pure, for tests.
import type { ThemeColors } from '@/constants/theme';
import { contrastRatio } from '@/data/contrast';
import { RANKS } from '@/data/ranks';
import { EXTRA_THEMES } from '@/data/extra-themes';
import { LEGACY_THEMES, legacyColorsOf, type LegacyThemeDef } from '@/data/legacy-themes';

/** The original themes plus the two this app added, all drawn the same way. */
export const LEGACY_STYLE_THEMES: readonly LegacyThemeDef[] = [...LEGACY_THEMES, ...EXTRA_THEMES];

export const DEFAULT_LEGACY_THEME = 'dark'; // the original app's default

export function legacyThemeById(id: string | null | undefined): LegacyThemeDef {
  return LEGACY_STYLE_THEMES.find((theme) => theme.id === id) ?? LEGACY_THEMES.find((theme) => theme.id === DEFAULT_LEGACY_THEME)!;
}

/**
 * A solid colour for raised surfaces (sheets, dialogs, menus) that reads well
 * with the theme's text: its lightest (light theme) or darkest (dark theme)
 * stop, deepened towards white/black until body text is comfortable (7:1).
 */
export function legacySolidSurface(def: LegacyThemeDef): string {
  const c = legacyColorsOf(def);
  const stops = [...c.gradient, c.bg];
  const luma = (hex: string) => { const n = parseInt(hex.replace('#', ''), 16); return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255); };
  let base = stops.reduce((best, stop) => ((c.light ? luma(stop) > luma(best) : luma(stop) < luma(best)) ? stop : best), stops[0]);
  const target = c.light ? 255 : 0;
  for (let step = 0; step < 20 && contrastRatio(def.ink, base) < 7; step++) {
    const n = parseInt(base.replace('#', ''), 16);
    const mix = (v: number) => Math.round(v + (target - v) * 0.15).toString(16).padStart(2, '0');
    base = `#${mix((n >> 16) & 255)}${mix((n >> 8) & 255)}${mix(n & 255)}`;
  }
  return base;
}

const cache = new Map<string, ThemeColors>();

export function legacyThemeColors(def: LegacyThemeDef): ThemeColors {
  const hit = cache.get(def.id);
  if (hit) return hit;
  const c = legacyColorsOf(def);
  // The original app's own shell colours (screens/Tabs.tsx).
  const bar = c.light ? 'rgba(255,255,255,0.94)' : 'rgba(8,14,70,0.94)';
  const side = c.light ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,40,0.38)';
  const colors: ThemeColors = {
    primary: c.primary,
    primaryPressed: c.primary,
    primaryText: c.primary,
    primarySubtle: c.card,
    primaryBorder: c.border,
    onPrimary: c.onPrimary,
    onPrimaryMuted: c.onPrimary,
    secondary: c.card,
    onSecondary: c.text,
    accent: c.accent,
    accentSubtle: c.card,
    accentText: c.accent,
    background: c.bg,
    surface: c.card,
    surfaceElevated: legacySolidSurface(def),
    surfaceMuted: c.card,
    surfaceSunken: c.card,
    track: c.border,
    text: c.text,
    textSecondary: c.silver,
    textTertiary: c.muted,
    textDisabled: c.muted,
    border: c.border,
    borderStrong: c.border,
    divider: c.border,
    hairline: c.border,
    highlight: c.card,
    success: c.ok,
    successText: c.ok,
    successSubtle: c.okBg,
    successBorder: c.ok,
    error: c.danger,
    errorSubtle: c.badBg,
    errorBorder: c.danger,
    warning: c.accent,
    warningText: c.accent,
    warningStrong: c.accent,
    warningSubtle: c.card,
    warningBorder: c.border,
    info: c.primary,
    infoSubtle: c.card,
    infoText: c.primary,
    tabBar: bar,
    tabBarBorder: c.border,
    tabActive: c.accent,
    tabInactive: c.muted,
    navSurface: side,
    navBorder: c.border,
    navActive: c.accent,
    navActiveSubtle: c.card,
    navInactive: c.silver,
    rewardBackground: c.card,
    rewardMuted: c.muted,
    logoLetters: c.text,
    stateNew: c.muted,
    stateLearning: c.primary,
    stateStruggling: c.danger,
    stateRemembered: c.accent,
    stateMastered: c.ok,
    focusRing: c.accent,
    shadow: 'rgba(0,0,0,0.25)',
    shadowStrong: 'rgba(0,0,0,0.4)',
    overlay: 'rgba(0,0,0,0.55)',
    apexBackground: c.bg,
    apexSurface: c.card,
    apexText: c.text,
    apexMuted: c.muted,
    apexGlow: c.accent,
    backgroundElement: c.card,
    backgroundSelected: c.border,
  } as ThemeColors;
  cache.set(def.id, colors);
  return colors;
}

/** The original app's level (src/progress.tsx: 1 + every 150 XP), used for its theme unlocks. */
export const legacyLevel = (xp: number) => 1 + Math.floor(Math.max(0, xp) / 150);

export type LegacyUnlock =
  | { unlocked: true }
  | { unlocked: false; kind: 'admin' }
  | { unlocked: false; kind: 'achievement'; name: string; desc: string }
  | { unlocked: false; kind: 'level'; level: number };

/**
 * The original app's theme unlock rules (screens/ThemePicker.tsx): admin-only
 * themes are for admins; an achievement theme needs that achievement earned
 * (level 1 or more here); every theme needs its level (`unlock`).
 */
export function legacyThemeUnlock(
  def: LegacyThemeDef,
  input: { xp: number; achievementLevels: Readonly<Record<string, number>>; isAdmin: boolean; achievement?: (id: string) => { name: string; desc: string } | undefined }
): LegacyUnlock {
  if (def.adminOnly && !input.isAdmin) return { unlocked: false, kind: 'admin' };
  if (def.ach && (input.achievementLevels[def.ach] ?? 0) < 1) {
    const info = input.achievement?.(def.ach);
    return { unlocked: false, kind: 'achievement', name: info?.name ?? def.ach, desc: info?.desc ?? '' };
  }
  if (legacyLevel(input.xp) < def.unlock) return { unlocked: false, kind: 'level', level: def.unlock };
  return { unlocked: true };
}

/** The original picker's wording for a locked theme. */
export function legacyLockText(lock: Exclude<LegacyUnlock, { unlocked: true }>, emoji = true) {
  const lockMark = emoji ? '🔒 ' : '';
  if (lock.kind === 'admin') return `${lockMark}Admins only`;
  if (lock.kind === 'achievement') return `${lockMark}Earn the "${lock.name}" achievement: ${lock.desc}`;
  return `${lockMark}Unlocks at Level ${lock.level}`;
}

/** Level (1 + every 150 XP) and rank title — one ladder for the whole app (data/ranks.ts). */
export function legacyRank(xp: number) {
  const level = legacyLevel(xp);
  let title = RANKS[0].name;
  for (const rank of RANKS) if (xp >= (rank.minXp ?? Infinity)) title = rank.name;
  return { level, title };
}

const flatCache = new Map<string, ThemeColors>();

/**
 * The Originals: the original theme with the original app's flat surfaces
 * (it drew no drop shadows). Hybrid keeps this app's shadows on the same colours.
 */
export function originalsThemeColors(def: LegacyThemeDef): ThemeColors {
  const hit = flatCache.get(def.id);
  if (hit) return hit;
  const flat: ThemeColors = { ...legacyThemeColors(def), shadow: 'transparent', shadowStrong: 'transparent', highlight: 'transparent' };
  flatCache.set(def.id, flat);
  return flat;
}
