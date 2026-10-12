import { useMemo } from 'react';

import { ColorSchemeName, ThemeColors } from '@/constants/theme';
import { useAppearancePreference, useLegacyThemePreference, useThemeFamilyPreference } from '@/data/settings';
import { themeColorsFor } from '@/data/theme-colors';
import { effectiveThemeFamily, type ThemeFamily } from '@/data/theme-portrayal';
import { useExperience } from '@/hooks/use-experience';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Uses the learner's selected palette from Settings.
// "System" follows the device / browser appearance (light or dark).
export function useResolvedColorScheme(): ColorSchemeName {
  const preference = useAppearancePreference();
  const systemScheme = useColorScheme();

  if (preference === 'system') {
    return systemScheme === 'dark' ? 'dark' : 'light';
  }

  return preference;
}

/** The colours for a theme in an experience (data/theme-colors.ts): drawn the experience's way, made readable. */
export { themeColorsFor };

/** The theme family in use for this part of the interface. */
export function useThemeFamily(): ThemeFamily {
  return effectiveThemeFamily(useExperience(), useThemeFamilyPreference());
}

/** True when a legacy theme colours the interface. */
export function useUsesLegacyTheme() {
  return useThemeFamily() === 'legacy';
}

// The active GRATEAPEX color palette.
export function useTheme(): ThemeColors {
  const experience = useExperience();
  const scheme = useResolvedColorScheme();
  const legacyTheme = useLegacyThemePreference();
  const family = useThemeFamilyPreference();
  return themeColorsFor(experience, scheme, legacyTheme, family);
}

// Builds a screen's styles from the active palette.
// Usage: const styles = useThemedStyles(createStyles);
// Styles are rebuilt only when the theme changes.
export function useThemedStyles<T>(
  createStyles: (colors: ThemeColors) => T
): T {
  const colors = useTheme();

  return useMemo(() => createStyles(colors), [createStyles, colors]);
}
