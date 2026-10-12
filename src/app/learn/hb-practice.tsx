import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BackLink } from '@/components/learning/nav-bits';
import { type FeedbackMode, QuestionSession, type SessionResult } from '@/components/learning/question-session';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/interactive';
import { Pill } from '@/components/ui/pill';
import { Screen } from '@/components/ui/screen';
import { ErrorScreen, LoadingState } from '@/components/ui/state-views';
import { Text } from '@/components/ui/text';
import { setPendingXpReward } from '@/components/xp-toast';
import { Type, type ThemeColors } from '@/constants/theme';
import { APEX } from '@/data/learning/apex';
import { dayKey } from '@/data/learning/time';
import { XP_RULES } from '@/data/learning/xp-rules';
import { bankQuestions, buildPractice, legacyCourse, loadLegacyBank, loadLegacyLessonList } from '@/data/legacy-study';
import { buildLocalPractice, hb2LessonById, hb2Sets } from '@/data/hb2-study';
import { legacyQuestionMemory, legacyReviewFor } from '@/data/legacy-review';
import { useQuestionHistory } from '@/data/question-history';
import { getLessonQuizBank } from '@/data/curriculum';
import { awardXp } from '@/data/progress';
import { isAnswerCorrect, type Question } from '@/data/questions';
import { useThemedStyles } from '@/hooks/use-theme';
import { param, routes } from '@/lib/routes';

