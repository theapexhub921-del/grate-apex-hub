import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Interactive } from '@/components/ui/interactive';
import { SectionHeader } from '@/components/ui/screen';
import { type Tile, TileGrid } from '@/components/ui/tile-grid';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Type, type ThemeColors } from '@/constants/theme';
import type { LegacyCourse, LegacyLessonMeta } from '@/data/legacy-study';
import { CUSTOM_COUNTS, CUSTOM_SECONDS, DRILL, MOCK_SIZE, MOCK_TESTS, PREPOST_SIZE, setKind } from '@/data/practice-modes';
import { loadPrePost, percentOf, type PrePost } from '@/data/prepost';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { routes } from '@/lib/routes';

type CourseSet = { id: string; name: string; count: number };


// A course's practice modes, from the original app (in this app's look):
// predicted tests, a custom quiz builder, a timed drill, past questions and a
// pre-test / post-test.
export function CoursePracticeModes({ course, lessons, sets }: { course: LegacyCourse; lessons: readonly LegacyLessonMeta[]; sets: readonly CourseSet[] }) {
  const styles = useThemedStyles(createStyles);
  const [sheet, setSheet] = useState<'predicted' | 'past' | 'custom' | null>(null);
  const [prepost, setPrepost] = useState<PrePost>({});
  useFocusEffect(useCallback(() => {
    let live = true;
    void loadPrePost(course.id).then((value) => { if (live) setPrepost(value); });
    return () => { live = false; };
  }, [course.id]));

  const predicted = sets.filter((set) => setKind(set.name) === 'predicted');
  const past = sets.filter((set) => setKind(set.name) === 'past');
  const pastQuestions = past.reduce((sum, set) => sum + set.count, 0);
  const pre = percentOf(prepost.pre);
  const post = percentOf(prepost.post);

  const tiles: Tile[] = [
    { id: 'predicted', icon: 'achievement', title: 'Predicted Tests', detail: predicted.length ? `${predicted.length} predicted papers, plus ${MOCK_TESTS} mock exams of ${MOCK_SIZE} questions. Answers are shown at the end, like the real paper.` : `Sit one of ${MOCK_TESTS} full mock exams of ${MOCK_SIZE} questions. Answers are shown at the end, like the real paper.`, onPress: () => setSheet('predicted') },
    { id: 'custom', icon: 'grid', title: 'Custom Quiz Builder', detail: 'Pick your lessons, number of questions, timing and when you see the answers.', onPress: () => setSheet('custom') },
    { id: 'drill', icon: 'timer', title: 'Timed Drill', detail: `Rapid fire with a countdown on every question (${DRILL.questions} questions, ${DRILL.seconds} seconds each). Beat the clock.`, onPress: () => router.push(routes.legacyPractice({ course: course.id, drill: true })) },
    { id: 'past', icon: 'book', title: 'Past questions', detail: `${past.length} paper${past.length === 1 ? '' : 's'}, ${pastQuestions.toLocaleString()} questions from real past papers.`, onPress: () => setSheet('past'), hidden: past.length === 0 },
    {
      id: 'prepost', icon: 'chart', title: 'Pre-test and post-test',
      detail: pre === null ? `Take ${PREPOST_SIZE} questions now, study, then ${PREPOST_SIZE} different ones later to measure your improvement.`
        : post === null ? `Pre-test: ${pre}%. Study the course, then take the post-test to see how much you’ve improved.`
        : `Pre-test ${pre}% → post-test ${post}% (${post - pre >= 0 ? '+' : ''}${post - pre} points). Take a new pre-test to start again.`,
      onPress: () => router.push(routes.legacyPractice({ course: course.id, prepost: pre === null || post !== null ? 'pre' : 'post' })),
    },
  ];

  return (
    <>
      <SectionHeader title="Practice modes" subtitle="Exams, drills and quizzes built from this course’s questions." style={styles.section} />
      <TileGrid columns={2} tiles={tiles} />

      <Sheet visible={sheet === 'predicted'} onClose={() => setSheet(null)} title="Predicted Tests" subtitle="Answers are shown at the end, like the real paper.">
        <View style={styles.list}>
          {predicted.map((set) => (
            <ListRow key={set.id} title={set.name} detail={`${set.count} questions · the original predicted paper`} onPress={() => { setSheet(null); router.push(routes.legacyPractice({ course: course.id, set: set.id, exam: true })); }} />
          ))}
          {Array.from({ length: MOCK_TESTS }, (_, index) => (
            <ListRow key={index} title={`Mock exam ${index + 1}`} detail={`${MOCK_SIZE} questions from across the course · the same paper each time`} onPress={() => { setSheet(null); router.push(routes.legacyPractice({ course: course.id, mock: index + 1 })); }} />
          ))}
        </View>
      </Sheet>

      <Sheet visible={sheet === 'past'} onClose={() => setSheet(null)} title="Past questions" subtitle="Real past papers, answers at the end.">
        <View style={styles.list}>
          {past.map((set) => (
            <ListRow key={set.id} title={set.name} detail={`${set.count} questions`} onPress={() => { setSheet(null); router.push(routes.legacyPractice({ course: course.id, set: set.id, exam: true })); }} />
          ))}
        </View>
      </Sheet>

      <CustomBuilder visible={sheet === 'custom'} onClose={() => setSheet(null)} course={course} lessons={lessons} sets={sets} />
    </>
  );
}

