import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { Arena, Rule } from '@/components/learning/apex-arena';
import { PersonAvatar } from '@/components/social/profile-card';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { SPRING } from '@/constants/motion';
import { Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// The battle intro: two learners face each other in the arena, a pulsing VS,
// the rules, then "Start the battle" (3 · 2 · 1 follows on the battle screen).
export function BattleIntro({ course, me, opponent, questions, seconds, winXp, onStart }: {
  course: string;
  me: { uid: string; name: string };
  opponent: { uid: string; name: string };
  questions: number;
  seconds: number;
  winXp: number;
  onStart: () => void;
}) {
  const colors = useTheme();
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(1);
  const left = useSharedValue(reduceMotion ? 0 : -60);
  const right = useSharedValue(reduceMotion ? 0 : 60);
  useEffect(() => {
    if (reduceMotion) return;
    left.value = withSpring(0, SPRING.pop);
    right.value = withSpring(0, SPRING.pop);
    pulse.value = withRepeat(withSequence(withTiming(1.12, { duration: 520, easing: Easing.out(Easing.quad) }), withTiming(1, { duration: 520, easing: Easing.in(Easing.quad) })), -1);
  }, [left, right, pulse, reduceMotion]);
  const vsStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const leftStyle = useAnimatedStyle(() => ({ transform: [{ translateX: left.value }] }));
  const rightStyle = useAnimatedStyle(() => ({ transform: [{ translateX: right.value }] }));

  return (
    <Arena>
      <Text style={styles.kicker}>XP BATTLE · {course.toUpperCase()}</Text>
      <View style={styles.versus}>
        <Animated.View style={[styles.side, leftStyle]}>
          <PersonAvatar uid={me.uid} name={me.name} size={84} ring="gold" />
          <Text style={[styles.name, { color: colors.apexText }]} numberOfLines={1}>You</Text>
        </Animated.View>
        <Animated.Text style={[styles.vs, vsStyle]}>VS</Animated.Text>
        <Animated.View style={[styles.side, rightStyle]}>
          <PersonAvatar uid={opponent.uid} name={opponent.name} size={84} ring="gold" />
          <Text style={[styles.name, { color: colors.apexText }]} numberOfLines={1}>@{opponent.name}</Text>
        </Animated.View>
      </View>
      <Text style={[styles.lead, { color: colors.apexText }]}>Same questions. Same clock. Highest score wins.</Text>
      <View style={styles.rules}>
        <Rule text={`${questions} questions from ${course}, the same for both of you`} />
        <Rule text={`${seconds} seconds per question — time out and it counts as missed`} />
        <Rule text={`The winner earns ${winXp} XP; nothing is taken from the other player`} />
        <Rule text="A tie on score goes to the faster player" />
      </View>
      <View style={styles.actions}>
        <Button label="Start the battle" variant="apex" size="lg" trailing="⚔" onPress={onStart} />
        <Button label="Not now" variant="ghost" onPress={() => router.back()} />
      </View>
    </Arena>
  );
}

const styles = StyleSheet.create({
  kicker: { ...Type.overline, letterSpacing: 1.6, color: '#FDC00A', textAlign: 'center' },
  versus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28, marginVertical: 10 },
  side: { alignItems: 'center', gap: 10, width: 130 },
  name: { fontSize: 15, fontWeight: '800', textAlign: 'center' },
  vs: { ...Type.numeral, fontSize: 54, lineHeight: 62, color: '#FDC00A', textShadowColor: 'rgba(253,192,10,0.55)', textShadowRadius: 18 },
  lead: { fontSize: 18, fontWeight: '700', textAlign: 'center', lineHeight: 26 },
  rules: { gap: 10, padding: 18, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(253,192,10,0.18)' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 8 },
});
