import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '@/components/ui/text';

import { MemoryDistribution } from '@/components/learning/memory-ui';
import { SubjectGlyph } from '@/components/learning/glyphs';
import { ClassAccessCard } from '@/components/learning/class-access-card';
import { Breadcrumbs } from '@/components/learning/nav-bits';
import { NextActionHero } from '@/components/learning/next-action-card';
import { PendingTopicCard, TopicCard } from '@/components/learning/topic-card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Card } from '@/components/ui/interactive';
import { Pill } from '@/components/ui/pill';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Columns, Screen, SectionHeader } from '@/components/ui/screen';
import { EmptyState } from '@/components/ui/state-views';
import { Type, isDesktopWidth, type ThemeColors } from '@/constants/theme';
import { classLessonCompletion, firstClassOffering, firstIncompleteClassBefore, isClassAhead, isSubjectOffered, makeClassSelection, readAcademicTrial, readClassSelection, sameClassSelection } from '@/data/class-curriculum';
import { getCourseTopicEntries, getCoursesForSubject, getTopic } from '@/data/curriculum';
import { contentTopics } from '@/data/content-catalog';
import type { SubjectId } from '@/data/lesson-types';
import { getNextActions } from '@/data/learning/next-action';
import { courseProgress, subjectProgress, type TopicProgress } from '@/data/learning/progress-model';
import { useLearning } from '@/data/learning/use-learning';
import { getSubjectInfo, getSubjectStatus } from '@/data/subjects';
import { useAuth } from '@/hooks/use-auth';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { param, routes } from '@/lib/routes';

