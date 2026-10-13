import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';

import { AiFlashcardsPanel, AiQuestionsPanel, AskAiPanel } from '@/components/learning/ai-study';
import { InteractiveLayer } from '@/components/learning/interactive-layer';
import { ClassAccessCard } from '@/components/learning/class-access-card';
import { MemoryStateBadge } from '@/components/learning/memory-ui';
import { Breadcrumbs } from '@/components/learning/nav-bits';
import { ReadingLayer } from '@/components/learning/reading-layer';
import { Button } from '@/components/ui/button';
import { Card, Interactive } from '@/components/ui/interactive';
import { Pill } from '@/components/ui/pill';
import { Columns, Screen } from '@/components/ui/screen';
import { ErrorScreen, InlineNotice, LoadingState } from '@/components/ui/state-views';
import { XpReward, XpToast } from '@/components/xp-toast';
import type { ThemeColors } from '@/constants/theme';
import { conceptKey, findLesson, getCourseInfo, getLessonQuizBank, isTrackableConcept } from '@/data/curriculum';
import { classLessonCompletion, firstClassOffering, firstIncompleteClassBefore, isClassAhead, readAcademicTrial, readClassSelection } from '@/data/class-curriculum';
import { lessonToText } from '@/data/ai-study';
import { beginLesson, finishLesson, type LessonFinish } from '@/data/learning/actions';
import { saveLessonSession, useLessonSessions } from '@/data/learning/lesson-sessions';
import { describeDue } from '@/data/learning/time';
import { useLearning } from '@/data/learning/use-learning';
import { lessonCompletionXp } from '@/data/learning/xp-rules';
import { getSubjectInfo } from '@/data/subjects';
import { useThemedStyles } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';
import { param, routes } from '@/lib/routes';

type View3 = 'learn' | 'read';
type AiView = 'ask' | 'aicards' | 'questions';

// /learn/lesson?lesson=<lesson id>[&layer=learn|read][&restart=1]
export default function LessonRoute() {
  const params = useLocalSearchParams<{
    lesson?: string | string[];
    layer?: string | string[];
    restart?: string | string[];
    t?: string | string[];
  }>();
  const lessonId = param(params.lesson);
  const layer = param(params.layer);
  const restart = param(params.restart) === '1';
  return (
    <LessonPlayer
      key={`${lessonId}:${param(params.t) ?? ''}`}
      lessonId={lessonId}
      requestedLayer={layer === 'learn' || layer === 'read' ? layer : undefined}
      restart={restart}
    />
  );
}

