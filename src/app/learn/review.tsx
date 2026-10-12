import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';

import { MemoryDistribution } from '@/components/learning/memory-ui';
import { Breadcrumbs, StatTile } from '@/components/learning/nav-bits';
import { type FeedbackMode, QuestionSession, type SessionItem, type SessionResult } from '@/components/learning/question-session';
import { Button } from '@/components/ui/button';
import { Card, Interactive } from '@/components/ui/interactive';
import { Screen } from '@/components/ui/screen';
import { EmptyState, InlineNotice } from '@/components/ui/state-views';
import { setPendingXpReward } from '@/components/xp-toast';
import type { ThemeColors } from '@/constants/theme';
import { conceptKey, findLesson, getCourseInfo, getTopic, isTrackableConcept } from '@/data/curriculum';
import { logSessionStart, submitQuiz } from '@/data/learning/actions';
import { type ConceptMemory, countStates } from '@/data/learning/memory';
import { selectQuestions, type SelectionFilters, type SelectionStrategy } from '@/data/learning/selection';
import { currentMemoryModel } from '@/data/learning/state';
import { describeAgo, describeDue, nowMs } from '@/data/learning/time';
import { useLearning } from '@/data/learning/use-learning';
import { ensureQuestionHistoryLoaded } from '@/data/question-history';
import { useThemedStyles } from '@/hooks/use-theme';
import { param, routes } from '@/lib/routes';

type Focus = 'mixed' | 'due' | 'weak';
const SIZES = [10, 20, 30] as const;

// /learn/review[?topic=…|course=…|lesson=…][&focus=mixed|due|weak]
//
// A dedicated review session — not a quiz retake. The engine mixes what
// most needs retrieval: due concepts (most overdue first), recent misses
// and struggling concepts, material approaching its review date, and a
// little reinforcement of known material. The learner chooses the size
// and focus, never the individual questions, so difficult concepts cannot
// be avoided forever.
export default function ReviewRoute() {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const topicId = param(params.topic);
  const courseId = param(params.course);
  const lessonId = param(params.lesson);
  const focusParam = param(params.focus);
  const sizeParam = Number(param(params.size));
  const token = param(params.t) ?? '';
  return (
    <ReviewScreen
      key={`${topicId}:${courseId}:${lessonId}:${focusParam}:${token}`}
      topicId={topicId}
      courseId={courseId}
      lessonId={lessonId}
      initialFocus={focusParam === 'due' || focusParam === 'weak' ? focusParam : 'mixed'}
      initialSize={SIZES.includes(sizeParam as (typeof SIZES)[number]) ? sizeParam : lessonId ? 10 : 20}
    />
  );
}

