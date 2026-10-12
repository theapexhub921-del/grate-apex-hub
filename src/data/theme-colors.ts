// The colours for any theme in any experience, made readable. Pure (tests run it
// for every theme × experience: tests/readability.test.mjs).
import { ATMOSPHERE } from '@/components/atmosphere/palettes';
import { type ColorSchemeName, Colors, type ThemeColors } from '@/constants/theme';
import { composite, ensureContrast, luminance, worstContrast } from '@/data/contrast';
import { hybridGlass, withAlpha } from '@/data/experience-style';
import type { ExperienceId } from '@/data/experience';
import { legacyThemeById, legacyThemeColors, originalsThemeColors } from '@/data/legacy-theme-colors';
import { legacyColorsOf } from '@/data/legacy-themes';
import { effectiveThemeFamily, legacyAtmosphere, originalsFromNewer, originateFromLegacy, paletteGradient, type ThemeFamily } from '@/data/theme-portrayal';

/** The theme's colours as the experience draws it (before the readability pass). */
export function rawThemeColors(experience: ExperienceId, scheme: ColorSchemeName, legacyTheme: string, chosen: ThemeFamily | null): ThemeColors {
  const family = effectiveThemeFamily(experience, chosen);
  const def = legacyThemeById(legacyTheme);
  if (experience === 'originals' || experience === 'hybrid') {
    if (family !== 'legacy') return experience === 'originals' ? originalsFromNewer(Colors[scheme], scheme === 'light') : hybridGlass(Colors[scheme]);
    const base = experience === 'originals' ? originalsThemeColors(def) : legacyThemeColors(def);
    // A veiled page (Matcha, Rainbow) also gets glass with more body, so card text
    // sits on a steady colour instead of the full gradient.
    const scrim = gradientPage(scheme, def.id, 'legacy').scrim;
    if (!scrim) return base;
    const light = scrim.color === '#ffffff';
    return { ...base, surface: withAlpha(scrim.color, light ? 0.55 : 0.38), surfaceMuted: withAlpha(scrim.color, light ? 0.4 : 0.28), hairline: withAlpha(def.ink, 0.16), border: withAlpha(def.ink, 0.2) };
  }
  return family === 'legacy' ? originateFromLegacy(def) : Colors[scheme];
}

/**
 * A gradient page whose colours are too far apart for its text (Matcha runs from
 * light to dark green; Rainbow passes through yellow) gets a veil — white under
 * dark text, black under light text — strong enough for comfortable reading
 * (7:1, more than the 4.5:1 minimum).
 */
export function pageScrim(stops: readonly string[], ink: string, target = 7): { color: string; alpha: number } | null {
  if (worstContrast(ink, stops) >= 4.5) return null;
  const color = luminance(ink) < 0.4 ? '#ffffff' : '#000000';
  for (let alpha = 0.1; alpha <= 0.8 + 1e-9; alpha += 0.05) {
    const veiled = stops.map((stop) => composite(withAlpha(color, alpha), stop));
    if (worstContrast(ink, veiled) >= target) return { color, alpha: Math.round(alpha * 100) / 100 };
  }
  return { color, alpha: 0.8 };
}

/** The original-style gradient page for The Originals and Hybrid: its stops and any veil. */
export function gradientPage(scheme: ColorSchemeName, legacyTheme: string, family: ThemeFamily) {
  const def = legacyThemeById(legacyTheme);
  const stops = family === 'legacy' ? [...legacyColorsOf(def).gradient] : paletteGradient(scheme).colors;
  const ink = family === 'legacy' ? def.ink : Colors[scheme].text;
  const bg = family === 'legacy' ? legacyColorsOf(def).bg : paletteGradient(scheme).bg;
  return { stops, bg, scrim: pageScrim(stops, ink) };
}

/** The page colours text can sit on directly (gradient stops, or the atmosphere's base and lit corner). */
export function pageBackdrops(experience: ExperienceId, scheme: ColorSchemeName, legacyTheme: string, chosen: ThemeFamily | null): string[] {
  const family = effectiveThemeFamily(experience, chosen);
  const def = legacyThemeById(legacyTheme);
  if (experience === 'originate') {
    const field = family === 'legacy' ? legacyAtmosphere(def) : ATMOSPHERE[scheme];
    return [field.base, composite(`${field.fieldA[0]}${alphaHex(field.fieldA[1] * 0.6)}`, field.base)];
  }
  const page = gradientPage(scheme, def.id, family);
  return page.scrim ? page.stops.map((stop) => composite(withAlpha(page.scrim!.color, page.scrim!.alpha), stop)) : page.stops;
}

const alphaHex = (alpha: number) => Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0');

// Which text colours must read on which surfaces, and how well (WCAG: 4.5 for
// body text, 3 for large/bold text, icons and secondary marks).
type Rule = { token: keyof ThemeColors; on: 'content' | 'nav' | 'primary' | 'secondary' | 'error' | 'success'; min: number };
const RULES: readonly Rule[] = [
  { token: 'text', on: 'content', min: 4.5 },
  { token: 'textSecondary', on: 'content', min: 4.5 },
  { token: 'textTertiary', on: 'content', min: 3 },
  { token: 'primaryText', on: 'content', min: 3 },
  { token: 'accentText', on: 'content', min: 3 },
  { token: 'infoText', on: 'content', min: 3 },
  { token: 'successText', on: 'content', min: 3 },
  { token: 'warningText', on: 'content', min: 3 },
  { token: 'error', on: 'content', min: 3 },
  { token: 'onPrimary', on: 'primary', min: 4.5 },
  { token: 'onSecondary', on: 'secondary', min: 4.5 },
  { token: 'tabActive', on: 'nav', min: 3 },
  { token: 'tabInactive', on: 'nav', min: 3 },
  { token: 'navActive', on: 'nav', min: 3 },
  { token: 'navInactive', on: 'nav', min: 3 },
];

/** Every colour a piece of text of that kind can sit on. */
export function surfacesFor(colors: ThemeColors, page: readonly string[]) {
  const over = (layer: string) => page.map((bg) => composite(layer, bg));
  return {
    content: [...page, ...over(colors.surface), ...over(colors.surfaceMuted), ...over(colors.surfaceElevated)],
    nav: [...over(colors.tabBar), ...over(colors.navSurface)],
    primary: over(colors.primary),
    secondary: over(colors.secondary),
    error: over(colors.error),
    success: over(colors.success),
  };
}

/** Adjusts only text colours (never fills) until each reads on its surfaces. */
export function readable(colors: ThemeColors, page: readonly string[]): ThemeColors {
  const surfaces = surfacesFor(colors, page);
  let changed: Partial<ThemeColors> | null = null;
  for (const rule of RULES) {
    const current = colors[rule.token] as string;
    const fixed = ensureContrast(current, surfaces[rule.on], rule.min);
    if (fixed !== current) (changed ??= {})[rule.token] = fixed as never;
  }
  return changed ? { ...colors, ...changed } : colors;
}

const cache = new Map<string, ThemeColors>();

/** The colours for a theme in an experience: drawn the experience's way, then made readable. */
export function themeColorsFor(experience: ExperienceId, scheme: ColorSchemeName, legacyTheme: string, chosen: ThemeFamily | null): ThemeColors {
  const family = effectiveThemeFamily(experience, chosen);
  const key = `${experience}|${family}|${family === 'legacy' ? legacyThemeById(legacyTheme).id : scheme}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const result = readable(rawThemeColors(experience, scheme, legacyTheme, chosen), pageBackdrops(experience, scheme, legacyTheme, chosen));
  cache.set(key, result);
  return result;
}
