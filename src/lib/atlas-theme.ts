import type { ThemeColors } from '@/constants/theme';

// The 3D atlas is a standalone web page (public/atlas/skeleton.html). It styles itself
// with CSS variables, so "obeying the app's theme" means handing it the app's colours.
// This is the one place that says which app colour fills which atlas variable.
//
// The atlas page reads these from its address (#theme=...) when it opens, and the web
// component sends them again with postMessage when the learner changes theme.

export type AtlasThemeVars = Record<string, string>;

const SCHEME_FLIP_LIGHTNESS = 0.5;

// 0 (black) → 1 (white), from a #RRGGBB or #RGB colour. Anything else counts as light.
function lightness(hex: string): number {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return 1;
  const raw = match[1].length === 3 ? match[1].split('').map((c) => c + c).join('') : match[1];
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function atlasThemeVars(colors: ThemeColors): AtlasThemeVars {
  const dark = lightness(colors.background) < SCHEME_FLIP_LIGHTNESS;
  return {
    __scheme: dark ? 'dark' : 'light',

    // Stage behind the 3D model
    '--stage-a': colors.surface,
    '--stage-b': colors.background,

    // Panels, cards and wells
    '--paper': colors.surfaceElevated,
    '--card': colors.surface,
    '--well': colors.surfaceSunken,
    '--raise': colors.surfaceElevated, // the selected tab / segment sitting on a well
    '--glass': colors.navSurface, // translucent toolbars over the stage
    '--line': colors.border,

    // Text
    '--ink': colors.text,
    '--ink-2': colors.textSecondary,
    '--muted': colors.textTertiary,
    '--on-ink': colors.background, // text on a solid --ink fill (active tool, bone tag)

    // Accent (the app's primary)
    '--cobalt': colors.primary,
    '--cobalt-2': colors.primarySubtle,
    '--on-cobalt': colors.onPrimary,
    '--on-cobalt-2': colors.onPrimaryMuted,
    '--focus': colors.focusRing,

    // Right / wrong
    '--good': colors.success,
    '--good-bg': colors.successSubtle,
    '--bad': colors.error,
    '--bad-bg': colors.errorSubtle,

    // Depth
    '--shadow-c': colors.shadow,
    '--shadow': `0 1px 2px ${colors.shadow}, 0 14px 36px ${colors.shadowStrong}`,
  };
}

// The atlas page lives in public/, so on the web it is served from the app's own address.
export const ATLAS_PAGE = '/atlas/skeleton.html';

export function atlasHash(vars: AtlasThemeVars): string {
  return `#theme=${encodeURIComponent(JSON.stringify(vars))}`;
}
