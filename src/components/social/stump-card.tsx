// Stump a friend (data/stumps.ts):
//   StumpCard      the question inside a feed post. Pick an option, check it,
//                  then see the answer and the explanation. Who got it right
//                  or wrong is shown ONLY to the learner who shared it, so
//                  nobody is afraid to have a go.
//   StumpComposer  the sheet that shares a question from quiz results.
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Interactive } from '@/components/ui/interactive';
import { Pill } from '@/components/ui/pill';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Radius, Type, type ThemeColors } from '@/constants/theme';
import type { StumpRef } from '@/data/community';
import type { ChoiceQuestion } from '@/data/questions';
import { personName, type SocialPerson } from '@/data/social';
import { answerStump, createStumpPost, LETTERS, listStumpAnswers, STUMP_NOTE_MAX, stumpOptionOrder, type StumpAnswer } from '@/data/stumps';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

const errorText = (caught: unknown, fallback: string) => (caught instanceof Error && caught.message ? caught.message : fallback);

export function StumpCard({ postId, question, stump, authorId, authorName, ownId, people }: {
  postId: string;
  question: ChoiceQuestion;
  stump: StumpRef;
  authorId: string;
  authorName: string; // the sharer, as the post shows them
  ownId: string | null;
  people: readonly SocialPerson[];
}) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const order = useMemo(() => stumpOptionOrder(question), [question]);
  const [answers, setAnswers] = useState<StumpAnswer[] | null>(null);
  const [choice, setChoice] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    listStumpAnswers(postId).then((list) => { if (live) setAnswers(list); }).catch(() => { if (live) setAnswers([]); });
    return () => { live = false; };
  }, [postId]);

  const isMine = Boolean(ownId) && authorId === ownId;
  const mine = answers?.find((answer) => answer.userId === ownId) ?? null;
  const revealed = isMine || Boolean(mine);

  async function check() {
    if (choice === null || busy) return;
    setBusy(true);
    setError(null);
    try {
      const answer = await answerStump(postId, question, choice);
      setAnswers((list) => [...(list ?? []).filter((item) => item.userId !== answer.userId), answer]);
    } catch (caught) {
      setError(errorText(caught, 'Could not save your answer.'));
    } finally {
      setBusy(false);
    }
  }

  // The sharer's private view: each answerer and how they did.
  const right = (answers ?? []).filter((answer) => answer.ok).length;
  const nameOf = (answer: StumpAnswer) => {
    const person = people.find((item) => item.userId === answer.userId);
    return person ? personName(person) : answer.username ? `@${answer.username}` : 'A learner';
  };

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Icon name="challenge" size={16} color={colors.primaryText} />
        <Text style={styles.kicker}>STUMP A FRIEND</Text>
        <Pill label={question.concept} style={styles.concept} />
      </View>
      {stump.note ? <Text style={styles.note}>{stump.note}</Text> : null}
      <Text style={styles.prompt}>{question.prompt}</Text>
      <View style={styles.options}>
        {order.map((index, position) => {
          const isAnswer = index === question.answer;
          const picked = mine ? mine.pick === index : choice === index;
          const tone = revealed ? (isAnswer ? 'right' : picked ? 'wrong' : 'idle') : picked ? 'picked' : 'idle';
          return (
            <Interactive
              key={index}
              disabled={revealed || busy}
              dimDisabled={false}
              onPress={() => setChoice(index)}
              accessibilityRole="radio"
              accessibilityState={{ checked: picked }}
              accessibilityLabel={`Option ${LETTERS[position]}: ${question.options[index]}`}
              style={({ hovered }) => [styles.option, styles[tone], hovered && tone === 'idle' && styles.hover]}
            >
              <Text style={[styles.letter, tone === 'right' && styles.rightText, tone === 'wrong' && styles.wrongText]}>{LETTERS[position]}</Text>
              <Text style={styles.optionText}>{question.options[index]}</Text>
              {revealed && isAnswer ? <Icon name="check" size={16} color={colors.successText} /> : null}
              {revealed && picked && !isAnswer ? <Icon name="close" size={16} color={colors.error} /> : null}
            </Interactive>
          );
        })}
      </View>
      {!revealed ? (
        <View style={styles.row}>
          <Button label="Check answer" size="sm" onPress={() => void check()} loading={busy} disabled={choice === null || busy || answers === null} />
          <Text style={styles.muted}>One try, and it counts as revision. Only {authorName} sees how you did.</Text>
        </View>
      ) : (
        <View style={styles.reveal}>
          {mine ? <Text style={[styles.verdict, mine.ok ? styles.rightText : styles.wrongText]}>{mine.ok ? 'You got it.' : 'Not this time.'}</Text> : <Text style={styles.verdict}>Your question</Text>}
          {question.explanation ? <Text style={styles.explanation}>{question.explanation}</Text> : null}
          {mine ? <Text style={styles.muted}>Your answer is private: only {authorName} sees how you did.</Text> : null}
        </View>
      )}
      {error ? <Text style={styles.errorLine}>{error}</Text> : null}
      {isMine && answers ? (
        <View style={styles.results}>
          <Text style={styles.resultsTitle}>
            {answers.length === 0 ? 'Nobody has answered yet.' : `${right} of ${answers.length} got it right`}
          </Text>
          {answers.map((answer) => (
            <View key={answer.userId} style={styles.resultRow}>
              <Icon name={answer.ok ? 'check' : 'close'} size={14} color={answer.ok ? colors.successText : colors.error} />
              <Text style={styles.resultName} numberOfLines={1}>{nameOf(answer)}</Text>
              <Text style={[styles.resultVerdict, answer.ok ? styles.rightText : styles.wrongText]}>{answer.ok ? 'got it' : 'missed it'}</Text>
            </View>
          ))}
          <Text style={styles.muted}>Only you can see who got it right or wrong.</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Shares a question from quiz results to the community feed. */
export function StumpComposer({ question, onClose }: { question: ChoiceQuestion | null; onClose: () => void }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);

  // A fresh sheet for each question.
  useEffect(() => {
    setNote('');
    setError(null);
    setPosted(false);
  }, [question?.id]);

  async function post() {
    if (!question || busy) return;
    setBusy(true);
    setError(null);
    try {
      await createStumpPost(question, note);
      setPosted(true);
    } catch (caught) {
      setError(errorText(caught, 'Could not share this question.'));
    } finally {
      setBusy(false);
    }
  }

  const order = question ? stumpOptionOrder(question) : [];
  return (
    <Sheet visible={question !== null} onClose={onClose} title="Stump a friend" subtitle="Share this question to the feed. Friends answer it right on the post.">
      {question ? (
        <View style={styles.composer}>
          <View style={styles.preview}>
            <Text style={styles.prompt}>{question.prompt}</Text>
            {order.map((index, position) => (
              <Text key={index} style={styles.previewOption}>{LETTERS[position]}. {question.options[index]}</Text>
            ))}
            <Text style={styles.muted}>The answer stays hidden until someone answers.</Text>
          </View>
          {posted ? (
            <>
              <Text style={styles.verdict}>Shared to the feed.</Text>
              <View style={styles.row}>
                <Button label="See it on Home" size="sm" onPress={() => { onClose(); router.push('/'); }} />
                <Button label="Done" size="sm" variant="ghost" onPress={onClose} />
              </View>
            </>
          ) : (
            <>
              <TextInput
                value={note}
                onChangeText={setNote}
                maxLength={STUMP_NOTE_MAX}
                placeholder="Add a note (optional), e.g. “Bet you can’t get this one”"
                placeholderTextColor={colors.textTertiary}
                accessibilityLabel="Note to go with the question"
                style={styles.input}
              />
              {error ? <Text style={styles.errorLine}>{error}</Text> : null}
              <View style={styles.row}>
                <Button label="Post to feed" size="sm" onPress={() => void post()} loading={busy} disabled={busy} />
                <Button label="Cancel" size="sm" variant="ghost" onPress={onClose} />
              </View>
            </>
          )}
        </View>
      ) : null}
    </Sheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: { gap: 10, borderWidth: 1, borderColor: colors.primaryBorder, borderRadius: 14, padding: 14, backgroundColor: colors.primarySubtle },
    head: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: colors.primaryText },
    concept: { marginLeft: 'auto', maxWidth: '55%' },
    note: { ...Type.callout, color: colors.text, fontStyle: 'italic' },
    prompt: { ...Type.headline, color: colors.text },
    options: { gap: 8 },
    option: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingVertical: 9, paddingHorizontal: 12, borderWidth: 1, borderRadius: Radius.md },
    idle: { borderColor: colors.border, backgroundColor: colors.surfaceSunken },
    hover: { borderColor: colors.borderStrong },
    picked: { borderColor: colors.primary, backgroundColor: colors.surfaceSunken },
    right: { borderColor: colors.successBorder, backgroundColor: colors.successSubtle },
    wrong: { borderColor: colors.errorBorder, backgroundColor: colors.errorSubtle },
    letter: { width: 18, fontWeight: '800', color: colors.textSecondary },
    optionText: { ...Type.callout, flex: 1, color: colors.text },
    rightText: { color: colors.successText },
    wrongText: { color: colors.error },
    errorLine: { ...Type.caption, color: colors.error },
    row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
    reveal: { gap: 4 },
    verdict: { ...Type.headline, color: colors.text },
    explanation: { ...Type.callout, color: colors.textSecondary },
    results: { gap: 6, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 10 },
    resultsTitle: { ...Type.callout, fontWeight: '700', color: colors.text },
    resultRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    resultName: { ...Type.callout, flex: 1, color: colors.text },
    resultVerdict: { ...Type.caption, fontWeight: '700' },
    muted: { ...Type.caption, color: colors.textTertiary, flexShrink: 1 },
    composer: { gap: 12 },
    preview: { gap: 6, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12, backgroundColor: colors.surfaceMuted },
    previewOption: { ...Type.callout, color: colors.text },
    input: { minHeight: 42, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: Radius.md, backgroundColor: colors.surfaceSunken, paddingHorizontal: 12, color: colors.text, fontSize: 14 },
  });
}
