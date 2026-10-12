import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';

import { MemoryStateBadge } from '@/components/learning/memory-ui';
import { QuestionFigure } from '@/components/learning/figure-view';
import { StumpComposer } from '@/components/social/stump-card';
import { Breadcrumbs, StatTile } from '@/components/learning/nav-bits';
import { Button } from '@/components/ui/button';
import { Card, Interactive } from '@/components/ui/interactive';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { Pill } from '@/components/ui/pill';
import { ProgressRing } from '@/components/ui/progress-ring';
import { Columns, Screen, SectionHeader } from '@/components/ui/screen';
import { ErrorScreen, InlineNotice, LoadingState } from '@/components/ui/state-views';
import { takePendingXpReward, type XpReward, XpToast } from '@/components/xp-toast';
import { Type, type ThemeColors } from '@/constants/theme';
import {
  conceptKey,
  conceptKeyByName,
  findLesson,
  getConceptEntry,
  getQuestionsByIds,
  getTopic,
} from '@/data/curriculum';
import type { ConceptMemory } from '@/data/learning/memory';
import { describeDue, formatDuration } from '@/data/learning/time';
import { useLearning } from '@/data/learning/use-learning';
import { formatXp, XP_RULES } from '@/data/learning/xp-rules';
import { type Answer, type ChoiceQuestion, correctAnswerText, isAnswerComplete, isAnswerCorrect, type Question } from '@/data/questions';
import { canStump } from '@/data/stumps';
import { type AttemptKind, type QuizAttempt, useQuizHistory } from '@/data/quiz-history';
import { useRotatingCompliment, useRotatingRemark } from '@/hooks/use-learning-remark';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { param, routes } from '@/lib/routes';

const MAX_TRUSTED_SECONDS = 24 * 60 * 60;

const KIND_LABEL: Record<AttemptKind, string> = {
  lesson: 'QUIZ RESULTS',
  topic: 'TOPIC QUIZ RESULTS',
  practice: 'PRACTICE RESULTS',
  review: 'REVIEW RESULTS',
  apex: 'APEX CHALLENGE',
  'mastery-check': 'MASTERY CHECK',
};

// /learn/results?attempt=<attempt id>
// Older links passed the result in the URL (score, total, …); those still
// render a summary from their parameters.
export default function ResultsRoute() {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const attemptId = param(params.attempt);
  const history = useQuizHistory();
  const [historyWaited, setHistoryWaited] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => setHistoryWaited(true), 1500);
      return () => clearTimeout(timer);
    }, [])
  );

  const legacy = useMemo(() => legacyAttempt(params), [params]);
  const attempt = attemptId ? history.find((item) => item.id === attemptId) : legacy;

  if (!attempt) {
    if (attemptId && !historyWaited) return <LoadingState label="Loading your results…" />;
    return (
      <ErrorScreen
        title="Results not found"
        message="These results are not saved on this device. Your attempts are listed on My Progress."
        primary={{ label: 'Open My Progress', onPress: () => router.replace(routes.progress()) }}
        secondary={{ label: 'Go to Study', onPress: () => router.replace(routes.learn()) }}
      />
    );
  }

  return <ResultsView key={attempt.id} attempt={attempt} />;
}

function legacyAttempt(params: Record<string, string | string[]>): QuizAttempt | undefined {
  const score = Number(param(params.score));
  const total = Number(param(params.total));
  if (!Number.isFinite(score) || !Number.isFinite(total) || total <= 0) return undefined;
  const lessonId = param(params.lesson) ?? '';
  const questionIds = (param(params.questionIds) ?? '').split(',').filter(Boolean);
  const wrongQuestionIds = (param(params.wrongQuestions) ?? '').split(',').filter(Boolean);
  const time = Number(param(params.time));
  const apex = param(params.challenge) === 'apex';
  return {
    id: `legacy:${lessonId}:${score}:${total}`,
    kind: apex ? 'apex' : 'lesson',
    attemptType: apex ? 'apex_challenge' : 'lesson',
    lessonId,
    topicId: findLesson(lessonId)?.topic.id ?? param(params.course) ?? '',
    courseId: param(params.course) ?? '',
    score,
    total,
    answered: total,
    percentage: Number(param(params.percentage)) || Math.round((score / total) * 100),
    timeSeconds: Number.isFinite(time) ? time : -1,
    wrongConcepts: (param(params.concepts) ?? '')
      .split('|')
      .map((value) => {
        try {
          return decodeURIComponent(value);
        } catch {
          return value;
        }
      })
      .filter(Boolean),
    wrongQuestionIds,
    questionIds,
    practice: false,
    completedAt: Date.now(),
  };
}

