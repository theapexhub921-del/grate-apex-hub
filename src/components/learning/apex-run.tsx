import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Arena } from '@/components/learning/apex-arena';
import { QuestionCard } from '@/components/question-card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { isWeb } from '@/components/ui/web';
import { Type } from '@/constants/theme';
import { recordAnswer } from '@/data/learning/actions';
import { APEX } from '@/data/learning/apex';
import { type Answer, isAnswerCorrect, type Question } from '@/data/questions';
import { useTheme } from '@/hooks/use-theme';

export type ApexStats = { answers: Record<string, Answer>; correct: number; total: number; avgMs: number; bestStreak: number };

const clock = () => Date.now();

// A course Apex run in the arena, the same way as the Apex Challenge screen:
// one question at a time, a draining gold timer, momentum for streaks, and
// answers that lock instantly. Each answer goes into the learning history.
export function ApexRun({ questions, seed, onDone }: { questions: readonly Question[]; seed: string; onDone: (stats: ApexStats) => void }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [locked, setLocked] = useState(false);
  const timeLeft = useSharedValue(1);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advance = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownAt = useRef(0);
  const responses = useRef<number[]>([]);
  const current = questions[index];

  useEffect(() => () => {
    if (timeout.current) clearTimeout(timeout.current);
    if (advance.current) clearTimeout(advance.current);
  }, []);

  // One clock per question.
  useEffect(() => {
    if (!current) return;
    shownAt.current = clock();
    timeLeft.value = 1;
    timeLeft.value = withTiming(0, { duration: APEX.secondsPerQuestion * 1000, easing: Easing.linear });
    timeout.current = setTimeout(() => lockAndAdvance(undefined), APEX.secondsPerQuestion * 1000);
    return () => { if (timeout.current) clearTimeout(timeout.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const timerStyle = useAnimatedStyle(() => ({ width: `${timeLeft.value * 100}%` }));

  function lockAndAdvance(answer: Answer | undefined) {
    if (!current || locked) return;
    if (timeout.current) clearTimeout(timeout.current);
    cancelAnimation(timeLeft);
    setLocked(true);
    const next = answer !== undefined ? { ...answers, [current.id]: answer } : answers;
    if (answer !== undefined) {
      responses.current.push(clock() - shownAt.current);
      setAnswers(next);
      void recordAnswer(current, answer, 'apex', `hb:${seed}`);
    }
    advance.current = setTimeout(() => {
      if (index + 1 >= questions.length) {
        let streak = 0;
        let bestStreak = 0;
        let correct = 0;
        for (const question of questions) {
          if (isAnswerCorrect(question, next[question.id])) {
            correct += 1;
            streak += 1;
            bestStreak = Math.max(bestStreak, streak);
          } else streak = 0;
        }
        const avgMs = responses.current.length ? responses.current.reduce((a, b) => a + b, 0) / responses.current.length : 0;
        onDone({ answers: next, correct, total: questions.length, avgMs, bestStreak });
      } else {
        setLocked(false);
        setIndex(index + 1);
      }
    }, APEX.revealMs);
  }

  if (!current) return null;
  let streak = 0;
  let correctSoFar = 0;
  for (const question of questions.slice(0, index)) {
    if (isAnswerCorrect(question, answers[question.id])) {
      correctSoFar += 1;
      streak += 1;
    } else streak = 0;
  }

  return (
    <Arena scroll={false} intensity="low">
      <View style={styles.runHeader}>
        <Text style={styles.kicker}>{index + 1} / {questions.length}</Text>
        <View style={styles.momentum} accessibilityLabel={`${correctSoFar} correct, streak ${streak}`}>
          <Icon name="check" size={14} color="#8BE39A" strokeWidth={2.6} />
          <Text style={styles.momentumText}>{correctSoFar}</Text>
          <View style={styles.momentumDivider} />
          <Icon name="streak" size={14} color={streak >= 3 ? '#FDC00A' : '#A9BCF0'} filled={streak >= 3} />
          <Text style={[styles.momentumText, streak >= 3 && styles.momentumHot]}>{streak >= 3 ? `Momentum ×${streak}` : `streak ${streak}`}</Text>
        </View>
      </View>
      <View style={styles.timerTrack} accessibilityLabel="Time left for this question">
        <Animated.View style={[styles.timerFill, timerStyle]} />
      </View>
      <View style={styles.cardWrap}>
        <QuestionCard key={current.id} question={current} value={answers[current.id]} onChange={(answer) => lockAndAdvance(answer)} revealed={locked} shuffleSeed={`${seed}:${current.id}`} keyboard={isWeb} compact />
      </View>
    </Arena>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const colors = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: colors.apexSurface }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.apexMuted }]}>{label}</Text>
    </View>
  );
}

/** The arena's results: score, accuracy, speed, best streak and XP. */
export function ApexDone({ title, stats, xp, onAgain, onLeave }: { title: string; stats: ApexStats; xp: number | null; onAgain: () => void; onLeave: () => void }) {
  const colors = useTheme();
  const percentage = stats.total ? Math.round((stats.correct / stats.total) * 100) : 0;
  return (
    <Arena>
      <Text style={styles.kicker}>RUN COMPLETE · {title.toUpperCase()}</Text>
      <Text style={styles.score}>{percentage}%</Text>
      <Text style={[styles.lead, { color: colors.apexText }]}>{stats.correct} of {stats.total} correct</Text>
      <View style={styles.statRow}>
        <Stat label="accuracy" value={`${percentage}%`} />
        <Stat label="avg answer" value={stats.avgMs ? `${(stats.avgMs / 1000).toFixed(1)}s` : '—'} />
        <Stat label="best streak" value={String(stats.bestStreak)} />
        <Stat label="XP" value={xp === null ? '…' : xp > 0 ? `+${xp}` : 'earned today'} />
      </View>
      <View style={styles.actions}>
        <Button label="Run again" variant="apex" trailing="⚡" onPress={onAgain} />
        <Button label="Leave the arena" variant="ghost" onPress={onLeave} />
      </View>
    </Arena>
  );
}

const styles = StyleSheet.create({
  kicker: { ...Type.overline, letterSpacing: 1.6, color: '#FDC00A', textAlign: 'center' },
  lead: { fontSize: 18, fontWeight: '700', textAlign: 'center', lineHeight: 26 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 8 },
  runHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  momentum: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(253,192,10,0.2)' },
  momentumDivider: { width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 4 },
  momentumText: { fontSize: 12, fontWeight: '800', color: '#E3EBFD' },
  momentumHot: { color: '#FDC00A' },
  timerTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.10)', overflow: 'hidden' },
  timerFill: { height: '100%', backgroundColor: '#FDC00A', borderRadius: 4, boxShadow: '0px 0px 14px rgba(253,192,10,0.7)' },
  cardWrap: { marginTop: 6 },
  score: { ...Type.numeral, fontSize: 88, lineHeight: 96, color: '#FDC00A', textAlign: 'center' },
  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  stat: { minWidth: 120, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(253,192,10,0.18)' },
  statValue: { ...Type.numeral, fontSize: 22, color: '#FFFFFF' },
  statLabel: { fontSize: 12, fontWeight: '700', marginTop: 2 },
});
