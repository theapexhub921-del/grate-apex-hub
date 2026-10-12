import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BackLink } from '@/components/learning/nav-bits';
import { Arena, Countdown, Rule } from '@/components/learning/apex-arena';
import { ApexWordmark } from '@/components/motion/apex-wordmark';
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
import { bankQuestions, buildPractice, legacyCourse, loadLegacyBank, loadLegacyLessonList, toQuestion } from '@/data/legacy-study';
import { shuffleSeeded } from '@/data/legacy-questions';
import { modeSettings, modeTitle, parsePracticeMode } from '@/data/practice-modes';
import { loadPrePost, percentOf, savePrePost } from '@/data/prepost';
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
  const paramKey = JSON.stringify(params);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const practice = useMemo(() => parsePracticeMode((key) => param(params[key])), [paramKey]);
  const settings = modeSettings(practice);
  const apex = practice.kind === 'apex';
  const lessonId = practice.kind === 'lesson' ? practice.lessonId : undefined;
  const setId = practice.kind === 'set' ? practice.setId : undefined;
  const review = practice.kind === 'review' ? practice.which : null;
  const history = useQuestionHistory();
  const [reviewIds] = useState(() => (review && course ? new Set(legacyReviewFor(course.id, legacyQuestionMemory(history), Date.now())[review]) : null));
  const attempt = param(params.attempt) ?? 'first';
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<FeedbackMode>(settings.feedback);
  const [result, setResult] = useState<{ correct: number; total: number; xp: number; pre?: number | null } | null>(null);
  // Apex Challenge: the arena intro, then 3 · 2 · 1 · GO, then the run (as on the Apex Challenge screen).
  const [apexPhase, setApexPhase] = useState<'intro' | 'countdown' | 'run'>(apex ? 'intro' : 'run');
  const [count, setCount] = useState<number>(APEX.countdownSeconds);
  useEffect(() => {
    if (apexPhase !== 'countdown') return;
    const timer = setTimeout(() => {
      if (count <= 1) setApexPhase('run');
      else setCount(count - 1);
    }, 800);
    return () => clearTimeout(timer);
  }, [apexPhase, count]);
  // Mock exams are the same paper every time; everything else is new each attempt.
  const seed = useMemo(() => `${course?.id}:${settings.key}:${settings.fixed ? 'fixed' : attempt}`, [course?.id, settings.key, settings.fixed, attempt]);

  useEffect(() => {
    if (!course) return;
    let live = true;
    const fail = (message: string) => { if (live) setError(message); };
    (async () => {
      // The pre-test's questions are left out of the post-test.
      const before = practice.kind === 'prepost' && practice.phase === 'post' ? new Set((await loadPrePost(course.id)).pre?.ids ?? []) : null;
      const take = (size: number) => (settings.count === Infinity ? size : Math.min(settings.count, size));
      if (course.subject) {
        // HB2: this app's questions (their ids feed spaced review).
        const sets = hb2Sets(course.id);
        const all = sets.flatMap((item) => item.questions);
        const set = setId ? sets.find((item) => item.id === setId) : undefined;
        let source: Question[] = all;
        if (lessonId) source = getLessonQuizBank(lessonId);
        else if (set) source = set.questions;
        else if (practice.kind === 'custom') {
          const chosen = [...practice.custom.lessons.flatMap((id) => getLessonQuizBank(id)), ...sets.filter((item) => practice.custom.sets.includes(item.id)).flatMap((item) => item.questions)];
          source = chosen.length ? [...new Map(chosen.map((question) => [question.id, question])).values()] : all;
        }
        if (before) source = source.filter((question) => !before.has(question.id));
        if (!live) return;
        if (source.length === 0) return fail('There are no questions here yet.');
        setTitle(modeTitle(practice, course.name, { lesson: lessonId ? hb2LessonById(lessonId)?.lesson.title : undefined, set: set?.name }));
        setQuestions(settings.variants ? buildLocalPractice(source, take(source.length), seed) : shuffleSeeded(source, seed).slice(0, take(source.length)));
        return;
      }
      const [bank, lessons] = await Promise.all([loadLegacyBank(course.id), lessonId || practice.kind === 'custom' ? loadLegacyLessonList() : Promise.resolve([])]);
      if (!live) return;
      const all = bankQuestions(bank);
      let source = all;
      const set = setId ? bank.sets.find((item) => item.id === setId) : undefined;
      const lesson = lessonId ? lessons.find((item) => item.id === lessonId) : undefined;
      if (lessonId) {
        const ids = new Set(lesson?.qids ?? []);
        source = all.filter((q) => ids.has(q.id));
      } else if (setId) {
        source = all.filter((q) => q.set === setId);
      } else if (reviewIds) {
        // Spaced review of the original questions (data/legacy-review.ts).
        source = all.filter((q) => reviewIds.has(q.id));
      } else if (practice.kind === 'custom') {
        const lessonQids = new Set(lessons.filter((item) => practice.custom.lessons.includes(item.id)).flatMap((item) => item.qids ?? []));
        const setIds = new Set(practice.custom.sets);
        const chosen = all.filter((q) => lessonQids.has(q.id) || setIds.has(q.set));
        if (chosen.length) source = chosen;
      }
      if (before) source = source.filter((q) => !before.has(`legacy:${course.id}:${q.id}`));
      if (source.length === 0) return fail(reviewIds ? 'Nothing to review here right now — well done.' : 'There are no questions here yet.');
      setTitle(modeTitle(practice, course.name, { lesson: lesson?.title, set: set?.name }));
      const size = take(source.length);
      setQuestions(
        settings.variants
          ? buildPractice(source, { course: course.id, lessonId }, size, seed)
          : shuffleSeeded(source, seed).slice(0, size).map((q) => toQuestion(q, { course: course.id, lessonId, concept: q.t || q.setName || 'General' }))
      );
    })().catch((problem) => fail(problem instanceof Error ? problem.message : 'The questions could not be loaded.'));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course, seed, paramKey, reviewIds]);

  const items = useMemo(() => (questions ?? []).map((question) => ({ question })), [questions]);

  if (!course) return <ErrorScreen title="Course not found" message="Open practice from a course in Study." primary={{ label: 'Back to Study', onPress: () => router.replace(routes.learn()) }} />;
  if (error) return <ErrorScreen title="Practice unavailable" message={error} primary={{ label: 'Back to the course', onPress: () => router.replace(routes.legacyCourse(course.id)) }} />;
  if (!questions) return <LoadingState label="Preparing your questions…" />;

  if (apex && apexPhase === 'intro' && !result) {
    return (
      <Arena>
        <Text style={styles.apexKicker}>APEX CHALLENGE · {course.name.toUpperCase()}</Text>
        <ApexWordmark size={76} />
        <Text style={styles.apexLead}>The whole course. {APEX.secondsPerQuestion} seconds a question. No second chances.</Text>
        <View style={styles.apexRules}>
          <Rule text={`${questions.length} questions drawn from across ${course.name}`} />
          <Rule text={`${APEX.secondsPerQuestion} seconds per question — time out and it counts as missed`} />
          <Rule text="Multiple choice, typing, true or false and matching, mixed" />
          <Rule text="A mastery and endurance event, separate from lesson practice" />
        </View>
        <View style={styles.apexActions}>
          <Button label="Enter the arena" variant="apex" size="lg" trailing="⚡" onPress={() => { setCount(APEX.countdownSeconds); setApexPhase('countdown'); }} />
          <Button label="Not now" variant="ghost" onPress={() => router.back()} />
        </View>
      </Arena>
    );
  }
  if (apex && apexPhase === 'countdown' && !result) {
    return (
      <Arena intensity="high">
        <Countdown count={count} total={APEX.countdownSeconds} />
      </Arena>
    );
  }

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
      sourceId: `hb:${course!.id}:${settings.key}:${dayKey(Date.now())}`,
      amount,
      label: title,
    });
    if (xp > 0) setPendingXpReward({ amount: xp, message: `${title} · ${correct}/${total}` });
    let pre: number | null | undefined;
    if (practice.kind === 'prepost') {
      const saved = await loadPrePost(course!.id);
      pre = practice.phase === 'post' ? percentOf(saved.pre) : undefined;
      await savePrePost(course!.id, practice.phase, { correct, total, ids: questions!.map((question) => question.id), at: Date.now() });
    }
    setResult({ correct, total, xp, pre });
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
          {practice.kind === 'prepost' && practice.phase === 'pre' ? <Text style={styles.resultText}>Now study the course, then take the post-test to see how much you’ve improved.</Text> : null}
          {practice.kind === 'prepost' && practice.phase === 'post' && result.pre != null ? <Text style={styles.resultText}>Pre-test {result.pre}% → post-test {percent}% ({percent - result.pre >= 0 ? '+' : ''}{percent - result.pre} points)</Text> : null}
          <View style={styles.resultActions}>
            {practice.kind !== 'prepost' ? <Button label="Try again" onPress={() => router.replace(`/learn/hb-practice?${new URLSearchParams({ ...Object.fromEntries(Object.entries(params).map(([key, value]) => [key, String(param(value) ?? '')])), attempt: String(Date.now()) })}` as never)} /> : null}
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
        onModeChange={settings.seconds || settings.feedback === 'submit' ? undefined : setMode}
        perQuestionSeconds={settings.seconds}
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
            <Text style={styles.sub}>{[`${questions.length} questions`, settings.seconds ? `${settings.seconds} seconds a question` : null, settings.feedback === 'submit' ? 'answers at the end, like the real paper' : null, settings.variants ? 'multiple choice, typing, true/false and matching' : null].filter(Boolean).join(' · ')}</Text>
          </View>
        }
      />
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    header: { gap: 4, marginBottom: 10 },
    apexKicker: { ...Type.overline, letterSpacing: 1.6, color: '#FDC00A', textAlign: 'center' },
    apexLead: { fontSize: 18, fontWeight: '700', textAlign: 'center', lineHeight: 26, color: colors.apexText },
    apexRules: { gap: 12, padding: 18, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(253,192,10,0.28)', backgroundColor: 'rgba(10,20,60,0.55)' },
    apexActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 8 },
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
