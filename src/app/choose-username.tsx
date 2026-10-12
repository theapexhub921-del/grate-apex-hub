import { signOut } from 'firebase/auth';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, TextInput } from '@/components/ui/text';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/interactive';
import { PageHeader, Screen } from '@/components/ui/screen';
import { Radius, type ThemeColors, Type } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { chooseUsername } from '@/lib/accounts';
import { auth } from '@/lib/firebase';
import { cleanUsername, validateUsername } from '@/lib/login-identifier';

// /choose-username — hidden. The route guard (app/_layout.tsx) sends a
// signed-in learner here when their profile has no username in the shared
// format yet: a first Google sign-in, or an early account whose "username"
// was a full name. Usernames are shared with the original GRATEAPEX app and
// are what other students see; the display name stays separate.
export default function ChooseUsernameScreen() {
  const colors = useTheme();
  const styles = useThemedStyles(createStyles);
  const { user } = useAuth();
  const current = typeof user?.profile?.username === 'string' ? user.profile.username : '';
  const [value, setValue] = useState(() => cleanUsername(current).replace(/[^a-z0-9_]/g, '_').slice(0, 20));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const cleaned = cleanUsername(value);
  const problem = cleaned ? validateUsername(cleaned) : null;

  async function save() {
    if (saving || !cleaned || problem) return;
    setSaving(true);
    setError(null);
    try {
      await chooseUsername(cleaned);
      // The guard moves on as soon as the saved profile arrives.
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Your username could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen width="content" contentStyle={styles.page}>
      <PageHeader eyebrow="One more step" title="Choose your username" subtitle="Other students see your username. It is the same in the original GRATEAPEX app." />
      <Card style={styles.card}>
        {current ? (
          <Text style={styles.note}>
            “{current}” can’t be used as a username. It will be kept as your display name.
          </Text>
        ) : null}
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={(text) => { setValue(text); setError(null); }}
          onSubmitEditing={() => void save()}
          placeholder="e.g. kofi_a"
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          maxLength={20}
          accessibilityLabel="Username"
        />
        <Text style={[styles.hint, problem ? styles.problem : null]}>{problem ?? '3–20 characters: lowercase letters, numbers and underscores. You can change it at most once every 30 days.'}</Text>
        {error ? <Text style={[styles.hint, styles.problem]} accessibilityRole="alert">{error}</Text> : null}
        <View style={styles.actions}>
          <Button label="Save username" size="lg" fullWidth loading={saving} disabled={!cleaned || Boolean(problem)} onPress={() => void save()} />
          <Button label="Sign out" variant="ghost" onPress={() => void signOut(auth)} />
        </View>
      </Card>
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    page: { paddingBottom: 120 },
    card: { gap: 10, marginTop: 8 },
    note: { ...Type.callout, color: colors.textSecondary },
    label: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
    input: {
      minHeight: 50,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSunken,
      paddingHorizontal: 14,
      fontSize: 15,
      color: colors.text,
    },
    hint: { fontSize: 12.5, lineHeight: 18, color: colors.textSecondary },
    problem: { color: colors.error },
    actions: { gap: 8, marginTop: 6 },
  });
}
