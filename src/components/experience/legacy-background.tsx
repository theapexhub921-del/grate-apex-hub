import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { PageMotifs } from '@/components/atmosphere/page-motifs';
import { Text } from '@/components/ui/text';
import { webStyle } from '@/components/ui/web';
import { legacyGradientAngle, withAlpha } from '@/data/experience-style';
import { gradientPage } from '@/data/theme-colors';
import { legacyThemeById } from '@/data/legacy-theme-colors';
import { useLegacyThemePreference } from '@/data/settings';
import { useExperience } from '@/hooks/use-experience';
import { useResolvedColorScheme, useThemeFamily } from '@/hooks/use-theme';

// The original app's background (old-reference/src/Background.tsx): the
// theme's gradient, start {0.1, 0} → end {0.9, 1}, with six faint floating
// science emoji.
//
//   The Originals — exactly that.
//   Hybrid        — the same gradient wash (from whichever theme colours it),
//                   with this app's drawn line motifs in place of the emoji.

const AMBIENT = [
  { e: '🧪', top: '8%', left: '78%' }, { e: '🫀', top: '22%', left: '6%' }, { e: '🩻', top: '38%', left: '84%' },
  { e: '🧠', top: '55%', left: '10%' }, { e: '🦟', top: '70%', left: '80%' }, { e: '🧬', top: '86%', left: '14%' },
] as const;

export function LegacyBackground({ lively = false }: { lively?: boolean }) {
  const experience = useExperience();
  const family = useThemeFamily();
  const legacyId = useLegacyThemePreference();
  const scheme = useResolvedColorScheme();
  const { width, height } = useWindowDimensions();

  // The theme's gradient, plus a readability veil where its colours are too far apart for its text.
  const page = gradientPage(scheme, legacyId, family);
  const colors = page.stops;
  const bg = page.bg;
  const light = family === 'legacy' ? legacyThemeById(legacyId).light : scheme === 'light';

  return (
    <View pointerEvents="none" accessible={false} aria-hidden style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: bg }]}>
      {Platform.OS === 'web' ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            webStyle({ backgroundImage: `linear-gradient(${legacyGradientAngle(width, height)}deg, ${colors.join(', ')})` }),
          ]}
        />
      ) : (
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <LinearGradient id="legacy-bg" x1="0.1" y1="0" x2="0.9" y2="1">
              {colors.map((color, index) => (
                <Stop key={index} offset={colors.length > 1 ? index / (colors.length - 1) : 0} stopColor={color} />
              ))}
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#legacy-bg)" />
        </Svg>
      )}
      {page.scrim ? <View style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(page.scrim.color, page.scrim.alpha) }]} /> : null}
      {experience === 'originals' ? (
        <View style={StyleSheet.absoluteFill}>
          {AMBIENT.map((a) => (
            <Text key={a.e} style={[styles.emoji, { top: a.top, left: a.left, opacity: light ? 0.1 : 0.12 }]}>
              {a.e}
            </Text>
          ))}
        </View>
      ) : (
        <PageMotifs lively={lively} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 0, overflow: 'hidden' },
  emoji: { position: 'absolute', fontSize: 32 },
});
