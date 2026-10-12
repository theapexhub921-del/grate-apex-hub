import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { AnimatedNumber } from '@/components/ui/animated-number';
import { Icon, type IconName } from '@/components/ui/icon';
import { Card } from '@/components/ui/interactive';
import { Pill } from '@/components/ui/pill';
import { Text } from '@/components/ui/text';
import { Type, type ThemeColors } from '@/constants/theme';
import { addDays, startOfDay } from '@/data/learning/time';
import { useLearning } from '@/data/learning/use-learning';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

// Study → "Your learning this week": lessons, answers, XP and streak for the
// last seven days, with XP per day (all from the real ledger). Sits next to
// the week calendar.
export function LearningWeekCard() {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const { progress, attempts, now } = useLearning();

  const today = startOfDay(now);
  const weekStart = addDays(today, -6);
  const lessonsThisWeek = Object.values(progress.lessonCompletedAt).filter((at) => at >= weekStart).length;
  const answersThisWeek = attempts.filter((attempt) => attempt.attemptedAt >= weekStart).length;
  const xpThisWeek = progress.xpLedger.filter((entry) => entry.at >= weekStart).reduce((sum, entry) => sum + entry.amount, 0);

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const start = addDays(today, index - 6);
        const end = addDays(start, 1);
        const xp = progress.xpLedger.filter((entry) => entry.at >= start && entry.at < end).reduce((sum, entry) => sum + Math.max(0, entry.amount), 0);
        return { start, xp, label: new Date(start).toLocaleDateString(undefined, { weekday: 'narrow' }), isToday: start === today };
      }),
    [progress.xpLedger, today]
  );
  const maxXp = Math.max(1, ...days.map((day) => day.xp));
  const points = days.map((day, index) => ({ x: 16 + index * 48, y: 82 - (day.xp / maxXp) * 62, isToday: day.isToday }));
  const line = smoothPath(points);
  const area = `${line} L ${points[points.length - 1].x} 90 L ${points[0].x} 90 Z`;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Your learning this week</Text>
        <Pill label="Real activity" tone="success" />
      </View>
      <View style={styles.stats}>
        <Stat icon="lesson" value={lessonsThisWeek} label="lessons" />
        <Stat icon="check" value={answersThisWeek} label="answers" />
        <Stat icon="xp" value={xpThisWeek} label="XP" />
        <Stat icon="streak" value={progress.streak} label="streak" />
      </View>
      <View style={styles.chart} accessibilityLabel={`XP per day this week: ${days.map((day) => day.xp).join(', ')}`}>
        <Svg style={styles.graph} viewBox="0 0 320 100" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="learnWeekXpFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.primary} stopOpacity="0.22" />
              <Stop offset="1" stopColor={colors.primary} stopOpacity="0.01" />
            </LinearGradient>
          </Defs>
          {[20, 40, 60, 80].map((y) => (
            <Line key={y} x1="16" y1={y} x2="304" y2={y} stroke={colors.divider} strokeWidth="1" strokeDasharray="3 5" />
          ))}
          <Path d={area} fill="url(#learnWeekXpFill)" />
          <Path d={line} fill="none" stroke={colors.primary} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((point, index) => (
            <Circle key={days[index].start} cx={point.x} cy={point.y} r={point.isToday ? 5 : 3.5} fill={point.isToday ? colors.accent : colors.primary} stroke={colors.surface} strokeWidth="2" />
          ))}
        </Svg>
        <View style={styles.labels}>
          {days.map((day) => (
            <Text key={day.start} style={[styles.label, day.isToday && styles.labelToday]}>{day.label}</Text>
          ))}
        </View>
      </View>
      <Text style={styles.note}>Friends see your weekly XP and streak — never your answers or scores.</Text>
    </Card>
  );
}

function smoothPath(points: { x: number; y: number }[]) {
  if (points.length < 2) return '';
  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const midpoint = (previous.x + point.x) / 2;
    return `${path} C ${midpoint} ${previous.y}, ${midpoint} ${point.y}, ${point.x} ${point.y}`;
  }, '');
}

function Stat({ icon, value, label }: { icon: IconName; value: number; label: string }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const gold = icon === 'xp' || icon === 'streak';
  return (
    <View style={styles.stat}>
      <Icon name={icon} size={15} color={gold ? colors.accentText : colors.primaryText} filled={gold} />
      <AnimatedNumber value={value} style={styles.value} />
      <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: { gap: 14 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    title: { ...Type.title3, color: colors.text },
    note: { fontSize: 12.5, lineHeight: 18, color: colors.textSecondary },
    stats: { flexDirection: 'row', gap: 8 },
    stat: { flex: 1, minWidth: 0, gap: 4, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 14, backgroundColor: colors.surfaceMuted },
    value: { ...Type.numeral, fontSize: 20, color: colors.text },
    statLabel: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
    chart: { height: 116, gap: 6 },
    graph: { width: '100%', height: 96 },
    labels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 5 },
    label: { fontSize: 11, fontWeight: '700', color: colors.textTertiary },
    labelToday: { color: colors.text },
  });
}
