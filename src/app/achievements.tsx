import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';

import { AchievementBadge } from '@/components/achievements/achievement-badge';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Icon } from '@/components/ui/icon';
import { Card } from '@/components/ui/interactive';
import { Pill } from '@/components/ui/pill';
import { ProgressBar } from '@/components/ui/progress-bar';
import { PageHeader, Screen, SectionHeader } from '@/components/ui/screen';
import { Radius, type ThemeColors, Type } from '@/constants/theme';
import { type AchievementGroup, type AchievementState } from '@/data/achievements';
import { useAchievements } from '@/data/achievements-store';
import { activatePowerup, boostRemainingMs, describeBoost, usePowerups, useActiveBoost } from '@/data/learning/powerups';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

// /achievements — hidden; reached from You (profile) and the level-complete
// notice. Every original-app milestone plus this app's own, five levels each.
// Each newly completed level gives one timed boost (data/achievements-store.ts).

const GROUP_ORDER: AchievementGroup[] = ['GRATEAPEX', 'Questions', 'Streaks', 'Levels', 'Skill', 'Lessons', 'Mistakes', 'Habits', 'Special days'];

export default function AchievementsScreen() {
  const styles = useThemedStyles(createStyles);
  const { states, ready } = useAchievements();
  const [open, setOpen] = useState<AchievementState | null>(null);
  const completed = states.reduce((sum, state) => sum + state.level, 0);
  const groups = useMemo(() => GROUP_ORDER.map((group) => ({ group, items: states.filter((state) => state.def.group === group) })), [states]);

  return (
    <Screen width="content" contentStyle={styles.page}>
      <PageHeader
        eyebrow="You"
        title="Achievements"
        subtitle={`${completed} of ${states.length * 5} levels complete${ready ? '' : ' · still loading your earlier progress'}`}
      />
      <BoostPanel />
      {groups.map(({ group, items }) => (
        <View key={group} style={styles.section}>
          <SectionHeader title={group === 'GRATEAPEX' ? 'GrAte Apex Hub' : group} subtitle={`${items.reduce((n, s) => n + s.level, 0)} of ${items.length * 5} levels`} />
          <View style={styles.badges}>
            {items.map((state) => <AchievementBadge key={state.def.id} state={state} onPress={() => setOpen(state)} />)}
          </View>
        </View>
      ))}
      <Sheet visible={Boolean(open)} onClose={() => setOpen(null)} title={open?.def.name ?? ''} subtitle={open ? `${open.def.group === 'GRATEAPEX' ? 'GrAte Apex Hub' : open.def.group} · level ${open.level} of 5` : undefined}>
        {open ? <AchievementRow state={open} /> : null}
      </Sheet>
    </Screen>
  );
}

function AchievementRow({ state }: { state: AchievementState }) {
  const colors = useTheme();
  const styles = useThemedStyles(createStyles);
  const { def, level, value, next, progress } = state;
  const status = level === 5 ? 'Complete' : level > 0 || value > 0 ? 'In progress' : 'Locked';
  return (
    <Card style={styles.row}>
      <View style={styles.rowTop} accessible accessibilityLabel={`${def.name}: level ${level} of 5. ${next !== null ? `Next: ${def.goal(next)}.` : 'All five levels complete.'}`}>
        <View style={[styles.mark, level > 0 ? styles.markEarned : null]}>
          <Icon name={level > 0 ? 'xp' : 'lock'} size={16} color={level > 0 ? colors.accentText : colors.textTertiary} filled={level > 0} />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.name}>{def.name}</Text>
          <Text style={styles.goal}>{next !== null ? `Level ${level + 1}: ${def.goal(next)}` : `All five levels complete · ${def.goal(def.levels[4])}`}</Text>
        </View>
        <Pill label={status} tone={level === 5 ? 'success' : level > 0 ? 'gold' : 'neutral'} />
      </View>
      <View style={styles.levels} accessibilityElementsHidden>
        {def.levels.map((threshold, index) => (
          <View key={threshold} style={[styles.level, index < level ? styles.levelDone : index === level ? styles.levelNext : null]}>
            <Text style={[styles.levelText, index < level ? styles.levelTextDone : null]}>{index + 1}</Text>
          </View>
        ))}
      </View>
      {next !== null ? <ProgressBar value={progress} height={6} label={`${Math.min(value, next).toLocaleString('en')} / ${next.toLocaleString('en')}`} /> : null}
      {def.pending ? <Text style={styles.pending}>Pending integration: {def.pending}</Text> : null}
    </Card>
  );
}

function BoostPanel() {
  const styles = useThemedStyles(createStyles);
  const inventory = usePowerups();
  const active = useActiveBoost();
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const remaining = boostRemainingMs(active, now);
  const timed = inventory.filter((item) => item.kind === 'timed');

  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [active]);

  async function activate(id: string) {
    setError(null);
    try {
      await activatePowerup(id);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'That boost could not be started.');
    }
  }

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return (
    <Card style={styles.boostCard}>
      <SectionHeader title="Boosts" subtitle="Each one multiplies the XP from lessons and lesson or topic quizzes for up to an hour, from when you activate it." />
      {remaining > 0 && active ? (
        <View style={styles.activeRow} accessibilityLiveRegion="polite">
          <Pill label={`×${active.multiplier} XP active`} tone="gold" />
          <Text style={styles.countdown}>{`${minutes}:${String(seconds).padStart(2, '0')} left`}</Text>
        </View>
      ) : null}
      {timed.length === 0 ? <Text style={styles.muted}>Complete an achievement level to earn a boost.</Text> : null}
      {timed.map((item) => (
        <View key={item.id} style={styles.boostRow}>
          <Text style={styles.boostText}>{describeBoost(item)}</Text>
          <Button label="Activate" size="sm" disabled={remaining > 0} onPress={() => void activate(item.id)} accessibilityLabel={`Activate ${describeBoost(item)}`} />
        </View>
      ))}
      {remaining > 0 && timed.length > 0 ? <Text style={styles.muted}>One boost at a time: the others wait here until this one ends.</Text> : null}
      {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
    </Card>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    page: { paddingBottom: 140, gap: 8 },
    section: { marginTop: 18, gap: 10 },
    list: { gap: 10 },
    badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, rowGap: 18 },
    row: { gap: 10, padding: 14 },
    rowTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    mark: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceSunken },
    markEarned: { backgroundColor: colors.accentSubtle },
    rowText: { flex: 1, minWidth: 0 },
    name: { ...Type.headline, color: colors.text },
    goal: { fontSize: 13, lineHeight: 18, color: colors.textSecondary },
    levels: { flexDirection: 'row', gap: 6 },
    level: { flex: 1, height: 22, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSunken },
    levelDone: { backgroundColor: colors.accentSubtle, borderColor: colors.accentText },
    levelNext: { borderColor: colors.primary },
    levelText: { fontSize: 11, fontWeight: '800', color: colors.textTertiary },
    levelTextDone: { color: colors.accentText },
    pending: { fontSize: 12, lineHeight: 17, color: colors.textTertiary },
    boostCard: { gap: 10, marginTop: 6 },
    activeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    countdown: { ...Type.headline, color: colors.text },
    boostRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    boostText: { flex: 1, fontSize: 14, color: colors.text },
    muted: { fontSize: 13, lineHeight: 18, color: colors.textSecondary },
    error: { fontSize: 13, color: colors.error },
  });
}
