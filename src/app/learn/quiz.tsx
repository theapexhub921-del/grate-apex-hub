import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';

import { Breadcrumbs, BackLink } from '@/components/learning/nav-bits';
import { type FeedbackMode, QuestionSession, type SessionItem, type SessionResult } from '@/components/learning/question-session';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Card, Interactive } from '@/components/ui/interactive';
import { Pill } from '@/components/ui/pill';
import { Screen } from '@/components/ui/screen';
import { ErrorScreen, InlineNotice } from '@/components/ui/state-views';
import { setPendingXpReward } from '@/components/xp-toast';
import type { ThemeColors } from '@/constants/theme';
import { findLesson, getLessonQuestions, getLessonQuizBank, getQuestionsByIds, getTopic } from '@/data/curriculum';
import type { AttemptMode } from '@/data/learning-sync';
import { logSessionStart, submitQuiz } from '@/data/learning/actions';
import { selectQuestions, type SelectionRequest } from '@/data/learning/selection';
import { currentMemoryModel } from '@/data/learning/state';
import { nowMs } from '@/data/learning/time';
import { XP_RULES } from '@/data/learning/xp-rules';
import { useProgress } from '@/data/progress';
import { ensureQuestionHistoryLoaded } from '@/data/question-history';
import { type AttemptKind, type CustomQuizSettings, ensureQuizHistoryLoaded, getQuizHistory } from '@/data/quiz-history';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { param, routes } from '@/lib/routes';
import type { Href } from 'expo-router';

const LESSON_QUIZ_SIZE = 30;
const TOPIC_QUIZ_SIZE = 30;

type QuizPlan = {
  kind: AttemptKind;
  attemptMode: AttemptMode;
  title: string;
  subtitle: string;
  lessonId?: string;
  topicId?: string;
  request: Omit<SelectionRequest, 'seed' | 'now'>;
  backHref: Href;
  crumbs: { label: string; href?: Href }[];
  customQuiz?: CustomQuizSettings;
};

// /learn/quiz?lesson=<id>[&masteryCheck=true]   lesson quiz / mastery check
// /learn/quiz?topic=<id>                         cumulative topic quiz
// /learn/quiz?practice=<id,id,…>                 practise specific questions
// Older links: ?course=<id>&challenge=apex → Apex Challenge;
//              ?lesson=<id>&practiceWrong=true&wrongQuestions=<ids> → practice
export default function QuizRoute() {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const lessonId = param(params.lesson);
  const topicId = param(params.topic);
  const practice =
    param(params.practice) ?? (param(params.practiceWrong) === 'true' ? param(params.wrongQuestions) : undefined);
  const masteryCheck = param(params.masteryCheck) === 'true';
  const custom = param(params.custom) === '1';
  const attemptToken = param(params.attempt) ?? '';
  const customLessonIds = custom ? [...new Set((param(params.lessons) ?? '').split(',').filter(Boolean))] : undefined;
  const customSize = custom ? Math.max(1, Math.min(50, Number(param(params.size)) || 10)) : undefined;
  const feedback = param(params.feedback) === 'submit' ? 'submit' : 'instant';
  const parsedSeconds = Number(param(params.seconds));
  const perQuestionSeconds = custom && Number.isInteger(parsedSeconds) && parsedSeconds >= 5 && parsedSeconds <= 120 ? parsedSeconds : undefined;
  const customSettings: CustomQuizSettings | undefined =
    custom && customLessonIds?.length
      ? { lessonIds: customLessonIds, size: customSize ?? 10, feedback, secondsPerQuestion: perQuestionSeconds }
      : undefined;

  if (param(params.challenge) === 'apex' || (!lessonId && !topicId && !practice && param(params.course))) {
    return <Redirect href={routes.apex(param(params.course))} />;
  }

  return (
    <QuizScreen
      key={`${lessonId ?? ''}:${topicId ?? ''}:${practice ?? ''}:${masteryCheck}:${custom}:${attemptToken}`}
      lessonId={lessonId}
      topicId={topicId}
      practiceIds={practice ? practice.split(',').filter(Boolean) : undefined}
      masteryCheck={masteryCheck}
      customLessonIds={customLessonIds}
      customSize={customSize}
      customSettings={customSettings}
      initialFeedback={custom ? feedback : undefined}
      perQuestionSeconds={perQuestionSeconds}
    />
  );
}

