import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';

import { BackLink } from '@/components/learning/nav-bits';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Card, Interactive } from '@/components/ui/interactive';
import { Pill } from '@/components/ui/pill';
import { PageHeader, Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { InlineNotice } from '@/components/ui/state-views';
import { Type, type ThemeColors } from '@/constants/theme';
import { getLessonQuestions, publishedTopics } from '@/data/curriculum';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { routes } from '@/lib/routes';

const QUESTION_COUNTS = [5, 10, 15, 20, 25] as const;
const FEEDBACK_OPTIONS = [
  { value: 'instant', label: 'After each' },
  { value: 'submit', label: 'At the end' },
] as const;
const TIMER_OPTIONS = [
  { value: 'off', label: 'Off' },
  { value: '10', label: '10 sec' },
  { value: '15', label: '15 sec' },
  { value: '20', label: '20 sec' },
  { value: '30', label: '30 sec' },
] as const;

export default function CustomQuizBuilderScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState<string>('10');
  const [feedback, setFeedback] = useState<'instant' | 'submit'>('instant');
  const [timer, setTimer] = useState('off');

  const selected = useMemo(() => new Set(selectedLessonIds), [selectedLessonIds]);
  const availableQuestionIds = useMemo(() => {
    const ids = new Set<string>();
    for (const lessonId of selectedLessonIds) {
      for (const question of getLessonQuestions(lessonId)) {
        if (question.usage !== 'learn') ids.add(question.id);
      }
    }
    return Array.from(ids);
  }, [selectedLessonIds]);

  function toggleLesson(lessonId: string) {
    setSelectedLessonIds((current) =>
      current.includes(lessonId) ? current.filter((id) => id !== lessonId) : [...current, lessonId]
    );
  }

  function toggleTopic(lessonIds: string[]) {
    const allSelected = lessonIds.every((lessonId) => selected.has(lessonId));
    setSelectedLessonIds((current) => {
      const remaining = current.filter((id) => !lessonIds.includes(id));
      return allSelected ? remaining : [...new Set([...remaining, ...lessonIds])];
    });
  }

  function startQuiz() {
    if (availableQuestionIds.length === 0) return;
    router.push(
      routes.customQuiz({
        lessonIds: selectedLessonIds,
        size: Math.min(Number(questionCount), availableQuestionIds.length),
        feedback,
        secondsPerQuestion: timer === 'off' ? undefined : Number(timer),
      })
    );
  }

  return (
    <Screen width="learning">
      <BackLink fallback={routes.learn()} />
      <PageHeader
        eyebrow="Study"
        title="Custom quiz"
        subtitle="Build a quiz from the lecture questions in the lessons you choose."
      />

      <View style={styles.sectionHeader}>
        <View style={styles.sectionCopy}>
          <Text style={styles.sectionTitle}>Choose lessons</Text>
          <Text style={styles.sectionDetail}>Select a whole topic or pick individual lessons.</Text>
        </View>
        <Pill label={`${availableQuestionIds.length} questions`} tone={availableQuestionIds.length ? 'primary' : 'neutral'} />
      </View>

      {publishedTopics.map((topic) => {
        const lessonIds = topic.lessons.map((lesson) => lesson.id);
        const selectedCount = lessonIds.filter((lessonId) => selected.has(lessonId)).length;
        const allSelected = lessonIds.length > 0 && selectedCount === lessonIds.length;
        return (
          <Card key={topic.id} style={styles.topicCard}>
            <View style={styles.topicHeader}>
              <View style={styles.topicCopy}>
                <Text style={styles.topicTitle}>{topic.title}</Text>
                <Text style={styles.topicCount}>{selectedCount} of {lessonIds.length} lessons selected</Text>
              </View>
              <Button
                label={allSelected ? 'Clear' : 'Select all'}
                size="sm"
                variant="secondary"
                onPress={() => toggleTopic(lessonIds)}
              />
            </View>
            <View style={styles.lessonList}>
              {topic.lessons.map((lesson) => {
                const isSelected = selected.has(lesson.id);
                const questionCount = getLessonQuestions(lesson.id).filter((question) => question.usage !== 'learn').length;
                return (
                  <Interactive
                    key={lesson.id}
                    onPress={() => toggleLesson(lesson.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                    accessibilityLabel={`${lesson.title}, ${questionCount} questions`}
                    style={({ hovered }) => [styles.lessonRow, hovered && styles.lessonRowHover]}
                  >
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected ? <Icon name="check" size={13} color={colors.surfaceElevated} /> : null}
                    </View>
                    <Text style={styles.lessonName}>{lesson.title}</Text>
                    <Text style={styles.lessonQuestionCount}>{questionCount}</Text>
                  </Interactive>
                );
              })}
            </View>
          </Card>
        );
      })}

      <Card style={styles.optionsCard}>
        <Text style={styles.sectionTitle}>Quiz settings</Text>
        <View style={styles.setting}>
          <Text style={styles.settingLabel}>Question count</Text>
          <SegmentedControl
            label="Number of questions"
            options={QUESTION_COUNTS.map((count) => ({ value: String(count), label: String(count) }))}
            value={questionCount}
            onChange={setQuestionCount}
          />
        </View>
        <View style={styles.setting}>
          <Text style={styles.settingLabel}>Feedback</Text>
          <SegmentedControl
            label="Feedback timing"
            options={FEEDBACK_OPTIONS}
            value={feedback}
            onChange={setFeedback}
          />
          <Text style={styles.settingHint}>See explanations after each answer, or finish all questions first.</Text>
        </View>
        <View style={styles.setting}>
          <Text style={styles.settingLabel}>Timed drill</Text>
          <SegmentedControl
            label="Seconds per question"
            options={TIMER_OPTIONS}
            value={timer}
            onChange={setTimer}
          />
          <Text style={styles.settingHint}>The timer starts again for each question.</Text>
        </View>
      </Card>

      {selectedLessonIds.length > 0 && availableQuestionIds.length === 0 ? (
        <InlineNotice tone="info" title="No quiz questions in this selection" message="Choose another lesson with published quiz questions." />
      ) : null}

      <View style={styles.startRow}>
        <Button label="Clear selection" variant="ghost" onPress={() => setSelectedLessonIds([])} disabled={selectedLessonIds.length === 0} />
        <Button
          label={timer === 'off' ? 'Start custom quiz' : 'Start timed drill'}
          trailing="→"
          size="lg"
          onPress={startQuiz}
          disabled={availableQuestionIds.length === 0}
        />
      </View>
      <Text style={styles.previewNote}>Your answers count toward your quiz history and spaced review.</Text>
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
    sectionCopy: { flex: 1, minWidth: 0 },
    sectionTitle: { ...Type.title3, color: colors.text },
    sectionDetail: { fontSize: 13, lineHeight: 18, color: colors.textSecondary, marginTop: 3 },
    topicCard: { gap: 10, marginBottom: 10 },
    topicHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    topicCopy: { flex: 1, minWidth: 0 },
    topicTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
    topicCount: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    lessonList: { borderTopWidth: 1, borderTopColor: colors.divider },
    lessonRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.divider, paddingVertical: 7 },
    lessonRowHover: { backgroundColor: colors.surfaceMuted },
    checkbox: { width: 20, height: 20, borderWidth: 1.5, borderColor: colors.border, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
    checkboxSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
    lessonName: { flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: '600', color: colors.text },
    lessonQuestionCount: { ...Type.numeral, fontSize: 12, color: colors.textTertiary },
    optionsCard: { gap: 16, marginTop: 10 },
    setting: { gap: 7 },
    settingLabel: { fontSize: 14, fontWeight: '800', color: colors.text },
    settingHint: { fontSize: 12.5, lineHeight: 18, color: colors.textSecondary },
    startRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
    previewNote: { fontSize: 11.5, color: colors.textTertiary, textAlign: 'right', marginTop: 8 },
  });
}
