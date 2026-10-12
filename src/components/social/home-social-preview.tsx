import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Card } from '@/components/ui/interactive';
import { Pill } from '@/components/ui/pill';
import { SectionHeader } from '@/components/ui/screen';
import { Type, type ThemeColors } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

const PEOPLE = [
  { name: 'Ama', update: 'Finally submitted everything for this week.' },
  { name: 'Kojo', update: 'What made your week better?' },
];

export function HomeSocialPreview() {
  const colors = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.group}>
      <Card style={styles.card}>
        <SectionHeader title="Stories" subtitle="Quick moments from your circle." style={styles.noMargin} right={<Pill label="Preview" />} />
        <View style={styles.stories}>
          <View style={styles.story}><View style={styles.add}><Icon name="plus" size={18} color={colors.primaryText} /></View><Text style={styles.storyLabel}>Your story</Text></View>
          {PEOPLE.map((person) => <View key={person.name} style={styles.story}><Avatar name={person.name} size={48} ring="gold" /><Text style={styles.storyLabel}>{person.name}</Text></View>)}
        </View>
      </Card>
      <Card style={styles.card}>
        <SectionHeader title="From your people" subtitle="Everyday life belongs here, too." style={styles.noMargin} />
        {PEOPLE.slice(0, 1).map((person) => (
          <View key={person.name} style={styles.post}>
            <Avatar name={person.name} size={38} ring="subtle" />
            <View style={styles.postBody}>
              <Text style={styles.name}>{person.name} Mensah <Text style={styles.sample}>· Sample</Text></Text>
              <Text style={styles.message}>{person.update}</Text>
              <Text style={styles.meta}>8 reactions · 2 replies</Text>
            </View>
          </View>
        ))}
        <Button label="View all in Connect" variant="secondary" size="sm" trailing="›" onPress={() => router.push('/social' as never)} />
      </Card>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    group: { gap: 14 },
    card: { gap: 12 },
    noMargin: { marginBottom: 0 },
    stories: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
    story: { width: 58, alignItems: 'center', gap: 6 },
    add: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: colors.primaryBorder, backgroundColor: colors.primarySubtle, alignItems: 'center', justifyContent: 'center' },
    storyLabel: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, textAlign: 'center' },
    post: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    postBody: { flex: 1, gap: 4 },
    name: { fontSize: 13, fontWeight: '800', color: colors.text },
    sample: { fontWeight: '600', color: colors.textTertiary },
    message: { ...Type.callout, color: colors.text },
    meta: { fontSize: 11.5, color: colors.textTertiary },
  });
}

