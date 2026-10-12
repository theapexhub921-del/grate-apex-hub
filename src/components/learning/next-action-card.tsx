import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { Interactive } from '@/components/ui/interactive';
import { webStyle } from '@/components/ui/web';
import { elevation, Radius, Type, type ThemeColors } from '@/constants/theme';
import type { NextAction } from '@/data/learning/next-action';
import { useResolvedColorScheme, useTheme, useThemedStyles } from '@/hooks/use-theme';

const KIND_LABEL: Record<NextAction['kind'], string> = {
  'resume-lesson': 'Continue where you left off',
  'review-weak': 'Needs attention',
  'review-due': 'Reinforcement ready',
  'take-quiz': 'Check your understanding',
  'retake-quiz': 'Try again',
  'start-lesson': 'Ready for the next lesson?',
  'next-topic': 'Start a topic',
  apex: 'Apex Challenge',
  'explore-learn': 'Get started',
};

const KIND_ICON: Record<NextAction['kind'], IconName> = {
  'resume-lesson': 'play',
  'review-weak': 'mastery',
  'review-due': 'reinforce',
  'take-quiz': 'check',
  'retake-quiz': 'reinforce',
  'start-lesson': 'lesson',
  'next-topic': 'course',
  apex: 'challenge',
  'explore-learn': 'learn',
};

// The one thing to do next, derived from learning state. Always the
// brightest surface on the page.
export function NextActionHero({ action }: { action: NextAction }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const scheme = useResolvedColorScheme();
  const heroStart = scheme === 'apex' ? colors.background : colors.rewardBackground;
  return (
    <View style={[styles.hero, elevation(colors, 2), { backgroundColor: colors.apexBackground }, webStyle({ backgroundImage: 'linear-gradient(135deg, ' + heroStart + ' 0%, ' + colors.apexSurface + ' 56%, ' + colors.apexBackground + ' 100%)' })]} accessibilityRole="summary">
      {/* Light inside the hero: a gold glow top-right, deep blue below. */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id="heroGlow" cx="92%" cy="0%" rx="60%" ry="90%" fx="92%" fy="0%">
            <Stop offset="0" stopColor="#FDC00A" stopOpacity={0.22} />
            <Stop offset="1" stopColor="#FDC00A" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="heroLight" cx="0%" cy="0%" rx="80%" ry="120%" fx="0%" fy="0%">
            <Stop offset="0" stopColor={heroStart} stopOpacity={0.55} />
            <Stop offset="1" stopColor={heroStart} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#heroLight)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#heroGlow)" />
        <Circle cx="96%" cy="110%" r="120" stroke="#FFFFFF" strokeOpacity={0.06} strokeWidth={1} fill="none" />
        <Circle cx="96%" cy="110%" r="180" stroke="#FFFFFF" strokeOpacity={0.045} strokeWidth={1} fill="none" />
      </Svg>
      <View style={styles.kickerRow}>
        <View style={styles.kickerIcon}>
          <Icon name={KIND_ICON[action.kind]} size={14} color={colors.apexBackground} filled={action.kind === 'resume-lesson' || action.kind === 'apex'} strokeWidth={2.2} />
        </View>
        <Text style={styles.heroKicker}>{KIND_LABEL[action.kind].toUpperCase()}</Text>
      </View>
      <Text style={styles.heroTitle}>{action.title}</Text>
      <Text style={styles.heroDetail}>{action.detail}</Text>
      <Button label={action.cta} trailing="→" variant="gold" size="lg" onPress={() => router.push(action.href)} style={styles.heroButton} />
    </View>
  );
}

// Secondary suggestions, shown as compact rows.
export function NextActionList({ actions }: { actions: NextAction[] }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  if (actions.length === 0) return null;
  return (
    <View style={[styles.list, elevation(colors, 1)]}>
      {actions.map((action, index) => (
        <Interactive
          key={action.id}
          onPress={() => router.push(action.href)}
          accessibilityLabel={`${action.title}. ${action.detail}`}
          style={({ hovered }) => [styles.row, index > 0 && styles.rowDivider, hovered && styles.rowHover]}
        >
          {({ hovered }) => (
            <>
              <View style={styles.rowIcon}>
                <Icon name={KIND_ICON[action.kind]} size={16} color={colors.primaryText} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowKicker}>{KIND_LABEL[action.kind].toUpperCase()}</Text>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {action.title}
                </Text>
                <Text style={styles.rowDetail} numberOfLines={2}>
                  {action.detail}
                </Text>
              </View>
              <Icon name="chevronRight" size={18} color={hovered ? colors.text : colors.textTertiary} />
            </>
          )}
        </Interactive>
      ))}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    hero: {
      borderRadius: Radius.xl,
      padding: 24,
      borderWidth: 1,
      borderColor: 'rgba(140, 175, 255, 0.28)',
      overflow: 'hidden',
    },
    kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    kickerIcon: {
      width: 24,
      height: 24,
      borderRadius: 8,
      backgroundColor: '#FDC00A',
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroKicker: { ...Type.overline, color: colors.accentText },
    heroTitle: { ...Type.title2, fontSize: 24, lineHeight: 31, color: colors.apexText, maxWidth: 620 },
    heroDetail: { fontSize: 15, lineHeight: 22, color: colors.apexMuted, marginTop: 6, maxWidth: 560 },
    heroButton: { marginTop: 20, alignSelf: 'flex-start' },
    list: {
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.hairline,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      gap: 12,
    },
    rowDivider: { borderTopWidth: 1, borderTopColor: colors.divider },
    rowHover: { backgroundColor: colors.surfaceMuted },
    rowIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.primarySubtle, alignItems: 'center', justifyContent: 'center' },
    rowText: { flex: 1, minWidth: 0 },
    rowKicker: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: colors.textTertiary },
    rowTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 2 },
    rowDetail: { fontSize: 12, lineHeight: 17, color: colors.textSecondary, marginTop: 2 },
  });
}
