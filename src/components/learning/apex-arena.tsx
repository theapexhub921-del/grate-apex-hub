import { type ReactNode, useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useTabBarScroll } from '@/components/tab-bar-visibility';
import { Icon } from '@/components/ui/icon';
import { ProgressRing } from '@/components/ui/progress-ring';
import { Text } from '@/components/ui/text';
import { isWeb, webStyle } from '@/components/ui/web';
import { SPRING } from '@/constants/motion';
import { Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// The Apex Challenge arena (its lit stage, the 3-2-1 countdown and the rule
// rows), shared by the Apex Challenge screen and course Apex runs.

// The arena: a deep stage lit from above by gold rays, with a slow pulse
// behind the content. Deliberately unlike a lesson quiz. `intensity`
// dims the light while questions are on screen, so reading stays easy.
export function Arena({ children, scroll = true, intensity = 'high' }: { children: ReactNode; scroll?: boolean; intensity?: 'high' | 'low' }) {
  const colors = useTheme();
  const tabBarScroll = useTabBarScroll();
  const inner = <View style={styles.inner}>{children}</View>;
  return (
    <View style={[styles.arena, { backgroundColor: colors.apexBackground }]}>
      <ArenaLight intensity={intensity} />
      {scroll ? <ScrollView {...tabBarScroll} contentContainerStyle={styles.scroll}>{inner}</ScrollView> : <View style={styles.scroll}>{inner}</View>}
    </View>
  );
}

function ArenaLight({ intensity }: { intensity: 'high' | 'low' }) {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    pulse.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [pulse, reduceMotion]);
  const ring = useAnimatedStyle(() => ({
    opacity: (intensity === 'high' ? 0.5 : 0.18) * (0.55 + pulse.value * 0.45),
    transform: [{ scale: 0.92 + pulse.value * 0.1 }],
  }));
  const strength = intensity === 'high' ? 1 : 0.45;
  return (
    <View style={[StyleSheet.absoluteFill, styles.noTouch]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="apexTop" cx="50%" cy="-10%" rx="70%" ry="60%" fx="50%" fy="-10%">
            <Stop offset="0" stopColor="#FDC00A" stopOpacity={0.22 * strength} />
            <Stop offset="1" stopColor="#FDC00A" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="apexBlue" cx="50%" cy="45%" rx="75%" ry="60%" fx="50%" fy="45%">
            <Stop offset="0" stopColor="#1C3FA8" stopOpacity={0.55 * strength} />
            <Stop offset="1" stopColor="#1C3FA8" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="apexEdge" cx="50%" cy="50%" rx="85%" ry="75%" fx="50%" fy="50%">
            <Stop offset="0.55" stopColor="#000000" stopOpacity={0} />
            <Stop offset="1" stopColor="#000000" stopOpacity={0.6} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#apexBlue)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#apexTop)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#apexEdge)" />
      </Svg>
      {isWeb ? <View style={[StyleSheet.absoluteFill, styles.rays, { opacity: strength }]} /> : null}
      <View style={styles.ringWrap}>
        <Animated.View style={[styles.ring, ring]} />
      </View>
    </View>
  );
}

// 3 · 2 · 1 · GO inside a ring that drains with each beat.
export function Countdown({ count, total }: { count: number; total: number }) {
  const reduceMotion = useReducedMotion();
  const beat = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) return;
    beat.value = 1.18;
    beat.value = withSpring(1, SPRING.pop);
  }, [count, beat, reduceMotion]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: beat.value }] }));
  return (
    <View style={styles.countdownWrap}>
      <ProgressRing value={count > 0 ? count / total : 1} size={220} thickness={6} color="#FDC00A" trackColor="rgba(255,255,255,0.08)" label="Countdown">
        <Animated.Text style={[styles.countdown, style]} accessibilityLiveRegion="assertive">
          {count > 0 ? count : 'GO'}
        </Animated.Text>
      </ProgressRing>
      <Text style={styles.countdownHint}>Answer fast. Answers lock instantly.</Text>
    </View>
  );
}

export function Rule({ text }: { text: string }) {
  const colors = useTheme();
  return (
    <View style={styles.rule}>
      <View style={styles.ruleIcon}>
        <Icon name="challenge" size={13} color="#0A1F5C" filled />
      </View>
      <Text style={[styles.ruleText, { color: colors.apexText }]}>{text}</Text>
    </View>
  );
}


const styles = StyleSheet.create({
  arena: { flex: 1, overflow: 'hidden' },
  noTouch: { pointerEvents: 'none' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20, paddingBottom: 110 },
  inner: { width: '100%', maxWidth: 760, alignSelf: 'center', alignItems: 'stretch', gap: 14 },
  rays: webStyle({
    backgroundImage:
      'conic-gradient(from 180deg at 50% -8%, transparent 0deg, rgba(253,192,10,0.10) 6deg, transparent 14deg, transparent 22deg, rgba(253,192,10,0.07) 28deg, transparent 36deg, transparent 324deg, rgba(253,192,10,0.07) 332deg, transparent 338deg, transparent 346deg, rgba(253,192,10,0.10) 354deg, transparent 360deg)',
    maskImage: 'linear-gradient(to bottom, #000 0%, transparent 70%)',
    WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, transparent 70%)',
  }),
  ringWrap: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  ring: {
    width: 420,
    height: 420,
    borderRadius: 210,
    borderWidth: 1.5,
    borderColor: 'rgba(253,192,10,0.45)',
    boxShadow: '0px 0px 60px rgba(253,192,10,0.18), inset 0px 0px 40px rgba(253,192,10,0.10)',
  },
  countdownWrap: { alignItems: 'center', gap: 22 },
  countdown: { ...Type.numeral, fontSize: 96, lineHeight: 110, color: '#FDC00A', textAlign: 'center' },
  countdownHint: { fontSize: 14, fontWeight: '700', color: '#A9BCF0', letterSpacing: 0.4 },
  rule: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  ruleIcon: { width: 22, height: 22, borderRadius: 7, backgroundColor: '#FDC00A', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  ruleText: { flex: 1, fontSize: 15, lineHeight: 22 },
});
