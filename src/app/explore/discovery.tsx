import { type Href, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Linking, type ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';

import { BackLink } from '@/components/learning/nav-bits';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Card, Interactive } from '@/components/ui/interactive';
import { Pill } from '@/components/ui/pill';
import { Screen } from '@/components/ui/screen';
import { ErrorScreen } from '@/components/ui/state-views';
import { Type, type ThemeColors } from '@/constants/theme';
import { getCategoryLabel, getExploreItem } from '@/data/explore';
import { useBackNavigation } from '@/hooks/use-back-navigation';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

const EXPLORE_HREF = '/explore' as Href;

// One reusable article screen for every Explore item.
// Opened as /explore/discovery?id=<item id>.
export default function DiscoveryScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const { id: idParam } = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const { goBack } = useBackNavigation();
  const scrollRef = useRef<ScrollView>(null);
  const item = getExploreItem(id);

  // This screen stays mounted in the background, so start each item at the top.
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [id]);

  if (!item) {
    return (
      <ErrorScreen
        title="Not found"
        message="This Explore item could not be found."
        primary={{ label: 'Back to Explore', onPress: () => goBack(EXPLORE_HREF) }}
      />
    );
  }

  const action = item.action;
  const status = item.provenance.status;

  return (
    <Screen ref={scrollRef} width="prose">
      <BackLink fallback={EXPLORE_HREF} label="Explore" />

      <View style={styles.header}>
        <View style={styles.kickerRow}>
          <Text style={styles.kicker}>
            {getCategoryLabel(item.category).toUpperCase()} · {item.topic.toUpperCase()}
          </Text>
          {status === 'draft' ? <Pill label="Draft — awaiting review" tone="warning" /> : status === 'reviewed' ? <Pill label="Reviewed" tone="success" /> : <Pill label="GrAte Apex Hub feature" tone="primary" />}
        </View>
        <Text style={styles.title} accessibilityRole="header">
          {item.title}
        </Text>
        <Text style={styles.standfirst}>{item.summary}</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.sectionLabel}>{item.category === 'grateapex' ? 'HOW IT WORKS' : 'THE BASIC IDEA'}</Text>
        <Text style={styles.paragraph}>{item.basicIdea}</Text>
      </View>

      {item.whyItMatters ? (
        <Card tone="insight" style={styles.why}>
          <View style={styles.whyHeader}>
            <Icon name="connection" size={16} color={colors.primaryText} />
            <Text style={styles.whyLabel}>WHY IT MATTERS</Text>
          </View>
          <Text style={styles.paragraph}>{item.whyItMatters}</Text>
        </Card>
      ) : null}

      {action ? <Button label={action.label} trailing="→" onPress={() => router.push(action.href as Href)} style={styles.action} /> : null}

      {/* Provenance / sources — always visible. */}
      <View style={styles.provenance}>
        <Text style={styles.sectionLabel}>{status === 'feature' ? 'ABOUT' : 'SOURCE'}</Text>
        <Text style={styles.provenanceText}>{item.provenance.note}</Text>
        {item.sources.map((source) => {
          const url = source.url;
          return url ? (
            <Interactive key={source.title} onPress={() => void Linking.openURL(url)} accessibilityRole="link" accessibilityLabel={source.title} style={styles.sourceRow}>
              <Icon name="connection" size={14} color={colors.primaryText} />
              <Text style={[styles.provenanceText, styles.sourceLink]}>{source.title}</Text>
            </Interactive>
          ) : (
            <Text key={source.title} style={styles.provenanceText}>
              • {source.title}
            </Text>
          );
        })}
      </View>
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    header: { marginTop: 20, marginBottom: 22, gap: 10 },
    kickerRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
    kicker: { ...Type.overline, color: colors.primaryText },
    title: { ...Type.display, color: colors.text },
    standfirst: { fontSize: 18, lineHeight: 27, color: colors.textSecondary },
    body: { gap: 8, paddingTop: 18, borderTopWidth: 1, borderTopColor: colors.divider },
    sectionLabel: { ...Type.overline, color: colors.textTertiary },
    paragraph: { fontSize: 16, lineHeight: 26, color: colors.text },
    why: { marginTop: 20, gap: 8 },
    whyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    whyLabel: { ...Type.overline, color: colors.primaryText },
    action: { alignSelf: 'flex-start', marginTop: 22 },
    provenance: { marginTop: 30, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.divider, gap: 6 },
    provenanceText: { fontSize: 13, lineHeight: 19, color: colors.textSecondary },
    sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sourceLink: { color: colors.primaryText, textDecorationLine: 'underline' },
  });
}
