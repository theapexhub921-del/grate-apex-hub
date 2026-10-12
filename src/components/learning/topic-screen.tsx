import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';

import { TopicGlyph } from '@/components/learning/glyphs';
import { ClassAccessCard } from '@/components/learning/class-access-card';
import { MemoryDistribution, MemoryStateBadge } from '@/components/learning/memory-ui';
import { Breadcrumbs, StatTile } from '@/components/learning/nav-bits';
import { NextActionHero } from '@/components/learning/next-action-card';
import { Button } from '@/components/ui/button';
import { Card, Interactive } from '@/components/ui/interactive';
import { Pill } from '@/components/ui/pill';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Columns, Screen, SectionHeader } from '@/components/ui/screen';
import { ErrorScreen } from '@/components/ui/state-views';
import { Type, type ThemeColors } from '@/constants/theme';
import { getSourceFile } from '@/data/content-catalog';
import { getCourseInfo, getTopic, hasLessonQuiz } from '@/data/curriculum';
import { classLessonCompletion, firstClassOffering, firstIncompleteClassBefore, isClassAhead, readAcademicTrial, readClassSelection } from '@/data/class-curriculum';
import { getNextActions } from '@/data/learning/next-action';
import {
  LESSON_STATUS_LABEL,
  type LessonProgress,
  topicProgress,
} from '@/data/learning/progress-model';
import { describeAgo, describeDue } from '@/data/learning/time';
import { useLearning } from '@/data/learning/use-learning';
import { getSubjectInfo } from '@/data/subjects';
import { useThemedStyles } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';
import { routes } from '@/lib/routes';