function ReviewScreen({
  topicId,
  courseId,
  lessonId,
  initialFocus,
  initialSize,
}: {
  topicId?: string;
  courseId?: string;
  lessonId?: string;
  initialFocus: Focus;
  initialSize: number;
}) {
  const styles = useThemedStyles(createStyles);
  const { memory, now } = useLearning();
  const [focus, setFocus] = useState<Focus>(initialFocus);
  const [size, setSize] = useState<number>(initialSize);
  const [mode, setMode] = useState<FeedbackMode>('instant');
  const [items, setItems] = useState<SessionItem[] | null>(null);
  const [seed, setSeed] = useState('');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lessonEntry = findLesson(lessonId);
  const topic = getTopic(topicId) ?? lessonEntry?.topic;
  const course = getCourseInfo(courseId);
  const lessonKeys = useMemo(
    () =>
      lessonEntry
        ? lessonEntry.lesson.concepts.filter(isTrackableConcept).map((concept) => conceptKey(lessonEntry.topic.id, concept.id))
        : undefined,
    [lessonEntry]
  );
  const scopeLabel = lessonEntry
    ? `${lessonEntry.lesson.title}`
    : topic
      ? topic.title
      : course
        ? `${course.title} course`
        : 'Everything you have learned';

  const concepts: ConceptMemory[] = useMemo(
    () =>
      Array.from(memory.concepts.values()).filter((concept) => {
        if (lessonKeys) return lessonKeys.includes(concept.key);
        if (topic) return concept.topicId === topic.id;
        if (course) return getTopic(concept.topicId)?.courseId === course.id;
        return true;
      }),
    [memory, lessonKeys, topic, course]
  );
  const counts = countStates(concepts);
  const weak = concepts.filter((concept) => concept.state === 'struggling' || concept.lastResult === 'incorrect');
  const overdue = concepts.filter((concept) => concept.dueAt !== null && concept.dueAt < now - 24 * 3600 * 1000);
  const upcoming = concepts
    .filter((concept) => concept.dueAt !== null && concept.dueAt > now)
    .sort((a, b) => (a.dueAt ?? 0) - (b.dueAt ?? 0));
  const lastReviewed = concepts.reduce<number | null>(
    (latest, concept) => (concept.lastReviewedAt && (!latest || concept.lastReviewedAt > latest) ? concept.lastReviewedAt : latest),
    null
  );

  async function start() {
    setStarting(true);
    setError(null);
    try {
      await ensureQuestionHistoryLoaded();
      const time = nowMs();
      const nextSeed = `review:${topic?.id ?? course?.id ?? 'all'}:${focus}:${time}`;
      const filters: SelectionFilters = { learnedOnly: true, ...(lessonKeys ? { conceptKeys: lessonKeys } : {}) };
      if (focus === 'due') filters.due = true;
      if (focus === 'weak') filters.weak = true;
      const strategy: SelectionStrategy = focus === 'mixed' ? 'weighted' : 'targeted';
      const selected = selectQuestions(
        {
          scope: { kind: 'review', topicId: topic?.id, courseId: course?.id },
          filters,
          strategy,
          size,
          seed: nextSeed,
          now: time,
        },
        currentMemoryModel(time)
      );
      if (selected.length === 0) {
        setError(
          focus === 'due'
            ? 'Nothing is due in this scope right now. Try a mixed session instead.'
            : focus === 'weak'
              ? 'No weak concepts in this scope right now — nice. Try a mixed session.'
              : 'There is nothing to review here yet. Complete a lesson first.'
        );
        setStarting(false);
        return;
      }
      setSeed(nextSeed);
      setItems(selected);
      logSessionStart('review', {
        topicId: topic?.id,
        lessonId: lessonEntry?.lesson.id,
        refId: nextSeed,
        data: { focus, size: selected.length, scope: scopeLabel },
      });
    } catch (problem) {
      console.warn('Could not build review session:', problem);
      setError('The review session could not be prepared. Please try again.');
    }
    setStarting(false);
  }

  async function submit(result: SessionResult) {
    if (!items) return;
    const outcome = await submitQuiz({
      kind: 'review',
      mode: 'review',
      sessionId: `review:${seed}`,
      topicId: topic?.id,
      courseId: course?.id,
      lessonId: lessonEntry?.lesson.id,
      questions: items.map((item) => item.question),
      answers: result.answers,
      recordedIds: result.recordedIds,
      timeSeconds: result.timeSeconds,
      feedbackMode: mode,
    });
    const extra = outcome.milestones.reduce((sum, item) => sum + item.xp, 0);
    if (outcome.xpApplied + extra !== 0) {
      setPendingXpReward({
        amount: outcome.xpApplied + extra,
        message: 'Review complete!',
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
        attemptMode="review"
        sessionId={`review:${seed}`}
        seed={seed}
        onSubmit={submit}
        submitLabel="Finish review"
        showReasons
        reviewNote="Missed in review — it returns tomorrow and its interval restarts."
        header={
          <View style={styles.sessionHeader}>
            <Breadcrumbs items={[{ label: 'Study', href: routes.learn() }, { label: 'Review' }]} />
            <Text style={styles.sessionTitle}>Review · {scopeLabel}</Text>
          </View>
        }
      />
    );
  }

  const nothingYet = counts.tracked === 0;

  return (
    <Screen width="learning">
      <Breadcrumbs
        items={[
          { label: 'Study', href: routes.learn() },
          ...(topic ? [{ label: topic.title, href: routes.topic(topic.id) }] : []),
          { label: 'Review' },
        ]}
        style={styles.crumbs}
      />
      <Text style={styles.kicker}>SPACED REVIEW</Text>
      <Text style={styles.title} accessibilityRole="header">
        {scopeLabel}
      </Text>
      <Text style={styles.subtitle}>
        Retrieval at the right time is what turns a lesson into long-term memory. Review picks what you are most likely to be forgetting.
      </Text>

      {nothingYet ? (
        <EmptyState
          icon="reinforce"
          title="Nothing to review yet"
          message="Complete a lesson and its concepts will be scheduled here — first tomorrow, then at growing intervals."
          action={{ label: 'Go to Study', onPress: () => router.push(routes.learn()) }}
        />
      ) : (
        <>
          <View style={styles.stats}>
            <StatTile value={counts.due} label="due now" accent={counts.due > 0 ? styles.dueColor.color : undefined} />
            <StatTile value={overdue.length} label="overdue" />
            <StatTile value={weak.length} label="need attention" accent={weak.length > 0 ? styles.weakColor.color : undefined} />
          </View>
          <Card style={styles.card}>
            <MemoryDistribution counts={counts} />
            <Text style={styles.meta}>
              {lastReviewed ? `Last practised ${describeAgo(lastReviewed, now)}. ` : ''}
              {upcoming[0]?.dueAt ? `Next due ${describeDue(upcoming[0].dueAt, now)}.` : ''}
            </Text>
            {weak.length > 0 ? (
              <Text style={styles.meta}>
                You struggled with: {weak.slice(0, 3).map((concept) => concept.name).join(', ')}
                {weak.length > 3 ? ` and ${weak.length - 3} more` : ''}.
              </Text>
            ) : null}
          </Card>

          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Focus</Text>
            <View style={styles.choiceRow} accessibilityRole="radiogroup">
              {(
                [
                  ['mixed', 'Smart mix', 'Due, weak and fading material, plus a little reinforcement.'],
                  ['due', `Due only (${counts.due})`, 'Only concepts whose review date has passed.'],
                  ['weak', `Weak only (${weak.length})`, 'Only concepts you have been missing.'],
                ] as [Focus, string, string][]
              ).map(([value, label, hint]) => (
                <Interactive
                  key={value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: focus === value }}
                  onPress={() => setFocus(value)}
                  style={({ hovered }) => [styles.choice, focus === value && styles.choiceSelected, hovered && styles.choiceHover]}
                >
                  <Text style={styles.choiceLabel}>{label}</Text>
                  <Text style={styles.choiceHint}>{hint}</Text>
                </Interactive>
              ))}
            </View>
            <Text style={styles.cardTitle}>Length</Text>
            <View style={styles.sizeRow} accessibilityRole="radiogroup">
              {SIZES.map((value) => (
                <Interactive
                  key={value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: size === value }}
                  onPress={() => setSize(value)}
                  style={({ hovered }) => [styles.size, size === value && styles.choiceSelected, hovered && styles.choiceHover]}
                >
                  <Text style={styles.choiceLabel}>{value}</Text>
                  <Text style={styles.choiceHint}>questions</Text>
                </Interactive>
              ))}
            </View>
          </Card>

          {error ? <InlineNotice tone="warning" message={error} /> : null}

          <View style={styles.startRow}>
            <Button label="Back" variant="ghost" onPress={() => router.back()} />
            <Button label="Start review" trailing="→" size="lg" onPress={() => void start()} loading={starting} />
          </View>
        </>
      )}
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    crumbs: { marginBottom: 14 },
    kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: colors.textTertiary },
    title: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 4 },
    subtitle: { fontSize: 15, lineHeight: 22, color: colors.textSecondary, marginTop: 6, marginBottom: 18 },
    stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
    dueColor: { color: colors.warningText },
    weakColor: { color: colors.error },
    card: { gap: 10, marginBottom: 12 },
    meta: { fontSize: 13, lineHeight: 19, color: colors.textSecondary },
    cardTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
    choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    choice: { flexGrow: 1, flexBasis: 180, borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, padding: 12, gap: 3 },
    choiceSelected: { borderColor: colors.primary, backgroundColor: colors.primarySubtle },
    choiceHover: { borderColor: colors.primaryBorder },
    choiceLabel: { fontSize: 14, fontWeight: '800', color: colors.text },
    choiceHint: { fontSize: 12, lineHeight: 17, color: colors.textSecondary },
    sizeRow: { flexDirection: 'row', gap: 8 },
    size: { flex: 1, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, paddingVertical: 10 },
    startRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 6 },
    sessionHeader: { gap: 6, marginBottom: 14 },
    sessionTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  });
}
