import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Rich } from '@/components/learning/legacy-blocks';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { Card, Interactive, PressableCard } from '@/components/ui/interactive';
import { Pill } from '@/components/ui/pill';
import { Text, TextInput } from '@/components/ui/text';
import { Radius, Type, type ThemeColors } from '@/constants/theme';
import { cardCounts, type CardState, type Flashcard, nextLabel, rateCard, type Rating, studyQueue } from '@/data/flashcards';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

// A lesson's study tools, from the original app (in this app's look): read it,
// flashcards with spaced repetition, the glossary, mnemonics, key facts and the
// lesson's step-by-step process. (The review calendar lives in Study.)

export type ToolTab = 'read' | 'cards' | 'glossary' | 'mnemonics' | 'facts' | 'steps' | 'practice' | 'ask' | 'aicards';
export type ToolTabInfo = { id: ToolTab; label: string; icon: IconName };

export function LessonToolTabs({ tabs, active, onChange }: { tabs: readonly ToolTabInfo[]; active: ToolTab; onChange: (tab: ToolTab) => void }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs} style={styles.tabsWrap}>
      {tabs.map((tab) => {
        const on = tab.id === active;
        return (
          <Interactive key={tab.id} onPress={() => onChange(tab.id)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={({ hovered }) => [styles.tab, on && styles.tabOn, hovered && !on && styles.tabHover]}>
            <Icon name={tab.icon} size={15} color={on ? colors.onPrimary : colors.textSecondary} />
            <Text style={[styles.tabText, on && styles.tabTextOn]} numberOfLines={1}>{tab.label}</Text>
          </Interactive>
        );
      })}
    </ScrollView>
  );
}

// ── Glossary ─────────────────────────────────────────────────────────

export function GlossaryPanel({ glossary }: { glossary: readonly { term: string; meaning: string }[] }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const [query, setQuery] = useState('');
  const shown = glossary.filter((entry) => !query.trim() || `${entry.term} ${entry.meaning}`.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Glossary</Text>
      <Text style={styles.panelText}>Every key word in this lesson, A–Z.</Text>
      <TextInput value={query} onChangeText={setQuery} placeholder="Search the glossary" placeholderTextColor={colors.textTertiary} accessibilityLabel="Search the glossary" style={styles.search} />
      {shown.map((entry) => (
        <View key={entry.term} style={styles.glossRow}>
          <Text style={styles.glossTerm}>{entry.term}</Text>
          <Text style={styles.glossMeaning}>{entry.meaning}</Text>
        </View>
      ))}
      {shown.length === 0 ? <Text style={styles.panelText}>No key words match “{query.trim()}”.</Text> : null}
    </View>
  );
}

// ── Mnemonics and key facts ─────────────────────────────────────────

export function AidsPanel({ title, intro, groups }: { title: string; intro: string; groups: readonly { h: string; lines: readonly string[] }[] }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>{title}</Text>
      <Text style={styles.panelText}>{intro}</Text>
      {groups.map((group, index) => (
        <Card key={index} style={styles.aid}>
          <Rich x={group.h} style={styles.aidHead} />
          {group.lines.map((line, j) => (
            <View key={j} style={styles.aidLineRow}>
              <View style={styles.bullet} />
              <Rich x={line} style={styles.aidLine} />
            </View>
          ))}
        </Card>
      ))}
    </View>
  );
}

// ── Steps (the lesson's process, e.g. "How an enzyme catalyses a reaction") ─

