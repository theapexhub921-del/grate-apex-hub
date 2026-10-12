import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '@/components/ui/text';

import { SubjectGlyph } from '@/components/learning/glyphs';
import { ClassAccessCard } from '@/components/learning/class-access-card';
import { LegacyCourseList } from '@/components/learning/legacy-course-list';
import { legacyCoursesForClass } from '@/data/legacy-study';
import { LearningWelcomeAtmosphere } from '@/components/learning/learning-welcome-atmosphere';
import { MemoryDistribution } from '@/components/learning/memory-ui';
import { NextActionHero, NextActionList } from '@/components/learning/next-action-card';
import { PersonalGoalsCard } from '@/components/learning/personal-goals-card';
import { QuestionOfTheDay } from '@/components/learning/question-of-the-day';
import { type Tile, TileGrid } from '@/components/ui/tile-grid';
import { LearningWeekCard } from '@/components/learning/learning-week-card';
import { ReviewCalendar } from '@/components/learning/review-calendar';
import { RankProgressCard } from '@/components/rank-progress';
import { TopicCard } from '@/components/learning/topic-card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Card, Interactive, PressableCard } from '@/components/ui/interactive';
import { Pill } from '@/components/ui/pill';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Columns, PageHeader, Screen, SectionHeader } from '@/components/ui/screen';
import { Type, type ThemeColors } from '@/constants/theme';
import { CLASS_IDS, classLessonCompletion, firstIncompleteClassBefore, isClassAhead, makeClassSelection, readAcademicTrial, readClassSelection, sameClassSelection, subjectsForClass, type ClassSelection } from '@/data/class-curriculum';
import { contentTopics } from '@/data/content-catalog';
import { getNextActions } from '@/data/learning/next-action';
import { curriculumProgress, subjectProgress } from '@/data/learning/progress-model';
import { useLearning } from '@/data/learning/use-learning';
import { useDisplayName } from '@/data/user';
import { getSubjectStatus, getSubjectStatusLabel, subjects } from '@/data/subjects';
import { useAuth } from '@/hooks/use-auth';
import { useGreeting } from '@/hooks/use-greeting';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { param, routes } from '@/lib/routes';

