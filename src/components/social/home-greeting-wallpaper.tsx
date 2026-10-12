import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Icon } from '@/components/ui/icon';
import { type ThemeColors } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

/** Small, slowly floating illustrations on the Home page background. */
export function HomeGreetingWallpaper() {
  const colors = useTheme();
  const styles = useThemedStyles(createStyles);
  const reduceMotion = useReducedMotion();
  const drift = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      drift.value = 0;
      return;
    }

    drift.value = withRepeat(withTiming(1, { duration: 9000 }), -1, true);
    return () => cancelAnimation(drift);
  }, [drift, reduceMotion]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -drift.value * 4 }],
  }));

  return (
    <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.art, floatStyle]}>
      <View style={[styles.orbit, styles.orbitOne]} />
      <View style={[styles.orbit, styles.orbitTwo]} />
      <View style={[styles.node, styles.nodePeople]}>
        <Icon name="social" size={22} color={colors.onPrimary} />
      </View>
      <View style={[styles.node, styles.nodeLearn]}>
        <Icon name="learn" size={18} color={colors.accent} />
      </View>
      <View style={[styles.node, styles.nodeSpark]}>
        <Icon name="connection" size={17} color={colors.onPrimary} />
      </View>
      <View style={[styles.node, styles.nodeChallenge]}><Icon name="challenge" size={18} color={colors.accent} /></View>
      <View style={[styles.node, styles.nodeBook]}><Icon name="book" size={18} color={colors.onPrimary} /></View>
      <View style={[styles.dot, styles.dotOne]} />
      <View style={[styles.dot, styles.dotTwo]} />
      <View style={[styles.dot, styles.dotThree]} />
    </Animated.View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    art: { ...StyleSheet.absoluteFill, overflow: 'hidden', opacity: 0.78, zIndex: 0 },
    orbit: { position: 'absolute', borderRadius: 999, borderWidth: 1, borderColor: colors.primaryBorder },
    orbitOne: { width: 190, height: 190, top: 28, right: '9%' },
    orbitTwo: { width: 310, height: 310, top: -24, right: '-2%', opacity: 0.55 },
    node: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.primaryBorder,
      backgroundColor: colors.surfaceElevated,
    },
    nodePeople: { width: 48, height: 48, top: '15%', right: '13%' },
    nodeLearn: { width: 42, height: 42, top: '43%', right: '26%' },
    nodeSpark: { width: 38, height: 38, top: '62%', right: '9%' },
    nodeChallenge: { width: 40, height: 40, top: '22%', right: '32%' },
    nodeBook: { width: 36, height: 36, top: '73%', right: '31%' },
    dot: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
    dotOne: { top: '31%', right: '24%' },
    dotTwo: { top: '68%', right: '19%' },
    dotThree: { top: '10%', right: '11%' },
  });
}
