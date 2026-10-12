import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text, TextInput } from '@/components/ui/text';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { QuestionFigure } from '@/components/learning/figure-view';
import { Icon } from '@/components/ui/icon';
import { Interactive } from '@/components/ui/interactive';
import { Pill } from '@/components/ui/pill';
import { webStyle } from '@/components/ui/web';
import { SPRING } from '@/constants/motion';
import { elevation, Type, type ThemeColors } from '@/constants/theme';
import { difficultyLabel } from '@/data/lesson-types';
import { useAnswerBouncePreference } from '@/data/settings';
import {
  type Answer,
  correctAnswerText,
  isAnswerCorrect,
  type Question,
  stableShuffle,
} from '@/data/questions';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

// Draws any question type (choice, true/false, multi-select, type-in,
// ordering, matching) and, once `revealed`, turns the answer into a
// learning event: what was right, why, which concept was tested, and
// when it will come back. Used by lesson checkpoints, the Lesson Quiz,
// Review and the Apex Challenge (compact).

type QuestionCardProps = {
  question: Question;
  value: Answer | undefined;
  onChange: (value: Answer) => void;
  revealed: boolean; // show right/wrong + explanation, and lock input
  heading?: string; // e.g. "QUESTION 3"
  onSubmitTyped?: () => void; // Enter key in a type-in answer
  retry?: boolean; // shown again later in the lesson
  shuffleSeed?: string;
  keyboard?: boolean; // 1–9 / A–Z select options (web)
  reviewNote?: string | null; // e.g. "This concept comes back for review tomorrow."
  compact?: boolean; // Apex: minimal chrome
  showMeta?: boolean; // difficulty / type chips
};

function choiceOrder(question: Extract<Question, { type: 'choice' | 'multi' }>, seed: string) {
  if (question.type === 'choice' && question.fixedOrder) return question.options.map((_, index) => index);
  return stableShuffle(question.options.length, `${seed}:choices`);
}

function typeLabel(question: Question) {
  if (question.type === 'choice' && question.fixedOrder && question.options.length === 2) return 'True or false';
  switch (question.type) {
    case 'choice':
      return 'Multiple choice';
    case 'multi':
      return 'Select all';
    case 'type':
      return 'Type the answer';
    case 'order':
      return 'Put in order';
    case 'match':
      return 'Match';
  }
}

function answerText(question: Question, value: Answer | undefined): string | null {
  if (value === undefined) return null;
  switch (question.type) {
    case 'choice':
      return typeof value === 'number' ? question.options[value] ?? null : null;
    case 'multi':
      return Array.isArray(value) ? value.map((index) => question.options[index]).join('; ') : null;
    case 'type':
      return typeof value === 'string' ? value : null;
    case 'order':
      return Array.isArray(value) ? value.map((index) => question.items[index]).join(' → ') : null;
    default:
      return null;
  }
}