export function TopicScreen({ topicId }: { topicId: string | undefined }) {
  const styles = useThemedStyles(createStyles);
  const { user } = useAuth();
  const ownSelection = readClassSelection(user?.user_metadata);
  const trial = readAcademicTrial(user?.user_metadata);
  const { inputs, now } = useLearning();
  const topic = getTopic(topicId);
  const progress = useMemo(() => (topic ? topicProgress(topic, inputs) : null), [topic, inputs]);
  const action = useMemo(() => (topic ? getNextActions(inputs, { topicId: topic.id })[0] : null), [topic, inputs]);

  if (!topic || !progress) {
    return (
      <ErrorScreen
        title="Topic not found"
        message={topicId ? `There is no published topic called “${topicId}”.` : 'This link does not name a topic.'}
        primary={{ label: 'Go to Study', onPress: () => router.replace(routes.learn()) }}
      />
    );
  }

  const subject = getSubjectInfo(topic.subject);
  const course = getCourseInfo(topic.courseId);
  const lectureFiles = topic.sourceFileIds
    .map((id) => getSourceFile(id))
    .filter((file): file is NonNullable<typeof file> => Boolean(file) && !file!.duplicateOf);
  const firstOffering = firstClassOffering(topic.subject);
  const requiredLevel = ownSelection && firstOffering && isClassAhead(firstOffering, ownSelection) && !trial.active
    ? firstIncompleteClassBefore(firstOffering, ownSelection, inputs.completedAt)
    : null;
  const requiredProgress = requiredLevel ? classLessonCompletion(requiredLevel.selection, inputs.completedAt) : null;
  if (firstOffering && requiredLevel) {
    return <Screen width="wide"><ClassAccessCard target={firstOffering} current={requiredLevel.selection} lessonsComplete={requiredProgress?.completed ?? 0} lessonsTotal={requiredProgress?.total ?? 0} trialUsed={trial.used} trialExpiresAt={trial.active ? trial.expiresAt : undefined} onStartTrial={() => router.replace(routes.learnEnvironment(firstOffering))} onBack={() => router.replace(routes.learn())} /></Screen>;
  }  const unresolved = (topic.discrepancies ?? []).filter((item) => item.status === 'unresolved').length;
  const clarified = (topic.discrepancies ?? []).filter((item) => item.status === 'resolved').length;

  const side = (
    <View style={styles.side}>
      <Card style={styles.progressCard}>
        <Text style={styles.cardKicker}>TOPIC PROGRESS</Text>
        <View style={styles.statRow}>
          <StatTile value={`${progress.completed}/${progress.total}`} label="lessons" style={styles.tile} />
          <StatTile value={`${Math.round(progress.mastery * 100)}%`} label="mastery" hint="estimate" style={styles.tile} />
          <StatTile value={progress.due} label="due" accent={progress.due > 0 ? styles.dueText.color : undefined} style={styles.tile} />
        </View>
        <ProgressBar value={progress.total ? progress.completed / progress.total : 0} label="Lessons completed" />
        <MemoryDistribution counts={progress.counts} />
        <Text style={styles.metaText}>
          {progress.lastRevisedAt ? `Last revised ${describeAgo(progress.lastRevisedAt, now)}.` : 'Not revised yet.'}
        </Text>
        <View style={styles.sideActions}>
          <Button
            label={progress.due > 0 ? `Review ${progress.due} due` : 'Topic review'}
            variant={progress.due > 0 ? 'primary' : 'secondary'}
            onPress={() => router.push(routes.review({ topicId: topic.id, focus: progress.due > 0 ? 'due' : 'mixed' }))}
            disabled={progress.counts.tracked === 0}
            fullWidth
          />
          <Button
            label="Cumulative topic quiz"
            variant="secondary"
            onPress={() => router.push(routes.topicQuiz(topic.id))}
            disabled={progress.completed === 0}
            accessibilityHint="Questions from every lesson you have completed in this topic"
            fullWidth
          />
        </View>
      </Card>

      {progress.weakConcepts.length > 0 ? (
        <Card>
          <Text style={styles.cardKicker}>NEEDS ATTENTION</Text>
          {progress.weakConcepts.slice(0, 5).map((concept) => (
            <View key={concept.key} style={styles.weakRow}>
              <Text style={styles.weakName} numberOfLines={2}>
                {concept.name}
              </Text>
              <Text style={styles.weakMeta}>
                {concept.dueAt ? `back ${describeDue(concept.dueAt, now)}` : ''}
              </Text>
            </View>
          ))}
          <Button
            label="Review weak concepts"
            variant="secondary"
            size="sm"
            onPress={() => router.push(routes.review({ topicId: topic.id, focus: 'weak' }))}
            style={styles.smallTop}
          />
        </Card>
      ) : null}

      <Card tone="muted">
        <Text style={styles.cardKicker}>SOURCES</Text>
        {lectureFiles.map((file) => (
          <Text key={file.id} style={styles.sourceText}>
            • {file.title ?? file.path.split('/').pop()}
            {file.author ? ` — ${file.author}` : ''}
            {file.role !== 'lecture' ? ` (${file.role})` : ''}
          </Text>
        ))}
        {clarified + unresolved > 0 ? (
          <Text style={styles.sourceNote}>
            {clarified > 0 ? `${clarified} point${clarified === 1 ? '' : 's'} where the slides disagreed are clarified in the lessons. ` : ''}
            {unresolved > 0 ? `${unresolved} still need confirming with your lecturer (never quizzed).` : ''}
          </Text>
        ) : null}
      </Card>
    </View>
  );

  const main = (
    <View style={styles.main}>
      {action ? <NextActionHero action={action} /> : null}
      <SectionHeader
        title="Lessons"
        subtitle="Learn interactively, read the summary, then take the quiz. Lessons are never locked."
        style={styles.lessonsHeader}
      />
      {progress.lessons.map((lesson) => (
        <LessonRow key={lesson.lessonId} lesson={lesson} now={now} />
      ))}
    </View>
  );

  return (
    <Screen width="wide">
      <Breadcrumbs
        items={[
          { label: 'Study', href: routes.learn() },
          { label: subject.name, href: routes.subject(topic.subject) },
          ...(course && course.title !== subject.name ? [{ label: course.title, href: routes.course(course.id) }] : []),
          { label: topic.title },
        ]}
        style={styles.crumbs}
      />
      <View style={styles.header}>
        <TopicGlyph title={topic.title} subject={topic.subject} size={58} />
        <View style={styles.headerText}>
          <Text style={styles.title} accessibilityRole="header">
            {topic.title}
          </Text>
          <Text style={styles.description}>{topic.description}</Text>
          {topic.source ? <Text style={styles.source}>{topic.source}</Text> : null}
        </View>
      </View>
      <Columns main={main} side={side} sideWidth={360} />
    </Screen>
  );
}

