import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Interactive } from '@/components/ui/interactive';
import { Text } from '@/components/ui/text';
import type { ThemeColors } from '@/constants/theme';
import { MAX_NOTE_LENGTH, saveQuestionNote, useQuestionNotes } from '@/data/question-notes';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

// A private note on one question: a mnemonic, or why it tripped you up. Shown with the question every time it comes back.
export function QuestionNote({ questionId }: { questionId: string }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const notes = useQuestionNotes();
  const saved = notes.get(questionId) ?? '';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open() {
    setDraft(saved);
    setError(null);
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await saveQuestionNote(questionId, draft);
      setEditing(false);
    } catch {
      setError('The note could not be saved. Check your connection and try again.');
    }
    setSaving(false);
  }

  if (editing) {
    return (
      <View style={styles.box}>
        <Text style={styles.kicker}>YOUR NOTE</Text>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          multiline
          maxLength={MAX_NOTE_LENGTH}
          autoFocus
          placeholder="A mnemonic, or why this one tripped you up…"
          placeholderTextColor={colors.textTertiary}
          accessibilityLabel="Note on this question"
          style={styles.input}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.actions}>
          <Button label="Save note" size="sm" onPress={() => void save()} loading={saving} />
          <Button label="Cancel" size="sm" variant="ghost" onPress={() => setEditing(false)} disabled={saving} />
          <Text style={styles.count}>{draft.length}/{MAX_NOTE_LENGTH}</Text>
        </View>
      </View>
    );
  }

  if (saved) {
    return (
      <View style={styles.box}>
        <Text style={styles.kicker}>YOUR NOTE</Text>
        <Text style={styles.noteText}>{saved}</Text>
        <Interactive onPress={open} accessibilityRole="button" accessibilityLabel="Edit your note" style={styles.link}>
          <Text style={styles.linkText}>Edit note</Text>
        </Interactive>
      </View>
    );
  }

  return (
    <Interactive onPress={open} accessibilityRole="button" accessibilityLabel="Add a note to this question" style={styles.link}>
      <Text style={styles.linkText}>+ Add a note</Text>
    </Interactive>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    box: { gap: 8, padding: 14, marginTop: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.1, color: colors.textTertiary },
    noteText: { fontSize: 14, lineHeight: 21, color: colors.text },
    input: { minHeight: 80, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border, color: colors.text, fontSize: 14, lineHeight: 20, textAlignVertical: 'top' },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    count: { marginLeft: 'auto', fontSize: 12, color: colors.textTertiary },
    error: { fontSize: 13, color: colors.error },
    link: { alignSelf: 'flex-start', paddingVertical: 8 },
    linkText: { fontSize: 13, fontWeight: '700', color: colors.primaryText },
  });
}