export function StepsPanel({ steps }: { steps: { title: string; items: readonly { t: string; d: string }[] } }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>{steps.title}</Text>
      <Text style={styles.panelText}>The process, one step at a time.</Text>
      {steps.items.map((item, index) => (
        <View key={index} style={styles.stepRow}>
          <View style={styles.stepRail}>
            <View style={styles.stepNode}><Text style={styles.stepNum}>{index + 1}</Text></View>
            {index < steps.items.length - 1 ? <View style={styles.stepLine} /> : null}
          </View>
          <View style={styles.stepBody}>
            <Rich x={item.t} style={styles.stepTitle} />
            <Rich x={item.d} style={styles.aidLine} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Flashcards ──────────────────────────────────────────────────────

const STORE = 'grateapex_flashcards';
// Event-time helpers (kept outside the component: rendering itself stays pure).
const timeNow = () => Date.now();
const shuffled = <T,>(list: readonly T[]) => [...list].sort(() => Math.random() - 0.5);
type Mode = 'study' | 'quick' | 'all' | 'missed';
type Session = { mode: Mode; queue: Flashcard[]; index: number; flipped: boolean; reviewed: number };

const RATINGS: { id: Rating; label: string; tone: 'error' | 'warning' | 'primary' | 'success' }[] = [
  { id: 'again', label: 'Again', tone: 'error' },
  { id: 'hard', label: 'Hard', tone: 'warning' },
  { id: 'good', label: 'Good', tone: 'primary' },
  { id: 'easy', label: 'Easy', tone: 'success' },
];

export type FlashcardLabels = { title: string; intro: string; front: string; back: string; hint: string };
const TERM_LABELS: FlashcardLabels = {
  title: 'Flashcards',
  intro: 'Spaced repetition like Anki. See the term, say the meaning out loud, flip, then tell it how it went: Again, Hard, Good or Easy. The easier a card is, the longer it waits before it comes back.',
  front: 'TERM',
  back: 'MEANING',
  hint: 'Say the meaning out loud, then tap to flip.',
};

export function FlashcardsPanel({ cards, labels = TERM_LABELS }: { cards: readonly Flashcard[]; labels?: FlashcardLabels }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const [states, setStates] = useState<Record<string, CardState>>({});
  const [session, setSession] = useState<Session | null>(null);
  const [now, setNow] = useState(timeNow);

  useEffect(() => {
    let live = true;
    AsyncStorage.getItem(STORE)
      .then((saved) => { if (live && saved) setStates(JSON.parse(saved) as Record<string, CardState>); })
      .catch(() => {});
    return () => { live = false; };
  }, []);

  const counts = useMemo(() => cardCounts(cards, states, now), [cards, states, now]);
  const missed = useMemo(() => cards.filter((card) => states[card.id]?.last === 'again'), [cards, states]);
  const studyNow = useMemo(() => studyQueue(cards, states, now), [cards, states, now]);

  function start(mode: Mode) {
    const at = timeNow();
    setNow(at);
    const queue = mode === 'study' ? studyQueue(cards, states, at)
      : mode === 'quick' ? shuffled(cards).slice(0, 5)
      : mode === 'missed' ? missed
      : [...cards];
    if (queue.length) setSession({ mode, queue, index: 0, flipped: false, reviewed: 0 });
  }

  function rate(rating: Rating) {
    if (!session) return;
    const card = session.queue[session.index];
    const at = timeNow();
    const scheduled = session.mode === 'study' || session.mode === 'missed';
    let queue = session.queue;
    if (scheduled) {
      const next = rateCard(states[card.id], rating, at);
      const all = { ...states, [card.id]: next };
      setStates(all);
      void AsyncStorage.setItem(STORE, JSON.stringify(all)).catch(() => {});
      // Like Anki: a card still in learning comes back later in this session.
      if (next.learning && next.due - at <= 20 * 60_000) queue = [...queue, card];
    }
    setNow(at);
    setSession({ ...session, queue, index: session.index + 1, flipped: false, reviewed: session.reviewed + 1 });
  }

  if (!cards.length) {
    return (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Flashcards</Text>
        <Text style={styles.panelText}>This lesson has no key words to make cards from yet.</Text>
      </View>
    );
  }

  if (session && session.index >= session.queue.length) {
    return (
      <View style={styles.panel}>
        <Card style={styles.doneCard}>
          <Icon name="check" size={28} color={colors.successText} strokeWidth={2.6} />
          <Text style={styles.panelTitle}>Done for now</Text>
          <Text style={styles.panelText}>{session.reviewed} card{session.reviewed === 1 ? '' : 's'} {session.mode === 'study' || session.mode === 'missed' ? 'reviewed. They’ll come back when they’re due.' : 'gone through. Your schedule hasn’t changed.'}</Text>
          <Button label="Back to flashcards" onPress={() => { setNow(timeNow()); setSession(null); }} />
        </Card>
      </View>
    );
  }

  if (session) {
    const card = session.queue[session.index];
    const scheduled = session.mode === 'study' || session.mode === 'missed';
    const at = now;
    return (
      <View style={styles.panel}>
        <View style={styles.sessionHead}>
          <Text style={styles.sessionCount}>Card {session.index + 1} of {session.queue.length}</Text>
          <Button label="End" variant="ghost" size="sm" onPress={() => { setNow(timeNow()); setSession(null); }} />
        </View>
        <PressableCard onPress={() => setSession({ ...session, flipped: !session.flipped })} accessibilityLabel={session.flipped ? 'Card back. Tap to see the front' : 'Card front. Tap to flip'} style={styles.flashcard}>
          <Text style={styles.cardSide}>{session.flipped ? labels.back : labels.front}</Text>
          <Text style={session.flipped ? styles.cardBack : styles.cardFront}>{session.flipped ? card.back : card.front}</Text>
          {!session.flipped ? <Text style={styles.cardHint}>{labels.hint}</Text> : null}
        </PressableCard>
        {session.flipped ? (
          scheduled ? (
            <View style={styles.ratings}>
              {RATINGS.map((rating) => (
                <Interactive key={rating.id} onPress={() => rate(rating.id)} accessibilityRole="button" accessibilityLabel={`${rating.label}, next in ${nextLabel(states[card.id], rating.id, at)}`} style={[styles.rating, { borderColor: rating.tone === 'error' ? colors.errorBorder : rating.tone === 'warning' ? colors.warningBorder : rating.tone === 'success' ? colors.successBorder : colors.primaryBorder }]}>
                  <Text style={styles.ratingLabel}>{rating.label}</Text>
                  <Text style={styles.ratingNext}>{nextLabel(states[card.id], rating.id, at)}</Text>
                </Interactive>
              ))}
            </View>
          ) : (
            <View style={styles.ratings}>
              <Button label="Next card" trailing="→" onPress={() => rate('good')} />
            </View>
          )
        ) : (
          <Button label="Flip" variant="secondary" onPress={() => setSession({ ...session, flipped: true })} />
        )}
      </View>
    );
  }

  const options: { mode: Mode; title: string; detail: string; icon: IconName; count?: number; disabled?: boolean }[] = [
    { mode: 'study', title: `Study now (${studyNow.length})`, detail: `${counts.fresh} new · ${counts.learning} learning · ${counts.due} to review`, icon: 'reinforce', disabled: studyNow.length === 0 },
    { mode: 'quick', title: 'Quick recall check', detail: '5 random cards, a minute or less. Doesn’t change your schedule.', icon: 'timer' },
    { mode: 'all', title: `All cards (${cards.length})`, detail: 'Go through every card in this set. Doesn’t change your schedule.', icon: 'grid' },
    { mode: 'missed', title: `Missed (${missed.length})`, detail: 'Cards you rated Again last time.', icon: 'close', disabled: missed.length === 0 },
  ];
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>{labels.title}</Text>
      <Text style={styles.panelText}>{labels.intro}</Text>
      {options.map((option) => (
        <PressableCard key={option.mode} onPress={() => start(option.mode)} disabled={option.disabled} accessibilityLabel={`${option.title}. ${option.detail}`} style={[styles.option, option.disabled && styles.optionOff]}>
          <View style={styles.optionIcon}><Icon name={option.icon} size={18} color={colors.primaryText} /></View>
          <View style={styles.flex}>
            <Text style={styles.optionTitle}>{option.title}</Text>
            <Text style={styles.panelText}>{option.detail}</Text>
          </View>
          <Icon name="chevronRight" size={16} color={colors.textTertiary} />
        </PressableCard>
      ))}
      {counts.due === 0 && counts.fresh === 0 && counts.learning === 0 ? <Pill label="All caught up" tone="success" /> : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    tabsWrap: { flexGrow: 0, marginBottom: 16 },
    tabs: { gap: 8, paddingVertical: 2 },
    tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    tabOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    tabHover: { borderColor: colors.primaryBorder },
    tabText: { fontSize: 13.5, fontWeight: '700', color: colors.text, maxWidth: 240 },
    tabTextOn: { color: colors.onPrimary },
    panel: { gap: 12 },
    panelTitle: { ...Type.title2, color: colors.text },
    panelText: { fontSize: 14, lineHeight: 21, color: colors.textSecondary },
    search: { borderWidth: 1, borderColor: colors.borderStrong, borderRadius: Radius.md, backgroundColor: colors.surfaceSunken, padding: 12, color: colors.text, fontSize: 14 },
    glossRow: { gap: 3, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.divider },
    glossTerm: { fontSize: 15, fontWeight: '800', color: colors.primaryText },
    glossMeaning: { fontSize: 14, lineHeight: 21, color: colors.text },
    aid: { gap: 8 },
    aidHead: { fontSize: 15.5, fontWeight: '800', color: colors.text },
    aidLineRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accentText, marginTop: 8 },
    aidLine: { flex: 1, fontSize: 14.5, lineHeight: 22, color: colors.text },
    stepRow: { flexDirection: 'row', gap: 12 },
    stepRail: { width: 30, alignItems: 'center' },
    stepNode: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
    stepNum: { fontSize: 13, fontWeight: '800', color: colors.onPrimary },
    stepLine: { flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 4 },
    stepBody: { flex: 1, minWidth: 0, gap: 4, paddingBottom: 16 },
    stepTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
    option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
    optionOff: { opacity: 0.55 },
    optionIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySubtle },
    optionTitle: { ...Type.headline, color: colors.text },
    sessionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sessionCount: { ...Type.overline, color: colors.primaryText },
    flashcard: { minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
    cardSide: { ...Type.overline, color: colors.textTertiary },
    cardFront: { ...Type.title1, color: colors.text, textAlign: 'center' },
    cardBack: { fontSize: 17, lineHeight: 26, color: colors.text, textAlign: 'center' },
    cardHint: { fontSize: 13, color: colors.textTertiary, textAlign: 'center' },
    ratings: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
    rating: { minWidth: 92, flexGrow: 1, alignItems: 'center', gap: 2, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, backgroundColor: colors.surface },
    ratingLabel: { fontSize: 15, fontWeight: '800', color: colors.text },
    ratingNext: { fontSize: 12, color: colors.textSecondary },
    doneCard: { alignItems: 'center', gap: 10, padding: 24 },
  });
}
