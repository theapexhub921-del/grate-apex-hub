import { router, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/interactive';
import { PageHeader, Screen } from '@/components/ui/screen';
import { Type, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-theme';

export type LegalSection = { title: string; paragraphs?: string[]; points?: string[] };

// Public pages (privacy policy, terms) — readable without signing in.
export function LegalPage({ title, updated, intro, sections }: { title: string; updated: string; intro: string; sections: LegalSection[] }) {
  const styles = useThemedStyles(createStyles);
  return (
    <Screen width="prose">
      <PageHeader title={title} subtitle={`Last updated ${updated}`} style={styles.header} />
      <Card style={styles.card}>
        <Text style={styles.body}>{intro}</Text>
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.heading}>{section.title}</Text>
            {section.paragraphs?.map((paragraph) => (
              <Text key={paragraph} style={styles.body}>{paragraph}</Text>
            ))}
            {section.points?.map((point) => (
              <View key={point} style={styles.pointRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={[styles.body, styles.point]}>{point}</Text>
              </View>
            ))}
          </View>
        ))}
      </Card>
      <Button label="Back to GrAte Apex Hub" variant="secondary" onPress={() => router.replace('/' as Href)} style={styles.back} />
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    header: { marginTop: 14, marginBottom: 14 },
    card: { gap: 18 },
    section: { gap: 8 },
    heading: { ...Type.title3, color: colors.text },
    body: { ...Type.callout, color: colors.textSecondary },
    pointRow: { flexDirection: 'row', gap: 8 },
    bullet: { ...Type.callout, color: colors.textTertiary },
    point: { flex: 1 },
    back: { marginTop: 16, alignSelf: 'flex-start' },
  });
}
