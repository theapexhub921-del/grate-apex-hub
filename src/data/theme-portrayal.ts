// Every theme is available in every experience; each experience draws it in
// its own way (owner request, 2026-10-10):
//
//               newer theme (Apex, Violet…)        legacy theme (Dark, Lavender Haze…)
//   Originate   this app's palette, as designed     the legacy colours redrawn the
//                                                   Originate way: solid cards, soft
//                                                   shadows, atmosphere light
//   The Originals the palette drawn the original     the original theme, exactly
//               way: glass panels, flat, gradient
//   Hybrid      the palette with glass panels        the original colours with this
//                                                   app's shadows
//
// Pure (no React Native), for tests.
import { ATMOSPHERE, type AtmospherePalette } from '@/components/atmosphere/palettes';
import type { ColorSchemeName } from '@/constants/theme';
import type { ThemeColors } from '@/constants/theme';
import type { ExperienceId } from '@/data/experience';
import { mixHex, withAlpha } from '@/data/experience-style';
import { legacyThemeColors } from '@/data/legacy-theme-colors';
import { legacyColorsOf, type LegacyThemeDef } from '@/data/legacy-themes';

export type ThemeFamily = 'newer' | 'legacy';

/** The family in use: the learner's choice, else The Originals → legacy, others → newer. */
export function effectiveThemeFamily(experience: ExperienceId, chosen: ThemeFamily | null): ThemeFamily {
  return chosen ?? (experience === 'originals' ? 'legacy' : 'newer');
}

const originalsCache = new WeakMap<ThemeColors, ThemeColors>();

/** The Originals wearing one of this app's newer themes: the original glass look in that palette. */
export function originalsFromNewer(colors: ThemeColors, light: boolean): ThemeColors {
  const hit = originalsCache.get(colors);
  if (hit) return hit;
  // The original panels: a 5–6% tint of the ink (or brand colour on light themes).
  const panel = light ? withAlpha(colors.primary, 0.05) : 'rgba(255,255,255,0.06)';
  const line = light ? withAlpha(colors.primary, 0.14) : 'rgba(255,255,255,0.12)';
  const result: ThemeColors = {
    ...colors,
    surface: panel,
    surfaceMuted: panel,
    surfaceSunken: panel,
    border: line,
    borderStrong: line,
    hairline: line,
    divider: line,
    primaryBorder: line,
    tabBar: withAlpha(colors.background, 0.94),
    tabBarBorder: line,
    tabActive: colors.accent,
    navSurface: withAlpha(colors.background, light ? 0.55 : 0.38),
    navBorder: line,
    navActive: colors.accent,
    shadow: 'transparent',
    shadowStrong: 'transparent',
    highlight: 'transparent',
  };
  originalsCache.set(colors, result);
  return result;
}

const originateCache = new Map<string, ThemeColors>();

/** Originate wearing a legacy theme: the same colours, redrawn with solid cards and soft shadows. */
export function originateFromLegacy(def: LegacyThemeDef): ThemeColors {
  const hit = originateCache.get(def.id);
  if (hit) return hit;
  const c0 = legacyColorsOf(def);
  // Originate's page is one colour: a light theme starts from its lightest stop, a dark one from its darkest.
  const c = { ...c0, bg: originateBase(def) };
  const base = legacyThemeColors(def);
  // Solid surfaces stepped up from the page colour (white on light themes, the ink on dark ones).
  const step = (amount: number) => (c.light ? mixHex('#ffffff', c.bg, amount) : mixHex(c.text, c.bg, amount));
  const surface = step(c.light ? 0.72 : 0.07);
  const line = mixHex(c.text, surface, c.light ? 0.12 : 0.14);
  const result: ThemeColors = {
    ...base,
    background: c.bg,
    surface,
    surfaceElevated: step(c.light ? 0.9 : 0.11),
    surfaceMuted: step(c.light ? 0.5 : 0.045),
    surfaceSunken: c.light ? mixHex(c.text, c.bg, 0.05) : mixHex('#000000', c.bg, 0.25),
    secondary: surface,
    border: line,
    borderStrong: mixHex(c.text, surface, 0.24),
    hairline: line,
    divider: line,
    track: mixHex(c.text, surface, 0.12),
    primarySubtle: mixHex(c.primary, surface, 0.16),
    primaryBorder: mixHex(c.primary, surface, 0.45),
    accentSubtle: mixHex(c.accent, surface, 0.16),
    infoSubtle: mixHex(c.primary, surface, 0.12),
    warningSubtle: mixHex(c.accent, surface, 0.14),
    highlight: c.light ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.06)',
    tabBar: step(c.light ? 0.9 : 0.11),
    tabBarBorder: line,
    tabActive: c.primary,
    navSurface: withAlpha(step(c.light ? 0.9 : 0.09), 0.9),
    navBorder: line,
    navActive: c.primary,
    navActiveSubtle: mixHex(c.primary, surface, 0.18),
    navInactive: c.muted,
    shadow: c.light ? 'rgba(15,23,42,0.10)' : 'rgba(0,0,0,0.35)',
    shadowStrong: c.light ? 'rgba(15,23,42,0.18)' : 'rgba(0,0,0,0.5)',
    overlay: 'rgba(0,0,0,0.55)',
  };
  originateCache.set(def.id, result);
  return result;
}

/** Originate's single page colour for a legacy theme: the lightest stop for a light theme, the darkest for a dark one. */
export function originateBase(def: LegacyThemeDef): string {
  const c = legacyColorsOf(def);
  const stops = [...c.gradient, c.bg];
  const lum = (hex: string) => { const n = parseInt(hex.replace('#', ''), 16); return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255); };
  return stops.reduce((best, stop) => ((c.light ? lum(stop) > lum(best) : lum(stop) < lum(best)) ? stop : best), stops[0]);
}

/** The original-style gradient wash for one of this app's palettes (The Originals, Hybrid). */
export function paletteGradient(scheme: ColorSchemeName) {
  const p = ATMOSPHERE[scheme];
  return {
    colors: [mixHex(p.fieldA[0], p.base, Math.min(0.55, p.fieldA[1] * 1.6)), mixHex(p.fieldB[0], p.base, Math.min(0.5, p.fieldB[1])), p.base],
    bg: p.base,
    light: scheme === 'light',
  };
}

/** Originate's page atmosphere for a legacy theme, in that theme's own colours. */
export function legacyAtmosphere(def: LegacyThemeDef): AtmospherePalette {
  const c = { ...legacyColorsOf(def), bg: originateBase(def) };
  const [first, second, third] = [c.gradient[0], c.gradient[Math.floor(c.gradient.length / 2)], c.gradient[c.gradient.length - 1]];
  return {
    base: c.bg,
    fieldA: [first, c.light ? 0.35 : 0.5],
    fieldB: [second, c.light ? 0.3 : 0.45],
    fieldC: [third, 0.85],
    auroraA: [def.accent, c.light ? 0.1 : 0.18],
    auroraB: [first, c.light ? 0.14 : 0.16],
    auroraC: [def.gold, c.light ? 0.08 : 0.06],
    grid: [def.ink, c.light ? 0.045 : 0.03],
    ray: [def.accent, c.light ? 0.05 : 0.045],
    gold: [def.gold, c.light ? 0.1 : 0.06],
    vignette: [c.light ? def.dim : '#000000', c.light ? 0.08 : 0.45],
    grain: c.light ? 0.05 : 0.07,
    grainBlend: c.light ? 'multiply' : 'overlay',
  };
}
