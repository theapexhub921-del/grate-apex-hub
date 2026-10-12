import { router, type Href } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/interactive';
import { SectionHeader } from '@/components/ui/screen';

/** Personal goals: shown in Study and You (moved from Feed, owner request 2026-10-10). */
export function PersonalGoalsCard() {
  return (
    <Card style={styles.card}>
      <SectionHeader title="Personal goals" subtitle="Keep a study target in sight." style={styles.heading} />
      <Button label="View goals" variant="secondary" onPress={() => router.push('/goals' as Href)} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  heading: { marginBottom: 0 },
});