type Row = { question: Question; answer: Answer | undefined; correct: boolean; answered: boolean };

function ResultsView({ attempt }: { attempt: QuizAttempt }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const { memory, now } = useLearning();
  const [xpReward, setXpReward] = useState<XpReward | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [stumpQuestion, setStumpQuestion] = useState<ChoiceQuestion | null>(null);

  // Show the reward once, right after submitting.
  useFocusEffect(
    useCallback(() => {
      const reward = takePendingXpReward();
      if (reward) setXpReward(reward);
    }, [])
  );

  const found = findLesson(attempt.lessonId);
  const topic = found?.topic ?? getTopic(attempt.topicId) ?? getTopic(attempt.courseId);
  const title =
    attempt.kind === 'review'
      ? 'Review session'
      : attempt.kind === 'apex'
        ? 'Apex Challenge'
        : attempt.kind === 'practice'
          ? attempt.customQuiz
            ? 'Custom practice'
            : 'Practice'
          : attempt.kind === 'topic'
            ? `${topic?.title ?? 'Topic'} — cumulative quiz`
            : found?.lesson.title ?? 'Quiz';
  const topicLabel = found?.lesson.title ?? topic?.title ?? 'this topic';

  const questions = useMemo(() => getQuestionsByIds(attempt.questionIds), [attempt.questionIds]);
  const rows: Row[] = useMemo(
    () =>
      questions.map((question) => {
        const answer = attempt.answers?.[question.id];
        // Older attempts did not store answers: treat them as answered.
        const answered = attempt.answers ? isAnswerComplete(question, answer) : true;
        const correct = attempt.answers
          ? isAnswerCorrect(question, answer)
          : !attempt.wrongQuestionIds.includes(question.id);
        return { question, answer, correct, answered };
      }),
    [questions, attempt]
  );

  const missed = rows.filter((row) => !row.correct);
  const accuracy = attempt.answered > 0 ? Math.round((attempt.score / attempt.answered) * 100) : 0;
  const validTime = attempt.timeSeconds >= 0 && attempt.timeSeconds <= MAX_TRUSTED_SECONDS;

  // Concepts: weak (any wrong) vs strong (all right).
  const conceptStatus = useMemo(() => {
    const byConcept = new Map<string, { name: string; key?: string; wrong: number; right: number; lessonId?: string }>();
    const add = (name: string, key: string | undefined, lessonId: string | undefined, correct: boolean) => {
      const id = key ?? name;
      const entry = byConcept.get(id) ?? { name, key, wrong: 0, right: 0, lessonId };
      if (correct) entry.right += 1;
      else entry.wrong += 1;
      byConcept.set(id, entry);
    };
    if (rows.length > 0) {
      for (const row of rows) {
        const key = row.question.conceptId && row.question.topicId ? conceptKey(row.question.topicId, row.question.conceptId) : undefined;
        add(row.question.concept, key, row.question.lessonId, row.correct);
      }
    } else {
      for (const name of attempt.wrongConcepts) add(name, attempt.lessonId ? conceptKeyByName(attempt.lessonId, name) : undefined, attempt.lessonId, false);
    }
    const list = Array.from(byConcept.values());
    return {
      weak: list.filter((item) => item.wrong > 0),
      strong: list.filter((item) => item.wrong === 0),
    };
  }, [rows, attempt]);

  const weakMemories = conceptStatus.weak
    .map((item) => (item.key ? memory.concepts.get(item.key) : undefined))
    .filter((item): item is ConceptMemory => Boolean(item));
  const returnsTomorrow = weakMemories.filter((item) => item.dueAt !== null && item.dueAt - now < 36 * 3600 * 1000).length;

  const remark = useRotatingRemark(attempt.id, attempt.percentage, conceptStatus.weak.length);
  const pace = useRotatingCompliment(attempt.id, topicLabel, attempt.percentage, validTime ? attempt.timeSeconds : null);

  const lessonsToRevisit = Array.from(
    new Set(conceptStatus.weak.map((item) => (item.key ? getConceptEntry(item.key)?.lesson.id : item.lessonId)).filter((id): id is string => Boolean(id)))
  )
    .map((id) => findLesson(id))
    .filter((entry): entry is NonNullable<ReturnType<typeof findLesson>> => Boolean(entry));

  const message =
    attempt.percentage === 100
      ? 'Perfect score.'
      : attempt.percentage >= 90
        ? 'Excellent work.'
        : attempt.percentage >= XP_RULES.passPercent
          ? 'Passed — good work.'
          : attempt.percentage >= 50
            ? 'Getting there. Review the misses below.'
            : 'This needs more practice — the misses below are your plan.';

  function retake() {
    if (attempt.customQuiz) {
      router.replace(
        routes.customQuiz({
          lessonIds: attempt.customQuiz.lessonIds,
          size: attempt.customQuiz.size,
          feedback: attempt.customQuiz.feedback,
          secondsPerQuestion: attempt.customQuiz.secondsPerQuestion,
        })
      );
    } else if (attempt.kind === 'topic' && topic) router.replace(routes.topicQuiz(topic.id));
    else if (attempt.kind === 'review') router.replace(routes.review({ topicId: attempt.topicId || undefined, focus: 'mixed' }));
    else if (attempt.kind === 'apex') router.replace(routes.apex(topic?.courseId ?? (attempt.courseId || undefined)));
    else if (attempt.lessonId) router.replace(routes.lessonQuiz(attempt.lessonId));
  }

  const nextLesson = found ? found.topic.lessons[found.index + 1] : undefined;
  const xpNet = attempt.xp?.net ?? null;

  const main = (
    <View style={styles.column}>
      <Card style={styles.hero} tone="elevated">
        <ProgressRing
          value={attempt.percentage / 100}
          size={128}
          thickness={10}
          gradient={attempt.percentage >= 90 ? ['#FFD54A', '#E3A400'] : attempt.percentage >= XP_RULES.passPercent ? [colors.success, colors.successText] : [colors.warning, colors.warningStrong]}
          label={`Score ${attempt.percentage}%`}
          delay={150}
        >
          <AnimatedNumber value={attempt.percentage} suffix="%" delay={150} style={styles.percentage} />
          <Text style={styles.heroLabel}>SCORE</Text>
        </ProgressRing>
        <View style={styles.heroInfo}>
          <Text style={styles.heroMessage}>{message}</Text>
          <Text style={styles.heroText}>
            {attempt.score} of {attempt.total} correct
            {attempt.answered < attempt.total ? ` · ${attempt.total - attempt.answered} unanswered` : ''}
          </Text>
          {xpNet !== null ? (
            <Pill label={formatXp(xpNet)} tone={xpNet >= 0 ? 'gold' : 'error'} style={styles.heroPill} />
          ) : null}
        </View>
      </Card>

      {attempt.kind === 'mastery-check' ? (
        <InlineNotice
          tone={attempt.percentage >= XP_RULES.masteryCheckPercent ? 'success' : 'warning'}
          title={attempt.percentage >= XP_RULES.masteryCheckPercent ? 'MASTERY DEMONSTRATED' : 'NOT YET'}
          message={
            attempt.percentage >= XP_RULES.masteryCheckPercent
              ? 'You scored 80% or more, so this lesson is now marked complete and its concepts are scheduled for review.'
              : 'You need 80% to test out. Work through the lesson — the concepts you missed are listed below.'
          }
        />
      ) : null}

      <View style={styles.stats}>
        <StatTile value={`${accuracy}%`} label="accuracy" hint="of answered" />
        <StatTile value={missed.length || attempt.wrongQuestionIds.length} label="missed" />
        <StatTile value={validTime ? formatDuration(attempt.timeSeconds) : '—'} label="time" />
      </View>

      <Card style={styles.card}>
        <Text style={styles.kicker}>YOUR LEARNING REMARK</Text>
        <Text style={styles.body}>{remark || 'Analysing your performance…'}</Text>
        <View style={styles.divider} />
        <Text style={styles.kicker}>YOUR PACE</Text>
        <Text style={styles.body}>{pace}</Text>
      </Card>

      {missed.length > 0 ? (
        <>
          <SectionHeader
            title={`Questions missed (${missed.length})`}
            subtitle="Read why — this is where the learning happens."
            right={
              rows.length > missed.length ? (
                <Button label={showAll ? 'Show missed only' : 'Show all'} size="sm" variant="ghost" onPress={() => setShowAll(!showAll)} />
              ) : null
            }
            style={styles.sectionTop}
          />
          {(showAll ? rows : missed).map((row, index) => (
            <QuestionReview key={row.question.id} row={row} index={index} onStump={canStump(row.question) ? () => setStumpQuestion(row.question as ChoiceQuestion) : undefined} />
          ))}
        </>
      ) : rows.length > 0 ? (
        <InlineNotice tone="success" title="NOTHING MISSED" message="Every question was answered correctly." />
      ) : null}
    </View>
  );

  const side = (
    <View style={styles.column}>
      {attempt.xp && attempt.xp.lines.length > 0 ? (
        <Card style={styles.card}>
          <Text style={styles.kicker}>XP</Text>
          {attempt.xp.lines.map((line, index) => (
            <View key={index} style={styles.xpRow}>
              <Text style={styles.xpLabel}>{line.label}</Text>
              <Text style={[styles.xpAmount, line.amount < 0 && styles.xpNegative]}>{formatXp(line.amount)}</Text>
            </View>
          ))}
          <View style={[styles.xpRow, styles.xpTotal]}>
            <Text style={styles.xpTotalLabel}>{attempt.xp.net >= 0 ? 'Earned' : 'Lost'}</Text>
            <Text style={[styles.xpTotalAmount, attempt.xp.net < 0 && styles.xpNegative]}>{formatXp(attempt.xp.net)}</Text>
          </View>
        </Card>
      ) : null}

      <Card style={styles.card}>
        <Text style={styles.kicker}>NEEDS REVIEW</Text>
        {conceptStatus.weak.length === 0 ? (
          <Text style={styles.body}>No weak concepts this time.</Text>
        ) : (
          conceptStatus.weak.map((item) => {
            const state = item.key ? memory.concepts.get(item.key) : undefined;
            return (
              <View key={item.key ?? item.name} style={styles.conceptRow}>
                <Text style={styles.conceptName}>{item.name}</Text>
                {state ? (
                  <View style={styles.conceptState}>
                    <MemoryStateBadge state={state.state} due={state.due} />
                    {state.dueAt ? <Text style={styles.conceptMeta}>returns {describeDue(state.dueAt, now)}</Text> : null}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
        {returnsTomorrow > 0 ? (
          <Text style={styles.queueNote}>
            {returnsTomorrow} concept{returnsTomorrow === 1 ? '' : 's'} entered your review queue — they come back within a day.
          </Text>
        ) : null}
      </Card>

      {conceptStatus.strong.length > 0 ? (
        <Card style={styles.card}>
          <Text style={styles.kicker}>STRENGTHS</Text>
          <View style={styles.chips}>
            {conceptStatus.strong.map((item) => (
              <Pill key={item.key ?? item.name} label={item.name} tone="success" />
            ))}
          </View>
        </Card>
      ) : null}

      {lessonsToRevisit.length > 0 ? (
        <Card style={styles.card}>
          <Text style={styles.kicker}>RECOMMENDED REVISION</Text>
          {lessonsToRevisit.slice(0, 4).map((entry) => (
            <Interactive
              key={entry.lesson.id}
              onPress={() => router.push(routes.lesson(entry.lesson.id, { layer: 'read' }))}
              accessibilityRole="link"
              style={({ hovered }) => [styles.reviseRow, hovered && styles.reviseHover]}
            >
              <Text style={styles.reviseText}>Re-read: {entry.lesson.title}</Text>
              <Text style={styles.reviseArrow}>›</Text>
            </Interactive>
          ))}
        </Card>
      ) : null}

      <View style={styles.actions}>
        {attempt.wrongQuestionIds.length > 0 && attempt.kind !== 'apex' ? (
          <Button
            label={`Practise ${attempt.wrongQuestionIds.length} wrong answer${attempt.wrongQuestionIds.length === 1 ? '' : 's'}`}
            onPress={() => router.push(routes.practice(attempt.wrongQuestionIds, { lessonId: attempt.lessonId, topicId: topic?.id }))}
            fullWidth
          />
        ) : null}
        <Button label={attempt.kind === 'review' ? 'Another review' : 'Retake'} variant="secondary" onPress={retake} fullWidth />
        {nextLesson && attempt.percentage >= XP_RULES.passPercent ? (
          <Button label={`Next: ${nextLesson.title}`} variant="secondary" onPress={() => router.push(routes.lesson(nextLesson.id))} fullWidth />
        ) : null}
        {topic ? (
          <Button label="Back to topic" variant="ghost" onPress={() => router.push(routes.topic(topic.id))} fullWidth />
        ) : (
          <Button label="Back to Study" variant="ghost" onPress={() => router.push(routes.learn())} fullWidth />
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <Screen width="wide">
        <Breadcrumbs
          items={[
            { label: 'Study', href: routes.learn() },
            ...(topic ? [{ label: topic.title, href: routes.topic(topic.id) }] : []),
            { label: 'Results' },
          ]}
          style={styles.crumbs}
        />
        <Text style={styles.kindLabel}>{attempt.customQuiz ? 'CUSTOM PRACTICE' : KIND_LABEL[attempt.kind]}</Text>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Columns main={main} side={side} sideWidth={360} />
      </Screen>
      <XpToast reward={xpReward} onHide={() => setXpReward(null)} />
      <StumpComposer question={stumpQuestion} onClose={() => setStumpQuestion(null)} />
    </View>
  );
}

function QuestionReview({ row, index, onStump }: { row: Row; index: number; onStump?: () => void }) {
  const styles = useThemedStyles(createStyles);
  const yourAnswer =
    row.answer === undefined
      ? null
      : row.question.type === 'choice'
        ? row.question.options[row.answer as number]
        : row.question.type === 'type'
          ? (row.answer as string)
          : row.question.type === 'multi'
            ? (row.answer as number[]).map((i) => (row.question as { options: string[] }).options[i]).join('; ')
            : null;
  return (
    <Card style={[styles.reviewCard, row.correct ? styles.reviewRight : styles.reviewWrong]}>
      <Text style={styles.reviewIndex}>
        {row.correct ? '✓' : '✗'} {index + 1} · {row.question.concept}
      </Text>
      <Text style={styles.reviewPrompt}>{row.question.prompt}</Text>
      {row.question.figure ? <QuestionFigure figure={row.question.figure} revealed /> : null}
      {!row.correct ? (
        <Text style={styles.reviewLine}>
          <Text style={styles.reviewLabel}>Your answer: </Text>
          {yourAnswer ?? (row.answered ? '—' : 'Not answered')}
        </Text>
      ) : null}
      <Text style={styles.reviewLine}>
        <Text style={styles.reviewLabel}>Correct answer: </Text>
        {correctAnswerText(row.question)}
      </Text>
      {row.question.explanation ? <Text style={styles.reviewExplanation}>{row.question.explanation}</Text> : null}
      {onStump ? <Button label="Stump a friend" size="sm" variant="ghost" onPress={onStump} style={styles.stumpButton} accessibilityLabel="Share this question to the feed for friends to answer" /> : null}
    </Card>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1 },
    crumbs: { marginBottom: 12 },
    kindLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: colors.textTertiary },
    title: { ...Type.title1, color: colors.text, marginTop: 4, marginBottom: 18 },
    column: { gap: 14 },
    hero: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 22, padding: 24 },
    percentage: { ...Type.numeral, fontSize: 32, lineHeight: 36, color: colors.text },
    heroLabel: { ...Type.overline, fontSize: 10, color: colors.textTertiary },
    heroInfo: { flex: 1, minWidth: 200, gap: 4 },
    heroMessage: { ...Type.title2, color: colors.text },
    heroText: { fontSize: 14, color: colors.textSecondary },
    heroPill: { marginTop: 4 },
    stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    card: { gap: 8 },
    kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.1, color: colors.textTertiary },
    body: { fontSize: 14, lineHeight: 21, color: colors.textSecondary },
    divider: { height: 1, backgroundColor: colors.divider, marginVertical: 6 },
    sectionTop: { marginTop: 8, marginBottom: 0 },
    xpRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
    xpLabel: { flex: 1, fontSize: 13, color: colors.textSecondary },
    xpAmount: { fontSize: 13, fontWeight: '800', color: colors.accentText },
    xpNegative: { color: colors.error },
    xpTotal: { borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 8, marginTop: 4 },
    xpTotalLabel: { fontSize: 14, fontWeight: '800', color: colors.text },
    xpTotalAmount: { fontSize: 16, fontWeight: '900', color: colors.accentText },
    conceptRow: { gap: 4, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.divider },
    conceptName: { fontSize: 14, fontWeight: '700', color: colors.text },
    conceptState: { gap: 3 },
    conceptMeta: { fontSize: 12, color: colors.textTertiary },
    queueNote: { fontSize: 12, lineHeight: 18, color: colors.warningText, fontWeight: '600', marginTop: 4 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    reviseRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 6, borderRadius: 8 },
    reviseHover: { backgroundColor: colors.surfaceMuted },
    reviseText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.primaryText },
    reviseArrow: { fontSize: 20, color: colors.textTertiary },
    actions: { gap: 8 },
    reviewCard: { gap: 6, borderLeftWidth: 4 },
    stumpButton: { alignSelf: 'flex-start' },
    reviewRight: { borderLeftColor: colors.success },
    reviewWrong: { borderLeftColor: colors.error },
    reviewIndex: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, color: colors.textTertiary },
    reviewPrompt: { fontSize: 15, fontWeight: '700', lineHeight: 22, color: colors.text },
    reviewLine: { fontSize: 14, lineHeight: 20, color: colors.text },
    reviewLabel: { fontWeight: '800' },
    reviewExplanation: { fontSize: 13, lineHeight: 20, color: colors.textSecondary },
  });
}
