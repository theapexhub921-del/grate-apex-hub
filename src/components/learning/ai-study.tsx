import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { type FlashcardLabels, FlashcardsPanel } from '@/components/learning/lesson-tools';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Card, Interactive } from '@/components/ui/interactive';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { InlineNotice } from '@/components/ui/state-views';
import { Text, TextInput } from '@/components/ui/text';
import { Radius, Type, type ThemeColors } from '@/constants/theme';
import { AI_CARDS_KEY, aiCards, mergeCards, parseSavedCards } from '@/data/ai-study';
import type { Flashcard } from '@/data/flashcards';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { AiError, askLessonAi, type ChatTurn, type LessonQuestion, makeLessonCards, makeLessonQuestions } from '@/lib/ai-study-api';

// "Ask AI", "AI Flashcards" and "AI Questions" — tabs on every lesson. Both send the lesson's
// own text to Gemini 3.1 Flash-Lite through /api/ai, which keeps the key private.

export type AiLesson = { id: string; title: string; text: string };

const SUGGESTIONS = [
  'Explain this lesson in simple words',
  'What are the most important points to remember?',
  'Give me a memory trick for the hardest part',
  'Quiz me with one question',
];

const problemText = (problem: unknown) => (problem instanceof AiError ? problem.message : 'The AI could not answer right now. Please try again.');

// ── Ask AI ──────────────────────────────────────────────────────────

export function AskAiPanel({ lesson }: { lesson: AiLesson }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busyRef.current) return;
    busyRef.current = true;
    const history = turns;
    setTurns([...history, { role: 'user', text: question }]);
    setDraft('');
    setError(null);
    setBusy(true);
    try {
      const answer = await askLessonAi(lesson, question, history);
      if (alive.current) setTurns((current) => [...current, { role: 'model', text: answer }]);
    } catch (problem) {
      if (alive.current) setError(problemText(problem));
    } finally {
      busyRef.current = false;
      if (alive.current) setBusy(false);
    }
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Ask AI</Text>
      <Text style={styles.panelText}>Ask anything about “{lesson.title}”. The answers come from this lesson first. AI can make mistakes, so check important details against your lecture notes.</Text>

      {turns.length === 0 ? (
        <View style={styles.chips}>
          {SUGGESTIONS.map((suggestion) => (
            <Interactive key={suggestion} onPress={() => void send(suggestion)} disabled={busy} accessibilityRole="button" style={({ hovered }) => [styles.chip, hovered && styles.chipHover]}>
              <Icon name="sparkle" size={14} color={colors.primaryText} />
              <Text style={styles.chipText}>{suggestion}</Text>
            </Interactive>
          ))}
        </View>
      ) : (
        <View style={styles.thread}>
          {turns.map((turn, i) => (
            <View key={i} style={[styles.row, turn.role === 'user' && styles.rowUser]}>
              <Card tone={turn.role === 'user' ? 'primary' : 'surface'} style={styles.bubble}>
                <Text style={styles.who}>{turn.role === 'user' ? 'You' : 'Ask AI'}</Text>
                <Text selectable style={styles.message}>{turn.text}</Text>
              </Card>
            </View>
          ))}
          {busy ? (
            <View style={styles.row}>
              <Card style={styles.bubble}>
                <Text style={styles.who}>Ask AI</Text>
                <Text style={styles.panelText}>Thinking…</Text>
              </Card>
            </View>
          ) : null}
        </View>
      )}

      {error ? <InlineNotice tone="error" message={error} /> : null}

      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Ask a question about this lesson"
          placeholderTextColor={colors.textTertiary}
          accessibilityLabel="Ask a question about this lesson"
          multiline
          maxLength={1000}
          style={styles.input}
        />
        <Button label="Ask" icon={<Icon name="send" size={16} color={colors.onPrimary} />} onPress={() => void send(draft)} loading={busy} disabled={busy || !draft.trim()} />
      </View>
      {turns.length > 0 ? <Button label="Clear conversation" variant="ghost" size="sm" onPress={() => { setTurns([]); setError(null); }} disabled={busy} /> : null}
    </View>
  );
}

// ── AI Flashcards ───────────────────────────────────────────────────

const AI_LABELS: FlashcardLabels = {
  title: 'AI flashcards',
  intro: 'Cards the AI wrote from this lesson. Answer in your head, flip, then rate how it went. Cards you rate come back on a spaced schedule, like Anki.',
  front: 'QUESTION',
  back: 'ANSWER',
  hint: 'Think of the answer first, then tap to flip.',
};

const COUNTS = [5, 10, 15];

