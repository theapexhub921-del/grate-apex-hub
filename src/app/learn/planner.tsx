import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, TextInput } from '@/components/ui/text';

import { BackLink } from '@/components/learning/nav-bits';
import { Button } from '@/components/ui/button';
import { Card, Interactive } from '@/components/ui/interactive';
import { Pill } from '@/components/ui/pill';
import { PageHeader, Screen, SectionHeader } from '@/components/ui/screen';
import { InlineNotice } from '@/components/ui/state-views';
import { Radius, Type, type ThemeColors } from '@/constants/theme';
import { publishedTopics } from '@/data/curriculum';
import { getProgressSnapshot } from '@/data/progress';
import { TimetableCalendar } from '@/components/learning/timetable-calendar';
import { Sheet } from '@/components/ui/sheet';
import { useDisplayName } from '@/data/user';
import { createTimetableBlock, deleteTimetableBlock, listStudyPlans, listTimetableBlocks, saveStudyPlan, updateStudyPlanProgress, updateTimetableBlock, type StudyPlan, type TimetableBlock } from '@/data/planning';
import { routes } from '@/lib/routes';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function PlannerScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [duration, setDuration] = useState('14');
  const [goal, setGoal] = useState('Study 30 minutes each day');
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [title, setTitle] = useState('');
  const [day, setDay] = useState('Mon');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('10:00');
  const [entries, setEntries] = useState<TimetableBlock[]>([]);
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [savingEntry, setSavingEntry] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const displayName = useDisplayName();

  function openBlock(entry?: TimetableBlock, defaults?: { weekday: number; start: string }) {
    setError('');
    if (entry) {
      setEditingId(entry.id); setTitle(entry.title ?? ''); setSubject(entry.subject ?? ''); setDay(DAYS[entry.weekday]); setStart(entry.start_time.slice(0, 5)); setEnd(entry.end_time.slice(0, 5));
    } else {
      const startAt = defaults?.start ?? '09:00';
      const endHour = Math.min(23, Number(startAt.slice(0, 2)) + 1);
      setEditingId(null); setTitle(''); setSubject(''); setDay(DAYS[defaults?.weekday ?? 0]); setStart(startAt); setEnd(`${String(endHour).padStart(2, '0')}:${startAt.slice(3, 5)}`);
    }
    setSheetOpen(true);
  }

  useEffect(() => {
    let active = true;
    Promise.all([listStudyPlans(), listTimetableBlocks()]).then(async ([plans, table]) => {
      if (!active) return;
      const current = plans.find((item) => item.status === 'active') ?? plans[0] ?? null;
      if (current) {
        setPlan(current);
        setSelectedIds(current.topic_ids);
        setDuration(String(current.duration_days));
        setGoal(current.goal);
        const completed = getProgressSnapshot().completedLessons;
        await updateStudyPlanProgress(completed);
        const refreshed = await listStudyPlans();
        setPlan(refreshed.find((item) => item.id === current.id) ?? current);
      }
      setEntries(table);
      setReady(true);
    }).catch((cause: unknown) => {
      if (!active) return;
      setError(cause instanceof Error ? cause.message : 'Could not load your saved planning data.');
      setReady(true);
    });
    return () => { active = false; };
  }, []);

  const lessonPath = useMemo(() => selectedIds.flatMap((id) => {
    const topic = publishedTopics.find((item) => item.id === id);
    return topic ? topic.lessons.map((lesson) => ({ topic, lesson })) : [];
  }), [selectedIds]);

  function toggleTopic(id: string) {
    setSaved(false);
    setSelectedIds((old) => old.includes(id) ? old.filter((value) => value !== id) : [...old, id]);
  }

  async function savePlan() {
    if (savingPlan || !selectedIds.length) return;
    setSavingPlan(true);
    try {
      setError('');
      const days = Math.max(1, Math.min(365, Number(duration) || 1));
      const next = await saveStudyPlan({ title: 'My study plan', topic_ids: selectedIds, duration_days: days, goal: goal.trim(), status: 'active' });
      setPlan(next);
      setSaved(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save the study plan.'); }
    finally { setSavingPlan(false); }
  }

  async function addTimetableEntry() {
    if (savingEntry) return;
    if (!title.trim() || !validTime(start) || !validTime(end) || end <= start) { setError('Add a title and a valid time range.'); return; }
    setSavingEntry(true);
    try {
      setError('');
      const input = { title: title.trim(), subject: subject.trim(), weekday: DAYS.indexOf(day), start_time: start, end_time: end, recurrence: 'weekly' as const, event_date: null, study_plan_id: plan?.id ?? null };
      const row = editingId ? await updateTimetableBlock(editingId, input) : await createTimetableBlock(input);
      setEntries((old) => editingId ? old.map((entry) => entry.id === editingId ? row : entry) : [...old, row].sort((a,b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time)));
      setTitle(''); setSubject(''); setEditingId(null); setSheetOpen(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save the timetable block.'); }
    finally { setSavingEntry(false); }
  }

  async function removeEntry(id: string) {
    try { await deleteTimetableBlock(id); setEntries((old) => old.filter((entry) => entry.id !== id)); setSheetOpen(false); setEditingId(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not remove the timetable block.'); }
  }

  return (
    <Screen width="content">
      <BackLink fallback={'/learn' as never} />
      <PageHeader title="Your study planner" subtitle="Your timetable, and an optional study plan built from the course." />
      {!ready ? <Text style={styles.body}>Loading your saved plans…</Text> : null}
      {error && !sheetOpen ? <InlineNotice tone="error" title="Planner issue" message={error} /> : null}

      <TimetableCalendar entries={entries} name={displayName} onAdd={(defaults) => openBlock(undefined, defaults)} onSelect={(entry) => openBlock(entry)} />

      <SectionHeader title="Build a study plan" subtitle="Choose topics and a time period. GrAte Apex Hub will make a lesson path from published course material." style={styles.sectionHeader} />

      <Card style={styles.sectionCard}>
        <Text style={styles.label}>Topics</Text>
        <View style={styles.topicGrid}>
          {publishedTopics.map((topic) => {
            const selected = selectedIds.includes(topic.id);
            return (
              <Interactive key={topic.id} onPress={() => toggleTopic(topic.id)} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} style={[styles.topicChoice, selected && styles.topicChoiceSelected]}>
                <Text style={[styles.topicText, selected && styles.topicTextSelected]}>{topic.title}</Text>
              </Interactive>
            );
          })}
        </View>
        <View style={styles.inputPair}>
          <View style={styles.flex}>
            <Text style={styles.label}>Time period (days)</Text>
          <TextInput value={duration} onChangeText={(value) => { setDuration(value); setSaved(false); }} keyboardType="number-pad" accessibilityLabel="Study plan duration in days" style={styles.input} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.label}>Your goal</Text>
            <TextInput value={goal} onChangeText={(value) => { setGoal(value); setSaved(false); }} maxLength={100} accessibilityLabel="Study goal" style={styles.input} />
          </View>
        </View>
        <Button label={saved ? 'Plan saved' : plan ? 'Save study plan' : 'Create study plan'} onPress={() => void savePlan()} loading={savingPlan} disabled={!ready || !selectedIds.length || savingPlan} />
      </Card>

      {plan && lessonPath.length ? (
        <Card style={styles.sectionCard}>
          <View style={styles.resultHead}><Text style={styles.heading}>Your lesson path</Text><Pill label={`${plan.duration_days} days`} tone="primary" /></View>
          <Text style={styles.body}>Goal: {plan.goal || 'Study at your own pace'}. The path uses {lessonPath.length} lessons from the topics you selected.</Text>
          {lessonPath.map(({ topic, lesson }, index) => {
            const completed = plan.progress_lesson_ids.includes(lesson.id) || getProgressSnapshot().completedLessons.includes(lesson.id);
            return (
            <Interactive key={lesson.id} onPress={() => router.push(routes.lesson(lesson.id))} style={styles.lessonRow} accessibilityRole="link">
              <View style={styles.lessonNumber}><Text style={styles.numberText}>{index + 1}</Text></View>
              <View style={styles.flex}><Text style={styles.lessonTitle}>{completed ? '✓ ' : ''}{lesson.title}</Text><Text style={styles.muted}>{topic.title}</Text></View>
              <Text style={styles.dayHint}>{completed ? 'Done' : `Day ${Math.min(plan.duration_days, Math.floor(index * plan.duration_days / lessonPath.length) + 1)}`}</Text>
            </Interactive>
          );})}
        </Card>
      ) : plan ? <InlineNotice tone="info" title="Your topics are not available yet" message="The plan is saved. Its lesson path will appear when those topics have published lessons." /> : null}

      <Sheet
        visible={sheetOpen}
        onClose={() => { if (!savingEntry) { setSheetOpen(false); setEditingId(null); } }}
        title={editingId ? 'Edit block' : 'Add to your timetable'}
        subtitle="A class or study block that repeats every week."
        footer={
          <View style={styles.sheetActions}>
            {editingId ? <Button label="Remove" variant="ghost" onPress={() => void removeEntry(editingId)} /> : null}
            <Button label="Cancel" variant="secondary" onPress={() => { setSheetOpen(false); setEditingId(null); }} disabled={savingEntry} />
            <Button label={editingId ? 'Save changes' : 'Add to timetable'} onPress={() => void addTimetableEntry()} loading={savingEntry} disabled={!ready || !title.trim() || savingEntry} />
          </View>
        }
      >
        <View style={styles.sheetBody}>
          {error ? <InlineNotice tone="error" title="Check the block" message={error} /> : null}
          <Text style={styles.label}>Name</Text>
          <TextInput value={title} onChangeText={setTitle} maxLength={60} placeholder="e.g. Anatomy lecture" placeholderTextColor={colors.textTertiary} accessibilityLabel="Timetable item name" style={styles.input} />
          <Text style={styles.label}>Subject (optional)</Text>
          <TextInput value={subject} onChangeText={setSubject} maxLength={100} placeholder="e.g. Anatomy" placeholderTextColor={colors.textTertiary} accessibilityLabel="Timetable subject" style={styles.input} />
          <Text style={styles.label}>Day</Text>
          <View style={styles.days}>
            {DAYS.map((value) => <Button key={value} label={value} size="sm" variant={day === value ? 'primary' : 'secondary'} onPress={() => setDay(value)} />)}
          </View>
          <Text style={styles.label}>Time</Text>
          <View style={styles.inputPair}>
            <TextInput value={start} onChangeText={setStart} placeholder="09:00" accessibilityLabel="Start time" style={[styles.input, styles.timeInput]} />
            <Text style={styles.body}>to</Text>
            <TextInput value={end} onChangeText={setEnd} placeholder="10:00" accessibilityLabel="End time" style={[styles.input, styles.timeInput]} />
          </View>
        </View>
      </Sheet>
    </Screen>
  );
}

function validTime(value: string) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(value); }

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    sectionHeader: { marginTop: 28 },
    sectionCard: { gap: 13, marginTop: 10 },
    weekCard: { marginTop: 10, padding: 14 },
    label: { ...Type.caption, fontWeight: '800', color: colors.textSecondary },
    heading: { ...Type.title3, color: colors.text },
    body: { ...Type.callout, color: colors.textSecondary },
    muted: { ...Type.caption, color: colors.textTertiary },
    topicGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    topicChoice: { paddingVertical: 8, paddingHorizontal: 11, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted },
    topicChoiceSelected: { borderColor: colors.primary, backgroundColor: colors.primarySubtle },
    topicText: { ...Type.caption, color: colors.textSecondary },
    topicTextSelected: { color: colors.primaryText, fontWeight: '800' },
    input: { minWidth: 0, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: Radius.md, backgroundColor: colors.surfaceSunken, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 14 },
    inputPair: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    flex: { flex: 1, minWidth: 0 },
    resultHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    lessonRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.divider },
    lessonNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primarySubtle, alignItems: 'center', justifyContent: 'center' },
    numberText: { ...Type.caption, fontWeight: '800', color: colors.primaryText },
    lessonTitle: { ...Type.callout, fontWeight: '700', color: colors.text },
    dayHint: { ...Type.caption, color: colors.textTertiary },
    days: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    timeInput: { flex: 1 },
    sheetBody: { gap: 8 },
    sheetActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 10 },
  });
}
