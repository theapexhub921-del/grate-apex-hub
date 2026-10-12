import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Card } from '@/components/ui/interactive';
import { Pill } from '@/components/ui/pill';
import { Type, type ThemeColors } from '@/constants/theme';
import { ACADEMIC_TRIAL_DAYS, academicTrialMetadata, readAcademicTrial, type ClassSelection } from '@/data/class-curriculum';
import { useAuth } from '@/hooks/use-auth';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function ClassAccessCard({ target, current, lessonsComplete, lessonsTotal, trialUsed, trialExpiresAt, onStartTrial, onBack }: {
  target: ClassSelection;
  current: ClassSelection;
  lessonsComplete: number;
  lessonsTotal: number;
  trialUsed: boolean;
  trialExpiresAt?: number;
  onStartTrial: () => void;
  onBack: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  useEffect(() => { const timer = setTimeout(() => setNow(Date.now()), 0); return () => clearTimeout(timer); }, []);
  const remaining = now && trialExpiresAt ? Math.max(0, Math.ceil((trialExpiresAt - now) / 86400000)) : 0;
  async function startTrial() {
    if (saving || trialUsed || !user) return;
    setSaving(true);
    setError(null);
    try {
      const startedAt = Date.now();
      await setDoc(
        doc(db, 'users', user.id),
        {
          trialStartedAt: serverTimestamp(),
          ...academicTrialMetadata(startedAt),
        },
        { merge: true }
      );
      setSaving(false);
      onStartTrial();
    } catch (err: any) {
      setSaving(false);
      setError(err?.message ?? 'The free trial could not be saved. Try again.');
    }
  }
  return <Card style={styles.card} tone="insight">
    <View style={styles.heading}><View style={styles.icon}><Icon name="lock" size={20} color={colors.primaryText} /></View><View style={styles.copy}><Text style={styles.kicker}>NEXT LEVEL · {target.classId} · SEMESTER {target.semester}</Text><Text style={styles.title}>Finish the required content first</Text></View><Pill label="Locked" /></View>
    <Text style={styles.body}>Complete the lessons in {current.classId}, Semester {current.semester} to unlock this class. Levels open in order, and earlier classes remain available for review.</Text>
    <View style={styles.progress}><Text style={styles.progressText}>{lessonsComplete} of {lessonsTotal} lessons completed in {current.classId}, Semester {current.semester}</Text></View>
    {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
    <View style={styles.actions}>
      <Button label={trialUsed ? (remaining > 0 ? `Trial active · ${remaining} days left` : '7-day trial already used') : `Start your ${ACADEMIC_TRIAL_DAYS}-day free trial`} variant="gold" onPress={() => void startTrial()} disabled={trialUsed || saving} loading={saving} />
      <Button label="Pay to unlock · coming soon" variant="secondary" disabled />
      <Button label="Back to my class" variant="ghost" onPress={onBack} />
    </View>
    <Text style={styles.footnote}>Your free trial opens future class content for 7 days. Payment options will be added later.</Text>
  </Card>;
}

function createStyles(colors: ThemeColors) { return StyleSheet.create({
  card: { gap: 13, maxWidth: 760, padding: 20 }, heading: { flexDirection: 'row', alignItems: 'center', gap: 12 }, icon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySubtle }, copy: { flex: 1, gap: 3 }, kicker: { ...Type.overline, color: colors.primaryText }, title: { ...Type.title3, color: colors.text }, body: { ...Type.body, color: colors.textSecondary }, progress: { padding: 12, borderRadius: 12, backgroundColor: colors.surfaceMuted }, progressText: { fontSize: 13, fontWeight: '700', color: colors.text }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, footnote: { fontSize: 12, lineHeight: 18, color: colors.textTertiary }, error: { fontSize: 13, color: colors.error },
}); }
