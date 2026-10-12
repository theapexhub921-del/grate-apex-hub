import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BackLink } from '@/components/learning/nav-bits';
import { Arena, Countdown } from '@/components/learning/apex-arena';
import { BattleIntro } from '@/components/social/battle-intro';
import { QuestionSession, type SessionResult } from '@/components/learning/question-session';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/interactive';
import { Pill } from '@/components/ui/pill';
import { Screen } from '@/components/ui/screen';
import { ErrorScreen, LoadingState } from '@/components/ui/state-views';
import { Text } from '@/components/ui/text';
import { setPendingXpReward } from '@/components/xp-toast';
import { Type, type ThemeColors } from '@/constants/theme';
import { type Battle, BATTLE_SECONDS, BATTLE_WIN_XP, battleStatus, getBattle, submitBattleResult } from '@/data/battles';
import { getTopicQuestions } from '@/data/curriculum';
import { bankQuestions, buildPractice, loadLegacyBank } from '@/data/legacy-study';
import { awardXp } from '@/data/progress';
import { isAnswerCorrect, type Question } from '@/data/questions';
import { useAuth } from '@/hooks/use-auth';
import { useThemedStyles } from '@/hooks/use-theme';
import { param } from '@/lib/routes';

// /social/battle?id=… — play your side of a battle: the same questions as your
// opponent (same course and seed), 15 seconds each. Then the result, once
// both have played. The winner earns XP from the app; nothing is taken from
// the other player.

