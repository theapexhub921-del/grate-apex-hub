import { doc, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Interactive } from '@/components/ui/interactive';
import { Text, TextInput } from '@/components/ui/text';
import { Radius, type ThemeColors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { auth, db } from '@/lib/firebase';

export const ABOUT_MAX = 160; // the shared rules allow a bio of up to 160 characters

// You → "About": a short line about yourself ("just a chill guy") that other
// learners see on your profile card and profile page (users/{uid}.bio).
export function AboutEditor() {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const { user } = useAuth();
  const saved = typeof user?.profile?.bio === 'string' ? (user.profile.bio as string) : '';
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setBusy(true);
    setError(null);
    try {
      await setDoc(doc(db, 'users', uid), { bio: text.trim().slice(0, ABOUT_MAX) }, { merge: true });
      setEditing(false);
    } catch {
      setError('Your about could not be saved. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <Interactive onPress={() => { setText(saved); setEditing(true); }} accessibilityRole="button" accessibilityLabel={saved ? `About: ${saved}. Edit` : 'Add an about'} style={styles.view}>
        <Text style={saved ? styles.about : styles.placeholder} numberOfLines={3}>{saved || 'Add an about — a line other learners see on your profile'}</Text>
        <Icon name="edit" size={14} color={colors.textTertiary} />
      </Interactive>
    );
  }
  return (
    <View style={styles.editor}>
      <TextInput value={text} onChangeText={setText} maxLength={ABOUT_MAX} multiline placeholder="e.g. Just a chill guy who loves physiology" placeholderTextColor={colors.textTertiary} accessibilityLabel="About you" style={styles.input} autoFocus />
      <View style={styles.row}>
        <Text style={styles.count}>{text.length}/{ABOUT_MAX}</Text>
        <Button label="Cancel" size="sm" variant="ghost" onPress={() => setEditing(false)} disabled={busy} />
        <Button label="Save" size="sm" onPress={() => void save()} loading={busy} />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    view: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 4, alignSelf: 'flex-start', maxWidth: '100%' },
    about: { flexShrink: 1, fontSize: 14, lineHeight: 20, color: colors.text },
    placeholder: { flexShrink: 1, fontSize: 13.5, lineHeight: 20, color: colors.textTertiary, fontStyle: 'italic' },
    editor: { gap: 8, alignSelf: 'stretch' },
    input: { minHeight: 64, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: Radius.md, backgroundColor: colors.surfaceSunken, padding: 10, color: colors.text, fontSize: 14, textAlignVertical: 'top' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'flex-end' },
    count: { flex: 1, fontSize: 12, color: colors.textTertiary },
    error: { fontSize: 12.5, color: colors.error },
  });
}