function buildPlan(input: {
  lessonId?: string;
  topicId?: string;
  practiceIds?: string[];
  masteryCheck: boolean;
  customLessonIds?: string[];
  customSize?: number;
  customSettings?: CustomQuizSettings;
  completed: string[];
}): QuizPlan | null {
  const { lessonId, topicId, practiceIds, masteryCheck, customLessonIds, customSize, customSettings, completed } = input;

  if (customLessonIds && customLessonIds.length > 0) {
    const lessonIds = customLessonIds.filter((id) => findLesson(id));
    const questionIds = Array.from(
      new Set(lessonIds.flatMap((id) => getLessonQuestions(id).filter((question) => question.usage !== 'learn').map((question) => question.id)))
    );
    if (questionIds.length === 0) return null;
    const size = Math.min(customSize ?? 10, questionIds.length);
    const topicIds = new Set(lessonIds.map((id) => findLesson(id)?.topic.id).filter((id): id is string => Boolean(id)));
    return {
      kind: 'practice',
      attemptMode: 'practice',
      title: 'Custom practice',
      subtitle: `A fresh set of up to ${size} questions from your selected lessons.`,
      topicId: topicIds.size === 1 ? Array.from(topicIds)[0] : '',
      request: { scope: { kind: 'questions', questionIds }, size },
      backHref: routes.customQuizBuilder(),
      crumbs: [{ label: 'Custom practice' }],
      customQuiz: customSettings ? { ...customSettings, lessonIds, size } : undefined,
    };
  }

  if (practiceIds && practiceIds.length > 0) {
    const questions = getQuestionsByIds(practiceIds);
    if (questions.length === 0) return null;
    const topic = getTopic(topicId ?? questions[0]?.topicId);
    return {
      kind: 'practice',
      attemptMode: 'practice',
      title: 'Practise your wrong answers',
      subtitle: `${questions.length} question${questions.length === 1 ? '' : 's'} you missed. No XP is lost while practising.`,
      lessonId,
      topicId: topic?.id,
      request: { scope: { kind: 'questions', questionIds: practiceIds }, size: practiceIds.length },
      backHref: topic ? routes.topic(topic.id) : routes.learn(),
      crumbs: topic ? [{ label: topic.title, href: routes.topic(topic.id) }, { label: 'Practice' }] : [{ label: 'Practice' }],
    };
  }

  if (lessonId) {
    const found = findLesson(lessonId);
    if (!found) return null;
    const done = completed.includes(lessonId);
    const isCheck = !done && masteryCheck;
    return {
      kind: isCheck ? 'mastery-check' : 'lesson',
      attemptMode: isCheck ? 'mastery-check' : 'lesson-quiz',
      title: found.lesson.title,
      subtitle: isCheck
        ? `Already know this? Score ${XP_RULES.masteryCheckPercent}% or more and the lesson is completed for you.`
        : 'Each 30-question attempt draws a fresh mix: new questions first, then the ones you found hard. Earlier lessons can top it up when needed.',
      lessonId,
      topicId: found.topic.id,
      request: { scope: { kind: 'lesson', lessonId }, size: LESSON_QUIZ_SIZE },
      backHref: routes.topic(found.topic.id),
      crumbs: [
        { label: found.topic.title, href: routes.topic(found.topic.id) },
        { label: `Lesson ${found.index + 1}`, href: routes.lesson(lessonId) },
        { label: isCheck ? 'Mastery check' : 'Quiz' },
      ],
    };
  }

  if (topicId) {
    const topic = getTopic(topicId);
    if (!topic) return null;
    return {
      kind: 'topic',
      attemptMode: 'topic-quiz',
      title: `${topic.title} — cumulative quiz`,
      subtitle: 'Questions from every lesson you have completed in this topic, weighted towards what needs review.',
      topicId,
      request: { scope: { kind: 'topic', topicId }, filters: { learnedOnly: true }, size: TOPIC_QUIZ_SIZE },
      backHref: routes.topic(topicId),
      crumbs: [{ label: topic.title, href: routes.topic(topicId) }, { label: 'Topic quiz' }],
    };
  }

  return null;
}

