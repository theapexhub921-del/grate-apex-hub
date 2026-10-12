import { useMemo } from 'react';

import { legacyThemeById } from '@/data/legacy-theme-colors';
import { legacyColorsOf } from '@/data/legacy-themes';
import { useLegacyThemePreference } from '@/data/settings';

/**
 * The original app's own colour names for the chosen original theme
 * (bg, card, border, text, muted, silver, primary, onPrimary, accent…), for
 * the parts of The Originals ported line by line from the original app.
 */
export function useLegacyPalette() {
  const id = useLegacyThemePreference();
  return useMemo(() => legacyColorsOf(legacyThemeById(id)), [id]);
}
