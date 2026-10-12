import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '@/components/ui/text';

import { MemoryDistribution } from '@/components/learning/memory-ui';
import { ClassAccessCard } from '@/components/learning/class-access-card';
import { Breadcrumbs } from '@/components/learning/nav-bits';
import { NextActionHero } from '@/components/learning/next-action-card';
import { PendingTopicCard, TopicCard } from '@/components/learning/topic-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/interactive';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen, SectionHeader } from '@/components/ui/screen';
import { ErrorScreen } from '@/components/ui/state-views';
import { isDesktopWidth, type ThemeColors } from '@/constants/theme';
import { getCourseInfo, getCourseTopicEntries, getTopic } from '@/data/curriculum';
import { classLessonCompletion, firstClassOffering, firstIncompleteClassBefore, isClassAhead, readAcademicTrial, readClassSelection } from '@/data/class-curriculum';
import { getNextActions } from '@/data/learning/next-action';
import { courseProgress } from '@/data/learning/progress-model';
import { useLearning } from '@/data/learning/use-learning';
import { getSubjectInfo } from '@/data/subjects';
import { useThemedStyles } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';
import { param, routes } from '@/lib/routes';

// A course: /learn/course?course=<course id>
// Older links passed a TOPIC id here (/learn/course?course=<topic id>);
// those redirect to the topic page so they keep working.
export default function CourseRoute() {
  const { course: courseParam } = useLocalSearchParams<{ course?: string | string[] }>();
  const id = param(courseParam);
  const styles = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const ownSelection = readClassSelection(user?.user_metadata);
  const trial = readAcademicTrial(user?.user_metadata);
  const { inputs, now } = useLearning();
  const course = getCourseInfo(id);
  const progress = course ? courseProgress(course.id, inputs) : null;

  if (!course && getTopic(id)) {
    return <Redirect href={routes.topic(id)} />;
  }

  if (!course || !progress) {
    return (
      <ErrorScreen
        title="Course not found"
        message={id ? `There is no course called “${id}”.` : 'This link does not name a course.'}
        primary={{ label: 'Go to Study', onPress: () => router.replace(routes.learn()) }}
      />
    );
  }

  const subject = getSubjectInfo(course.subject);
  const pending = getCourseTopicEntries(course.id).filter((entry) => entry.status !== 'published');
  const action = progress.topics.length ? getNextActions(inputs, { courseId: course.id })[0] : null;
  const desktop = isDesktopWidth(width);  const firstOffering = course ? firstClassOffering(course.subject) : null;
  const requiredLevel = ownSelection && firstOffering && isClassAhead(firstOffering, ownSelection) && !trial.active
    ? firstIncompleteClassBefore(firstOffering, ownSelection, inputs.completedAt)
    : null;
  const requiredProgress = requiredLevel ? classLessonCompletion(requiredLevel.selection, inputs.completedAt) : null;
  if (course && firstOffering && requiredLevel) {
    return <Screen width="wide"><ClassAccessCard target={firstOffering} current={requiredLevel.selection} lessonsComplete={requiredProgress?.completed ?? 0} lessonsTotal={requiredProgress?.total ?? 0} trialUsed={trial.used} trialExpiresAt={trial.active ? trial.expiresAt : undefined} onStartTrial={() => router.replace(routes.learnEnvironment(firstOffering))} onBack={() => router.replace(routes.learn())} /></Screen>;
  }

  return (
    <Screen width="wide">
      <Breadcrumbs
        items={[
          { label: 'Study', href: routes.learn() },
          { label: subject.name, href: routes.subject(course.subject) },
          { label: course.title },
        ]}
        style={styles.crumbs}
      />
      <Text style={styles.title} accessibilityRole="header">
        {course.title}
      </Text>
      <Text style={styles.description}>{course.description}</Text>

      {progress.topics.length > 0 ? (
        <Card style={styles.summary}>
          <Text style={styles.summaryText}>
            {progress.lessonsCompleted}/{progress.lessonsTotal} lessons · {progress.topicsCompleted}/{progress.topics.length} topics completed ·{' '}
            {progress.due} due · mastery {Math.round(progress.mastery * 100)}% (estimate)
          </Text>
          <ProgressBar value={progress.lessonsTotal ? progress.lessonsCompleted / progress.lessonsTotal : 0} label="Course lessons completed" />
          <MemoryDistribution counts={progress.counts} />
          <View style={styles.actions}>
            <Button label="Course review" variant="secondary" onPress={() => router.push(routes.review({ courseId: course.id, focus: 'mixed' }))} />
            <Button label="Apex Challenge" variant="apex" trailing="⚡" onPress={() => router.push(routes.apex(course.id))} />
          </View>
        </Card>
      ) : null}

      {action ? <View style={styles.block}><NextActionHero action={action} /></View> : null}

      <SectionHeader title="Topics" style={styles.block} />
      <View style={[styles.grid, desktop && styles.gridDesktop]}>
        {progress.topics.map((topic) => (
          <View key={topic.topic.id} style={desktop ? styles.gridItem : null}>
            <TopicCard progress={topic} now={now} />
          </View>
        ))}
        {pending.map((topic) => (
          <View key={topic.id} style={desktop ? styles.gridItem : null}>
            <PendingTopicCard topic={topic} />
          </View>
        ))}
      </View>
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    crumbs: { marginBottom: 14 },
    title: { fontSize: 30, fontWeight: '800', color: colors.text },
    description: { fontSize: 15, color: colors.textSecondary, marginTop: 4, marginBottom: 18 },
    summary: { gap: 12 },
    summaryText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    block: { marginTop: 20 },
    grid: { gap: 12 },
    gridDesktop: { flexDirection: 'row', flexWrap: 'wrap' },
    gridItem: { width: '49%', flexGrow: 1, minWidth: 340 },
  });
}