function LessonPlayer({
  lessonId,
  requestedLayer,
  restart,
}: {
  lessonId: string | undefined;
  requestedLayer?: View3;
  restart: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const { user } = useAuth();
  const ownSelection = readClassSelection(user?.user_metadata);
  const trial = readAcademicTrial(user?.user_metadata);
  const scrollRef = useRef<ScrollView>(null);
  const found = findLesson(lessonId);
  const foundLesson = found?.lesson;
  const foundTopic = found?.topic;
  const sessions = useLessonSessions();
  const { progress, memory, now } = useLearning();
  const [xpReward, setXpReward] = useState<XpReward | null>(null);
  const [finish, setFinish] = useState<LessonFinish | null>(null);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const lesson = found?.lesson;
  const hasInteractive = (lesson?.interactive?.length ?? 0) > 0;
  const completed = lesson ? progress.completedLessons.includes(lesson.id) : false;
  const session = lesson ? sessions[lesson.id] : undefined;  const firstOffering = found ? firstClassOffering(found.topic.subject) : null;
  const requiredLevel = ownSelection && firstOffering && isClassAhead(firstOffering, ownSelection) && !trial.active
    ? firstIncompleteClassBefore(firstOffering, ownSelection, progress.lessonCompletedAt)
    : null;
  const requiredProgress = requiredLevel ? classLessonCompletion(requiredLevel.selection, progress.lessonCompletedAt) : null;
  const classLocked = Boolean(firstOffering && requiredLevel);

  // Ask AI / AI Flashcards take over the main column while open.
  const [ai, setAi] = useState<AiView | null>(null);
  const [view, setView] = useState<View3>(() => {
    if (requestedLayer) return requestedLayer;
    if (!hasInteractive) return 'read';
    if (completed) return 'read';
    return 'learn';
  });

  // Start (or resume) the lesson session once.
  useEffect(() => {
    if (!lesson || classLocked) return;
    let cancelled = false;
    void (async () => {
      try {
        if (!completed || restart || requestedLayer === 'learn') {
          const started = await beginLesson(lesson.id, { restart: restart || (completed && requestedLayer === 'learn') });
          if (!cancelled && started && !requestedLayer && started.phase === 'reading') setView('read');
        }
      } catch (problem) {
        console.warn('Could not start lesson session:', problem);
        if (!cancelled) setError('Your place in this lesson could not be saved on this device. You can still learn; progress will save when you complete the lesson.');
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Run once per lesson open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson?.id, classLocked]);

  const concepts = useMemo(() => {
    if (!foundLesson || !foundTopic) return [];
    return foundLesson.concepts.filter(isTrackableConcept).map((concept) => ({
      concept,
      memory: memory.concepts.get(conceptKey(foundTopic.id, concept.id)),
    }));
  }, [foundLesson, foundTopic, memory]);

  if (!found || !lesson) {
    return (
      <ErrorScreen
        title="Lesson not found"
        message={lessonId ? `There is no lesson called “${lessonId}”. It may have been renamed or removed.` : 'This link does not name a lesson.'}
        primary={{ label: 'Go to Study', onPress: () => router.replace(routes.learn()) }}
      />
    );
  }

  if (firstOffering && requiredLevel) {
    return <Screen width="wide"><ClassAccessCard target={firstOffering} current={requiredLevel.selection} lessonsComplete={requiredProgress?.completed ?? 0} lessonsTotal={requiredProgress?.total ?? 0} trialUsed={trial.used} trialExpiresAt={trial.active ? trial.expiresAt : undefined} onStartTrial={() => router.replace(routes.learnEnvironment(firstOffering))} onBack={() => router.replace(routes.learn())} /></Screen>;
  }
  if (!ready && !completed && hasInteractive && !session) {
    return <LoadingState label="Opening your lesson…" />;
  }

  const { topic, index } = found;
  const subject = getSubjectInfo(topic.subject);
  const course = getCourseInfo(topic.courseId);
  const quizSize = getLessonQuizBank(lesson.id).length;
  const nextLesson = topic.lessons[index + 1];
  const xp = lessonCompletionXp(lesson.xp);
  const resumed = !completed && session && session.phase === 'interactive' && session.position > 0 && view === 'learn';

  function scrollTop() {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  function goTo(next: View3) {
    setAi(null);
    setView(next);
    scrollTop();
  }

  async function complete() {
    if (completing || !lesson) return;
    setCompleting(true);
    setError(null);
    try {
      const result = await finishLesson(lesson.id);
      setFinish(result);
      if (result.awarded) {
        const total = result.xp + result.milestones.reduce((sum, item) => sum + item.xp, 0);
        setXpReward({
          amount: total,
          message: 'Lesson completed!',
          lines: [{ label: 'Lesson', amount: result.xp }, ...result.milestones.map((item) => ({ label: item.label, amount: item.xp }))],
        });
      }
      scrollTop();
    } catch (problem) {
      console.warn('Could not complete lesson:', problem);
      setError('The lesson could not be marked complete. Check your connection and try again — nothing was lost.');
    } finally {
      setCompleting(false);
    }
  }

  const outline = (
    <View style={styles.side}>
      <Card style={styles.sideCard}>
        <Text style={styles.kicker}>THIS LESSON</Text>
        {(['learn', 'read'] as View3[]).map((layer, i) => {
          const disabled = layer === 'learn' && !hasInteractive;
          const active = view === layer && !ai;
          const label = layer === 'learn' ? 'Learn interactively' : 'Read & revise';
          const detail =
            layer === 'learn'
              ? hasInteractive
                ? session && !completed
                  ? `Step ${Math.min(session.position + 1, session.queue.length)} of ${session.queue.length}`
                  : `${lesson.interactive!.length} steps`
                : 'Not available for this lesson'
              : `${lesson.chunks.length} sections`;
          return (
            <Interactive
              key={layer}
              onPress={() => (layer === 'learn' && completed ? router.push(routes.lesson(lesson.id, { layer: 'learn', restart: true })) : goTo(layer))}
              disabled={disabled}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={({ hovered }) => [styles.outlineRow, active && styles.outlineActive, hovered && styles.outlineHover]}
            >
              <Text style={[styles.outlineNumber, active && styles.outlineNumberActive]}>{i + 1}</Text>
              <View style={styles.flex}>
                <Text style={styles.outlineLabel}>{label}</Text>
                <Text style={styles.outlineDetail}>{detail}</Text>
              </View>
            </Interactive>
          );
        })}
        <Interactive
          onPress={() => router.push(routes.lessonQuiz(lesson.id, { masteryCheck: !completed }))}
          disabled={quizSize === 0}
          style={({ hovered }) => [styles.outlineRow, hovered && styles.outlineHover]}
        >
          <Text style={styles.outlineNumber}>3</Text>
          <View style={styles.flex}>
            <Text style={styles.outlineLabel}>{completed ? 'Lesson quiz' : 'Test out (quiz)'}</Text>
            <Text style={styles.outlineDetail}>{quizSize > 0 ? `${quizSize} questions in the bank` : 'No quiz yet'}</Text>
          </View>
        </Interactive>
      </Card>

      {concepts.length > 0 ? (
        <Card style={styles.sideCard}>
          <Text style={styles.kicker}>CONCEPTS IN THIS LESSON</Text>
          {concepts.map(({ concept, memory: state }) => (
            <View key={concept.id} style={styles.conceptRow}>
              <Text style={styles.conceptName}>{concept.name}</Text>
              {state ? (
                <View style={styles.conceptState}>
                  <MemoryStateBadge state={state.state} due={state.due} />
                  {state.dueAt && !state.due ? <Text style={styles.conceptDue}>review {describeDue(state.dueAt, now)}</Text> : null}
                </View>
              ) : (
                <Pill label="New" />
              )}
            </View>
          ))}
        </Card>
      ) : null}
    </View>
  );

  const aiLesson = { id: lesson.id, title: lesson.title, text: lessonToText(lesson) };
  const lessonMain = (
    <View style={styles.main}>
      {error ? <InlineNotice tone="error" title="SOMETHING WENT WRONG" message={error} /> : null}

      {(finish?.awarded || (completed && finish)) ? (
        <Card style={styles.doneCard}>
          <Text style={styles.doneTitle}>✓ Lesson completed</Text>
          <Text style={styles.doneText}>
            {finish?.awarded ? `+${finish.xp} XP. ` : ''}
            {concepts.length} concept{concepts.length === 1 ? '' : 's'} scheduled for their first review tomorrow — retrieval then is what makes it stick.
          </Text>
          {finish?.milestones.map((item) => (
            <Text key={item.label} style={styles.milestone}>
              ★ {item.label} · +{item.xp} XP
            </Text>
          ))}
          <View style={styles.doneActions}>
            {quizSize > 0 ? <Button label="Take the lesson quiz" trailing="→" onPress={() => router.push(routes.lessonQuiz(lesson.id))} /> : null}
            {nextLesson ? (
              <Button label={`Next: ${nextLesson.title}`} variant="secondary" onPress={() => router.push(routes.lesson(nextLesson.id))} />
            ) : null}
            <Button label="Back to topic" variant="ghost" onPress={() => router.push(routes.topic(topic.id))} />
          </View>
        </Card>
      ) : null}

      {resumed ? (
        <View style={styles.resume}>
          <Text style={styles.resumeText}>Welcome back — you are where you left off.</Text>
          <Button label="Restart lesson" size="sm" variant="ghost" onPress={() => router.replace(routes.lesson(lesson.id, { layer: 'learn', restart: true }))} />
        </View>
      ) : null}

      {view === 'learn' && hasInteractive && session && session.phase !== 'complete' ? (
        <InteractiveLayer
          lesson={lesson}
          session={session}
          onFinished={() => {
            saveLessonSession({ ...session, phase: 'reading' });
            goTo('read');
          }}
        />
      ) : null}

      {view === 'learn' && hasInteractive && (!session || session.phase === 'complete') ? (
        <Card style={styles.sideCard}>
          <Text style={styles.doneText}>You have completed this lesson. Practise the interactive steps again any time.</Text>
          <Button label="Practise interactively" onPress={() => router.replace(routes.lesson(lesson.id, { layer: 'learn', restart: true }))} />
        </Card>
      ) : null}

      {view === 'read' ? (
        <>
          {hasInteractive && !completed && session?.phase === 'interactive' ? (
            <InlineNotice
              tone="info"
              message="You jumped ahead to the reading summary. The interactive steps are still waiting — learning by answering first makes this stick far better."
            />
          ) : null}
          {completed && !finish && concepts.some((item) => item.memory) ? (
            <Card tone="primary" style={styles.recallFirst}>
              <Text style={styles.completeTitle}>Recall first, then re-read</Text>
              <Text style={styles.doneText}>
                Coming back to revise? Retrieving before re-reading is what strengthens memory. Try a short check on this
                lesson&apos;s concepts first.
              </Text>
              <Button
                label="Quick recall check · 10 questions"
                onPress={() => router.push(routes.review({ lessonId: lesson.id, focus: 'mixed', size: 10 }))}
              />
            </Card>
          ) : null}
          <ReadingLayer lesson={lesson} />
          {!completed ? (
            <Card tone="primary" style={styles.completeCard}>
              <Text style={styles.completeTitle}>Finished the lesson?</Text>
              <Text style={styles.doneText}>
                Completing it schedules its {concepts.length} concepts for spaced review and unlocks the quiz as the next step.
              </Text>
              <Button
                label={`Complete lesson · +${xp} XP`}
                variant="gold"
                size="lg"
                loading={completing}
                onPress={() => void complete()}
              />
            </Card>
          ) : !finish ? (
            <View style={styles.doneActions}>
              {quizSize > 0 ? <Button label="Take the lesson quiz" onPress={() => router.push(routes.lessonQuiz(lesson.id))} /> : null}
              {nextLesson ? (
                <Button label={`Next: ${nextLesson.title}`} variant="secondary" onPress={() => router.push(routes.lesson(nextLesson.id))} />
              ) : null}
              <Button label="Back to topic" variant="ghost" onPress={() => router.push(routes.topic(topic.id))} />
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );

  const main = ai ? (
    <View style={styles.main}>
      {ai === 'ask' ? <AskAiPanel lesson={aiLesson} /> : ai === 'questions' ? <AiQuestionsPanel lesson={aiLesson} /> : <AiFlashcardsPanel lesson={aiLesson} />}
    </View>
  ) : lessonMain;

  function openAi(next: AiView) {
    setAi(next);
    scrollTop();
  }

  return (
    <View style={styles.screen}>
      <Screen ref={scrollRef} width="wide">
        <Breadcrumbs
          items={[
            { label: 'Study', href: routes.learn() },
            { label: subject.name, href: routes.subject(topic.subject) },
            ...(course && course.title !== subject.name ? [{ label: course.title, href: routes.course(course.id) }] : []),
            { label: topic.title, href: routes.topic(topic.id) },
            { label: `Lesson ${index + 1} of ${topic.lessons.length}` },
          ]}
          style={styles.crumbs}
        />
        <Text style={styles.title} accessibilityRole="header">
          {lesson.title}
        </Text>
        <Text style={styles.description}>{lesson.description}</Text>
        <View style={styles.headerPills}>
          {completed ? <Pill label="Completed" tone="success" /> : null}
          {lesson.estimatedMinutes ? <Pill label={`~${lesson.estimatedMinutes} min`} /> : null}
          <Pill label={`${concepts.length} concepts`} />
        </View>

        {lesson.objectives && lesson.objectives.length > 0 ? (
          <Card tone="muted" style={styles.objectives}>
            <Text style={styles.kicker}>WHAT YOU’LL LEARN</Text>
            {lesson.objectives.map((objective, i) => (
              <Text key={i} style={styles.objective}>
                • {objective}
              </Text>
            ))}
          </Card>
        ) : null}

        <View style={styles.tabs} accessibilityRole="tablist">
          {(['learn', 'read'] as View3[]).map((layer, i) => (
            <Interactive
              key={layer}
              accessibilityRole="tab"
              accessibilityState={{ selected: view === layer }}
              disabled={layer === 'learn' && !hasInteractive}
              onPress={() => goTo(layer)}
              style={({ hovered }) => [styles.tab, view === layer && !ai && styles.tabActive, hovered && styles.tabHover]}
            >
              <Text style={[styles.tabText, view === layer && !ai && styles.tabTextActive]}>
                {i + 1} · {layer === 'learn' ? 'Learn' : 'Read'}
              </Text>
            </Interactive>
          ))}
          <Interactive
            accessibilityRole="tab"
            disabled={quizSize === 0}
            onPress={() => router.push(routes.lessonQuiz(lesson.id, { masteryCheck: !completed }))}
            style={({ hovered }) => [styles.tab, hovered && styles.tabHover]}
          >
            <Text style={styles.tabText}>3 · Quiz</Text>
          </Interactive>
          {(['ask', 'aicards', 'questions'] as AiView[]).map((layer) => (
            <Interactive
              key={layer}
              accessibilityRole="tab"
              accessibilityState={{ selected: ai === layer }}
              onPress={() => openAi(layer)}
              style={({ hovered }) => [styles.tab, ai === layer && styles.tabActive, hovered && styles.tabHover]}
            >
              <Text style={[styles.tabText, ai === layer && styles.tabTextActive]}>{layer === 'ask' ? 'Ask AI' : layer === 'questions' ? 'AI Questions' : 'AI Flashcards'}</Text>
            </Interactive>
          ))}
        </View>

        <Columns main={main} side={outline} sideWidth={320} />
      </Screen>
      <XpToast reward={xpReward} onHide={() => setXpReward(null)} />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1 },
    flex: { flex: 1 },
    crumbs: { marginBottom: 12 },
    title: { fontSize: 28, fontWeight: '800', lineHeight: 35, color: colors.text },
    description: { fontSize: 15, lineHeight: 22, color: colors.textSecondary, marginTop: 4 },
    headerPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    objectives: { marginTop: 16, gap: 4 },
    objective: { fontSize: 14, lineHeight: 21, color: colors.text },
    kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.1, color: colors.textTertiary, marginBottom: 6 },
    tabs: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 18,
      marginBottom: 16,
      padding: 4,
      borderRadius: 14,
      backgroundColor: colors.surfaceMuted,
      alignSelf: 'flex-start',
    },
    tab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
    tabActive: { backgroundColor: colors.surface },
    tabHover: { backgroundColor: colors.surface },
    tabText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
    tabTextActive: { color: colors.text },
    main: { gap: 14 },
    side: { gap: 14 },
    sideCard: { gap: 8 },
    outlineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 10 },
    outlineActive: { backgroundColor: colors.primarySubtle },
    outlineHover: { backgroundColor: colors.surfaceMuted },
    outlineNumber: {
      width: 26,
      height: 26,
      borderRadius: 13,
      textAlign: 'center',
      lineHeight: 26,
      fontSize: 12,
      fontWeight: '800',
      color: colors.textSecondary,
      backgroundColor: colors.surfaceMuted,
      overflow: 'hidden',
    },
    outlineNumberActive: { backgroundColor: colors.primary, color: colors.onPrimary },
    outlineLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
    outlineDetail: { fontSize: 12, color: colors.textTertiary },
    conceptRow: { gap: 4, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.divider },
    conceptName: { fontSize: 13, fontWeight: '700', color: colors.text },
    conceptState: { gap: 3 },
    conceptDue: { fontSize: 11, color: colors.textTertiary },
    resume: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      backgroundColor: colors.primarySubtle,
      borderRadius: 14,
      paddingVertical: 6,
      paddingLeft: 14,
      paddingRight: 6,
    },
    resumeText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.primaryText },
    completeCard: { gap: 10, alignItems: 'flex-start' },
    recallFirst: { gap: 8, alignItems: 'flex-start' },
    completeTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
    doneCard: { gap: 8, borderColor: colors.successBorder, backgroundColor: colors.successSubtle },
    doneTitle: { fontSize: 20, fontWeight: '800', color: colors.successText },
    doneText: { fontSize: 14, lineHeight: 21, color: colors.textSecondary },
    milestone: { fontSize: 14, fontWeight: '700', color: colors.accentText },
    doneActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  });
}
