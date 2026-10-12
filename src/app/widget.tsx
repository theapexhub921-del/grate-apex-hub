import { router } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';

import { LogoMark } from '@/components/logo-mark';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/interactive';
import { Screen } from '@/components/ui/screen';
import { Type, type ThemeColors } from '@/constants/theme';
import { useProgress } from '@/data/progress';
import { getRankProgress } from '@/data/ranks';
import { useThemedStyles } from '@/hooks/use-theme';
import { routes } from '@/lib/routes';

export default function StudyWidgetScreen() {
  const styles = useThemedStyles(createStyles);
  const progress = useProgress();
  const rank = getRankProgress(progress.xp);

  function closeWidget() {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.opener) {
      window.close();
      return;
    }
    router.back();
  }

  return (
    <Screen width="content" contentStyle={styles.page}>
      <View style={styles.brandRow}>
        <LogoMark height={26} />
        <View style={styles.brandCopy}>
          <Text style={styles.brandName}>GrAte Apex Hub</Text>
          <Text style={styles.brandLabel}>STUDY WIDGET</Text>
        </View>
      </View>

      <Card style={styles.progressCard}>
        <Text style={styles.eyebrow}>YOUR PROGRESS</Text>
        <Text style={styles.rank}>{rank?.rank.name ?? 'Fresher'}</Text>
        <View style={styles.metricGrid}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{progress.streak}</Text>
            <Text style={styles.metricLabel}>DAY STREAK</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{progress.xp.toLocaleString()}</Text>
            <Text style={styles.metricLabel}>TOTAL XP</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{progress.lessonsCompleted}</Text>
            <Text style={styles.metricLabel}>LESSONS DONE</Text>
          </View>
        </View>
        <View style={styles.levelRow}>
          <Text style={styles.levelLabel}>Level {progress.level}</Text>
          <Text style={styles.levelHint}>{progress.streak > 0 ? 'Keep your learning streak going.' : 'Start a study streak today.'}</Text>
        </View>
      </Card>

      <View style={styles.actions}>
        <Button label="Continue studying" variant="primary" fullWidth onPress={() => router.push(routes.learn())} />
        <Button label="Close widget" variant="ghost" fullWidth onPress={closeWidget} />
      </View>
      <Text style={styles.footer}>Progress syncs with your GrAte Apex Hub account.</Text>
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    page: { width: '100%', maxWidth: 420, alignSelf: 'center', flexGrow: 1, justifyContent: 'center', gap: 18, paddingVertical: 24 },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 },
    brandCopy: { gap: 1 },
    brandName: { fontSize: 20, fontWeight: '900', color: colors.text },
    brandLabel: { ...Type.overline, color: colors.textTertiary, fontSize: 9 },
    progressCard: { gap: 10, padding: 20 },
    eyebrow: { ...Type.overline, color: colors.primaryText },
    rank: { ...Type.title2, color: colors.text },
    metricGrid: { flexDirection: 'row', gap: 8, marginTop: 4 },
    metric: { flex: 1, minWidth: 0, borderRadius: 13, paddingVertical: 12, paddingHorizontal: 8, backgroundColor: colors.surfaceMuted, alignItems: 'center', gap: 3 },
    metricValue: { ...Type.numeral, fontSize: 19, color: colors.text },
    metricLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6, color: colors.textTertiary, textAlign: 'center' },
    levelRow: { borderTopWidth: 1, borderTopColor: colors.divider, marginTop: 3, paddingTop: 12, gap: 3 },
    levelLabel: { fontSize: 13, fontWeight: '800', color: colors.primaryText },
    levelHint: { fontSize: 12, lineHeight: 17, color: colors.textSecondary },
    actions: { gap: 7 },
    footer: { fontSize: 11, lineHeight: 16, color: colors.textTertiary, textAlign: 'center' },
  });
}
