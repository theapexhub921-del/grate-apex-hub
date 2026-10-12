import { useEffect, type PropsWithChildren } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Icon } from '@/components/ui/icon';
import { Radius, type ThemeColors } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

/** Gentle social-learning line art behind the Learn welcome message. */
export function LearningWelcomeAtmosphere({ children }: PropsWithChildren) {
  const colors = useTheme();
  const styles = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();
  const compact = width < 900;
  const reduceMotion = useReducedMotion();
  const drift = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      drift.value = 0;
      return;
    }
    drift.value = withRepeat(withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [drift, reduceMotion]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -drift.value * 5 }],
    opacity: (compact ? 0.1 : 0.18) + drift.value * (compact ? 0.04 : 0.08),
  }));

  return (
    <View style={[styles.panel, compact && styles.panelCompact]}>
      <View pointerEvents="none" style={[styles.orbit, styles.orbitOne]} />
      <View pointerEvents="none" style={[styles.orbit, styles.orbitTwo]} />
      <Animated.View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.art, floatStyle]}
      >
        <View style={[styles.node, styles.book]}><Icon name="book" size={21} color={colors.primaryText} /></View>
        <View style={[styles.node, styles.social]}><Icon name="social" size={22} color={colors.primaryText} /></View>
        <View style={[styles.node, styles.connection]}><Icon name="connection" size={18} color={colors.accentText} /></View>
        <View style={[styles.sparkle, styles.sparkleOne]}><Icon name="sparkle" size={17} color={colors.accentText} /></View>
        <View style={[styles.sparkle, styles.sparkleTwo]}><Icon name="sparkle" size={12} color={colors.primaryText} /></View>
      </Animated.View>
      <View style={[styles.content, compact && styles.contentCompact]}>{children}</View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    panel: {
      position: 'relative',
      overflow: 'hidden',
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: colors.primaryBorder,
      backgroundColor: colors.surface,
      paddingHorizontal: 20,
      paddingVertical: 18,
      marginBottom: 22,
    },
    panelCompact: { paddingHorizontal: 16, paddingVertical: 16 },
    orbit: { position: 'absolute', borderRadius: 999, borderWidth: 1, borderColor: colors.primaryBorder },
    orbitOne: { width: 142, height: 142, top: -76, right: 34, opacity: 0.38 },
    orbitTwo: { width: 210, height: 210, top: -110, right: -8, opacity: 0.24 },
    art: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
    node: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.primaryBorder,
      backgroundColor: colors.surfaceElevated,
    },
    book: { width: 42, height: 42, top: 13, right: 94 },
    social: { width: 46, height: 46, top: 32, right: 30 },
    connection: { width: 34, height: 34, top: 69, right: 124 },
    sparkle: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
    sparkleOne: { top: 16, right: 19 },
    sparkleTwo: { top: 90, right: 73 },
    content: { position: 'relative', zIndex: 1, paddingRight: 130 },
    contentCompact: { paddingRight: 0 },
  });
}