function QuizScreen({
  lessonId,
  topicId,
  practiceIds,
  masteryCheck,
  customLessonIds,
  customSize,
  customSettings,
  initialFeedback,
  perQuestionSeconds,
}: {
  lessonId?: string;
  topicId?: string;
  practiceIds?: string[];
  masteryCheck: boolean;
  customLessonIds?: string[];
  customSize?: number;
  customSettings?: CustomQuizSettings;
  initialFeedback?: FeedbackMode;
  perQuestionSeconds?: number;
}) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const progress = useProgress();
  const plan = buildPlan({ lessonId, topicId, practiceIds, masteryCheck, customLessonIds, customSize, customSettings, completed: progress.completedLessons });
  const [mode, setMode] = useState<FeedbackMode>(initialFeedback ?? 'instant');
  const [items, setItems] = useState<SessionItem[] | null>(null);
  const [seed, setSeed] = useState('');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!plan) {
    return (
      <ErrorScreen
        title="Quiz not found"
        message={
          lessonId || topicId || practiceIds
            ? 'This quiz could not be found. The lesson, topic or questions may have been renamed.'
            : 'This link does not say which quiz to open.'
        }
        primary={{ label: 'Go to Study', onPress: () => router.replace(routes.learn()) }}
      />
    );
  }

  const bankSize = plan.lessonId && plan.kind !== 'practice' ? getLessonQuizBank(plan.lessonId).length : null;
  const lessonDone = plan.lessonId ? progress.completedLessons.includes(plan.lessonId) : true;

  async function start() {
    if (!plan || starting) return;
    setStarting(true);
    setError(null);
    try {
      await Promise.all([ensureQuestionHistoryLoaded(), ensureQuizHistoryLoaded()]);
      const now = nowMs();
      const nextSeed = `${plan.kind}:${plan.lessonId ?? plan.topicId ?? 'practice'}:${now}`;
      const previous = getQuizHistory().find(
        (attempt) =>
          attempt.kind === plan.kind &&
          attempt.lessonId === (plan.lessonId ?? '') &&
          (!plan.topicId || attempt.topicId === plan.topicId)
      );
      const selected = selectQuestions(
        { ...plan.request, seed: nextSeed, now, recentIds: previous?.questionIds },
        currentMemoryModel(now)
      );
      if (selected.length === 0) {
        setError(
          plan.kind === 'topic'
            ? 'Complete at least one lesson in this topic first — the cumulative quiz only asks about lessons you have studied.'
            : 'There are no questions available for this quiz yet.'
        );
        setStarting(false);
        return;
      }
      setSeed(nextSeed);
      setItems(selected);
      logSessionStart('quiz', {
        topicId: plan.topicId,
        lessonId: plan.lessonId,
        refId: nextSeed,
        data: { kind: plan.kind, size: selected.length, mode },
      });
    } catch (problem) {
      console.warn('Could not start quiz:', problem);
      setError('The quiz could not be prepared. Please try again.');
    }
    setStarting(false);
  }

  async function submit(result: SessionResult) {
    if (!plan || !items) return;
    const outcome = await submitQuiz({
      kind: plan.kind,
      mode: plan.attemptMode,
      sessionId: `quiz:${seed}`,
      lessonId: plan.lessonId,
      topicId: plan.topicId,
      questions: items.map((item) => item.question),
      answers: result.answers,
      recordedIds: result.recordedIds,
      timeSeconds: result.timeSeconds,
      feedbackMode: mode,
      practice: plan.kind === 'practice',
      customQuiz: plan.customQuiz,
    });
    const extra = outcome.milestones.reduce((sum, item) => sum + item.xp, 0);
    if (outcome.xpApplied !== 0 || extra !== 0) {
      setPendingXpReward({
        amount: outcome.xpApplied + extra,
        message: outcome.xpApplied < 0 ? 'Quiz completed — XP lost for wrong answers' : 'Quiz completed!',
        lines: [...outcome.xp.lines, ...outcome.milestones.map((item) => ({ label: item.label, amount: item.xp }))],
      });
    }
    router.replace(routes.results(outcome.attempt.id));
  }

  if (items) {
    return (
      <QuestionSession
        items={items}
        mode={mode}
        onModeChange={setMode}
        perQuestionSeconds={perQuestionSeconds}
        attemptMode={plan.attemptMode}
        sessionId={`quiz:${seed}`}
        seed={seed}
        onSubmit={submit}
        submitLabel="Finish quiz"
        reviewNote={plan.kind === 'practice' ? null : 'This concept comes back for review tomorrow.'}
        header={
          <View style={styles.sessionHeader}>
            <Breadcrumbs items={[{ label: 'Study', href: routes.learn() }, ...plan.crumbs]} />
            <Text style={styles.sessionTitle} numberOfLines={2}>
              {plan.title}
            </Text>
          </View>
        }
      />
    );
  }

  return (
    <Screen width="learning">
      <BackLink fallback={'/learn' as never} />
      <Breadcrumbs items={[{ label: 'Study', href: routes.learn() }, ...plan.crumbs]} style={styles.crumbs} />
      <Text style={styles.kicker}>
        {plan.kind === 'mastery-check'
          ? 'MASTERY CHECK'
          : plan.kind === 'topic'
            ? 'CUMULATIVE TOPIC QUIZ'
            : plan.kind === 'practice'
              ? 'PRACTICE'
              : 'LESSON QUIZ'}
      </Text>
      <Text style={styles.title} accessibilityRole="header">
        {plan.title}
      </Text>
      <Text style={styles.subtitle}>{plan.subtitle}</Text>

      {plan.lessonId && !lessonDone && plan.kind === 'lesson' ? (
        <InlineNotice
          tone="info"
          title="YOU HAVE NOT COMPLETED THIS LESSON YET"
          message={`Learn it first, or take this quiz as a mastery check: score ${XP_RULES.masteryCheckPercent}%+ and the lesson is completed for you.`}
        />
      ) : null}

      <View style={styles.meta}>
        {bankSize !== null ? (
          <Pill label={`Up to ${LESSON_QUIZ_SIZE} questions · ${bankSize} in this lesson's bank`} />
        ) : null}
        {plan.kind === 'practice' ? (
          <Pill label="No XP penalties" tone="success" />
        ) : (
          <Pill label={`−${XP_RULES.lessonQuiz.wrongPenalty} XP per wrong answer`} tone="warning" />
        )}
      </View>

      <Card style={styles.modeCard}>
        <Text style={styles.modeTitle}>How do you want feedback?</Text>
        <View style={styles.modeRow} accessibilityRole="radiogroup">
          {(['instant', 'submit'] as FeedbackMode[]).map((option) => (
            <Interactive
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ checked: mode === option }}
              onPress={() => setMode(option)}
              style={({ hovered }) => [styles.modeOption, mode === option && styles.modeSelected, hovered && styles.modeHover]}
            >
              <View style={styles.modeIcon}>
                <Icon name={option === 'instant' ? 'challenge' : 'lesson'} size={18} color={colors.primaryText} />
              </View>
              <Text style={styles.modeLabel}>{option === 'instant' ? 'Instant feedback' : 'Submit at the end'}</Text>
              <Text style={styles.modeText}>
                {option === 'instant'
                  ? 'See right/wrong and the explanation after each answer.'
                  : 'Answer everything first, like an exam. Explanations on the results page.'}
              </Text>
            </Interactive>
          ))}
        </View>
      </Card>

      {error ? <InlineNotice tone="warning" message={error} /> : null}

      <View style={styles.startRow}>
        {plan.lessonId && !lessonDone && plan.kind === 'lesson' ? (
          <>
            <Button label="Go to the lesson" variant="secondary" onPress={() => router.push(routes.lesson(plan.lessonId))} />
            <Button
              label="Take it as a mastery check"
              onPress={() => router.replace(routes.lessonQuiz(plan.lessonId, { masteryCheck: true }))}
            />
          </>
        ) : (
          <>
            <Button label="Back" variant="ghost" onPress={() => router.push(plan.backHref)} />
            <Button label="Start quiz" trailing="→" size="lg" onPress={() => void start()} loading={starting} />
          </>
        )}
      </View>
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    crumbs: { marginBottom: 14 },
    kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: colors.textTertiary },
    title: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 4 },
    subtitle: { fontSize: 15, lineHeight: 22, color: colors.textSecondary, marginTop: 6, marginBottom: 14 },
    meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 12 },
    modeCard: { gap: 12, marginBottom: 14 },
    modeTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
    modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    modeOption: {
      flexGrow: 1,
      flexBasis: 230,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 14,
      gap: 4,
    },
    modeSelected: { borderColor: colors.primary, backgroundColor: colors.primarySubtle },
    modeHover: { borderColor: colors.primaryBorder },
    modeIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.primarySubtle, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    modeLabel: { fontSize: 15, fontWeight: '800', color: colors.text },
    modeText: { fontSize: 13, lineHeight: 18, color: colors.textSecondary },
    startRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
    sessionHeader: { gap: 6, marginBottom: 14 },
    sessionTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  });
}
