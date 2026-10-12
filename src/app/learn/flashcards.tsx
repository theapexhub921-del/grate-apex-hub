import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';

import { BackLink } from '@/components/learning/nav-bits';
import { Button } from '@/components/ui/button';
import { Interactive } from '@/components/ui/interactive';
import { Pill } from '@/components/ui/pill';
import { PageHeader, Screen } from '@/components/ui/screen';
import { EmptyState } from '@/components/ui/state-views';
import { elevation, Radius, Type, type ThemeColors } from '@/constants/theme';
import { findLesson } from '@/data/curriculum';
import type { Lesson } from '@/data/lesson-types';
import { useThemedStyles } from '@/hooks/use-theme';
import { isLocalPreview } from '@/lib/local-preview';
import { routes } from '@/lib/routes';

// Flashcards (ported from the older Grate Apex Hub site) — LOCAL PREVIEW.
// Built only from the lesson's own lecture-based material: key terms from
// the reading layer and the lesson's recall prompts. Practice only.
type Flashcard = { id: string; front: string; back: string; kind: 'Term' | 'Recall' };

function buildCards(lesson: Lesson): Flashcard[] {
  const cards: Flashcard[] = [];
  const seen = new Set<string>();
  const add = (card: Flashcard) => {
    const key = card.front.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    cards.push(card);
  };
  lesson.chunks.forEach((chunk, c) =>
    chunk.terms?.forEach((term, t) => add({ id: `term-${c}-${t}`, front: term.term, back: term.meaning, kind: 'Term' }))
  );
  lesson.interactive?.forEach((step, s) => {
    if (step.type === 'learn') step.terms?.forEach((term, t) => add({ id: `learn-${s}-${t}`, front: term.term, back: term.meaning, kind: 'Term' }));
    if (step.type === 'recall') add({ id: `recall-${s}`, front: step.recall.prompt, back: step.recall.answer.join('\n'), kind: 'Recall' });
  });
  return cards;
}

export default function FlashcardsScreen() {
  const styles = useThemedStyles(createStyles);
  const { lesson: lessonParam } = useLocalSearchParams<{ lesson?: string }>();
  const entry = findLesson(typeof lessonParam === 'string' ? lessonParam : null);
  const cards = useMemo(() => (entry ? buildCards(entry.lesson) : []), [entry]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);

  if (!isLocalPreview()) {
    return (
      <Screen width="prose">
        <EmptyState icon="lock" title="Coming soon" message="Flashcards are being prepared." />
      </Screen>
    );
  }

  if (!entry || cards.length === 0) {
    return (
      <Screen width="prose">
        <BackLink fallback={routes.learn()} />
        <EmptyState icon="lesson" title="No flashcards" message={entry ? 'This lesson has no key terms or recall prompts yet.' : 'That lesson could not be found.'} />
      </Screen>
    );
  }

  const done = index >= cards.length;
  const card = cards[Math.min(index, cards.length - 1)];

  function next(gotIt: boolean) {
    if (gotIt) setKnown((value) => value + 1);
    setFlipped(false);
    setIndex((value) => value + 1);
  }

  return (
    <Screen width="prose">
      <BackLink fallback={routes.lesson(entry.lesson.id, { layer: 'read' })} />
      <PageHeader title="Flashcards" subtitle={`${entry.topic.title} · ${entry.lesson.title}`} style={styles.header} />
      <View style={styles.meta}>
        <Pill label="Local preview" tone="warning" />
        <Text style={styles.count}>{done ? `${cards.length} / ${cards.length}` : `${index + 1} / ${cards.length}`}</Text>
      </View>

      {done ? (
        <View style={[styles.card, styles.center]}>
          <Text style={styles.front}>Deck finished</Text>
          <Text style={styles.back}>You knew {known} of {cards.length}.</Text>
          <Button label="Go again" onPress={() => { setIndex(0); setKnown(0); setFlipped(false); }} />
        </View>
      ) : (
        <>
          <Interactive onPress={() => setFlipped((value) => !value)} accessibilityLabel={flipped ? 'Show the question' : 'Show the answer'} style={styles.card}>
            <Text style={styles.kind}>{card.kind === 'Term' ? 'KEY TERM' : 'RECALL'}{flipped ? ' · ANSWER' : ''}</Text>
            <Text style={flipped ? styles.back : styles.front}>{flipped ? card.back : card.front}</Text>
            {!flipped ? <Text style={styles.hint}>Tap to flip</Text> : null}
          </Interactive>
          {flipped ? (
            <View style={styles.actions}>
              <Button label="Again" variant="secondary" onPress={() => next(false)} />
              <Button label="Got it" onPress={() => next(true)} />
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    header: { marginTop: 14, marginBottom: 10 },
    meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    count: { ...Type.numeral, fontSize: 14, color: colors.textSecondary },
    card: {
      minHeight: 240,
      padding: 24,
      gap: 14,
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.hairline,
      ...elevation(colors, 2),
    },
    center: { alignItems: 'center' },
    kind: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: colors.textTertiary },
    front: { ...Type.title2, color: colors.text },
    back: { ...Type.body, color: colors.text },
    hint: { fontSize: 12.5, color: colors.textTertiary },
    actions: { flexDirection: 'row', gap: 12, marginTop: 14, justifyContent: 'center' },
  });
}
