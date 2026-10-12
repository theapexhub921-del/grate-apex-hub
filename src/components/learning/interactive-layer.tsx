import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { PathwaySteps } from '@/components/pathway-steps';
import { QuestionCard } from '@/components/question-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/interactive';
import { ProgressBar } from '@/components/ui/progress-bar';
import { isWeb } from '@/components/ui/web';
import type { ThemeColors } from '@/constants/theme';
import type { InteractiveStep, Lesson } from '@/data/lesson-types';
import { recordAnswer, recordRecall } from '@/data/learning/actions';
import { type LessonSession, saveLessonSession } from '@/data/learning/lesson-sessions';
import { type Answer, isAnswerComplete, isAnswerCorrect } from '@/data/questions';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useThemedStyles } from '@/hooks/use-theme';

// Layer 1 of a lesson: learn by thinking and doing.
//
// One step at a time. 'learn' cards teach a small piece; 'ask' steps make
// the learner retrieve / predict / reason BEFORE the explanation is shown;
// 'recall' steps ask for open recall, then a self-check against the model
// answer. A checkpoint missed on the first try comes back once at the end
// (spaced retrieval inside the lesson), and every answer feeds the memory
// model, so missed concepts return in Review. Progress is saved after
// every step, so leaving half-way never loses the learner's place.

