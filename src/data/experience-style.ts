// Pure rules behind the three experiences' look (docs/experiences-architecture.md).
// No React Native imports, so the tests can check them directly.
import type { ThemeColors } from '@/constants/theme';
import type { ExperienceId } from '@/data/experience';

// ── Fonts ───────────────────────────────────────────────────────────
//
// The original app's font rule (old-reference/src/Text.tsx), unchanged:
//   subtext  (fontSize < 14, or a muted colour)  → Montserrat
//   headers  (bold 700+, or fontSize >= 24)      → Poppins
//   normal text                                  → Roboto
//   inputs                                       → Roboto
// Weights snap to the font files the original app loaded (Roboto has no 600/800).
//
// Hybrid keeps only the original headings (Poppins); its body text stays in
// this app's face.

export type LegacyFontFamily = 'Poppins' | 'Montserrat' | 'Roboto';

const WEB_STACK: Record<LegacyFontFamily, string> = {
  Poppins: 'Poppins, ui-sans-serif, system-ui, sans-serif',
  Montserrat: 'Montserrat, ui-sans-serif, system-ui, sans-serif',
  Roboto: 'Roboto, ui-sans-serif, system-ui, sans-serif',
};

type FontInput = { fontSize?: number; fontWeight?: string | number; color?: unknown };

export function legacyWeight(weight: string | number | undefined, family: LegacyFontFamily): 400 | 500 | 600 | 700 | 800 {
  const raw = parseInt(String(weight ?? '400'), 10) || (weight === 'bold' ? 700 : 400);
  const w = raw >= 800 ? 800 : raw >= 700 ? 700 : raw >= 600 ? 600 : raw >= 500 ? 500 : 400;
  if (family === 'Roboto' && (w === 600 || w === 800)) return 700;
  return w;
}

/** The family the original app would have used for this text. */
export function legacyFontFamily(style: FontInput, forced?: LegacyFontFamily): LegacyFontFamily {
  if (forced) return forced;
  const raw = parseInt(String(style.fontWeight ?? '400'), 10) || (style.fontWeight === 'bold' ? 700 : 400);
  const fontSize = style.fontSize ?? 16;
  const color = typeof style.color === 'string' ? style.color : '';
  // The original check, as written (it looks for these fragments in the colour value).
  const isMuted = Boolean(color) && (color.includes('muted') || color.includes('999') || color.includes('666') || color.includes('aaa'));
  if (fontSize < 14 || isMuted) return 'Montserrat';
  if (raw >= 700 || fontSize >= 24) return 'Poppins';
  return 'Roboto';
}

/**
 * The font override for one piece of text in an experience (web), or null to
 * leave this app's own fonts alone.
 */
export type ExperienceFont = { fontFamily: string; fontWeight: '400' | '500' | '600' | '700' | '800' };

export function experienceFont(experience: ExperienceId, style: FontInput, input = false): ExperienceFont | null {
  if (experience === 'originate') return null;
  if (experience === 'hybrid') {
    if (input) return null;
    const family = legacyFontFamily(style);
    if (family !== 'Poppins') return null;
    return { fontFamily: WEB_STACK.Poppins, fontWeight: `${legacyWeight(style.fontWeight, 'Poppins')}` as ExperienceFont['fontWeight'] };
  }
  const family = legacyFontFamily(style, input ? 'Roboto' : undefined);
  return { fontFamily: WEB_STACK[family], fontWeight: `${legacyWeight(style.fontWeight, family)}` as ExperienceFont['fontWeight'] };
}

// ── Colours ─────────────────────────────────────────────────────────

/** '#RRGGBB' (or '#RGB') → 'rgba(r,g,b,alpha)'. Other formats are returned unchanged. */
export function withAlpha(color: string, alpha: number) {
  const hex = color.trim().replace('#', '');
  if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return color;
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

const glassCache = new WeakMap<ThemeColors, ThemeColors>();

/**
 * Hybrid with one of this app's palettes: the same colours, with the original
 * app's frosted-glass panels (translucent surfaces; Card adds the blur).
 * Raised surfaces (sheets, menus) stay solid so they remain readable.
 */
export function hybridGlass(colors: ThemeColors): ThemeColors {
  const hit = glassCache.get(colors);
  if (hit) return hit;
  const glass: ThemeColors = {
    ...colors,
    surface: withAlpha(colors.surface, 0.62),
    surfaceMuted: withAlpha(colors.surfaceMuted, 0.5),
    hairline: withAlpha(colors.border, 0.7),
  };
  glassCache.set(colors, glass);
  return glass;
}

/** Mixes `top` over `base` ('#RRGGBB' colours) by `amount` (0–1). */
export function mixHex(top: string, base: string, amount: number) {
  const parse = (c: string) => {
    const n = parseInt(c.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const a = parse(top);
  const b = parse(base);
  const t = Math.max(0, Math.min(1, amount));
  return `#${a.map((v, i) => Math.round(b[i] + (v - b[i]) * t).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * The CSS angle expo-linear-gradient uses on the web for the original
 * background's start {x: 0.1, y: 0} → end {x: 0.9, y: 1} over a w × h area,
 * so the gradient falls exactly as it did in the original app.
 */
export function legacyGradientAngle(width: number, height: number) {
  const px = (0.9 - 0.1) * Math.max(1, width);
  const py = (1 - 0) * Math.max(1, height);
  return 90 + (Math.atan2(py, px) * 180) / Math.PI;
}