function seededShuffle<T>(items: readonly T[], seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const random = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

async function battleQuestions(battle: Battle): Promise<Question[]> {
  if (battle.course.kind === 'hb') {
    const bank = await loadLegacyBank(battle.course.id);
    return buildPractice(bankQuestions(bank), { course: battle.course.id }, battle.count, battle.seed);
  }
  const pool = getTopicQuestions(battle.course.id).filter((question) => question.usage !== 'learn');
  return seededShuffle(pool, battle.seed).slice(0, battle.count);
}

export default function BattleScreen() {
  const styles = useThemedStyles(createStyles);
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = param(params.id);
  const { user } = useAuth();
  const uid = user?.uid ?? '';
  const [battle, setBattle] = useState<Battle | null>(null);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [reward, setReward] = useState(0);
  // The intro (you vs them in the arena), then 3 · 2 · 1, then the questions.
  const [phase, setPhase] = useState<'intro' | 'countdown' | 'play'>('intro');
  const [count, setCount] = useState(3);
  useEffect(() => {
    if (phase !== 'countdown') return;
    const timer = setTimeout(() => {
      if (count <= 1) setPhase('play');
      else setCount(count - 1);
    }, 800);
    return () => clearTimeout(timer);
  }, [phase, count]);

  useEffect(() => {
    if (!id) return;
    let live = true;
    getBattle(id)
      .then(async (found) => {
        if (!live) return;
        if (!found) throw new Error('This battle could not be found.');
        setBattle(found);
        setQuestions(await battleQuestions(found));
      })
      .catch((problem) => { if (live) setError(problem instanceof Error ? problem.message : 'The battle could not be loaded.'); });
    return () => { live = false; };
  }, [id]);

  const items = useMemo(() => (questions ?? []).map((question) => ({ question })), [questions]);

  if (!id) return <ErrorScreen title="No battle chosen" message="Open a battle from Connect." primary={{ label: 'Back to Connect', onPress: () => router.replace('/social') }} />;
  if (error) return <ErrorScreen title="Battle unavailable" message={error} primary={{ label: 'Back to Connect', onPress: () => router.replace('/social') }} />;
  if (!battle || !questions) return <LoadingState label="Setting up the battle…" />;

  const status = battleStatus(battle, uid);
  const mine = battle.challengerId === uid ? battle.challenger : battle.opponent;
  const theirs = battle.challengerId === uid ? battle.opponent : battle.challenger;
  const otherName = battle.challengerId === uid ? battle.opponentName : battle.challengerName;

  async function submit(result: SessionResult) {
    const correct = questions!.filter((question) => isAnswerCorrect(question, result.answers[question.id])).length;
    const side = { score: correct, total: questions!.length, seconds: Math.round(result.timeSeconds) };
    await submitBattleResult(battle!, side);
    const updated = await getBattle(battle!.id);
    if (updated) {
      setBattle(updated);
      if (battleStatus(updated, uid) === 'won') {
        const xp = await awardXp({ sourceType: 'quiz', sourceId: `battle:${updated.id}`, amount: BATTLE_WIN_XP, label: `Battle won · ${updated.course.name}` });
        if (xp > 0) setPendingXpReward({ amount: xp, message: `Battle won · ${updated.course.name}` });
        setReward(xp);
      }
    }
    setDone(true);
  }

  if (done || (mine && status !== 'waiting-for-you')) {
    return (
      <Screen width="learning">
        <BackLink fallback={'/social' as never} />
        <Card style={styles.result}>
          <Text style={styles.resultTitle}>{battle.course.name}</Text>
          <View style={styles.scores}>
            <View style={styles.scoreBox}><Text style={styles.scoreLabel}>YOU</Text><Text style={styles.score}>{mine ? `${mine.score}/${mine.total}` : '—'}</Text><Text style={styles.muted}>{mine ? `${mine.seconds}s` : ''}</Text></View>
            <Text style={styles.vs}>vs</Text>
            <View style={styles.scoreBox}><Text style={styles.scoreLabel}>@{otherName ?? 'opponent'}</Text><Text style={styles.score}>{theirs ? `${theirs.score}/${theirs.total}` : '…'}</Text><Text style={styles.muted}>{theirs ? `${theirs.seconds}s` : 'not played yet'}</Text></View>
          </View>
          <Pill
            label={status === 'won' ? 'You won' : status === 'lost' ? 'You lost' : status === 'draw' ? 'Draw' : status === 'declined' ? 'Declined' : 'Waiting for your opponent'}
            tone={status === 'won' ? 'success' : status === 'lost' ? 'error' : status === 'draw' ? 'gold' : 'neutral'}
          />
          {reward > 0 ? <Text style={styles.reward}>+{reward} XP</Text> : null}
          <Button label="Back to Connect" variant="secondary" onPress={() => router.replace('/social')} />
        </Card>
      </Screen>
    );
  }

  if (phase === 'intro') {
    return (
      <BattleIntro
        course={battle.course.name}
        me={{ uid, name: user?.profile?.username ?? 'You' }}
        opponent={{ uid: battle.challengerId === uid ? battle.opponentId : battle.challengerId, name: otherName ?? 'opponent' }}
        questions={questions.length}
        seconds={BATTLE_SECONDS}
        winXp={BATTLE_WIN_XP}
        onStart={() => { setCount(3); setPhase('countdown'); }}
      />
    );
  }
  if (phase === 'countdown') {
    return (
      <Arena intensity="high">
        <Countdown count={count} total={3} />
      </Arena>
    );
  }

  return (
    <Screen width="learning">
      <QuestionSession
        items={items}
        mode="instant"
        perQuestionSeconds={BATTLE_SECONDS}
        attemptMode="practice"
        sessionId={`battle:${battle.id}:${uid}`}
        seed={battle.seed}
        onSubmit={submit}
        submitLabel="Finish the battle"
        reviewNote={null}
        header={
          <View style={styles.header}>
            <BackLink fallback={'/social' as never} />
            <Text style={styles.title}>Battle · {battle.course.name}</Text>
            <Text style={styles.muted}>Against @{otherName ?? 'opponent'} · {questions.length} questions · {BATTLE_SECONDS} seconds each</Text>
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
    muted: { fontSize: 12.5, color: colors.textTertiary },
    result: { alignItems: 'center', gap: 14, padding: 26, marginTop: 10 },
    resultTitle: { ...Type.title3, color: colors.text },
    scores: { flexDirection: 'row', alignItems: 'center', gap: 22 },
    scoreBox: { alignItems: 'center', gap: 2, minWidth: 110 },
    scoreLabel: { ...Type.overline, color: colors.textTertiary },
    score: { ...Type.display, color: colors.text },
    vs: { fontSize: 16, fontWeight: '800', color: colors.textTertiary },
    reward: { fontSize: 16, fontWeight: '800', color: colors.successText },
  });
}