function LessonRow({ lesson, now }: { lesson: LessonProgress; now: number }) {
  const styles = useThemedStyles(createStyles);
  const hasQuiz = hasLessonQuiz(lesson.lessonId);
  const done = lesson.completedAt !== null;
  const tone =
    lesson.status === 'quiz-passed' ? 'gold' : lesson.status === 'completed' ? 'success' : lesson.status === 'in-progress' ? 'primary' : 'neutral';
  const primaryLabel = done ? 'Re-read' : lesson.inSession ? 'Continue' : 'Start';

  // A plain card: the title area and the buttons are separate tap targets
  // (never a button inside a button — invalid on web and confusing for
  // keyboard and screen-reader users).
  return (
    <Card style={styles.lessonCard}>
      <Interactive
        onPress={() => router.push(routes.lesson(lesson.lessonId))}
        accessibilityRole="link"
        accessibilityLabel={`Lesson ${lesson.index + 1}: ${lesson.lesson.title}. ${LESSON_STATUS_LABEL[lesson.status]}.`}
        style={({ hovered }) => [styles.lessonTop, styles.lessonLink, hovered && styles.lessonLinkHover]}
      >
        <View style={[styles.lessonNumber, done && styles.lessonNumberDone]}>
          <Text style={[styles.lessonNumberText, done && styles.lessonNumberTextDone]}>{done ? '✓' : lesson.index + 1}</Text>
        </View>
        <View style={styles.lessonInfo}>
          <Text style={styles.lessonTitle}>{lesson.lesson.title}</Text>
          <Text style={styles.lessonDescription} numberOfLines={2}>
            {lesson.lesson.description}
          </Text>
          <View style={styles.lessonPills}>
            <Pill label={LESSON_STATUS_LABEL[lesson.status]} tone={tone} />
            {lesson.bestQuizPercent !== null ? <Pill label={`Best quiz ${lesson.bestQuizPercent}%`} /> : null}
            {lesson.due > 0 ? <Pill label={`${lesson.due} due`} tone="warning" /> : null}
            {lesson.counts.struggling > 0 ? <Pill label={`${lesson.counts.struggling} struggling`} tone="error" /> : null}
            {lesson.lesson.estimatedMinutes ? <Pill label={`~${lesson.lesson.estimatedMinutes} min`} /> : null}
          </View>
          {lesson.lastRevisedAt ? (
            <Text style={styles.lessonMeta}>Last practised {describeAgo(lesson.lastRevisedAt, now)}</Text>
          ) : null}
        </View>
      </Interactive>
      <View style={styles.lessonActions}>
        <Button label={primaryLabel} size="sm" variant={done ? 'secondary' : 'primary'} onPress={() => router.push(routes.lesson(lesson.lessonId))} />
        {hasQuiz ? (
          <Button
            label={done ? 'Quiz' : 'Test out'}
            size="sm"
            variant="secondary"
            onPress={() => router.push(routes.lessonQuiz(lesson.lessonId, { masteryCheck: !done }))}
            accessibilityHint={done ? 'Take the lesson quiz' : 'Already know this? Score 80% to complete the lesson'}
          />
        ) : null}
        {lesson.concepts.length > 0 && lesson.concepts.some((concept) => concept.state === 'struggling') ? (
          <MemoryStateBadge state="struggling" />
        ) : null}
      </View>
    </Card>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    crumbs: { marginBottom: 14 },
    header: { flexDirection: 'row', gap: 14, marginBottom: 22, alignItems: 'flex-start' },
    emoji: { fontSize: 40, marginTop: 2 },
    headerText: { flex: 1, minWidth: 0 },
    title: { ...Type.title1, color: colors.text },
    description: { fontSize: 15, lineHeight: 22, color: colors.textSecondary, marginTop: 4 },
    source: { fontSize: 12, fontStyle: 'italic', color: colors.textTertiary, marginTop: 6 },
    main: { gap: 12 },
    side: { gap: 14 },
    lessonsHeader: { marginTop: 10, marginBottom: 0 },
    progressCard: { gap: 12 },
    cardKicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.1, color: colors.textTertiary, marginBottom: 6 },
    statRow: { flexDirection: 'row', gap: 8 },
    tile: { minWidth: 0, paddingHorizontal: 10 },
    dueText: { color: colors.warningText },
    metaText: { fontSize: 12, color: colors.textTertiary },
    sideActions: { gap: 8, marginTop: 4 },
    weakRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 5 },
    weakName: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
    weakMeta: { fontSize: 11, color: colors.textTertiary },
    smallTop: { marginTop: 8, alignSelf: 'flex-start' },
    sourceText: { fontSize: 12, lineHeight: 18, color: colors.textSecondary },
    sourceNote: { fontSize: 12, lineHeight: 18, color: colors.textTertiary, marginTop: 8 },
    lessonCard: { gap: 12 },
    lessonTop: { flexDirection: 'row', gap: 12 },
    lessonLink: { borderRadius: 12, margin: -6, padding: 6 },
    lessonLinkHover: { backgroundColor: colors.surfaceMuted },
    lessonNumber: {
      width: 38,
      height: 38,
      borderRadius: 11,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    lessonNumberDone: { backgroundColor: colors.successSubtle },
    lessonNumberText: { fontSize: 15, fontWeight: '800', color: colors.text },
    lessonNumberTextDone: { color: colors.successText },
    lessonInfo: { flex: 1, minWidth: 0, gap: 5 },
    lessonTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
    lessonDescription: { fontSize: 13, lineHeight: 19, color: colors.textSecondary },
    lessonPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    lessonMeta: { fontSize: 11, color: colors.textTertiary },
    lessonActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingLeft: 50 },
  });
}