export function AiFlashcardsPanel({ lesson }: { lesson: AiLesson }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const [cards, setCards] = useState<Flashcard[] | null>(null);
  const [count, setCount] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const alive = useRef(true);
  const busyRef = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  useEffect(() => {
    let live = true;
    AsyncStorage.getItem(AI_CARDS_KEY(lesson.id))
      .then((saved) => { if (live) setCards(parseSavedCards(saved)); })
      .catch(() => { if (live) setCards([]); });
    return () => { live = false; };
  }, [lesson.id]);

  async function generate(addTo: Flashcard[]) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const made = await makeLessonCards(lesson, count, addTo.map((card) => card.front));
      const fresh = aiCards(lesson.id, made);
      const all = mergeCards(addTo, fresh);
      if (!alive.current) return;
      if (all.length === addTo.length) {
        setNote('The AI only came back with cards you already have. Try again for different ones.');
        return;
      }
      setCards(all);
      void AsyncStorage.setItem(AI_CARDS_KEY(lesson.id), JSON.stringify(all)).catch(() => {});
    } catch (problem) {
      if (alive.current) setError(problemText(problem));
    } finally {
      busyRef.current = false;
      if (alive.current) setBusy(false);
    }
  }

  function startOver() {
    setCards([]);
    setNote(null);
    setError(null);
    void AsyncStorage.removeItem(AI_CARDS_KEY(lesson.id)).catch(() => {});
  }

  if (cards === null) {
    return (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>AI flashcards</Text>
        <Text style={styles.panelText}>Loading your cards…</Text>
      </View>
    );
  }

  const picker = (
    <View style={styles.pickerRow}>
      <Text style={styles.pickerLabel}>Cards to make</Text>
      <SegmentedControl label="Cards to make" options={COUNTS.map((value) => ({ value: String(value), label: String(value) }))} value={String(count)} onChange={(value) => setCount(Number(value))} style={styles.picker} />
    </View>
  );

  if (cards.length === 0) {
    return (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>AI flashcards</Text>
        <Text style={styles.panelText}>The AI reads “{lesson.title}” and writes question-and-answer cards for you. Then you study them with spaced repetition. AI can make mistakes, so check anything that looks wrong against your notes.</Text>
        {picker}
        {error ? <InlineNotice tone="error" message={error} /> : null}
        {note ? <InlineNotice tone="info" message={note} /> : null}
        <Button label={busy ? 'Writing your cards…' : 'Make flashcards'} icon={<Icon name="sparkle" size={16} color={colors.onPrimary} />} onPress={() => void generate([])} loading={busy} disabled={busy} />
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <FlashcardsPanel cards={cards} labels={AI_LABELS} />
      <Card tone="muted" style={styles.more}>
        <Text style={styles.moreTitle}>{cards.length} AI card{cards.length === 1 ? '' : 's'} for this lesson</Text>
        {picker}
        {error ? <InlineNotice tone="error" message={error} /> : null}
        {note ? <InlineNotice tone="info" message={note} /> : null}
        <View style={styles.moreActions}>
          <Button label={busy ? 'Writing…' : 'Add more cards'} variant="secondary" icon={<Icon name="plus" size={16} color={colors.text} />} onPress={() => void generate(cards)} loading={busy} disabled={busy} />
          <Button label="Delete these cards" variant="ghost" icon={<Icon name="trash" size={16} color={colors.textSecondary} />} onPress={startOver} disabled={busy} />
        </View>
      </Card>
    </View>
  );
}

// ── AI Questions ────────────────────────────────────────────────────

const QUESTION_COUNTS = [5, 10];

