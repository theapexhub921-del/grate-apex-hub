import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BackLink } from '@/components/learning/nav-bits';
import { LegacyCourseTile } from '@/components/learning/legacy-course-tile';
import { CoursePracticeModes } from '@/components/learning/course-practice-modes';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Card, Interactive, PressableCard } from '@/components/ui/interactive';
import { Pill } from '@/components/ui/pill';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen, SectionHeader } from '@/components/ui/screen';
import { ErrorScreen, LoadingState } from '@/components/ui/state-views';
import { Text } from '@/components/ui/text';
import { Type, type ThemeColors } from '@/constants/theme';
import { legacyCourse, loadCourseSets, loadLegacyLessons, loadLegacySectionProgress, type LegacyLessonMeta, plainText } from '@/data/legacy-study';
import { useProgress } from '@/data/progress';
import { useNow } from '@/data/learning/use-learning';
import { legacyQuestionMemory, legacyReviewFor } from '@/data/legacy-review';
import { useQuestionHistory } from '@/data/question-history';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { param, routes } from '@/lib/routes';

// /learn/hb-course?course=<id> — one of the original app's HB1 courses, in
// this app's layout: its lessons as a path in order, each with its sections,
// reading time and practice questions, plus the course's question sets and an
// Apex Challenge.
export default function LegacyCourseScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const params = useLocalSearchParams<{ course?: string | string[] }>();
  const course = legacyCourse(param(params.course));
  const progress = useProgress();
  const history = useQuestionHistory();
  const now = useNow();
  // The original questions in the same spaced-review engine (HB2 questions are in Study → Spaced review).
  const review = useMemo(() => (course && !course.subject ? legacyReviewFor(course.id, legacyQuestionMemory(history), now) : null), [course, history, now]);
  const [lessons, setLessons] = useState<LegacyLessonMeta[] | null>(null);
  const [sets, setSets] = useState<{ id: string; name: string; count: number }[] | null>(null);
  const [sectionsRead, setSectionsRead] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!course) return;
    let live = true;
    Promise.all([loadLegacyLessons(course.id), loadLegacySectionProgress()])
      .then(([list, read]) => { if (live) { setLessons(list); setSectionsRead(read); } })
      .catch((problem) => { if (live) setError(problem instanceof Error ? problem.message : 'This course could not be loaded.'); });
    loadCourseSets(course.id).then((value) => { if (live) setSets(value); }).catch(() => {});
    return () => { live = false; };
  }, [course]);

  const completed = useMemo(() => new Set(progress.completedLessons), [progress.completedLessons]);
  if (!course) return <ErrorScreen title="Course not found" message="Open a course from Study." primary={{ label: 'Back to Study', onPress: () => router.replace(routes.learn()) }} />;
  if (error) return <ErrorScreen title="Course unavailable" message={error} primary={{ label: 'Back to Study', onPress: () => router.replace(routes.learn()) }} />;
  if (!lessons) return <LoadingState label="Loading lessons…" />;

  const done = lessons.filter((lesson) => completed.has(lesson.id)).length;
  // Topics (HB2): each gets a clear heading in the path — its number, lessons and progress.
  const topics = [...new Set(lessons.map((lesson) => lesson.group).filter((group): group is string => Boolean(group)))];
  const topicStats = (group: string) => {
    const own = lessons.filter((lesson) => lesson.group === group);
    return { total: own.length, done: own.filter((lesson) => completed.has(lesson.id)).length };
  };
  const totalQuestions = sets ? sets.reduce((sum, set) => sum + set.count, 0) : null;

  return (
    <Screen width="content">
      <BackLink fallback={routes.learn()} />
      <Card style={styles.header}>
        <LegacyCourseTile course={course} size={64} />
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{course.name}</Text>
            <Pill label={`${course.classId} · Semester ${course.semester}`} tone="primary" />
          </View>
          <Text style={styles.desc}>{course.desc}</Text>
          <View style={styles.progressRow}>
            <ProgressBar value={lessons.length ? done / lessons.length : 0} height={6} style={styles.flex} label={`${course.name} lessons completed`} />
            <Text style={styles.meta}>{done}/{lessons.length} lessons{totalQuestions !== null ? ` · ${totalQuestions.toLocaleString()} questions` : ''}</Text>
          </View>
          {lessons.length ? <View style={styles.actions}>
            <Button label="Practice the course" size="sm" onPress={() => router.push(routes.legacyPractice({ course: course.id }))} />
            <Button label="Apex Challenge" size="sm" variant="gold" trailing="⚡" onPress={() => router.push(routes.legacyPractice({ course: course.id, apex: true }))} />
          </View> : null}
        </View>
      </Card>

      {review && review.tracked > 0 ? (
        <Card style={styles.reviewCard}>
          <View style={styles.reviewText}>
            <Text style={styles.reviewTitle}>Spaced review</Text>
            <Text style={styles.summary}>{review.due.length ? `${review.due.length} question${review.due.length === 1 ? ' is' : 's are'} due to come back.` : 'Nothing is due right now.'} {review.missed.length ? `${review.missed.length} answered wrongly last time.` : ''}</Text>
          </View>
          <View style={styles.actions}>
            <Button label={review.due.length ? `Review ${Math.min(20, review.due.length)} due` : 'Nothing due'} size="sm" disabled={!review.due.length} onPress={() => router.push(routes.legacyPractice({ course: course.id, review: 'due' }))} />
            <Button label="Fix your mistakes" size="sm" variant="secondary" disabled={!review.missed.length} onPress={() => router.push(routes.legacyPractice({ course: course.id, review: 'missed' }))} />
          </View>
        </Card>
      ) : null}

      {lessons.length ? <CoursePracticeModes course={course} lessons={lessons} sets={sets ?? []} /> : null}

      <SectionHeader title="Lessons" subtitle={lessons.length ? `${lessons.length} lessons in order · ${done} completed` : undefined} style={styles.section} />
      {lessons.length === 0 ? (
        <Card tone="insight" style={styles.empty}>
          <Text style={styles.lessonTitle}>Lessons are on the way</Text>
          <Text style={styles.summary}>{course.name} lessons are being prepared from the lecture files. They will appear here, in course order, as each topic is ready.</Text>
        </Card>
      ) : null}
      <View style={styles.path}>
        {lessons.map((lesson, index) => {
          const read = Math.min(sectionsRead[lesson.id] ?? 0, lesson.sections.length);
          const isDone = completed.has(lesson.id) || (lesson.sections.length > 0 && read >= lesson.sections.length);
          const started = read > 0;
          const questions = lesson.qids?.length ?? lesson.qcount ?? 0;
          const last = index === lessons.length - 1;
          const newGroup = lesson.group && lesson.group !== lessons[index - 1]?.group;
          return (
            <View key={lesson.id}>
            {newGroup && lesson.group ? (() => {
              const stats = topicStats(lesson.group);
              const number = topics.indexOf(lesson.group) + 1;
              return (
                <View style={[styles.topicHead, number > 1 && styles.topicHeadGap]} accessibilityRole="header">
                  <View style={[styles.topicBadge, stats.done === stats.total && styles.topicBadgeDone]}>
                    {stats.done === stats.total ? <Icon name="check" size={18} color={colors.onPrimary} strokeWidth={2.6} /> : <Text style={styles.topicBadgeText}>{number}</Text>}
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.topicKicker}>TOPIC {number} OF {topics.length}</Text>
                    <Text style={styles.topicTitle}>{lesson.group}</Text>
                    <View style={styles.progressRow}>
                      <ProgressBar value={stats.total ? stats.done / stats.total : 0} height={6} style={styles.flex} label={`${lesson.group} lessons completed`} />
                      <Text style={styles.meta}>{stats.done}/{stats.total} lessons</Text>
                    </View>
                  </View>
                </View>
              );
            })() : null}
            <View style={styles.pathRow}>
              <View style={styles.rail}>
                <View style={[styles.node, isDone ? styles.nodeDone : started ? styles.nodeActive : null]}>
                  {isDone ? <Icon name="check" size={14} color={colors.onPrimary} strokeWidth={2.6} /> : <Text style={[styles.nodeText, started && { color: colors.primaryText }]}>{index + 1}</Text>}
                </View>
                {!last ? <View style={[styles.line, isDone && styles.lineDone]} /> : null}
              </View>
              <View style={styles.pathCard}>
                {started && !isDone ? <Text style={styles.kicker}>IN PROGRESS</Text> : null}
                <Card style={styles.lessonCard}>
                  <Interactive onPress={() => router.push(routes.legacyLesson(lesson.id))} accessibilityRole="button" accessibilityLabel={`${lesson.title}. ${isDone ? 'Completed' : started ? 'In progress' : 'Not started'}`} style={styles.lessonBody}>
                  <View style={styles.lessonTop}>
                    <View style={styles.lessonIcon}><Text style={styles.lessonEmoji}>{lesson.icon || course.icon}</Text></View>
                    <View style={styles.flex}>
                      <Text style={styles.lessonTitle}>{lesson.title}</Text>
                      <Pill label={isDone ? 'Completed' : started ? 'In progress' : 'Not started'} tone={isDone ? 'success' : started ? 'primary' : 'neutral'} />
                    </View>
                  </View>
                  {lesson.summary ? <Text style={styles.summary} numberOfLines={3}>{plainText(lesson.summary)}</Text> : null}
                  <View style={styles.progressRow}>
                    <ProgressBar value={lesson.sections.length ? read / lesson.sections.length : 0} height={5} style={styles.flex} label={`${lesson.title} sections read`} />
                    <Text style={styles.meta}>{read}/{lesson.sections.length} sections</Text>
                  </View>
                  </Interactive>
                    <View style={styles.lessonFoot}>
                      <Text style={styles.metaSoft}>{lesson.sections.length} sections · ~{lesson.minutes} min</Text>
                      <View style={styles.chips}>
                        {lesson.subject ? (
                          <Interactive onPress={() => router.push(routes.lesson(lesson.id, { layer: 'learn' }))} accessibilityRole="button" accessibilityLabel={`Learn by answering: ${lesson.title}`} style={styles.answerChip}>
                            <Icon name="challenge" size={14} color={colors.primaryText} />
                            <Text style={styles.answerText}>Learn by answering</Text>
                          </Interactive>
                        ) : null}
                        {questions > 0 ? (
                          <Interactive onPress={() => router.push(routes.legacyPractice({ course: course.id, lesson: lesson.id }))} accessibilityRole="button" style={styles.practice}>
                            <Icon name="edit" size={14} color={colors.accentText} />
                            <Text style={styles.practiceText}>Practice · {questions} questions</Text>
                          </Interactive>
                        ) : null}
                      </View>
                    </View>
                </Card>
              </View>
            </View>
            </View>
          );
        })}
      </View>

      {sets?.length ? (
        <>
          <SectionHeader title="Question sets" subtitle={course.subject ? 'Practise each topic’s questions in mixed types.' : 'The course’s quizzes and past questions, as in the original app.'} style={styles.section} />
          <View style={styles.sets}>
            {sets.map((set) => (
              <Interactive key={set.id} onPress={() => router.push(routes.legacyPractice({ course: course.id, set: set.id }))} accessibilityRole="button" style={({ hovered }) => [styles.set, hovered && styles.setHover]}>
                <Text style={styles.setName}>{set.name}</Text>
                <Text style={styles.metaSoft}>{set.count} questions</Text>
              </Interactive>
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    header: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, padding: 20, marginTop: 8 },
    headerText: { flex: 1, minWidth: 240, gap: 8 },
    titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
    title: { ...Type.title1, color: colors.text },
    desc: { fontSize: 14, lineHeight: 21, color: colors.textSecondary },
    progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    meta: { fontSize: 12.5, fontWeight: '700', color: colors.textSecondary },
    metaSoft: { fontSize: 12.5, color: colors.textTertiary },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4, flexShrink: 1, maxWidth: '100%' },
    section: { marginTop: 28 },
    topicHead: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 10, borderRadius: 18, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border },
    topicHeadGap: { marginTop: 22 },
    topicBadge: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySubtle, borderWidth: 1.5, borderColor: colors.primaryBorder },
    topicBadgeDone: { backgroundColor: colors.success, borderColor: colors.success },
    topicBadgeText: { fontSize: 18, fontWeight: '800', color: colors.primaryText },
    topicKicker: { ...Type.overline, color: colors.primaryText },
    topicTitle: { ...Type.title2, color: colors.text, marginTop: 2, marginBottom: 6 },
    empty: { gap: 6, padding: 18 },
    reviewCard: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 16, marginTop: 16 },
    reviewText: { flex: 1, minWidth: 220, gap: 4 },
    reviewTitle: { ...Type.headline, color: colors.text },
    path: { gap: 0 },
    pathRow: { flexDirection: 'row', gap: 14 },
    rail: { width: 34, alignItems: 'center' },
    node: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: colors.borderStrong, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
    nodeActive: { borderColor: colors.primary },
    nodeDone: { backgroundColor: colors.primary, borderColor: colors.primary },
    nodeText: { fontSize: 13, fontWeight: '800', color: colors.textSecondary },
    line: { flex: 1, width: 2, backgroundColor: colors.border, marginTop: 4 },
    lineDone: { backgroundColor: colors.primary },
    pathCard: { flex: 1, minWidth: 0, paddingBottom: 14, gap: 6 },
    kicker: { ...Type.overline, color: colors.primaryText, marginTop: 4 },
    lessonCard: { gap: 10 },
    lessonBody: { gap: 10 },
    lessonTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    lessonIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    lessonEmoji: { fontSize: 24 },
    lessonTitle: { ...Type.title3, color: colors.text, marginBottom: 4 },
    summary: { fontSize: 13.5, lineHeight: 20, color: colors.textSecondary },
    lessonFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
    practice: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: colors.accentSubtle },
    practiceText: { flexShrink: 1, fontSize: 12.5, fontWeight: '800', color: colors.accentText },
    // Phones: the chip group shrinks to the card's width so its chips wrap instead of running off the edge.
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: '100%' },
    answerChip: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: colors.primarySubtle, borderWidth: 1, borderColor: colors.primaryBorder },
    answerText: { flexShrink: 1, fontSize: 12.5, fontWeight: '800', color: colors.primaryText },
    sets: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    set: { minWidth: 160, flexGrow: 1, flexBasis: '30%', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: 4 },
    setHover: { borderColor: colors.primaryBorder },
    setName: { fontSize: 14.5, fontWeight: '800', color: colors.text },
  });
}
