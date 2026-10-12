import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';

import { Button } from '@/components/ui/button';
import { Card, Interactive } from '@/components/ui/interactive';
import { PageHeader, Screen, SectionHeader } from '@/components/ui/screen';
import { CLASS_IDS, readClassSelection, SEMESTERS, type ClassId, type Semester } from '@/data/class-curriculum';
import { useAuth } from '@/hooks/use-auth';
import { saveClassSelection } from '@/lib/accounts';
import { routes } from '@/lib/routes';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { type ThemeColors } from '@/constants/theme';

export default function ClassSelectionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colors = useTheme();
  const styles = useThemedStyles(createStyles);
  const [classId, setClassId] = useState<ClassId | null>(() => readClassSelection(user?.user_metadata)?.classId ?? null);
  const [semester, setSemester] = useState<Semester | null>(() => readClassSelection(user?.user_metadata)?.semester ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = readClassSelection(user?.user_metadata);
    if (saved) {
      router.replace(routes.learnEnvironment(saved));
    }
  }, [router, user]);

  async function confirmSelection() {
    if (!classId || !semester || saving) return;
    setSaving(true);
    setError(null);

    try {
      // Saved as hall + semester and locked, as the shared rules require.
      const saved = { classId, semester };
      await saveClassSelection(saved);
      router.replace(routes.learnEnvironment(saved));
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Your class selection could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen width="content" contentStyle={styles.page}>
      <PageHeader
        eyebrow="Your learning path"
        title="Choose your class and semester"
        subtitle="This sets the curriculum you’ll see in Study."
        style={styles.pageHeader}
      />

      <Card style={styles.selectionCard}>
        <SectionHeader title="Your class" subtitle="Choose the class you are currently in." style={styles.section} />
        <View style={styles.choices} accessibilityRole="radiogroup" accessibilityLabel="Choose your class">
          {CLASS_IDS.map((item) => {
            const selected = item === classId;
            return (
              <Interactive
                key={item}
                onPress={() => setClassId(item)}
                accessibilityRole="radio"
                accessibilityLabel={item}
                accessibilityState={{ selected }}
                style={[styles.choice, selected && styles.choiceSelected]}
              >
                <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{item}</Text>
              </Interactive>
            );
          })}
        </View>

        <SectionHeader title="Semester" subtitle={classId ? `Choose your current semester in ${classId}.` : 'Choose a class first.'} style={styles.semesterSection} />
        <View style={styles.choices} accessibilityRole="radiogroup" accessibilityLabel="Choose your semester">
          {SEMESTERS.map((item) => {
            const selected = item === semester;
            return (
              <Interactive
                key={item}
                onPress={() => classId && setSemester(item)}
                disabled={!classId}
                accessibilityRole="radio"
                accessibilityLabel={`Semester ${item}`}
                accessibilityState={{ selected, disabled: !classId }}
                style={[styles.semesterChoice, selected && styles.choiceSelected]}
              >
                <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>Semester {item}</Text>
              </Interactive>
            );
          })}
        </View>

        <View style={styles.note}>
          <Text style={styles.noteTitle}>Your choice is permanent</Text>
          <Text style={styles.noteText}>You can browse subjects from other classes in Study; that preview will not change your selected class. To fix a mistake later, ask an administrator.</Text>
        </View>

        {error ? <Text style={[styles.error, { color: colors.error }]} accessibilityRole="alert">{error}</Text> : null}
        <Button
          label={saving ? 'Saving your curriculum…' : 'Confirm my class'}
          onPress={confirmSelection}
          loading={saving}
          disabled={!classId || !semester}
          fullWidth
          style={styles.confirm}
        />
      </Card>
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    page: { width: '100%', maxWidth: 720, alignSelf: 'center', flexGrow: 1, justifyContent: 'center' },
    pageHeader: { marginBottom: 18 },
    selectionCard: { gap: 16 },
    section: { marginBottom: -6 },
    semesterSection: { marginTop: 2, marginBottom: -6 },
    choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    choice: { flexGrow: 1, flexBasis: '28%', alignItems: 'center', justifyContent: 'center', minHeight: 54, padding: 12, borderRadius: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline },
    semesterChoice: { flexGrow: 1, flexBasis: '44%', alignItems: 'center', justifyContent: 'center', minHeight: 48, padding: 10, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline },
    choiceSelected: { backgroundColor: colors.primarySubtle, borderColor: colors.primary, borderWidth: 1.5 },
    choiceText: { fontSize: 15, fontWeight: '800', color: colors.textSecondary },
    choiceTextSelected: { color: colors.primaryText },
    note: { gap: 3, borderRadius: 14, padding: 13, backgroundColor: colors.surfaceMuted },
    noteTitle: { fontSize: 13, fontWeight: '800', color: colors.text },
    noteText: { fontSize: 13, lineHeight: 19, color: colors.textSecondary },
    error: { fontSize: 13, lineHeight: 19, fontWeight: '600' },
    confirm: { marginTop: 1 },
  });
}
