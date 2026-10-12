import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, TextInput } from '@/components/ui/text';

import { BackLink } from '@/components/learning/nav-bits';
import { Button } from '@/components/ui/button';
import { Card, Interactive } from '@/components/ui/interactive';
import { InlineNotice } from '@/components/ui/state-views';
import { PageHeader, Screen, SectionHeader } from '@/components/ui/screen';
import { Radius, Type, type ThemeColors } from '@/constants/theme';
import { createPersonalGoal, deletePersonalGoal, listPersonalGoals, refreshProgressGoals, type PersonalGoal } from '@/data/planning';
import { getProgressSnapshot } from '@/data/progress';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

const GOAL_TYPES: { value: PersonalGoal['goal_type']; label: string }[] = [
  { value: 'lessons', label: 'Lessons' }, { value: 'xp', label: 'XP' }, { value: 'streak', label: 'Streak days' },
];

export default function GoalsScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const [goals, setGoals] = useState<PersonalGoal[]>([]);
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('10');
  const [deadline, setDeadline] = useState('');
  const [kind, setKind] = useState<PersonalGoal['goal_type']>('lessons');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);

  async function reload() {
    setBusy(true);
    try {
      const progress = getProgressSnapshot();
      await refreshProgressGoals({ lessonsCompleted: progress.lessonsCompleted, xp: progress.xp, streak: progress.streak });
      setGoals(await listPersonalGoals());
      setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load your goals.'); }
    finally { setBusy(false); }
  }

  useEffect(() => { queueMicrotask(() => { void reload(); }); }, []);

  async function addGoal() {
    const value = Number(target);
    if (!title.trim() || !Number.isFinite(value) || value <= 0) { setError('Add a goal name and a target greater than zero.'); return; }
    try {
      setError('');
      await createPersonalGoal({ title: title.trim(), goal_type: kind, target: value, deadline: deadline.trim() || null });
      setTitle(''); setDeadline('');
      await reload();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save the goal.'); }
  }

  async function remove(id: string) {
    try { await deletePersonalGoal(id); setGoals((old) => old.filter((goal) => goal.id !== id)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not remove the goal.'); }
  }

  return <Screen width="content">
    <BackLink fallback="/" />
    <PageHeader title="Personal goals" subtitle="Set a target that fits your study life. Progress updates from your learning activity." />
    {error ? <InlineNotice tone="error" title="Goal sync issue" message={error} /> : null}
    <SectionHeader title="Create a goal" subtitle="Lesson, XP and streak goals track automatically from your GrAte Apex Hub progress." />
    <Card style={styles.card}>
      <TextInput value={title} onChangeText={setTitle} maxLength={120} placeholder="e.g. Finish 10 lessons" placeholderTextColor={colors.textTertiary} style={styles.input} accessibilityLabel="Goal name" />
      <View style={styles.typeRow}>{GOAL_TYPES.map((item) => <Interactive key={item.value} onPress={() => setKind(item.value)} accessibilityRole="radio" accessibilityState={{ checked: kind === item.value }} style={[styles.typeChoice, kind === item.value && styles.typeChoiceActive]}><Text style={[styles.typeText, kind === item.value && styles.typeTextActive]}>{item.label}</Text></Interactive>)}</View>
      <View style={styles.inputPair}>
        <View style={styles.flex}><Text style={styles.label}>Target</Text><TextInput value={target} onChangeText={setTarget} keyboardType="decimal-pad" style={styles.input} accessibilityLabel="Goal target" /></View>
        <View style={styles.flex}><Text style={styles.label}>Deadline (optional)</Text><TextInput value={deadline} onChangeText={setDeadline} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textTertiary} style={styles.input} accessibilityLabel="Goal deadline" /></View>
      </View>
      <Button label="Save goal" onPress={() => void addGoal()} disabled={!title.trim()} />
    </Card>
    <SectionHeader title="Your goals" subtitle="Progress is private to you." style={styles.section} />
    {busy ? <Text style={styles.muted}>Loading goals…</Text> : goals.length ? goals.map((goal) => {
      const current = goal.goal_type === 'lessons' || goal.goal_type === 'xp' || goal.goal_type === 'streak' ? goal.current : Number(goal.current);
      const pct = Math.min(100, Math.round(current / Number(goal.target) * 100));
      return <Card key={goal.id} style={styles.goalCard}>
        <View style={styles.goalTop}><View style={styles.flex}><Text style={styles.title}>{goal.title}</Text><Text style={styles.muted}>{current} / {goal.target} {goal.goal_type}{goal.deadline ? ` · due ${goal.deadline}` : ''}</Text></View><Button label="Remove" variant="ghost" size="sm" onPress={() => void remove(goal.id)} /></View>
        <View style={styles.track}><View style={[styles.fill, { width: `${pct}%` }]} /></View>
        <Text style={styles.pct}>{goal.completed_at || pct >= 100 ? 'Completed' : `${pct}% complete`}</Text>
      </Card>;
    }) : <Card style={styles.card}><Text style={styles.body}>No goals yet. Add one above, and progress will appear here as you study.</Text></Card>}
  </Screen>;
}

function createStyles(c: ThemeColors) { return StyleSheet.create({
  card: { gap: 12, marginTop: 12 }, section: { marginTop: 26 }, goalCard: { gap: 10, marginTop: 10 },
  input: { width: '100%', minWidth: 0, borderWidth: 1, borderColor: c.borderStrong, borderRadius: Radius.md, backgroundColor: c.surfaceSunken, paddingHorizontal: 12, paddingVertical: 10, color: c.text, fontSize: 14 },
  inputPair: { flexDirection: 'row', gap: 10 }, flex: { flex: 1, minWidth: 0 }, label: { ...Type.caption, color: c.textSecondary, fontWeight: '700', marginBottom: 4 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, typeChoice: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceMuted }, typeChoiceActive: { borderColor: c.primary, backgroundColor: c.primarySubtle }, typeText: { ...Type.caption, color: c.textSecondary }, typeTextActive: { color: c.primaryText, fontWeight: '800' },
  goalTop: { flexDirection: 'row', gap: 10, alignItems: 'center' }, title: { ...Type.title3, color: c.text }, muted: { ...Type.caption, color: c.textTertiary, marginTop: 3 }, body: { ...Type.callout, color: c.textSecondary },
  track: { height: 9, borderRadius: 8, backgroundColor: c.surfaceMuted, overflow: 'hidden' }, fill: { height: '100%', backgroundColor: c.primary, borderRadius: 8 }, pct: { ...Type.caption, color: c.textSecondary, fontWeight: '700' },
}); }
