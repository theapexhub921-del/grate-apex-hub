import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BackLink } from '@/components/learning/nav-bits';
import { Arena, Countdown, Rule } from '@/components/learning/apex-arena';
import { ApexDone, ApexRun, type ApexStats } from '@/components/learning/apex-run';
import { ApexWordmark } from '@/components/motion/apex-wordmark';
import { type FeedbackMode, QuestionSession, type SessionProgress, type SessionResult } from '@/components/learning/question-session';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/interactive';
import { deleteQuizDraft, getQuizDraft, type QuizDraft, saveQuizDraft } from '@/data/quiz-drafts';
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
  const [result, setResult] = useState<{ correct: number; total: number; xp: number; pre?: number | null; missed: Question[] } | null>(null);
  // "Review mistakes": a second round with only the questions just got wrong.
  const [reviewing, setReviewing] = useState<{ round: number; questions: Question[] } | null>(null);
  const [apexStats, setApexStats] = useState<ApexStats | null>(null);
  const [apexXp, setApexXp] = useState<number | null>(null);
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
      // HB2 with a past-question set from the supplementary bank: skip to the legacy bank path.
      const isHb2SupplSet = course.subject && setId && !hb2Sets(course.id).find((s) => s.id === setId);
      if (course.subject && !isHb2SupplSet) {
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
        if (apex) source = source.filter((question) => question.type === 'choice');
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
      if (apex) source = source.filter((q) => q.kind !== 'input' && q.o?.length > 1 && q.a >= 0);
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

  // ── Resume: an unfinished practice is saved as you go, with the order of its questions ──
  const continueSaved = param(params.continue) === '1';
  const draftKey = course && !apex ? `hb:${course.id}:${settings.key}` : '';
  const [saved, setSaved] = useState<QuizDraft | null>(null);
  const [draftReady, setDraftReady] = useState(!draftKey);
  const finished = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<SessionProgress | null>(null);
  const queryText = Object.entries(params)
    .filter(([name]) => name !== 'continue')
    .map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(param(value) ?? '')}`)
    .join('&');

  useEffect(() => {
    if (!draftKey) return;
    let live = true;
    getQuizDraft(draftKey)
      .then((draft) => {
        if (!live) return;
        setSaved(draft);
        if (draft && continueSaved) setMode(draft.mode);
      })
      .catch(() => undefined)
      .finally(() => live && setDraftReady(true));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  // The same questions in the same order as when the quiz was saved (rebuilt from the same seed, then put in the saved order).
  const resuming = continueSaved && saved !== null;
  const items = useMemo(() => {
    const list = questions ?? [];
    if (!resuming || !saved) return list.map((question) => ({ question }));
    const byId = new Map(list.map((question) => [question.id, question]));
    const ordered = saved.itemIds.map((id) => byId.get(id)).filter((question): question is Question => Boolean(question));
    return (ordered.length ? ordered : list).map((question) => ({ question }));
  }, [questions, resuming, saved]);

  const initial = useMemo<SessionProgress | undefined>(() => {
    if (!resuming || !saved) return undefined;
    const ids = new Set(items.map((item) => item.question.id));
    const kept = (list: string[]) => list.filter((id) => ids.has(id));
    return {
      index: saved.itemIds.slice(0, saved.index).filter((id) => ids.has(id)).length,
      answers: Object.fromEntries(Object.entries(saved.answers).filter(([id]) => ids.has(id))) as SessionProgress['answers'],
      checked: kept(saved.checked),
      skipped: kept(saved.skipped),
      recorded: kept(saved.recorded),
      timedOut: kept(saved.timedOut),
      elapsed: saved.elapsed ?? 0,
    };
  }, [items, resuming, saved]);

  const live = useRef({ items, seed, mode, draftKey, queryText, lessonId: lessonId ?? null, title });
  useEffect(() => {
    live.current = { items, seed, mode, draftKey, queryText, lessonId: lessonId ?? null, title };
  });

  function writeDraft(state: SessionProgress, strict = false): Promise<void> {
    const current = live.current;
    if (!current.draftKey || current.items.length === 0) return Promise.resolve();
    const saving = saveQuizDraft({
      key: current.draftKey,
      lessonId: current.lessonId,
      title: current.title,
      query: current.queryText,
      path: '/learn/hb-practice',
      seed: current.seed,
      mode: current.mode,
      itemIds: current.items.map((item) => item.question.id),
      index: state.index,
      answers: state.answers,
      checked: state.checked,
      skipped: state.skipped,
      recorded: state.recorded,
      timedOut: state.timedOut,
      elapsed: state.elapsed,
    });
    return strict ? saving : saving.catch((problem) => console.warn('Could not save practice progress:', problem));
  }

  // "Save & exit": save right now (only if there is something to keep), then go back to the course.
  async function saveAndExit(state: SessionProgress) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const started = state.index > 0 || Object.keys(state.answers).length > 0 || state.skipped.length > 0;
    if (started) await writeDraft(state, true);
    finished.current = true;
    router.replace(routes.legacyCourse(course!.id));
  }

  function onProgress(state: SessionProgress) {
    latest.current = state;
    if (finished.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void writeDraft(state), 800);
  }

  // Leaving part-way keeps the latest answers.
  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (!finished.current && latest.current) void writeDraft(latest.current);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  if (!course) return <ErrorScreen title="Course not found" message="Open practice from a course in Study." primary={{ label: 'Back to Study', onPress: () => router.replace(routes.learn()) }} />;
  if (error) return <ErrorScreen title="Practice unavailable" message={error} primary={{ label: 'Back to the course', onPress: () => router.replace(routes.legacyCourse(course.id)) }} />;
  if (!questions || !draftReady) return <LoadingState label="Preparing your questions…" />;

  // An unfinished copy of this practice exists: carry on, or start again.
  if (saved && !continueSaved && !apex && !result) {
    return (
      <Screen width="learning">
        <BackLink fallback={routes.legacyCourse(course.id)} />
        <Card style={styles.header}>
          <Text style={styles.sub}>UNFINISHED PRACTICE</Text>
          <Text style={styles.title}>{saved.title || title}</Text>
          <Text style={styles.sub}>You are on question {Math.min(saved.index + 1, saved.itemIds.length)} of {saved.itemIds.length}. Resuming keeps the same questions in the same order.</Text>
          <View style={styles.apexActions}>
            <Button label="Resume" onPress={() => router.replace(`/learn/hb-practice?${saved.query}&continue=1` as never)} />
            <Button label="Start fresh" variant="secondary" onPress={() => { void deleteQuizDraft(saved.key).catch(() => undefined); setSaved(null); }} />
          </View>
        </Card>
      </Screen>
    );
  }

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
  if (apex && apexStats) {
    return (
      <ApexDone
        title={course.name}
        stats={apexStats}
        xp={apexXp}
        onAgain={() => router.replace(routes.legacyPractice({ course: course.id, apex: true }))}
        onLeave={() => router.replace(routes.legacyCourse(course.id))}
      />
    );
  }
  if (apex && apexPhase === 'run') {
    return (
      <ApexRun
        questions={questions}
        seed={seed}
        onDone={(stats) => {
          setApexStats(stats);
          void awardApexXp(stats);
        }}
      />
    );
  }
  if (apex && apexPhase === 'countdown' && !result) {
    return (
      <Arena intensity="high">
        <Countdown count={count} total={APEX.countdownSeconds} />
      </Arena>
    );
  }

  async function awardApexXp(stats: ApexStats) {
    const percent = stats.total ? (stats.correct / stats.total) * 100 : 0;
    const bonus = percent >= 90 ? XP_RULES.apex.bonusAt90 : percent >= 75 ? XP_RULES.apex.bonusAt75 : percent >= 50 ? XP_RULES.apex.bonusAt50 : 0;
    const amount = Math.min(XP_RULES.taskMax, XP_RULES.apex.completion + bonus);
    const xp = await awardXp({ sourceType: 'apex', sourceId: `hb:${course!.id}:apex:${dayKey(Date.now())}`, amount, label: `${course!.name} · Apex Challenge` });
    if (xp > 0) setPendingXpReward({ amount: xp, message: `Apex Challenge · ${stats.correct}/${stats.total}` });
    setApexXp(xp);
  }

  async function submit(session: SessionResult) {
    // Hold the autosave while submitting; it is switched back on if submitting fails.
    finished.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    try {
      await submitPractice(session);
    } catch (problem) {
      finished.current = false;
      throw problem;
    }
    if (draftKey && !reviewing) void deleteQuizDraft(draftKey).catch(() => undefined);
  }

  async function submitPractice(session: SessionResult) {
    const asked = reviewing ? reviewing.questions : questions!;
    const missed = asked.filter((question) => !isAnswerCorrect(question, session.answers[question.id]));
    const correct = asked.length - missed.length;
    const total = asked.length;
    // A mistakes round is extra practice: no second XP award.
    if (reviewing) {
      setResult({ correct, total, xp: 0, missed });
      return;
    }
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
    setResult({ correct, total, xp, pre, missed });
  }

  if (result) {
    const percent = result.total ? Math.round((result.correct / result.total) * 100) : 0;
    return (
      <Screen width="learning">
        <Card style={styles.result}>
          <Text style={styles.resultEmoji}>{percent >= 75 ? '🏆' : percent >= 50 ? '💪' : '📚'}</Text>
          <Text style={styles.resultScore}>{result.correct}/{result.total}</Text>
          <Text style={styles.resultTitle}>{reviewing ? `${title} · mistakes` : title}</Text>
          <Pill label={`${percent}%`} tone={percent >= 75 ? 'success' : percent >= 50 ? 'gold' : 'neutral'} />
          <Text style={styles.resultText}>{result.xp > 0 ? `+${result.xp} XP` : reviewing ? 'Mistakes round — no extra XP.' : 'XP for this practice was already earned today.'}</Text>
          {practice.kind === 'prepost' && practice.phase === 'pre' ? <Text style={styles.resultText}>Now study the course, then take the post-test to see how much you’ve improved.</Text> : null}
          {practice.kind === 'prepost' && practice.phase === 'post' && result.pre != null ? <Text style={styles.resultText}>Pre-test {result.pre}% → post-test {percent}% ({percent - result.pre >= 0 ? '+' : ''}{percent - result.pre} points)</Text> : null}
          <View style={styles.resultActions}>
            {practice.kind !== 'prepost' && result.missed.length > 0 ? (
              <Button
                label={`Review ${result.missed.length} mistake${result.missed.length === 1 ? '' : 's'}`}
                onPress={() => {
                  setMode('instant');
                  setReviewing({ round: (reviewing?.round ?? 0) + 1, questions: result.missed });
                  setResult(null);
                }}
              />
            ) : null}
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
        key={reviewing?.round ?? 0}
        items={reviewing ? reviewing.questions.map((question) => ({ question })) : items}
        mode={mode}
        onModeChange={settings.seconds || settings.feedback === 'submit' ? undefined : setMode}
        perQuestionSeconds={settings.seconds}
        attemptMode={apex ? 'apex' : 'practice'}
        sessionId={`hb:${seed}${reviewing ? `:r${reviewing.round}` : ''}`}
        seed={reviewing ? `${seed}:r${reviewing.round}` : seed}
        initial={reviewing ? undefined : initial}
        onProgress={apex || reviewing ? undefined : onProgress}
        onSaveExit={apex || reviewing || !draftKey ? undefined : saveAndExit}
        onSubmit={submit}
        submitLabel="Finish"
        reviewNote={null}
        header={
          <View style={styles.header}>
            <BackLink fallback={routes.legacyCourse(course.id)} />
            <Text style={styles.title} numberOfLines={2}>{reviewing ? `${title} · mistakes` : title}</Text>
            <Text style={styles.sub}>{reviewing ? `${reviewing.questions.length} question${reviewing.questions.length === 1 ? '' : 's'} you missed, answers shown as you go` : [`${questions.length} questions`, settings.seconds ? `${settings.seconds} seconds a question` : null, settings.feedback === 'submit' ? 'answers at the end, like the real paper' : null, settings.variants ? 'multiple choice, typing, true/false and matching' : null].filter(Boolean).join(' · ')}</Text>
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