function ListRow({ title, detail, onPress }: { title: string; detail: string; onPress: () => void }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  return (
    <Interactive onPress={onPress} accessibilityRole="button" style={({ hovered }) => [styles.row, hovered && styles.rowHover]}>
      <View style={styles.flex}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.tileText}>{detail}</Text>
      </View>
      <Icon name="chevronRight" size={16} color={colors.textTertiary} />
    </Interactive>
  );
}

function CustomBuilder({ visible, onClose, course, lessons, sets }: { visible: boolean; onClose: () => void; course: LegacyCourse; lessons: readonly LegacyLessonMeta[]; sets: readonly CourseSet[] }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const [picked, setPicked] = useState<string[]>([]);
  const [pickedSets, setPickedSets] = useState<string[]>([]);
  const [count, setCount] = useState<string>('20');
  const [seconds, setSeconds] = useState<string>('0');
  const [feedback, setFeedback] = useState<'instant' | 'submit'>('instant');
  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);
  const withQuestions = lessons.filter((lesson) => (lesson.qids?.length ?? lesson.qcount ?? 0) > 0);

  function start() {
    onClose();
    router.push(routes.legacyPractice({ course: course.id, custom: { lessons: picked, sets: pickedSets, count: Number(count), seconds: Number(seconds) || undefined, feedback } }));
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Custom Quiz Builder"
      subtitle="Choose lessons or question sets (none = the whole course)."
      footer={<View style={styles.footer}><Button label="Clear" variant="ghost" onPress={() => { setPicked([]); setPickedSets([]); }} /><Button label="Start the quiz" trailing="→" onPress={start} /></View>}
    >
      <View style={styles.builder}>
        <Text style={styles.label}>Number of questions</Text>
        <SegmentedControl label="Number of questions" options={CUSTOM_COUNTS.map((value) => ({ value: String(value), label: String(value) }))} value={count} onChange={setCount} />
        <Text style={styles.label}>Timer per question</Text>
        <SegmentedControl label="Seconds per question" options={CUSTOM_SECONDS.map((value) => ({ value: String(value), label: value ? `${value} s` : 'Off' }))} value={seconds} onChange={setSeconds} />
        <Text style={styles.label}>Answers</Text>
        <SegmentedControl label="When you see the answers" options={[{ value: 'instant', label: 'After each' }, { value: 'submit', label: 'At the end' }]} value={feedback} onChange={(value) => setFeedback(value as 'instant' | 'submit')} />
        {withQuestions.length ? <Text style={styles.label}>Lessons</Text> : null}
        {withQuestions.map((lesson) => {
          const on = picked.includes(lesson.id);
          return (
            <Interactive key={lesson.id} onPress={() => setPicked((list) => toggle(list, lesson.id))} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={styles.check}>
              <View style={[styles.box, on && styles.boxOn]}>{on ? <Icon name="check" size={12} color={colors.onPrimary} strokeWidth={3} /> : null}</View>
              <Text style={styles.checkText}>{lesson.title}</Text>
              <Text style={styles.count}>{lesson.qids?.length ?? lesson.qcount ?? 0}</Text>
            </Interactive>
          );
        })}
        {sets.length ? <Text style={styles.label}>Question sets</Text> : null}
        {sets.map((set) => {
          const on = pickedSets.includes(set.id);
          return (
            <Interactive key={set.id} onPress={() => setPickedSets((list) => toggle(list, set.id))} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={styles.check}>
              <View style={[styles.box, on && styles.boxOn]}>{on ? <Icon name="check" size={12} color={colors.onPrimary} strokeWidth={3} /> : null}</View>
              <Text style={styles.checkText}>{set.name}</Text>
              <Text style={styles.count}>{set.count}</Text>
            </Interactive>
          );
        })}
      </View>
    </Sheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    section: { marginTop: 28 },
    grid: { gap: 12 },
    row2: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
    tile: { flex: 1, minWidth: 0, minHeight: 112, flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 16 },
    tileGap: { flex: 1 },
    tileIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSubtle },
    tileTitle: { ...Type.headline, color: colors.text },
    tileText: { fontSize: 13.5, lineHeight: 20, color: colors.textSecondary, marginTop: 2 },
    list: { gap: 6 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    rowHover: { borderColor: colors.primaryBorder },
    rowTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
    builder: { gap: 10 },
    label: { ...Type.overline, color: colors.textSecondary, marginTop: 8 },
    check: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
    box: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
    boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    checkText: { flex: 1, fontSize: 14, color: colors.text },
    count: { fontSize: 12.5, fontWeight: '700', color: colors.textTertiary },
    footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  });
}
