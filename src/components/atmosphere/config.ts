import { usePathname } from 'expo-router';

import { ATMOSPHERE, type AtmospherePalette, type MoodLevels, type Tint } from '@/components/atmosphere/palettes';
import { legacyThemeById } from '@/data/legacy-theme-colors';
import { useLegacyThemePreference } from '@/data/settings';
import { legacyAtmosphere } from '@/data/theme-portrayal';
import { useResolvedColorScheme, useUsesLegacyTheme } from '@/hooks/use-theme';

// The GRATEAPEX page atmosphere: the layered light behind every screen.
//
//   base field → tonal fields → aurora → light rays → faint grid
//   → localized gold glow → grain → vignette
//
// Each screen has a MOOD that sets how much of it shows: Home is lively,
// Learn is calm, the quiz is nearly plain (readability first), Profile and
// Settings are quiet. The Apex arena paints its own darker stage.

export { ATMOSPHERE, type AtmospherePalette, type MoodLevels, type Tint };

export type AtmosphereMood = 'lively' | 'expressive' | 'calm' | 'focus' | 'quiet' | 'auth';




export const MOODS: Record<AtmosphereMood, MoodLevels> = {
  lively: { fields: 1, aurora: 0.9, rays: 0.7, grid: 0.6, gold: 1, grain: 1, vignette: 1, animate: true },
  expressive: { fields: 1, aurora: 1, rays: 0.5, grid: 0.85, gold: 0.7, grain: 1, vignette: 1, animate: true },
  calm: { fields: 0.8, aurora: 0.4, rays: 0, grid: 0.35, gold: 0.25, grain: 0.8, vignette: 0.8, animate: false },
  focus: { fields: 0.45, aurora: 0, rays: 0, grid: 0, gold: 0, grain: 0.5, vignette: 0.5, animate: false },
  quiet: { fields: 0.65, aurora: 0.25, rays: 0, grid: 0, gold: 0.2, grain: 0.7, vignette: 0.7, animate: false },
  auth: { fields: 1, aurora: 1, rays: 0.9, grid: 0.7, gold: 1, grain: 1, vignette: 1, animate: true },
};

// The mood for the current route.
export function moodForPath(pathname: string): AtmosphereMood {
  if (pathname === '/' || pathname === '') return 'lively';
  if (pathname.startsWith('/login') || pathname.startsWith('/onboarding')) return 'auth';
  if (pathname.startsWith('/explore')) return 'expressive';
  if (pathname.startsWith('/social')) return 'lively';
  if (pathname.startsWith('/learn/quiz') || pathname.startsWith('/learn/review')) return 'focus';
  if (pathname.startsWith('/learn/lesson')) return 'focus';
  if (pathname.startsWith('/learn')) return 'calm';
  return 'quiet'; // profile, settings, progress
}

export function useAtmosphereMood(): AtmosphereMood {
  return moodForPath(usePathname());
}

// '#RRGGBB' + opacity → 'rgba(r, g, b, a)'.
export function rgba([hex, opacity]: Tint, scale = 1) {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const a = Math.max(0, Math.min(1, opacity * scale));
  return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(3))})`;
}

/**
 * The atmosphere colours for the active theme: this app's palette for a newer
 * theme, or the legacy theme's own colours (data/theme-portrayal.ts) when
 * Originate wears a legacy theme.
 */
export function useAtmospherePalette(): { palette: AtmospherePalette; light: boolean; key: string } {
  const scheme = useResolvedColorScheme();
  const legacy = useUsesLegacyTheme();
  const legacyId = useLegacyThemePreference();
  if (!legacy) return { palette: ATMOSPHERE[scheme], light: scheme === 'light', key: scheme };
  const def = legacyThemeById(legacyId);
  return { palette: legacyAtmosphere(def), light: def.light, key: `legacy-${def.id}` };
}
