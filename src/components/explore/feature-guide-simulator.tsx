import { useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { Card } from '@/components/ui/interactive';
import { Pill } from '@/components/ui/pill';
import { Text } from '@/components/ui/text';
import { webStyle } from '@/components/ui/web';
import { MOTION } from '@/constants/motion';
import { Type, type ThemeColors } from '@/constants/theme';
import { EXPLORE_GUIDE, type ExploreGuideEntry } from '@/data/explore';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

// Explore → "GrAte Apex Hub feature guide", as a guided tour instead of a wall
// of cards: pick a group, and the features play one at a time on a small
// screen (or step through them). Each shows its real status.

type Group = { id: string; label: string; icon: IconName; titles: readonly string[] };

const GROUPS: readonly Group[] = [
  { id: 'learn', label: 'Learning', icon: 'learn', titles: ['Study', 'HB1 courses', 'HB2 courses', 'Custom quizzes', 'Practice question types', 'Apex Challenge', 'Past Question Bank'] },
  { id: 'progress', label: 'Progress and rewards', icon: 'xp', titles: ['XP and ranks', 'Achievements', 'Learning power-ups', 'Learning streak', 'Leagues', 'Friend streaks, freezes and restores', 'Weekly challenges', 'Apex Coin gifts'] },
  { id: 'social', label: 'Social', icon: 'social', titles: ['Feed', 'Posts, reactions, comments and reshares', 'Profiles and follows', 'Connect', 'Messages', 'Study groups and discussions', 'Friend battles', 'Table Conferences', 'Live voice calls'] },
  { id: 'planning', label: 'Planning', icon: 'calendar', titles: ['Study Plans', 'Timetable', 'Goals', 'Notifications'] },
  { id: 'app', label: 'The app', icon: 'settings', titles: ['You', 'Explore every Monday', 'Experiences and themes', 'Settings', 'Install and share the app', 'Widgets and personalization'] },
];

const ICONS: Record<string, IconName> = {
  Study: 'learn', 'HB1 courses': 'course', 'HB2 courses': 'biochemistry', 'Custom quizzes': 'edit', 'Practice question types': 'lesson', 'Profiles and follows': 'profile', 'Apex Challenge': 'challenge', 'Past Question Bank': 'book', 'XP and ranks': 'rank', Achievements: 'achievement',
  'Learning power-ups': 'sparkle', 'Learning streak': 'streak', Leagues: 'chart', 'Friend streaks, freezes and restores': 'streak',
  'Weekly challenges': 'calendar', 'Apex Coin gifts': 'xp', Feed: 'home', 'Posts, reactions, comments and reshares': 'heart', Connect: 'social',
  Messages: 'comment', 'Explore every Monday': 'research', 'Study groups and discussions': 'social', 'Friend battles': 'challenge', 'Table Conferences': 'clock', 'Live voice calls': 'announcement',
  'Study Plans': 'course', Timetable: 'calendar', Goals: 'mastery', Notifications: 'bell', You: 'profile', 'Experiences and themes': 'sparkle',
  Settings: 'settings', 'Install and share the app': 'upload', 'Widgets and personalization': 'grid',
};

const AUTOPLAY_MS = 5000;
const STATUS: Record<ExploreGuideEntry['status'], { label: string; tone: 'primary' | 'neutral' | 'warning' }> = {
  available: { label: 'Available', tone: 'primary' },
  limited: { label: 'In progress', tone: 'warning' },
  'coming-soon': { label: 'Coming soon', tone: 'neutral' },
};

export function FeatureGuideSimulator() {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const reduceMotion = useReducedMotion();
  const [groupId, setGroupId] = useState(GROUPS[0].id);
  const [index, setIndex] = useState(0);
  const [touched, setTouched] = useState(false);
  const [fade] = useState(() => new Animated.Value(1));

  const group = GROUPS.find((item) => item.id === groupId) ?? GROUPS[0];
  const entries = useMemo(
    () => group.titles.map((title) => EXPLORE_GUIDE.find((entry) => entry.title === title)).filter((entry): entry is ExploreGuideEntry => Boolean(entry)),
    [group]
  );
  const entry = entries[Math.min(index, entries.length - 1)];

  // Steps through the group's features until the learner takes over (never under reduced motion).
  useEffect(() => {
    if (touched || reduceMotion || entries.length < 2) return;
    const timer = setTimeout(() => setIndex((value) => (value + 1) % entries.length), AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [index, touched, reduceMotion, entries.length]);

  useEffect(() => {
    if (reduceMotion) return;
    fade.setValue(0.2);
    Animated.timing(fade, { toValue: 1, duration: MOTION.standard, useNativeDriver: false }).start();
  }, [index, groupId, fade, reduceMotion]);

  const go = (next: number) => {
    setTouched(true);
    setIndex((next + entries.length) % entries.length);
  };

  if (!entry) return null;
  const status = STATUS[entry.status];

  return (
    <Card style={styles.card}>
      <View style={styles.groups} accessibilityRole="tablist">
        {GROUPS.map((item) => {
          const selected = item.id === group.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => {
                setTouched(true);
                setGroupId(item.id);
                setIndex(0);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={[styles.group, selected && styles.groupOn, webStyle({ cursor: 'pointer' })]}
            >
              <Icon name={item.icon} size={14} color={selected ? colors.onPrimary : colors.textSecondary} />
              <Text style={[styles.groupText, selected && { color: colors.onPrimary }]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.body}>
        <Animated.View style={[styles.stage, { opacity: fade }]} accessibilityLiveRegion="polite">
          <View style={styles.stageGlow} />
          <View style={styles.stageIcon}>
            <Icon name={ICONS[entry.title] ?? 'sparkle'} size={34} color={colors.primaryText} />
          </View>
          <View style={styles.mockRow}><View style={[styles.mockLine, { width: '72%' }]} /></View>
          <View style={styles.mockRow}><View style={[styles.mockLine, { width: '54%' }]} /></View>
          <View style={[styles.mockButton, entry.status !== 'available' && styles.mockButtonOff]} />
        </Animated.View>

        <View style={styles.copy}>
          <View style={styles.head}>
            <Text style={styles.step}>{group.label.toUpperCase()} · {Math.min(index, entries.length - 1) + 1} / {entries.length}</Text>
            <Pill label={status.label} tone={status.tone} />
          </View>
          <Text style={styles.title}>{entry.title}</Text>
          <Text style={styles.detail}>{entry.detail}</Text>
          <View style={styles.dots}>
            {entries.map((item, i) => (
              <Pressable key={item.title} onPress={() => go(i)} accessibilityLabel={`Show ${item.title}`} style={webStyle({ cursor: 'pointer' })}>
                <View style={[styles.dot, i === index && styles.dotOn]} />
              </Pressable>
            ))}
          </View>
          <View style={styles.controls}>
            <Button label="Previous" size="sm" variant="secondary" onPress={() => go(index - 1)} />
            <Button label="Next" size="sm" trailing="→" onPress={() => go(index + 1)} />
          </View>
        </View>
      </View>
    </Card>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: { gap: 16, padding: 20 },
    groups: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    group: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted },
    groupOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    groupText: { fontSize: 12.5, fontWeight: '700', color: colors.textSecondary },
    body: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, alignItems: 'center' },
    stage: { width: 220, height: 200, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', gap: 10, overflow: 'hidden', alignSelf: 'center' },
    stageGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 90, top: -60, left: -40, backgroundColor: colors.primarySubtle, opacity: 0.7 },
    stageIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.primarySubtle, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
    mockRow: { width: '70%', alignItems: 'center' },
    mockLine: { height: 7, borderRadius: 4, backgroundColor: colors.track },
    mockButton: { width: 90, height: 20, borderRadius: 10, backgroundColor: colors.primary, marginTop: 4 },
    mockButtonOff: { backgroundColor: colors.track },
    copy: { flex: 1, minWidth: 220, gap: 8 },
    head: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    step: { ...Type.overline, color: colors.textTertiary },
    title: { ...Type.title2, color: colors.text },
    detail: { fontSize: 14, lineHeight: 21, color: colors.textSecondary },
    dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.track },
    dotOn: { width: 20, backgroundColor: colors.primary },
    controls: { flexDirection: 'row', gap: 10, marginTop: 6 },
  });
}