export function InteractiveLayer({
  lesson,
  session,
  onFinished,
}: {
  lesson: Lesson;
  session: LessonSession;
  onFinished: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const reduceMotion = useReducedMotion();
  const steps = lesson.interactive ?? [];
  const [answer, setAnswer] = useState<Answer | undefined>(undefined);
  const [revealed, setRevealed] = useState(false);
  const [recallShown, setRecallShown] = useState(false);
  const [busy, setBusy] = useState(false);

  const { queue, position } = session;
  const finished = position >= queue.length;
  const entry = finished ? null : queue[position];
  const step: InteractiveStep | undefined = entry ? steps[entry.step] : undefined;
  const sessionId = `lesson:${lesson.id}:${session.startedAt}`;

  function advance(patch: Partial<LessonSession> = {}) {
    setAnswer(undefined);
    setRevealed(false);
    setRecallShown(false);
    saveLessonSession({ ...session, ...patch, position: session.position + 1 });
  }

  async function check() {
    if (!step || step.type !== 'ask' || !entry || revealed || busy) return;
    if (!isAnswerComplete(step.question, answer)) return;
    setBusy(true);
    const correct = isAnswerCorrect(step.question, answer);
    setRevealed(true);
    await recordAnswer(step.question, answer, entry.retry ? 'interactive-retry' : 'interactive', sessionId);
    if (!entry.retry) {
      saveLessonSession({
        ...session,
        checkpoints: session.checkpoints + 1,
        firstTryCorrect: session.firstTryCorrect + (correct ? 1 : 0),
        queue: correct ? session.queue : [...session.queue, { step: entry.step, retry: true }],
        missed:
          correct || session.missed.includes(step.question.concept)
            ? session.missed
            : [...session.missed, step.question.concept],
      });
    }
    setBusy(false);
  }

  async function rate(rating: 'yes' | 'partial' | 'no') {
    if (!step || step.type !== 'recall' || busy) return;
    setBusy(true);
    await recordRecall(step.recall, rating, sessionId);
    setBusy(false);
    advance({
      recalled: { ...session.recalled, [step.recall.id]: rating },
      missed:
        rating === 'no' && !session.missed.includes(step.recall.concept)
          ? [...session.missed, step.recall.concept]
          : session.missed,
    });
  }

  const canCheck = step?.type === 'ask' && isAnswerComplete(step.question, answer);
  useKeyboardShortcuts(
    {
      Enter: () => {
        if (!step) return;
        if (step.type === 'ask') {
          if (!revealed && canCheck) void check();
          else if (revealed) advance();
        } else if (step.type === 'learn') advance();
        else if (step.type === 'recall' && !recallShown) setRecallShown(true);
      },
    },
    !finished,
    ['Enter']
  );

  if (finished) {
    const checkpoints = steps.filter((item) => item.type === 'ask').length;
    return (
      <Card style={styles.summary}>
        <Text style={styles.kicker}>INTERACTIVE LESSON COMPLETE</Text>
        <Text style={styles.summaryTitle}>You worked it out — now consolidate it.</Text>
        {checkpoints > 0 ? (
          <Text style={styles.body}>
            {session.firstTryCorrect} of {checkpoints} checkpoint{checkpoints === 1 ? '' : 's'} right on the first try.
          </Text>
        ) : null}
        {session.missed.length > 0 ? (
          <View style={styles.revisit}>
            <Text style={styles.revisitTitle}>COMING BACK IN REVIEW</Text>
            {session.missed.map((concept) => (
              <Text key={concept} style={styles.revisitItem}>
                • {concept}
              </Text>
            ))}
          </View>
        ) : (
          <Text style={styles.body}>No weak spots this time.</Text>
        )}
        <Text style={styles.body}>Next: the reading summary — the structured version to revise from.</Text>
        <Button label="Continue to the reading summary" trailing="→" onPress={onFinished} />
      </Card>
    );
  }

  const progressValue = queue.length ? position / queue.length : 0;
  const stepLabel = entry?.retry ? 'One more try' : `Step ${Math.min(position + 1, queue.length)} of ${queue.length}`;

  return (
    <View>
      <View style={styles.progressRow}>
        <ProgressBar value={progressValue} style={styles.flex} label="Interactive lesson progress" />
        <Text style={styles.progressText}>{stepLabel}</Text>
      </View>

      <Animated.View key={`${position}`} entering={reduceMotion ? undefined : FadeInDown.duration(220)}>
        {step?.type === 'learn' ? (
          <Card style={styles.learnCard}>
            <Text style={styles.kicker}>LEARN</Text>
            <Text style={styles.learnTitle}>{step.title}</Text>
            {step.body.map((paragraph, index) => (
              <Text key={index} style={styles.body}>
                {paragraph}
              </Text>
            ))}
            {step.steps ? <PathwaySteps steps={step.steps} /> : null}
            {step.terms ? (
              <View style={styles.terms}>
                {step.terms.map((term) => (
                  <View key={term.term} style={styles.term}>
                    <Text style={styles.termName}>{term.term}</Text>
                    <Text style={styles.termMeaning}>{term.meaning}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {step.keyPoint ? (
              <View style={styles.keyPoint}>
                <Text style={styles.keyPointText}>★ {step.keyPoint}</Text>
              </View>
            ) : null}
          </Card>
        ) : null}

        {step?.type === 'ask' ? (
          <>
            <QuestionCard
              question={step.question}
              value={answer}
              onChange={setAnswer}
              revealed={revealed}
              retry={entry?.retry}
              heading={entry?.retry ? undefined : 'CHECKPOINT · ANSWER FIRST'}
              shuffleSeed={`${lesson.id}:${step.question.id}:${entry?.retry ? 'retry' : 'first'}`}
              onSubmitTyped={() => void check()}
              keyboard={isWeb}
              reviewNote={entry?.retry ? null : 'This concept comes back for review tomorrow.'}
            />
            {revealed && step.reveal ? (
              <Card tone="primary" style={styles.revealCard}>
                {step.reveal.map((paragraph, index) => (
                  <Text key={index} style={styles.body}>
                    {paragraph}
                  </Text>
                ))}
              </Card>
            ) : null}
          </>
        ) : null}

        {step?.type === 'recall' ? (
          <Card style={styles.learnCard}>
            <Text style={styles.kicker}>RECALL · FROM MEMORY</Text>
            <Text style={styles.learnTitle}>{step.recall.prompt}</Text>
            {!recallShown ? (
              <Text style={styles.body}>Say or write your answer first, then compare.</Text>
            ) : (
              <View style={styles.modelAnswer}>
                <Text style={styles.modelTitle}>MODEL ANSWER</Text>
                {step.recall.answer.map((point, index) => (
                  <Text key={index} style={styles.modelPoint}>
                    • {point}
                  </Text>
                ))}
                <Text style={styles.ratePrompt}>How much of that did you recall?</Text>
                <View style={styles.rateRow}>
                  <Button label="All of it" onPress={() => void rate('yes')} disabled={busy} />
                  <Button label="Partly" variant="secondary" onPress={() => void rate('partial')} disabled={busy} />
                  <Button label="Not really" variant="secondary" onPress={() => void rate('no')} disabled={busy} />
                </View>
              </View>
            )}
          </Card>
        ) : null}
      </Animated.View>

      <View style={styles.actions}>
        {step?.type === 'learn' ? (
          <Button label="Continue" trailing="→" onPress={() => advance()} shortcut={isWeb ? 'Enter' : undefined} />
        ) : null}
        {step?.type === 'ask' ? (
          revealed ? (
            <Button label="Continue" trailing="→" onPress={() => advance()} shortcut={isWeb ? 'Enter' : undefined} />
          ) : (
            <Button label="Check" onPress={() => void check()} disabled={!canCheck || busy} shortcut={isWeb ? 'Enter' : undefined} />
          )
        ) : null}
        {step?.type === 'recall' && !recallShown ? (
          <Button label="Show the model answer" onPress={() => setRecallShown(true)} shortcut={isWeb ? 'Enter' : undefined} />
        ) : null}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1 },
    progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    progressText: { fontSize: 12, fontWeight: '700', color: colors.textTertiary },
    kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.1, color: colors.textTertiary, marginBottom: 8 },
    learnCard: { marginBottom: 16, gap: 4 },
    learnTitle: { fontSize: 21, fontWeight: '800', lineHeight: 28, color: colors.text, marginBottom: 8 },
    body: { fontSize: 16, lineHeight: 25, color: colors.textSecondary, marginBottom: 10 },
    terms: { gap: 8, marginTop: 4 },
    term: { borderLeftWidth: 3, borderLeftColor: colors.primary, paddingLeft: 10 },
    termName: { fontSize: 14, fontWeight: '800', color: colors.text },
    termMeaning: { fontSize: 14, lineHeight: 20, color: colors.textSecondary },
    keyPoint: { backgroundColor: colors.accentSubtle, borderRadius: 12, padding: 12, marginTop: 6 },
    keyPointText: { fontSize: 14, lineHeight: 20, fontWeight: '700', color: colors.accentText },
    revealCard: { marginTop: -6, marginBottom: 16 },
    modelAnswer: { backgroundColor: colors.surfaceMuted, borderRadius: 14, padding: 14, gap: 6 },
    modelTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: colors.textTertiary },
    modelPoint: { fontSize: 15, lineHeight: 22, color: colors.text },
    ratePrompt: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 8 },
    rateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
    summary: { gap: 10 },
    summaryTitle: { fontSize: 21, fontWeight: '800', color: colors.text },
    revisit: { backgroundColor: colors.primarySubtle, borderRadius: 14, padding: 14 },
    revisitTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: colors.primaryText, marginBottom: 6 },
    revisitItem: { fontSize: 14, lineHeight: 21, color: colors.text },
  });
}
