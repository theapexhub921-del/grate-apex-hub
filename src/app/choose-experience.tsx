import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { Atmosphere } from '@/components/atmosphere/atmosphere';
import { LegacyBackground } from '@/components/experience/legacy-background';
import { LegacyFloatingBar } from '@/components/experience/legacy-navigation';
import { FloatingTabBar } from '@/components/floating-tab-bar';
import { SubjectGlyph } from '@/components/learning/glyphs';
import { Button } from '@/components/ui/button';
import { Card, Interactive } from '@/components/ui/interactive';
import { Pill } from '@/components/ui/pill';
import { PageHeader, Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Radius, type ThemeColors, Type } from '@/constants/theme';
import { DEFAULT_EXPERIENCE, EXPERIENCE_INFO, EXPERIENCES, type ExperienceId, isExperience, saveExperience } from '@/data/experience';
import { useAuth } from '@/hooks/use-auth';
import { ExperiencePreview } from '@/hooks/use-experience';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

// /choose-experience — hidden. The route guard sends a learner here when the
// experience switch is on and they have not chosen yet (there is no default).
// Settings → Experience opens the same choice later.
//
// Each option shows a live preview: a small screen drawn with the app's real
// components in that experience (background, fonts, cards, buttons, course
// icon and navigation), in the learner's own themes.
export default function ChooseExperienceScreen() {
  const styles = useThemedStyles(createStyles);
  const { user } = useAuth();
  const saved = isExperience(user?.profile?.experience) ? user?.profile?.experience : null;
  const [choice, setChoice] = useState<ExperienceId | null>(saved ?? DEFAULT_EXPERIENCE);
  const [saving, setSaving] = useState(false);
  // One roomy card per experience: preview beside its description on wide screens.
  const wide = useWindowDimensions().width >= 760;
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!choice || saving) return;
    setSaving(true);
    setError(null);
    try {
      await saveExperience(choice);
      router.replace('/');
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Your experience could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen width="content" contentStyle={styles.page}>
      <PageHeader
        eyebrow="Your app"
        title="Choose your experience"
        subtitle="This changes how the app looks and is laid out — not your account, progress, friends, messages, achievements or XP. You can change it any time in Settings."
      />
      <View style={styles.list} accessibilityRole="radiogroup">
        {EXPERIENCES.map((id) => {
          const selected = choice === id;
          return (
            <Interactive
              key={id}
              onPress={() => setChoice(id)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${EXPERIENCE_INFO[id].name}: ${EXPERIENCE_INFO[id].summary}`}
              style={styles.optionWrap}
            >
              <Card style={[styles.option, wide && styles.optionWide, selected ? styles.selected : null]}>
                <View style={wide ? styles.sampleWide : null}>
                  <ExperienceSample experience={id} />
                </View>
                <View style={[styles.copy, wide && styles.copyWide]}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{EXPERIENCE_INFO[id].name}</Text>
                  {id === DEFAULT_EXPERIENCE ? <Pill label="Default" tone="gold" /> : null}
                </View>
                <Text style={styles.summary}>{EXPERIENCE_INFO[id].summary}</Text>
                {selected ? <Text style={styles.chosen}>Selected</Text> : null}
                </View>
              </Card>
            </Interactive>
          );
        })}
      </View>
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      <Button label="Continue" size="lg" fullWidth disabled={!choice || !user} loading={saving} onPress={() => void confirm()} />
    </Screen>
  );
}

/** A small, non-interactive screen in one experience. */
function ExperienceSample({ experience }: { experience: ExperienceId }) {
  return (
    <ExperiencePreview experience={experience}>
      <SampleScreen experience={experience} />
    </ExperiencePreview>
  );
}

function SampleScreen({ experience }: { experience: ExperienceId }) {
  const colors = useTheme();
  const styles = useThemedStyles(createSampleStyles);
  return (
    <View style={[styles.frame, { borderColor: colors.border }]} pointerEvents="none" aria-hidden>
      {experience === 'originate' ? <Atmosphere mood="calm" /> : <LegacyBackground />}
      <View style={styles.content}>
        <PageHeader title="Study" subtitle="Pick up where you left off." style={styles.header} />
        <Card style={styles.card}>
          <View style={styles.cardRow}>
            <SubjectGlyph subject="biochemistry" size={44} />
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Biochemistry</Text>
              <Text style={styles.cardMeta}>Fatty Acid Biosynthesis</Text>
            </View>
          </View>
          <Button label="Resume" size="sm" />
        </Card>
      </View>
      {experience === 'originals' ? <LegacyFloatingBar onNavigate={() => {}} /> : <FloatingTabBar onNavigate={() => {}} />}
    </View>
  );
}

function createSampleStyles(colors: ThemeColors) {
  return StyleSheet.create({
    frame: { height: 330, borderRadius: 18, borderWidth: 1, overflow: 'hidden', position: 'relative', marginBottom: 14, backgroundColor: colors.background },
    content: { padding: 16, zIndex: 1 },
    header: { marginBottom: 12 },
    card: { gap: 12 },
    cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    cardText: { flex: 1, minWidth: 0 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    cardMeta: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  });
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    page: { paddingBottom: 120, gap: 14 },
    list: { gap: 14 },
    optionWrap: { width: '100%' },
    optionWide: { flexDirection: 'row', alignItems: 'center', gap: 22 },
    sampleWide: { width: 380 },
    copy: { gap: 6 },
    copyWide: { flex: 1, minWidth: 0 },
    chosen: { ...Type.overline, color: colors.primaryText, marginTop: 6 },
    option: { gap: 4, borderWidth: 2, borderColor: 'transparent', borderRadius: Radius.lg, flex: 1 },
    selected: { borderColor: colors.primary },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    name: { ...Type.title3, color: colors.text },
    summary: { fontSize: 14.5, lineHeight: 22, color: colors.textSecondary },
    error: { fontSize: 13, color: colors.error },
  });
}