export function QuestionCard({
  question,
  value,
  onChange,
  revealed,
  heading,
  onSubmitTyped,
  retry,
  shuffleSeed,
  keyboard = false,
  reviewNote,
  compact = false,
  showMeta = false,
}: QuestionCardProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const reduceMotion = useReducedMotion();
  const answerBounceEnabled = useAnswerBouncePreference();
  const correct = revealed && isAnswerCorrect(question, value);
  const seed = shuffleSeed ?? question.id;

  // Feedback motion: a small pop and a springing check when right; a
  // quiet settle when wrong (clear, but never punishing — no shaking).
  const pop = useSharedValue(1);
  const mark = useSharedValue(revealed ? 1 : 0);
  useEffect(() => {
    if (!revealed) {
      mark.value = 0;
      return;
    }
    if (reduceMotion || !answerBounceEnabled) {
      mark.value = 1;
      pop.value = 1;
      return;
    }
    mark.value = 0;
    mark.value = withSpring(1, SPRING.pop);
    pop.value = correct
      ? withSequence(withTiming(1.015, { duration: 110 }), withSpring(1, { damping: 12 }))
      : withSequence(withTiming(0.995, { duration: 90 }), withTiming(1, { duration: 160 }));
  }, [revealed, correct, reduceMotion, answerBounceEnabled, pop, mark]);
  const motion = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const markStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, mark.value * 1.4), transform: [{ scale: 0.4 + 0.6 * mark.value }] }));

  const headingParts = [heading, retry ? 'TRY AGAIN' : question.label?.toUpperCase()].filter(Boolean);
  const yourAnswer = !correct && revealed ? answerText(question, value) : null;

  return (
    <Animated.View style={[styles.card, compact && styles.cardCompact, motion]}>
      {headingParts.length > 0 && <Text style={styles.heading}>{headingParts.join(' · ')}</Text>}

      <Text style={[styles.prompt, compact && styles.promptCompact]} accessibilityRole="header">
        {question.prompt}
      </Text>

      {question.figure ? <QuestionFigure figure={question.figure} revealed={revealed} /> : null}

      {showMeta && !compact ? (
        <View style={styles.meta}>
          <Pill label={typeLabel(question)} />
          <Pill
            label={difficultyLabel(question.difficulty)}
            tone={question.difficulty === 'advanced' ? 'warning' : question.difficulty === 'intermediate' ? 'primary' : 'neutral'}
          />
          {question.clinical ? <Pill label="Clinical" tone="success" /> : null}
        </View>
      ) : null}

      {(question.type === 'choice' || question.type === 'multi') && (
        <OptionsInput
          question={question}
          value={value}
          onChange={onChange}
          revealed={revealed}
          order={choiceOrder(question, seed)}
          keyboard={keyboard}
          compact={compact}
        />
      )}

      {question.type === 'type' && (
        <TypeInput
          placeholder={question.placeholder}
          value={(value as string | undefined) ?? ''}
          onChange={onChange}
          revealed={revealed}
          correct={correct}
          onSubmit={onSubmitTyped}
        />
      )}

      {question.type === 'order' && (
        <OrderInput
          question={question}
          value={(value as number[] | undefined) ?? []}
          onChange={onChange}
          revealed={revealed}
          shuffleSeed={seed}
        />
      )}

      {question.type === 'match' && (
        <MatchInput
          question={question}
          value={(value as number[] | undefined) ?? question.pairs.map(() => -1)}
          onChange={onChange}
          revealed={revealed}
          shuffleSeed={seed}
        />
      )}

      {revealed && !compact && (
        <View
          style={[styles.feedback, correct ? styles.feedbackCorrect : styles.feedbackIncorrect]}
          accessibilityLiveRegion="polite"
        >
          <View style={styles.feedbackHeader}>
            <Animated.View style={[styles.feedbackMark, correct ? styles.feedbackMarkCorrect : styles.feedbackMarkIncorrect, markStyle]}>
              <Icon name={correct ? 'check' : 'reinforce'} size={15} color={correct ? '#FFFFFF' : colors.warningStrong} strokeWidth={correct ? 3 : 2.2} />
            </Animated.View>
            <Text style={[styles.feedbackTitle, correct ? styles.feedbackTitleCorrect : styles.feedbackTitleIncorrect]}>
              {correct ? 'Correct.' : 'Not quite.'}
            </Text>
          </View>

          {!correct && yourAnswer ? (
            <Text style={styles.feedbackLine}>
              <Text style={styles.feedbackLabel}>You answered: </Text>
              {yourAnswer}
            </Text>
          ) : null}

          {!correct && (
            <Text style={styles.feedbackLine}>
              <Text style={styles.feedbackLabel}>Correct answer: </Text>
              {correctAnswerText(question)}
            </Text>
          )}

          {correct && question.takeaway ? (
            <Text style={styles.feedbackText}>
              <Text style={styles.feedbackLabel}>Remember: </Text>
              {question.takeaway}
            </Text>
          ) : question.explanation ? (
            <Text style={styles.feedbackText}>{question.explanation}</Text>
          ) : null}

          <View style={styles.feedbackFooter}>
            <Text style={styles.conceptText}>Concept tested: {question.concept}</Text>
            {!correct && reviewNote ? <Text style={styles.reviewNote}>{reviewNote}</Text> : null}
          </View>
        </View>
      )}

      {revealed && compact && (
        <Text style={[styles.compactResult, correct ? styles.feedbackTitleCorrect : styles.feedbackTitleIncorrect]}>
          {correct ? 'Correct' : `Answer: ${correctAnswerText(question)}`}
        </Text>
      )}
    </Animated.View>
  );
}

