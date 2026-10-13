import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { BackLink } from '@/components/learning/nav-bits';
import { Icon } from '@/components/ui/icon';
import { Card, Interactive } from '@/components/ui/interactive';
import { PageHeader, Screen } from '@/components/ui/screen';
import { InlineNotice } from '@/components/ui/state-views';
import { Text, TextInput } from '@/components/ui/text';
import { Radius, Type, type ThemeColors } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { askStudyChat } from '@/lib/ai-chat-api';
import { AiError, type ChatTurn } from '@/lib/ai-study-api';

// Study chat: ask the AI anything, not tied to a lesson.

const SUGGESTIONS = [
  'Explain glycolysis like I am new to it',
  'Make me a 7-day study plan for my exams',
  'Give me a memory trick for the cranial nerves',
  'Quiz me on basic medical chemistry',
];

export default function StudyChatScreen() {
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

  async function send(raw: string) {
    const message = raw.trim();
    if (!message || busyRef.current) return;
    busyRef.current = true;
    const history = turns;
    setTurns([...history, { role: 'user', text: message }]);
    setDraft('');
    setError(null);
    setBusy(true);
    try {
      const answer = await askStudyChat(message, history);
      if (alive.current) setTurns((current) => [...current, { role: 'model', text: answer }]);
    } catch (problem) {
      if (alive.current) setError(problem instanceof AiError ? problem.message : 'The AI could not answer right now. Please try again.');
    } finally {
      busyRef.current = false;
      if (alive.current) setBusy(false);
    }
  }

  return (
    <Screen width="content">
      <BackLink fallback={'/learn' as never} />
      <PageHeader eyebrow="Learn" title="Study chat" subtitle="Ask anything: concepts, study plans, memory tricks, quizzes. AI can make mistakes, so check exam details against your notes." />

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
                <Text style={styles.who}>{turn.role === 'user' ? 'You' : 'Study chat'}</Text>
                <Text selectable style={styles.message}>{turn.text}</Text>
              </Card>
            </View>
          ))}
          {busy ? (
            <View style={styles.row}>
              <Card style={styles.bubble}>
                <Text style={styles.who}>Study chat</Text>
                <Text style={styles.hint}>Thinking…</Text>
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
          placeholder="Ask anything"
          placeholderTextColor={colors.textTertiary}
          accessibilityLabel="Message Study chat"
          multiline
          maxLength={4000}
          style={styles.input}
        />
        <Button label="Send" icon={<Icon name="send" size={16} color={colors.onPrimary} />} onPress={() => void send(draft)} loading={busy} disabled={busy || !draft.trim()} />
      </View>
      {turns.length > 0 ? <Button label="New chat" variant="ghost" size="sm" onPress={() => { setTurns([]); setError(null); }} disabled={busy} /> : null}
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
    hint: { fontSize: 14, lineHeight: 21, color: colors.textSecondary },
    composer: { gap: 10 },
    input: { minHeight: 74, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: Radius.md, backgroundColor: colors.surfaceSunken, padding: 12, color: colors.text, fontSize: 14.5, textAlignVertical: 'top' },
  });
}
