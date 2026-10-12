import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';

import { QuestionCard } from '@/components/question-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/interactive';
import { Pill } from '@/components/ui/pill';
import { Type, type ThemeColors } from '@/constants/theme';
import { findLesson } from '@/data/curriculum';
import { pickQuestion, qotdDay, readCloudAnswer, readLocalAnswer, readTally, saveAnswer, type SaveResult, type Tally } from '@/data/qotd';
import { type Answer, isAnswerCorrect } from '@/data/questions';
import { useThemedStyles } from '@/hooks/use-theme';
import { routes } from '@/lib/routes';
import { setPendingXpReward } from '@/components/xp-toast';
import { XP_RULES } from '@/data/learning/xp-rules';
import { awardXp } from '@/data/progress';

// Question of the Day (ported from the older Grate Apex Hub site).
// One single-answer question per day from the published question banks —
// the same question for every learner on a given (UTC) day. Practice only: it
// never affects XP, memory or review schedules. The answer is saved once per
// day on the account (shared with the original app) together with this app's
// class tally — see data/qotd.ts.
type Status = 'loading' | 'open' | 'saved' | 'elsewhere' | 'not-saved' | 'local';

export function QuestionOfTheDay() {
  const styles = useThemedStyles(createStyles);
  const day = qotdDay();
  const question = useMemo(() => pickQuestion(day), [day]);
  const [answer, setAnswer] = useState<Answer | undefined>(undefined);
  const [revealed, setRevealed] = useState(false);
  const [status, setStatus] = useState<Status>('loading');
  const [tally, setTally] = useState<Tally | null>(null);
  const [earned, setEarned] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const local = await readLocalAnswer(day);
      let cloud: Awaited<ReturnType<typeof readCloudAnswer>> | undefined;
      try {
        cloud = await readCloudAnswer(day);
      } catch {
        cloud = undefined; // offline: fall back to what this device knows
      }
      if (!alive) return;
      if (local && question && local.questionId === question.id) {
        setAnswer(local.pick);
        setRevealed(true);
        if (local.synced || cloud) setStatus('saved');
        else {
          // Saved on this device only: try again (the rules count it once at most).
          const result = await saveAnswer(day, question.id, local.pick, isAnswerCorrect(question, local.pick));
          if (alive) setStatus(statusFor(result));
        }
      } else if (cloud) {
        setRevealed(true);
        setStatus('elsewhere');
      } else {
        setStatus('open');
      }
      readTally(day).then((value) => { if (alive) setTally(value); }).catch(() => undefined);
    })();
    return () => {
      alive = false;
    };
  }, [day, question]);

  if (!question) return null;
  const entry = findLesson(question.lessonId);

  async function check() {
    if (answer === undefined || typeof answer !== 'number' || !question) return;
    setRevealed(true);
    const correct = isAnswerCorrect(question, answer);
    const result = await saveAnswer(day, question.id, answer, correct);
    setStatus(statusFor(result));
    // XP once a day (the award key is the day).
    const amount = correct ? XP_RULES.questionOfTheDay.correct : XP_RULES.questionOfTheDay.answered;
    const xp = await awardXp({ sourceType: 'practice', sourceId: `qotd:${day}`, amount, label: 'Question of the Day' });
    if (xp > 0) {
      setEarned(xp);
      setPendingXpReward({ amount: xp, message: correct ? 'Question of the Day · correct' : 'Question of the Day' });
    }
    readTally(day).then(setTally).catch(() => undefined);
  }

  const share = tally && tally.total > 0 ? `${Math.round((tally.correct / tally.total) * 100)}% of ${tally.total} learner${tally.total === 1 ? '' : 's'} got this right today.` : null;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Question of the Day</Text>
        <Pill label={`+${XP_RULES.questionOfTheDay.correct} XP`} tone="gold" />
      </View>
      {entry ? <Text style={styles.source}>{entry.topic.title} · {entry.lesson.title}</Text> : null}
      {status === 'loading' ? <Text style={styles.source}>Checking today’s answer…</Text> : null}
      <QuestionCard question={question} value={answer} onChange={status === 'open' ? setAnswer : () => undefined} revealed={revealed} shuffleSeed={day} compact />
      {revealed ? (
        <View style={styles.footer}>
          {status === 'elsewhere' ? (
            <Text style={styles.result}>You already answered today’s question — on another device or in the original app. Come back tomorrow.</Text>
          ) : (
            <Text style={styles.result}>{isAnswerCorrect(question, answer) ? 'Correct — nice start to the day.' : 'Not this time — see why above.'}{earned ? ` +${earned} XP` : ''}</Text>
          )}
          {status === 'not-saved' ? <Text style={styles.note}>Your answer is saved on this device only. It will count once you’re back online.</Text> : null}
          {status === 'local' ? <Text style={styles.note}>Sign in to add your answer to today’s class results.</Text> : null}
          {share ? <Text style={styles.note}>{share}</Text> : null}
          {entry ? (
            <View style={styles.links}>
              <Button label="Open the lesson" size="sm" variant="secondary" onPress={() => router.push(routes.legacyLesson(entry.lesson.id))} />
              <Button label="Flashcards" size="sm" variant="secondary" onPress={() => router.push(routes.legacyLesson(entry.lesson.id, undefined, 'cards'))} />
            </View>
          ) : null}
        </View>
      ) : (
        <Button label="Check answer" size="sm" onPress={() => void check()} disabled={answer === undefined || status !== 'open'} />
      )}
    </Card>
  );
}

function statusFor(result: SaveResult): Status {
  if (result === 'saved') return 'saved';
  if (result === 'already-answered') return 'elsewhere';
  if (result === 'signed-out') return 'local';
  return 'not-saved';
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: { gap: 12 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    title: { ...Type.title3, color: colors.text },
    source: { fontSize: 12.5, color: colors.textSecondary },
    footer: { gap: 10 },
    links: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    result: { fontSize: 14, fontWeight: '700', color: colors.text },
    note: { fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  });
}