// ─── Multiple choice / select all ──────────────────────────────────

function OptionsInput({
  question,
  value,
  onChange,
  revealed,
  order,
  keyboard,
  compact,
}: {
  question: Extract<Question, { type: 'choice' | 'multi' }>;
  value: Answer | undefined;
  onChange: (value: Answer) => void;
  revealed: boolean;
  order: number[];
  keyboard: boolean;
  compact: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const multi = question.type === 'multi';
  const selectedList = multi ? ((value as number[] | undefined) ?? []) : [];

  function choose(answerIndex: number) {
    if (revealed) return;
    if (multi) {
      onChange(
        selectedList.includes(answerIndex)
          ? selectedList.filter((item) => item !== answerIndex)
          : [...selectedList, answerIndex]
      );
    } else {
      onChange(answerIndex);
    }
  }

  const shortcuts: Record<string, () => void> = {};
  order.forEach((answerIndex, displayIndex) => {
    shortcuts[String(displayIndex + 1)] = () => choose(answerIndex);
    shortcuts[String.fromCharCode(97 + displayIndex)] = () => choose(answerIndex);
  });
  useKeyboardShortcuts(shortcuts, keyboard && !revealed);

  return (
    <View accessibilityRole={multi ? undefined : 'radiogroup'}>
      {multi && <Text style={styles.hint}>Select all that apply.</Text>}
      {order.map((answerIndex, displayIndex) => {
        const selected = multi ? selectedList.includes(answerIndex) : value === answerIndex;
        const isRight = multi ? question.answers.includes(answerIndex) : answerIndex === (question as { answer: number }).answer;
        return (
          <Interactive
            key={answerIndex}
            onPress={() => choose(answerIndex)}
            disabled={revealed}
            accessibilityRole={multi ? 'checkbox' : 'radio'}
            accessibilityState={{ checked: selected, selected }}
            accessibilityLabel={`Option ${String.fromCharCode(65 + displayIndex)}: ${question.options[answerIndex]}`}
            style={({ hovered, pressed }) => [
              styles.option,
              compact && styles.optionCompact,
              hovered && !revealed && styles.optionHover,
              selected && styles.optionSelected,
              revealed && isRight && styles.optionRight,
              revealed && selected && !isRight && styles.optionWrong,
              pressed && styles.optionPressed,
              revealed && styles.optionStatic,
            ]}
          >
            {multi ? (
              <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                {selected && <Icon name="check" size={14} color={colors.onPrimary} strokeWidth={3} />}
              </View>
            ) : (
              <View style={[styles.optionBadge, selected && styles.optionBadgeSelected]}>
                <Text style={[styles.optionBadgeText, selected && styles.optionBadgeTextSelected]}>
                  {String.fromCharCode(65 + displayIndex)}
                </Text>
              </View>
            )}
            <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{question.options[answerIndex]}</Text>
            {revealed && isRight ? <Icon name="check" size={18} color={colors.success} strokeWidth={2.6} style={styles.optionMark} /> : null}
            {revealed && selected && !isRight ? <Icon name="close" size={16} color={colors.warningStrong} strokeWidth={2.4} style={styles.optionMark} /> : null}
          </Interactive>
        );
      })}
    </View>
  );
}

// ─── Type-in / fill in the blank ────────────────────────────────────

function TypeInput({
  placeholder,
  value,
  onChange,
  revealed,
  correct,
  onSubmit,
}: {
  placeholder?: string;
  value: string;
  onChange: (value: Answer) => void;
  revealed: boolean;
  correct: boolean;
  onSubmit?: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();

  return (
    <View>
      <TextInput
        style={[styles.textInput, revealed && (correct ? styles.textInputRight : styles.textInputWrong)]}
        value={value}
        onChangeText={onChange}
        editable={!revealed}
        placeholder={placeholder ?? 'Type your answer'}
        placeholderTextColor={colors.textTertiary}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={!revealed}
        returnKeyType="done"
        onSubmitEditing={onSubmit}
        accessibilityLabel="Your answer"
      />
      {!revealed ? <Text style={styles.hint}>Spelling, capitals and spaces are forgiven where they don’t change the meaning.</Text> : null}
    </View>
  );
}

// ─── Ordering ───────────────────────────────────────────────────────

function OrderInput({
  question,
  value,
  onChange,
  revealed,
  shuffleSeed,
}: {
  question: Extract<Question, { type: 'order' }>;
  value: number[];
  onChange: (value: Answer) => void;
  revealed: boolean;
  shuffleSeed: string;
}) {
  const styles = useThemedStyles(createStyles);
  const shuffled = useMemo(
    () => stableShuffle(question.items.length, `${shuffleSeed}:order`),
    [question, shuffleSeed]
  );
  const remaining = shuffled.filter((index) => !value.includes(index));

  return (
    <View>
      <Text style={styles.hint}>Tap the items in the correct order. Tap a placed item to remove it.</Text>

      {value.map((itemIndex, position) => {
        const isRight = question.items[itemIndex] === question.items[position];
        return (
          <Interactive
            key={itemIndex}
            style={({ hovered }) => [
              styles.option,
              styles.optionSelected,
              hovered && !revealed && styles.optionHover,
              revealed && (isRight ? styles.optionRight : styles.optionWrong),
            ]}
            onPress={() => onChange(value.filter((item) => item !== itemIndex))}
            disabled={revealed}
            accessibilityLabel={`Position ${position + 1}: ${question.items[itemIndex]}. Tap to remove.`}
          >
            <View style={[styles.optionBadge, styles.optionBadgeSelected]}>
              <Text style={[styles.optionBadgeText, styles.optionBadgeTextSelected]}>{position + 1}</Text>
            </View>
            <Text style={[styles.optionText, styles.optionTextSelected]}>{question.items[itemIndex]}</Text>
          </Interactive>
        );
      })}

      {remaining.length > 0 && (
        <View style={styles.pool}>
          {remaining.map((itemIndex) => (
            <Interactive
              key={itemIndex}
              style={({ hovered }) => [styles.chip, hovered && styles.chipHover]}
              onPress={() => onChange([...value, itemIndex])}
              disabled={revealed}
              accessibilityLabel={`Add: ${question.items[itemIndex]}`}
            >
              <Text style={styles.chipText}>{question.items[itemIndex]}</Text>
            </Interactive>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Matching ───────────────────────────────────────────────────────

function MatchInput({
  question,
  value,
  onChange,
  revealed,
  shuffleSeed,
}: {
  question: Extract<Question, { type: 'match' }>;
  value: number[];
  onChange: (value: Answer) => void;
  revealed: boolean;
  shuffleSeed: string;
}) {
  const styles = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();
  const [activeLeft, setActiveLeft] = useState<number | null>(null);
  const rightOrder = useMemo(
    () => stableShuffle(question.pairs.length, `${shuffleSeed}:match`),
    [question, shuffleSeed]
  );

  const matchedCount = value.filter((choice) => choice >= 0).length;
  const stacked = width < 520;

  function chooseLeft(leftIndex: number) {
    if (revealed) return;
    if (value[leftIndex] >= 0) {
      const next = [...value];
      next[leftIndex] = -1;
      onChange(next);
      setActiveLeft(null);
      return;
    }
    setActiveLeft(activeLeft === leftIndex ? null : leftIndex);
  }

  function chooseRight(rightIndex: number) {
    if (revealed || activeLeft === null) return;
    const next = [...value];
    const previousLeft = next.findIndex((match) => match === rightIndex);
    if (previousLeft >= 0 && previousLeft !== activeLeft) next[previousLeft] = -1;
    next[activeLeft] = rightIndex;
    onChange(next);
    setActiveLeft(null);
  }

  return (
    <View>
      <Text style={styles.hint}>
        {matchedCount === question.pairs.length
          ? 'All pairs matched. Tap a matched item to change it.'
          : 'Tap an item on the left, then its match on the right.'}
      </Text>

      <View style={[styles.matchColumns, stacked && styles.matchColumnsStacked]}>
        <View style={styles.matchColumn}>
          {question.pairs.map((pair, leftIndex) => {
            const rightIndex = value[leftIndex];
            const matched = rightIndex >= 0;
            const selected = activeLeft === leftIndex;
            const isRight = matched && question.pairs[rightIndex]?.right === pair.right;
            return (
              <Interactive
                key={`left-${leftIndex}`}
                style={({ hovered }) => [
                  styles.matchOption,
                  hovered && !revealed && styles.optionHover,
                  selected && styles.matchOptionSelected,
                  matched && styles.matchOptionMatched,
                  revealed && matched && (isRight ? styles.matchRight : styles.matchWrong),
                ]}
                onPress={() => chooseLeft(leftIndex)}
                disabled={revealed}
                accessibilityState={{ selected, disabled: revealed }}
                accessibilityLabel={matched ? `${pair.left}, matched with ${question.pairs[rightIndex].right}` : pair.left}
              >
                <Text style={[styles.matchOptionText, matched && styles.matchTextMatched]}>{pair.left}</Text>
                {matched && !revealed && (
                  <Text style={styles.matchPartnerText} numberOfLines={2}>
                    {question.pairs[rightIndex].right}
                  </Text>
                )}
              </Interactive>
            );
          })}
        </View>

        <View style={styles.matchColumn}>
          {rightOrder.map((rightIndex) => {
            const leftIndex = value.findIndex((match) => match === rightIndex);
            const matched = leftIndex >= 0;
            const isRight = matched && question.pairs[leftIndex].right === question.pairs[rightIndex].right;
            return (
              <Interactive
                key={`right-${rightIndex}`}
                style={({ hovered }) => [
                  styles.matchOption,
                  hovered && activeLeft !== null && !revealed && styles.optionHover,
                  matched && styles.matchOptionMatched,
                  revealed && matched && (isRight ? styles.matchRight : styles.matchWrong),
                ]}
                onPress={() => chooseRight(rightIndex)}
                disabled={revealed || activeLeft === null}
                accessibilityLabel={question.pairs[rightIndex].right}
                accessibilityState={{ selected: matched, disabled: revealed || activeLeft === null }}
              >
                <Text style={[styles.matchOptionText, matched && styles.matchTextMatched]}>
                  {question.pairs[rightIndex].right}
                </Text>
              </Interactive>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      padding: 22,
      marginBottom: 18,
      borderWidth: 1,
      borderColor: colors.hairline,
      ...elevation(colors, 1),
    },
    cardCompact: { padding: 18, marginBottom: 12 },
    heading: { fontSize: 11, fontWeight: '800', color: colors.textTertiary, letterSpacing: 1, marginBottom: 10 },
    prompt: { ...Type.title3, fontSize: 19, lineHeight: 27, marginBottom: 16, color: colors.text },
    promptCompact: { fontSize: 20, lineHeight: 28 },
    meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: -6, marginBottom: 14 },
    hint: { fontSize: 13, color: colors.textTertiary, marginBottom: 10, lineHeight: 18 },

    option: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 14,
      paddingVertical: 13,
      paddingHorizontal: 14,
      marginBottom: 10,
      minHeight: 52,
      backgroundColor: colors.surface,
      ...webStyle({ transitionProperty: 'border-color, background-color, transform', transitionDuration: '120ms' }),
    },
    optionCompact: { paddingVertical: 15 },
    optionHover: { borderColor: colors.primaryBorder, backgroundColor: colors.surfaceMuted },
    optionPressed: { transform: [{ scale: 0.99 }] },
    optionStatic: { ...webStyle({ cursor: 'default' }) },
    optionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySubtle },
    optionRight: { borderColor: colors.success, backgroundColor: colors.successSubtle },
    optionWrong: { borderColor: colors.warningBorder, backgroundColor: colors.warningSubtle },
    optionBadge: {
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    optionBadgeSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    optionBadgeText: { fontSize: 13, fontWeight: '800', color: colors.text },
    optionBadgeTextSelected: { color: colors.onPrimary },
    optionText: { flex: 1, fontSize: 15, lineHeight: 21, color: colors.text },
    optionTextSelected: { fontWeight: '600' },
    optionMark: { marginLeft: 8 },
    optionMarkWrong: { color: colors.error },

    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    checkboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    checkboxTick: { color: colors.onPrimary, fontSize: 14, fontWeight: 'bold' },

    textInput: {
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 14,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.surfaceMuted,
      marginBottom: 6,
    },
    textInputRight: { borderColor: colors.success },
    textInputWrong: { borderColor: colors.error },

    pool: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    chipHover: { borderColor: colors.primaryBorder },
    chipText: { fontSize: 14, color: colors.text },

    matchColumns: { flexDirection: 'row', alignItems: 'stretch', gap: 10 },
    matchColumn: { flex: 1, minWidth: 0, gap: 8 },
    matchColumnsStacked: { flexDirection: 'column' },
    matchPartnerText: { fontSize: 11, lineHeight: 15, color: colors.textTertiary, textAlign: 'center', marginTop: 3 },
    matchOption: {
      minHeight: 48,
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 9,
    },
    matchOptionSelected: { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.primarySubtle },
    matchOptionMatched: { borderColor: colors.primaryBorder, backgroundColor: colors.surface },
    matchTextMatched: { color: colors.textSecondary },
    matchRight: { borderColor: colors.success, backgroundColor: colors.successSubtle },
    matchWrong: { borderColor: colors.error, backgroundColor: colors.errorSubtle },
    matchOptionText: { fontSize: 13, lineHeight: 18, color: colors.text, textAlign: 'center' },

    feedback: { borderRadius: 16, padding: 16, marginTop: 10, gap: 6 },
    feedbackCorrect: { backgroundColor: colors.successSubtle },
    feedbackIncorrect: { backgroundColor: colors.warningSubtle },
    feedbackTitle: { fontSize: 16, fontWeight: '800' },
    feedbackHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    feedbackMark: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    feedbackMarkCorrect: { backgroundColor: colors.success },
    feedbackMarkIncorrect: { backgroundColor: colors.warningBorder },
    feedbackTitleCorrect: { color: colors.successText },
    feedbackTitleIncorrect: { color: colors.warningStrong },
    feedbackLine: { fontSize: 14, color: colors.text, lineHeight: 20 },
    feedbackLabel: { fontWeight: '800' },
    feedbackText: { fontSize: 14, color: colors.textSecondary, lineHeight: 21 },
    feedbackFooter: { marginTop: 4, gap: 3 },
    conceptText: { fontSize: 12, fontWeight: '700', color: colors.textTertiary },
    reviewNote: { fontSize: 12, fontWeight: '700', color: colors.warningText },
    compactResult: { fontSize: 15, fontWeight: '800', marginTop: 4 },
  });
}