export function AiQuestionsPanel({ lesson }: { lesson: AiLesson }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const [questions, setQuestions] = useState<LessonQuestion[] | null>(null);
  const [picks, setPicks] = useState<Record<number, number>>({});
  const [count, setCount] = useState(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  // Questions are made fresh each time and never saved: they are practice, not course content.
  async function generate() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const made = await makeLessonQuestions(lesson, count, (questions ?? []).map((item) => item.question));
      if (alive.current) {
        setQuestions(made);
        setPicks({});
      }
    } catch (problem) {
      if (alive.current) setError(problemText(problem));
    } finally {
      busyRef.current = false;
      if (alive.current) setBusy(false);
    }
  }

  const answered = Object.keys(picks).length;
  const correct = questions ? questions.reduce((total, item, i) => total + (picks[i] === item.answer ? 1 : 0), 0) : 0;

  const picker = (
    <View style={styles.pickerRow}>
      <Text style={styles.pickerLabel}>Questions to make</Text>
      <SegmentedControl label="Questions to make" options={QUESTION_COUNTS.map((value) => ({ value: String(value), label: String(value) }))} value={String(count)} onChange={(value) => setCount(Number(value))} style={styles.picker} />
    </View>
  );

  if (!questions) {
    return (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>AI questions</Text>
        <Text style={styles.panelText}>The AI reads “{lesson.title}” and writes multiple-choice questions to test yourself. Pick an answer to see if you were right and why. AI can make mistakes, so check anything that looks wrong against your notes.</Text>
        {picker}
        {error ? <InlineNotice tone="error" message={error} /> : null}
        <Button label={busy ? 'Writing your questions…' : 'Generate questions'} icon={<Icon name="sparkle" size={16} color={colors.onPrimary} />} onPress={() => void generate()} loading={busy} disabled={busy} />
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>AI questions</Text>
      {answered > 0 ? <Text style={styles.panelText}>{correct} of {answered} answered correctly so far.</Text> : null}
      {questions.map((item, index) => {
        const chosen = picks[index];
        const done = chosen !== undefined;
        return (
          <Card key={index} style={styles.questionCard}>
            <Text style={styles.who}>Question {index + 1}</Text>
            <Text style={styles.questionText}>{item.question}</Text>
            <View style={styles.optionList}>
              {item.options.map((option, optionIndex) => {
                const isAnswer = optionIndex === item.answer;
                const isWrongPick = done && chosen === optionIndex && !isAnswer;
                return (
                  <Interactive
                    key={optionIndex}
                    disabled={done}
                    accessibilityRole="button"
                    onPress={() => setPicks((current) => ({ ...current, [index]: optionIndex }))}
                    style={({ hovered }) => [
                      styles.option,
                      done && isAnswer && styles.optionRight,
                      isWrongPick && styles.optionWrong,
                      !done && hovered && styles.optionHover,
                    ]}
                  >
                    <Text style={styles.optionLetter}>{String.fromCharCode(65 + optionIndex)}</Text>
                    <Text style={styles.optionText}>{option}</Text>
                  </Interactive>
                );
              })}
            </View>
            {done ? (
              <Text style={[styles.feedback, chosen === item.answer ? styles.feedbackRight : styles.feedbackWrong]}>
                {chosen === item.answer ? 'Correct. ' : 'Not quite. '}
                {item.explanation}
              </Text>
            ) : null}
          </Card>
        );
      })}

      <Card tone="muted" style={styles.more}>
        <Text style={styles.moreTitle}>New set</Text>
        {picker}
        {error ? <InlineNotice tone="error" message={error} /> : null}
        <View style={styles.moreActions}>
          <Button label={busy ? 'Writing…' : 'Make new questions'} variant="secondary" icon={<Icon name="sparkle" size={16} color={colors.text} />} onPress={() => void generate()} loading={busy} disabled={busy} />
          <Button label="Clear questions" variant="ghost" onPress={() => { setQuestions(null); setPicks({}); setError(null); }} disabled={busy} />
        </View>
      </Card>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    panel: { gap: 12 },
    panelTitle: { ...Type.title2, color: colors.text },
    panelText: { fontSize: 14, lineHeight: 21, color: colors.textSecondary },
    chips: { gap: 8 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11, paddingHorizontal: 14, borderRadius: Radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    chipHover: { borderColor: colors.primaryBorder },
    chipText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
    thread: { gap: 10 },
    row: { flexDirection: 'row', justifyContent: 'flex-start' },
    rowUser: { justifyContent: 'flex-end' },
    bubble: { gap: 4, padding: 14, maxWidth: '92%' },
    who: { ...Type.overline, color: colors.primaryText },
    message: { fontSize: 14.5, lineHeight: 22, color: colors.text },
    composer: { gap: 10 },
    input: { minHeight: 74, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: Radius.md, backgroundColor: colors.surfaceSunken, padding: 12, color: colors.text, fontSize: 14.5, textAlignVertical: 'top' },
    pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
    picker: { minWidth: 190 },
    pickerLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
    more: { gap: 12, padding: 16, marginTop: 6 },
    moreTitle: { ...Type.headline, color: colors.text },
    moreActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    questionCard: { gap: 10, padding: 16 },
    questionText: { fontSize: 15.5, lineHeight: 23, fontWeight: '700', color: colors.text },
    optionList: { gap: 8 },
    option: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 12, borderRadius: Radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    optionHover: { borderColor: colors.primaryBorder },
    optionRight: { borderColor: colors.success, backgroundColor: colors.surfaceSunken },
    optionWrong: { borderColor: colors.error, backgroundColor: colors.surfaceSunken },
    optionLetter: { width: 24, fontSize: 13, fontWeight: '800', color: colors.primaryText },
    optionText: { flex: 1, fontSize: 14.5, lineHeight: 21, color: colors.text },
    feedback: { fontSize: 14, lineHeight: 21, fontWeight: '600' },
    feedbackRight: { color: colors.success },
    feedbackWrong: { color: colors.error },
  });
}