// /learn/hb-practice?course=…[&lesson=…|&set=…][&apex=1] — practice from an
// original course's question bank: a lesson's own questions, one of the
// original quiz sets, or the whole course. Questions come as multiple choice,
// type-the-answer, true/false and matching. Apex Challenge: 10 seconds a
// question, as in this app's Apex Challenge.
export default function LegacyPracticeScreen() {
  const styles = useThemedStyles(createStyles);
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const course = legacyCourse(param(params.course));
  const lessonId = param(params.lesson);
  const setId = param(params.set);
  const apex = param(params.apex) === '1';
  const review = param(params.review) === 'due' ? 'due' : param(params.review) === 'missed' ? 'missed' : null;
  const history = useQuestionHistory();
  const [reviewIds] = useState(() => (review && course ? new Set(legacyReviewFor(course.id, legacyQuestionMemory(history), Date.now())[review]) : null));
  const attempt = param(params.attempt) ?? 'first';
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<FeedbackMode>(apex ? 'instant' : 'instant');
  const [result, setResult] = useState<{ correct: number; total: number; xp: number } | null>(null);
  const seed = useMemo(() => `${course?.id}:${lessonId ?? setId ?? 'all'}:${apex ? 'apex' : 'practice'}:${attempt}`, [course?.id, lessonId, setId, apex, attempt]);

  useEffect(() => {
    if (!course) return;
    let live = true;
    if (course.subject) {
      // HB2: this app's questions (their ids feed spaced review), mixed the original way.
      const sets = hb2Sets(course.id);
      const set = setId ? sets.find((item) => item.id === setId) : undefined;
      const source = lessonId ? getLessonQuizBank(lessonId) : set ? set.questions : sets.flatMap((item) => item.questions);
      const lessonTitle = lessonId ? hb2LessonById(lessonId)?.lesson.title : undefined;
      const label = apex ? `${course.name} · Apex Challenge` : set ? `${course.name} · ${set.name}` : lessonTitle ? `${lessonTitle} · practice` : `${course.name} · practice`;
      const count = apex ? APEX.questionsPerRun : setId ? Math.min(30, source.length) : lessonId ? 15 : 20;
      queueMicrotask(() => {
        if (!live) return;
        if (source.length === 0) { setError('There are no questions here yet.'); return; }
        setTitle(label);
        setQuestions(buildLocalPractice(source, count, seed));
      });
      return () => { live = false; };
    }
    Promise.all([loadLegacyBank(course.id), lessonId ? loadLegacyLessonList() : Promise.resolve([])])
      .then(([bank, lessons]) => {
        if (!live) return;
        const all = bankQuestions(bank);
        let source = all;
        let label = `${course.name} · practice`;
        if (lessonId) {
          const lesson = lessons.find((item) => item.id === lessonId);
          const ids = new Set(lesson?.qids ?? []);
          source = all.filter((q) => ids.has(q.id));
          label = lesson ? `${lesson.title} · practice` : label;
        } else if (setId) {
          const set = bank.sets.find((item) => item.id === setId);
          source = all.filter((q) => q.set === setId);
          label = set ? `${course.name} · ${set.name}` : label;
        } else if (reviewIds) {
          // Spaced review of the original questions (data/legacy-review.ts).
          source = all.filter((q) => reviewIds.has(q.id));
          label = `${course.name} · ${review === 'due' ? 'Due for review' : 'Fix your mistakes'}`;
        }
        if (apex) label = `${course.name} · Apex Challenge`;
        const count = apex ? APEX.questionsPerRun : setId ? Math.min(30, source.length) : reviewIds ? Math.min(20, source.length) : lessonId ? 15 : 20;
        if (source.length === 0) throw new Error(reviewIds ? 'Nothing to review here right now — well done.' : 'There are no questions here yet.');
        setTitle(label);
        setQuestions(buildPractice(source, { course: course.id, lessonId }, count, seed));
      })
      .catch((problem) => { if (live) setError(problem instanceof Error ? problem.message : 'The questions could not be loaded.'); });
    return () => { live = false; };
  }, [course, lessonId, setId, apex, seed, reviewIds, review]);

  const items = useMemo(() => (questions ?? []).map((question) => ({ question })), [questions]);

  if (!course) return <ErrorScreen title="Course not found" message="Open practice from a course in Study." primary={{ label: 'Back to Study', onPress: () => router.replace(routes.learn()) }} />;
  if (error) return <ErrorScreen title="Practice unavailable" message={error} primary={{ label: 'Back to the course', onPress: () => router.replace(routes.legacyCourse(course.id)) }} />;
  if (!questions) return <LoadingState label="Preparing your questions…" />;

  async function submit(session: SessionResult) {
    const correct = questions!.filter((question) => isAnswerCorrect(question, session.answers[question.id])).length;
    const total = questions!.length;
    const percent = total ? (correct / total) * 100 : 0;
    // XP once a day per practice source, scaled like this app's quizzes.
    const base = apex ? XP_RULES.apex.completion : XP_RULES.lessonQuiz.completion;
    const bonus = apex
      ? percent >= 90 ? XP_RULES.apex.bonusAt90 : percent >= 75 ? XP_RULES.apex.bonusAt75 : percent >= 50 ? XP_RULES.apex.bonusAt50 : 0
      : percent >= 90 ? XP_RULES.lessonQuiz.bonusAt90 : percent >= 75 ? XP_RULES.lessonQuiz.bonusAt75 : 0;
    const amount = Math.min(XP_RULES.taskMax, base + bonus);
    const xp = await awardXp({
      sourceType: apex ? 'apex' : 'practice',
      sourceId: `hb:${course!.id}:${lessonId ?? setId ?? 'all'}:${dayKey(Date.now())}`,
      amount,
      label: title,
    });
    if (xp > 0) setPendingXpReward({ amount: xp, message: `${title} · ${correct}/${total}` });
    setResult({ correct, total, xp });
  }

  if (result) {
    const percent = result.total ? Math.round((result.correct / result.total) * 100) : 0;
    return (
      <Screen width="learning">
        <Card style={styles.result}>
          <Text style={styles.resultEmoji}>{percent >= 75 ? '🏆' : percent >= 50 ? '💪' : '📚'}</Text>
          <Text style={styles.resultScore}>{result.correct}/{result.total}</Text>
          <Text style={styles.resultTitle}>{title}</Text>
          <Pill label={`${percent}%`} tone={percent >= 75 ? 'success' : percent >= 50 ? 'gold' : 'neutral'} />
          <Text style={styles.resultText}>{result.xp > 0 ? `+${result.xp} XP` : 'XP for this practice was already earned today.'}</Text>
          <View style={styles.resultActions}>
            <Button label="Try again" onPress={() => router.replace(routes.legacyPractice({ course: course!.id, lesson: lessonId, set: setId, apex }))} />
            <Button label="Back to the course" variant="secondary" onPress={() => router.replace(routes.legacyCourse(course!.id))} />
          </View>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen width="learning">
      <QuestionSession
        items={items}
        mode={mode}
        onModeChange={apex ? undefined : setMode}
        perQuestionSeconds={apex ? APEX.secondsPerQuestion : undefined}
        attemptMode={apex ? 'apex' : 'practice'}
        sessionId={`hb:${seed}`}
        seed={seed}
        onSubmit={submit}
        submitLabel="Finish"
        reviewNote={null}
        header={
          <View style={styles.header}>
            <BackLink fallback={routes.legacyCourse(course.id)} />
            <Text style={styles.title} numberOfLines={2}>{title}</Text>
            <Text style={styles.sub}>{apex ? `${APEX.secondsPerQuestion} seconds a question · ${questions.length} questions` : `${questions.length} questions · multiple choice, typing, true/false and matching`}</Text>
          </View>
        }
      />
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    header: { gap: 4, marginBottom: 10 },
    title: { ...Type.title2, color: colors.text },
    sub: { fontSize: 13, color: colors.textSecondary },
    result: { alignItems: 'center', gap: 10, padding: 28, marginTop: 20 },
    resultEmoji: { fontSize: 46 },
    resultScore: { ...Type.display, color: colors.text },
    resultTitle: { ...Type.headline, color: colors.textSecondary, textAlign: 'center' },
    resultText: { fontSize: 15, color: colors.text },
    resultActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 8 },
  });
}