export function SubjectScreen({ subject }: { subject: SubjectId }) {
  const styles = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();
  const desktop = isDesktopWidth(width);
  const { user } = useAuth();
  const params = useLocalSearchParams<{ viewClass?: string | string[]; viewSemester?: string | string[] }>();
  const ownSelection = readClassSelection(user?.user_metadata);
  const trial = readAcademicTrial(user?.user_metadata);
  const viewSelection = makeClassSelection(param(params.viewClass), Number(param(params.viewSemester))) ?? ownSelection;
  const isOwnSelection = sameClassSelection(viewSelection, ownSelection);
  const { inputs, now } = useLearning();
  const info = getSubjectInfo(subject);
  const status = getSubjectStatus(subject);
  const courses = getCoursesForSubject(subject);
  const progress = useMemo(() => subjectProgress(subject, inputs), [subject, inputs]);
  const unclassified = contentTopics.filter((topic) => topic.status === 'needs-classification' && topic.subject === null);
  const subjectOffered = Boolean(viewSelection && isSubjectOffered(viewSelection, subject));  const firstOffering = firstClassOffering(subject);
  const requestedFuture = ownSelection && viewSelection && isClassAhead(viewSelection, ownSelection)
    ? viewSelection
    : ownSelection && isOwnSelection && firstOffering && isClassAhead(firstOffering, ownSelection)
      ? firstOffering
      : null;
  const requiredLevel = requestedFuture && ownSelection && !trial.active
    ? firstIncompleteClassBefore(requestedFuture, ownSelection, inputs.completedAt)
    : null;
  const requiredProgress = requiredLevel ? classLessonCompletion(requiredLevel.selection, inputs.completedAt) : null;

  if (requiredLevel && requestedFuture) {
    return <Screen width="wide"><ClassAccessCard target={requestedFuture} current={requiredLevel.selection} lessonsComplete={requiredProgress?.completed ?? 0} lessonsTotal={requiredProgress?.total ?? 0} trialUsed={trial.used} trialExpiresAt={trial.active ? trial.expiresAt : undefined} onStartTrial={() => router.replace(routes.learnEnvironment(requestedFuture))} onBack={() => router.replace(routes.learn())} /></Screen>;
  }

  if (!subjectOffered) {
    return (
      <Screen width="wide">
        <Breadcrumbs items={[{ label: 'Study', href: viewSelection ? routes.learnEnvironment(viewSelection) : routes.learn() }, { label: info.name }]} style={styles.crumbs} />
        <EmptyState
          icon="course"
          title="Coming soon"
          message={viewSelection ? `${info.name} is not available in ${viewSelection.classId}, Semester ${viewSelection.semester} yet.` : 'Choose your class and semester to see its curriculum.'}
          style={styles.empty}
        />
        <Button label="Back to Study" variant="secondary" onPress={() => router.replace(viewSelection ? routes.learnEnvironment(viewSelection) : routes.learn())} />
      </Screen>
    );
  }

  return (
    <Screen width="wide">
      <Breadcrumbs items={[{ label: 'Study', href: routes.learn() }, { label: info.name }]} style={styles.crumbs} />

      <View style={styles.header}>
        <SubjectGlyph subject={subject} size={58} />
        <View style={styles.headerText}>
          {viewSelection ? <Pill label={`${isOwnSelection ? 'My class' : 'Browsing'} · ${viewSelection.classId} · Semester ${viewSelection.semester}`} tone={isOwnSelection ? 'primary' : 'neutral'} /> : null}
          <Text style={styles.title} accessibilityRole="header">
            {info.name}
          </Text>
          <Text style={styles.tagline}>{info.tagline}</Text>
        </View>
      </View>

      {status === 'available' ? (
        <Card style={styles.summary}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>{progress.percent}%</Text>
              <Text style={styles.summaryLabel}>lessons completed</Text>
            </View>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>{Math.round(progress.mastery * 100)}%</Text>
              <Text style={styles.summaryLabel}>mastery (estimate)</Text>
            </View>
            <View style={styles.summaryStat}>
              <Text style={[styles.summaryValue, progress.due > 0 && styles.dueValue]}>{progress.due}</Text>
              <Text style={styles.summaryLabel}>concepts due</Text>
            </View>
          </View>
          <ProgressBar value={progress.lessonsTotal ? progress.lessonsCompleted / progress.lessonsTotal : 0} label="Subject lessons completed" />
          <MemoryDistribution counts={progress.counts} style={styles.distribution} />
        </Card>
      ) : null}

      {courses.map((course) => {
        const entries = getCourseTopicEntries(course.id);
        const published = entries.filter((entry) => entry.status === 'published' && getTopic(entry.id));
        const pending = entries.filter((entry) => entry.status !== 'published');
        const cProgress = courseProgress(course.id, inputs);
        const action = published.length > 0 ? getNextActions(inputs, { courseId: course.id })[0] : null;

        if (entries.length === 0) {
          return (
            <EmptyState
              key={course.id}
              icon="course"
              title="Awaiting lecture materials"
              message={`${info.name} lectures have not been supplied yet. Topics will appear here as soon as they are added — nothing is invented in the meantime.`}
              style={styles.empty}
            />
          );
        }

        return (
          <View key={course.id} style={styles.course}>
            <SectionHeader
              title={courses.length > 1 ? course.title : 'Topics'}
              subtitle={`${published.length} topic${published.length === 1 ? '' : 's'} in order · ${cProgress.lessonsCompleted}/${cProgress.lessonsTotal} lessons completed${pending.length ? ` · ${pending.length} in preparation` : ''}`}
              style={styles.sectionHeader}
            />

            <Columns
              sideWidth={360}
              sideFirstOnMobile
              main={<TopicProgression topics={cProgress.topics} now={now} />}
              side={
                <View style={styles.side}>
                  {action ? <NextActionHero action={action} /> : null}
                  {published.length > 0 ? (
                    <View style={styles.courseActions}>
                      <Button
                        label="Course review"
                        variant="secondary"
                        fullWidth={desktop}
                        onPress={() => router.push(routes.review({ courseId: course.id, focus: 'mixed' }))}
                        accessibilityHint="Mixed spaced review across every topic in this course"
                      />
                      <Button
                        label="Apex Challenge"
                        variant="apex"
                        trailing="⚡"
                        fullWidth={desktop}
                        onPress={() => router.push(routes.apex(course.id))}
                        accessibilityHint="A timed, whole-course mastery challenge"
                      />
                    </View>
                  ) : null}
                </View>
              }
            />

            {pending.length > 0 ? (
              <>
                <SectionHeader
                  title="Lessons in preparation"
                  subtitle="Lecture material for these topics has been received and inventoried. Lessons are built only from the supplied slides."
                  style={styles.sectionHeader}
                />
                <View style={styles.pendingList}>
                  {pending.map((topic) => (
                    <PendingTopicCard key={topic.id} topic={topic} />
                  ))}
                </View>
              </>
            ) : null}
          </View>
        );
      })}

      {subject === 'anatomy' && unclassified.length > 0 ? (
        <View style={styles.course}>
          <SectionHeader
            title="Awaiting classification"
            subtitle="Found in another subject's folder; looks like Anatomy. It will be built once its subject is confirmed."
            style={styles.sectionHeader}
          />
          {unclassified.map((topic) => (
            <PendingTopicCard key={topic.id} topic={topic} />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

// Topics as a path, top to bottom, in the course's order: finish one, then
// the next. Done topics show a check, the next one is highlighted.
function TopicProgression({ topics, now }: { topics: TopicProgress[]; now: number }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const nextIndex = topics.findIndex((topic) => topic.status !== 'completed' && topic.status !== 'mastered');

  return (
    <View role="list">
      {topics.map((topic, index) => {
        const done = topic.status === 'completed' || topic.status === 'mastered';
        const isNext = index === nextIndex;
        const last = index === topics.length - 1;
        return (
          <View key={topic.topic.id} style={styles.step} role="listitem">
            <View style={styles.stepRail}>
              <View style={[styles.stepNode, done && styles.stepNodeDone, isNext && styles.stepNodeNext]}>
                {done ? (
                  <Icon name="check" size={15} color={colors.successText} strokeWidth={2.8} />
                ) : (
                  <Text style={[styles.stepNumber, isNext && styles.stepNumberNext]}>{index + 1}</Text>
                )}
              </View>
              {!last ? <View style={[styles.stepLine, done && styles.stepLineDone]} /> : null}
            </View>
            <View style={[styles.stepBody, !last && styles.stepBodySpaced]}>
              {isNext ? (
                <Text style={styles.upNext}>{topic.status === 'in-progress' ? 'IN PROGRESS' : 'UP NEXT'}</Text>
              ) : null}
              <TopicCard progress={topic} now={now} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    crumbs: { marginBottom: 14 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
    emoji: { fontSize: 40 },
    headerText: { flex: 1 },
    title: { ...Type.title1, color: colors.text },
    tagline: { fontSize: 15, color: colors.textSecondary, marginTop: 2 },
    summary: { gap: 12, marginBottom: 22 },
    summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
    summaryStat: { minWidth: 110 },
    summaryValue: { fontSize: 24, fontWeight: '800', color: colors.text },
    dueValue: { color: colors.warningText },
    summaryLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
    distribution: { marginTop: 2 },
    course: { gap: 14, marginBottom: 26 },
    sectionHeader: { marginTop: 8, marginBottom: 0 },
    side: { gap: 14 },
    courseActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    pendingList: { gap: 12 },
    step: { flexDirection: 'row', gap: 14 },
    stepRail: { width: 34, alignItems: 'center' },
    stepNode: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1.5,
      borderColor: colors.border,
      marginTop: 14,
    },
    stepNodeDone: { backgroundColor: colors.successSubtle, borderColor: colors.successBorder },
    stepNodeNext: { backgroundColor: colors.primarySubtle, borderColor: colors.primary, borderWidth: 2 },
    stepNumber: { ...Type.numeral, fontSize: 14, color: colors.textSecondary },
    stepNumberNext: { color: colors.primaryText },
    stepLine: { flex: 1, width: 2, marginTop: 4, borderRadius: 1, backgroundColor: colors.border },
    stepLineDone: { backgroundColor: colors.successBorder },
    stepBody: { flex: 1, minWidth: 0 },
    stepBodySpaced: { paddingBottom: 14 },
    upNext: { ...Type.overline, fontSize: 10, color: colors.primaryText, marginBottom: 6, marginTop: 2 },
    empty: { marginTop: 4 },
  });
}