// Learn — the academic workspace: what to do next, every subject, and the
// topics in progress. All numbers come from the learning engine.
export default function LearnScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const { width } = useWindowDimensions();
  const compactWelcome = width < 900;
  const { user } = useAuth();
  const { greeting } = useGreeting();
  const displayName = useDisplayName();
  const params = useLocalSearchParams<{ viewClass?: string | string[]; viewSemester?: string | string[] }>();
  const ownSelection = readClassSelection(user?.user_metadata);
  const querySelection = makeClassSelection(param(params.viewClass), Number(param(params.viewSemester)));
  const viewing = querySelection ?? ownSelection;
  const viewingOwnClass = sameClassSelection(viewing, ownSelection);
  const [browseOpen, setBrowseOpen] = useState(Boolean(querySelection && !viewingOwnClass));
  const { progress, inputs, memory, attempts, now } = useLearning();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const lessonsThisWeek = Object.values(progress.lessonCompletedAt).filter((at) => at >= weekStart.getTime()).length;
  const reviewsThisWeek = attempts.filter((attempt) => attempt.attemptedAt >= weekStart.getTime()).length;
  const actions = useMemo(() => getNextActions(inputs), [inputs]);
  const overall = useMemo(() => curriculumProgress(inputs), [inputs]);
  const recent = overall.topics
    .filter((topic) => topic.status !== 'not-started')
    .sort((a, b) => (b.lastRevisedAt ?? 0) - (a.lastRevisedAt ?? 0))
    .slice(0, 3);
  const trial = readAcademicTrial(user?.user_metadata);
  const currentCompletion = ownSelection ? classLessonCompletion(ownSelection, inputs.completedAt) : { completed: 0, total: 0, complete: false };
  const restrictedViewing = Boolean(viewing && ownSelection && isClassAhead(viewing, ownSelection) && !trial.active && firstIncompleteClassBefore(viewing, ownSelection, inputs.completedAt));
  const [requestedFuture, setRequestedFuture] = useState<ClassSelection | null>(null);
  const blockedSelection = requestedFuture ?? (restrictedViewing ? viewing : null);
  const requiredLevel = blockedSelection && ownSelection ? firstIncompleteClassBefore(blockedSelection, ownSelection, inputs.completedAt) : null;
  const offeredIds = viewing ? subjectsForClass(viewing) : [];
  const offeredSubjects = subjects.filter((subject) => offeredIds.includes(subject.id));
  const legacyCourses = legacyCoursesForClass(viewing);
  const welcomeBadge = viewingOwnClass
    ? <Pill label="My curriculum" tone="primary" />
    : viewing ? <Pill label="Read-only preview" tone="neutral" /> : null;

  function showEnvironment(selection: ClassSelection) {
    if (ownSelection && isClassAhead(selection, ownSelection) && !trial.active && Boolean(firstIncompleteClassBefore(selection, ownSelection, inputs.completedAt))) {
      setRequestedFuture(selection);
      return;
    }
    setRequestedFuture(null);
    if (sameClassSelection(selection, ownSelection)) router.replace(routes.learn());
    else router.replace(routes.learnEnvironment(selection));
  }

  const main = (
    <View style={styles.column}>
      {actions[0] ? <NextActionHero action={actions[0]} /> : null}

      <Card style={styles.tutorCard} tone="primary">
        <View style={styles.tutorCopy}>
          <Text style={styles.tutorEyebrow}>VOICE STUDY PREVIEW</Text>
          <Text style={styles.tutorTitle}>Study out loud with GrAte Apex Hub</Text>
          <Text style={styles.subjectTagline}>Ask a question, explain an idea and practise recall in a voice session.</Text>
        </View>
        <Button label="Open AI tutor" variant="secondary" trailing="chevronRight" onPress={() => router.push('/learn/tutor' as never)} />
      </Card>

      <Card style={styles.tutorCard} tone="outline">
        <View style={styles.tutorCopy}>
          <Text style={styles.tutorEyebrow}>PAST QUESTION BANK</Text>
          <Text style={styles.tutorTitle}>Verified past questions</Text>
          <Text style={styles.subjectTagline}>Coming Soon. We’ll open the bank when verified question material is ready.</Text>
        </View>
        <Pill label="Coming Soon" />
      </Card>

      <SectionHeader title="Subjects" subtitle="Subject → course → topic → lessons." style={styles.section} />
      <View style={styles.subjectGrid}>
      {offeredSubjects.map((subject) => {
        const status = getSubjectStatus(subject);
        const progress = subjectProgress(subject.id, inputs);
        const received = contentTopics.filter((topic) => topic.subject === subject.id && topic.status !== 'empty').length;
        return (
          <PressableCard
            key={subject.id}
            onPress={() => viewing && router.push(routes.subject(subject.id, viewing))}
            accessibilityLabel={`${subject.name}. ${getSubjectStatusLabel(status, progress.percent)}`}
            style={styles.subjectCard}
          >
            <SubjectGlyph subject={subject.id} size={52} />
            <View style={styles.subjectInfo}>
              <View style={styles.subjectTitleRow}>
                <Text style={styles.subjectTitle}>{subject.name}</Text>
                {status !== 'available' ? (
                  <Pill label={getSubjectStatusLabel(status, progress.percent)} tone={status === 'awaiting' ? 'neutral' : 'warning'} />
                ) : progress.due > 0 ? (
                  <Pill label={`${progress.due} due`} tone="warning" />
                ) : null}
              </View>
              <Text style={styles.subjectTagline}>{subject.tagline}</Text>
              {status === 'available' ? (
                <>
                  <View style={styles.subjectProgressRow}>
                    <ProgressBar value={progress.lessonsTotal ? progress.lessonsCompleted / progress.lessonsTotal : 0} height={6} style={styles.flex} label={`${subject.name} lessons completed`} />
                    <Text style={styles.subjectMeta}>
                      {progress.topics.length} topic{progress.topics.length === 1 ? '' : 's'} · {progress.lessonsCompleted}/{progress.lessonsTotal} lessons
                    </Text>
                  </View>
                  {received > progress.topics.length ? (
                    <Text style={styles.subjectNote}>
                      + {received - progress.topics.length} more topics received, lessons in preparation
                    </Text>
                  ) : null}
                </>
              ) : status === 'in-preparation' ? (
                <Text style={styles.subjectNote}>{received} lecture topics received — lessons in preparation.</Text>
              ) : null}
            </View>
            <Icon name="chevronRight" size={20} color={colors.textTertiary} />
          </PressableCard>
        );
      })}

      </View>

      {recent.length > 0 ? (
        <>
          <SectionHeader title="Your topics" subtitle="Where you have been learning recently." style={styles.section} />
          <View style={styles.topicGrid}>
          {recent.map((topic) => (
            <View key={topic.topic.id} style={styles.topicGridItem}><TopicCard progress={topic} now={now} compact /></View>
          ))}
          </View>
        </>
      ) : null}
    </View>
  );

  // Study tools (also under the course list on wide screens, so Learn uses the space under the courses).
  const studyToolsLeft = (
    <View style={styles.toolColumn}>
        <LearningWeekCard />
        <Card style={styles.reviewCard}>
          <View style={styles.reviewHeader}>
            <View style={styles.reviewIcon}>
              <Icon name="reinforce" size={18} color={colors.primaryText} />
            </View>
            <Text style={styles.kicker}>SPACED REVIEW</Text>
          </View>
          <Text style={styles.reviewTitle}>
            {overall.due > 0 ? `${overall.due} concept${overall.due === 1 ? '' : 's'} due` : 'Nothing due right now'}
          </Text>
          <Text style={styles.reviewText}>
            {overall.counts.tracked > 0
              ? 'Review brings back what you are most likely to forget — weak and due concepts first.'
              : 'Complete a lesson and its concepts will start coming back for review.'}
          </Text>
          {overall.counts.tracked > 0 ? <MemoryDistribution counts={overall.counts} /> : null}
          <Button
            label={overall.due > 0 ? 'Review now' : 'Practise anyway'}
            variant={overall.due > 0 ? 'primary' : 'secondary'}
            onPress={() => router.push(routes.review({ focus: overall.due > 0 ? 'due' : 'mixed' }))}
            disabled={overall.counts.tracked === 0}
            fullWidth
          />
        </Card>
    </View>
  );
  const studyToolsRight = (
    <View style={styles.toolColumn}>
        <Card style={styles.reviewCard}>
          <View style={styles.reviewHeader}>
            <View style={styles.reviewIcon}>
              <Icon name="edit" size={18} color={colors.primaryText} />
            </View>
            <Text style={styles.kicker}>CUSTOM QUIZ</Text>
          </View>
          <Text style={styles.reviewTitle}>Build your own quiz</Text>
          <Text style={styles.reviewText}>Pick the lessons, how many questions, feedback after each or at the end, and an optional timer for a drill.</Text>
          <Button label="Create a custom quiz" variant="secondary" fullWidth onPress={() => router.push(routes.customQuizBuilder())} />
        </Card>
        <Card style={styles.reviewCard}>
          <View style={styles.reviewHeader}>
            <View style={styles.reviewIcon}>
              <Icon name="calendar" size={18} color={colors.primaryText} />
            </View>
            <Text style={styles.kicker}>OPTIONAL PLANNING</Text>
          </View>
          <Text style={styles.reviewTitle}>Plan your study week</Text>
          <Text style={styles.reviewText}>Choose topics for a personal lesson path, set a study goal or add recurring blocks to your timetable.</Text>
          <Button label="Open study planner" variant="secondary" fullWidth onPress={() => router.push('/learn/planner' as never)} />
        </Card>
        <Card style={styles.reviewCard} tone="outline">
          <View style={styles.reviewHeader}>
            <View style={styles.reviewIcon}>
              <Icon name="book" size={18} color={colors.primaryText} />
            </View>
            <Text style={styles.kicker}>QUESTION BANK</Text>
            <Pill label="Coming soon" />
          </View>
          <Text style={styles.reviewTitle}>Past questions</Text>
          <Text style={styles.reviewText}>A past-question bank is planned for Study. Materials will be added when they are ready to share.</Text>
        </Card>
        {actions.length > 1 ? (
          <>
            <Text style={styles.kicker}>ALSO SUGGESTED</Text>
            <NextActionList actions={actions.slice(1, 4)} />
          </>
        ) : null}
    </View>
  );

  const sideTop = (
    <>
      <QuestionOfTheDay />
      <RankProgressCard lifetimeXp={progress.xp} />
      <PersonalGoalsCard />
      <Card style={styles.calendarCard}>
        <SectionHeader
          title="Your week"
          subtitle={`${lessonsThisWeek} lessons · ${reviewsThisWeek} reviews this week · your spaced-review plan`}
          style={styles.calendarHeading}
        />
        <ReviewCalendar memory={memory} attempts={attempts} now={now} />
      </Card>
    </>
  );

  const side = (
    <View style={styles.column}>
      {sideTop}
      {studyToolsLeft}
      {studyToolsRight}
    </View>
  );

  // Study, organised in sections (courses, practise and plan, your progress), with uniform tiles.
  const studyTiles: Tile[] = [
    {
      id: 'review', icon: 'reinforce', title: 'Spaced review',
      detail: overall.counts.tracked > 0 ? (overall.due > 0 ? 'What you are most likely to forget comes back first.' : 'Nothing due right now. Practise anyway to stay sharp.') : 'Finish a lesson and its ideas start coming back for review.',
      badge: overall.due > 0 ? `${overall.due} due` : undefined,
      onPress: () => router.push(routes.review({ focus: overall.due > 0 ? 'due' : 'mixed' })),
      disabled: overall.counts.tracked === 0,
    },
    { id: 'custom', icon: 'edit', title: 'Custom quiz', detail: 'Choose the lessons, how many questions, a timer and when you see the answers.', onPress: () => router.push(routes.customQuizBuilder()) },
    { id: 'past', icon: 'book', title: 'Past question bank', detail: 'Real past papers and predicted papers, sat like the exam.', onPress: () => router.push('/learn/past-questions' as never) },
    { id: 'planner', icon: 'calendar', title: 'Timetable and plans', detail: 'Your weekly calendar, and a lesson path for your goals.', onPress: () => router.push('/learn/planner' as never) },
  ];
  const reviewCalendar = (
    <Card style={styles.calendarCard}>
      <SectionHeader
        title="Your week"
        subtitle={`${lessonsThisWeek} lessons · ${reviewsThisWeek} reviews this week · your spaced-review plan`}
        style={styles.calendarHeading}
      />
      <ReviewCalendar memory={memory} attempts={attempts} now={now} />
    </Card>
  );
  const studyHub = (
    <View style={styles.column}>
      <Columns main={<LegacyCourseList courses={legacyCourses} selection={viewing as ClassSelection} />} side={<QuestionOfTheDay />} sideWidth={360} />
      <SectionHeader title="Practise and plan" subtitle="Ways to practise beyond the lessons, and your week." style={styles.hubSection} />
      <TileGrid columns={4} tiles={studyTiles} />
      <SectionHeader title="Your progress" subtitle="Your rank, this week and your goals." style={styles.hubSection} />
      {/* This week on the left (wider); rank and goals stacked on the right, matching its height. */}
      <View style={styles.progressRow}>
        <View style={styles.progressWide}><LearningWeekCard /></View>
        <View style={styles.progressStack}>
          <View style={styles.progressFill}><RankProgressCard lifetimeXp={progress.xp} /></View>
          <View style={styles.progressFill}><PersonalGoalsCard /></View>
        </View>
      </View>
      {reviewCalendar}
    </View>
  );

  return (
    <Screen width="wide">
      <LearningWelcomeAtmosphere>
        <PageHeader
          eyebrow={viewing ? `${viewingOwnClass ? 'My class' : 'Browsing'} · ${viewing.classId} · Semester ${viewing.semester}` : 'Your curriculum'}
          title={displayName?.trim() ? `${greeting}, ${displayName.trim()}` : greeting}
          subtitle={
            viewingOwnClass
              ? actions[0]
                ? `Here’s your next learning step: ${actions[0].title}.`
                : 'Choose a subject and take your next step in medicine.'
              : 'Preview another class and semester. Your own selection stays the same.'
          }
          right={compactWelcome ? null : welcomeBadge}
          style={styles.welcomeHeader}
        />
        {compactWelcome && welcomeBadge ? <View style={styles.mobileWelcomeBadge}>{welcomeBadge}</View> : null}
      </LearningWelcomeAtmosphere>

      {viewing ? (
        <View style={styles.browseArea}>
          {!browseOpen ? (
            <View style={styles.browseActions}>
              <Button label="Browse other classes" variant="secondary" trailing="chevronDown" onPress={() => setBrowseOpen(true)} />
            </View>
          ) : (
            <Card style={styles.browseCard}>
              <SectionHeader
                title="Browse classes"
                subtitle="Choose a class and semester to preview its subjects. This will not change your selection."
                style={styles.browseHeading}
                right={(
                  <View style={styles.browseHeaderActions}>
                    <Button label="My class" variant="ghost" size="sm" onPress={() => showEnvironment(ownSelection ?? viewing)} />
                  </View>
                )}
              />
              <View style={styles.classChoices} accessibilityRole="radiogroup" accessibilityLabel="Browse class curricula">
                {CLASS_IDS.map((classId) => {
                  const selected = classId === viewing.classId;
                  return (
                    <Interactive
                      key={classId}
                      onPress={() => showEnvironment({ classId, semester: viewing.semester })}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      style={[styles.classChoice, selected && styles.classChoiceSelected]}
                    >
                      <Text style={[styles.classChoiceText, selected && styles.classChoiceTextSelected]}>{classId}</Text>
                    </Interactive>
                  );
                })}
              </View>
              <View style={styles.semesterChoices} accessibilityRole="radiogroup" accessibilityLabel="Browse semesters">
                {([1, 2] as const).map((semester) => {
                  const selected = semester === viewing.semester;
                  return (
                    <Interactive
                      key={semester}
                      onPress={() => showEnvironment({ classId: viewing.classId, semester })}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      style={[styles.semesterChoice, selected && styles.classChoiceSelected]}
                    >
                      <Text style={[styles.classChoiceText, selected && styles.classChoiceTextSelected]}>Semester {semester}</Text>
                    </Interactive>
                  );
                })}
              </View>
            </Card>
          )}
        </View>
      ) : null}

      {blockedSelection && ownSelection ? (
        <ClassAccessCard target={blockedSelection} current={requiredLevel?.selection ?? ownSelection} lessonsComplete={requiredLevel?.completed ?? currentCompletion.completed} lessonsTotal={requiredLevel?.total ?? currentCompletion.total} trialUsed={trial.used} trialExpiresAt={trial.active ? trial.expiresAt : undefined} onStartTrial={() => { if (blockedSelection) { setRequestedFuture(null); router.replace(routes.learnEnvironment(blockedSelection)); } }} onBack={() => { setRequestedFuture(null); showEnvironment(ownSelection); }} />
      ) : viewing && legacyCourses.length > 0 ? (
        // HB1 (the original app's courses) and HB2 Semester 1 (this app's lessons), in the original study style.
        studyHub
      ) : offeredSubjects.length > 0 ? (
        <Columns main={main} side={side} sideWidth={360} />
      ) : (
        <Card tone="insight" style={styles.comingSoon}>
          <View style={styles.comingIcon}><Icon name="book" size={22} color={colors.primaryText} /></View>
          <Text style={styles.comingTitle}>Coming soon</Text>
          <Text style={styles.comingText}>
            {viewing ? `Courses for ${viewing.classId}, Semester ${viewing.semester} will appear here when they are ready.` : 'Your class curriculum will appear here after you choose a class and semester.'}
          </Text>
        </Card>
      )}
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    column: { gap: 12 },
    tutorCard: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between', gap: 14, padding: 18 },
    tutorCopy: { flex: 1, minWidth: 230, gap: 4 },
    tutorEyebrow: { ...Type.overline, color: colors.primaryText },
    tutorTitle: { ...Type.headline, color: colors.text },
    section: { marginTop: 14, marginBottom: 0 },
    toolGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' },
    hubSection: { marginTop: 18, marginBottom: 2 },
    progressRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'stretch' },
    progressWide: { flexGrow: 2, flexBasis: 460, minWidth: 0 },
    progressStack: { flexGrow: 1, flexBasis: 300, minWidth: 0, gap: 16 },
    progressFill: { flexGrow: 1 },
    toolColumn: { flexGrow: 1, flexBasis: 320, minWidth: 0, gap: 16 },
    calendarCard: { gap: 12 },
    calendarHeading: { marginBottom: 0 },
    welcomeHeader: { marginBottom: 0 },
    mobileWelcomeBadge: { alignSelf: 'flex-start', marginTop: 10 },
    browseArea: { marginTop: -8, marginBottom: 18 },
    browseActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
    browseHeaderActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
    browseCard: { gap: 12 },
    browseHeading: { marginBottom: 0 },
    classChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    classChoice: { minWidth: 70, flexGrow: 1, flexBasis: '14%', minHeight: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, backgroundColor: colors.surfaceMuted },
    classChoiceSelected: { backgroundColor: colors.primarySubtle, borderColor: colors.primary, borderWidth: 1.5 },
    classChoiceText: { fontSize: 13, fontWeight: '800', color: colors.textSecondary },
    classChoiceTextSelected: { color: colors.primaryText },
    semesterChoices: { flexDirection: 'row', gap: 8 },
    semesterChoice: { flex: 1, minHeight: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, backgroundColor: colors.surfaceMuted },
    comingSoon: { gap: 9, alignItems: 'flex-start', maxWidth: 680, paddingVertical: 22 },
    comingIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceElevated },
    comingTitle: { ...Type.title3, color: colors.text },
    comingText: { ...Type.body, color: colors.textSecondary },
    subjectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    subjectCard: { flexGrow: 1, flexBasis: 260, minWidth: 240, maxWidth: 500, flexDirection: 'row', alignItems: 'center', gap: 14 },
    subjectInfo: { flex: 1, minWidth: 0, gap: 4 },
    subjectTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
    subjectTitle: { ...Type.title3, color: colors.text },
    subjectTagline: { fontSize: 13, color: colors.textSecondary },
    subjectProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
    flex: { flex: 1 },
    subjectMeta: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
    subjectNote: { fontSize: 12, color: colors.textTertiary },
    topicGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    topicGridItem: { flexGrow: 1, flexBasis: 280, minWidth: 260, maxWidth: 440 },
    reviewCard: { gap: 10 },
    reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    reviewIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.primarySubtle, alignItems: 'center', justifyContent: 'center' },
    kicker: { ...Type.overline, color: colors.textTertiary },
    reviewTitle: { ...Type.title2, fontSize: 20, color: colors.text },
    reviewText: { fontSize: 13, lineHeight: 19, color: colors.textSecondary },
  });
}
