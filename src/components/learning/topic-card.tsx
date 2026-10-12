import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';

import { MemoryDistribution } from '@/components/learning/memory-ui';
import { SUBJECT_TINTS, TopicGlyph } from '@/components/learning/glyphs';
import { Icon } from '@/components/ui/icon';
import { PressableCard, Card } from '@/components/ui/interactive';
import { Pill } from '@/components/ui/pill';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Type, type ThemeColors } from '@/constants/theme';
import type { ContentTopic } from '@/data/lesson-types';
import { TOPIC_STATUS_LABEL, type TopicProgress } from '@/data/learning/progress-model';
import { describeAgo } from '@/data/learning/time';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { routes } from '@/lib/routes';

// A published topic with real progress.
export function TopicCard({ progress, now, compact }: { progress: TopicProgress; now: number; compact?: boolean }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const { topic } = progress;
  const tint = SUBJECT_TINTS[topic.subject ?? 'biochemistry'];
  const tone =
    progress.status === 'mastered'
      ? 'gold'
      : progress.status === 'completed'
        ? 'success'
        : progress.status === 'in-progress'
          ? 'primary'
          : 'neutral';

  return (
    <PressableCard
      onPress={() => router.push(routes.topic(topic.id))}
      accessibilityLabel={`${topic.title}. ${progress.completed} of ${progress.total} lessons completed. ${TOPIC_STATUS_LABEL[progress.status]}.`}
      style={[styles.card, { borderColor: `${tint.soft}55` }]}
    >
      <View style={styles.header}>
        <View style={[styles.emojiTile, { borderColor: `${tint.soft}66` }]} aria-hidden>
          <Text style={styles.topicEmoji}>{topic.emoji}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={2}>
            {topic.title}
          </Text>
          <View style={styles.pills}>
            <Pill label={TOPIC_STATUS_LABEL[progress.status]} tone={tone} />
            {progress.due > 0 ? <Pill label={`${progress.due} due`} tone="warning" /> : null}
          </View>
        </View>
        <View style={[styles.sparkle, { backgroundColor: colors.surfaceMuted }]} aria-hidden>
          <Icon name="sparkle" size={16} color={tint.soft} />
        </View>
      </View>

      {!compact ? (
        <Text style={styles.description} numberOfLines={2}>
          {topic.description}
        </Text>
      ) : null}

      <View style={styles.progressRow}>
        <ProgressBar value={progress.total ? progress.completed / progress.total : 0} height={6} style={styles.bar} label="Lessons completed" />
        <Text style={styles.progressText}>
          {progress.completed}/{progress.total} lessons
        </Text>
      </View>

      {progress.counts.tracked > 0 ? (
        <MemoryDistribution counts={progress.counts} legend={!compact} height={6} style={styles.memory} />
      ) : null}

      <Text style={styles.meta}>
        {progress.lastRevisedAt
          ? `Last revised ${describeAgo(progress.lastRevisedAt, now)} · mastery ${Math.round(progress.mastery * 100)}% (estimate)`
          : `${progress.conceptTotal} concepts · not started`}
      </Text>
    </PressableCard>
  );
}

// A topic whose lecture material is inventoried but not yet built.
export function PendingTopicCard({ topic }: { topic: ContentTopic }) {
  const styles = useThemedStyles(createStyles);
  const label =
    topic.status === 'needs-classification'
      ? 'Subject to be confirmed'
      : topic.status === 'empty'
        ? 'No usable lecture file in this ZIP'
        : 'Lecture material received · lessons in preparation';
  return (
    <Card style={[styles.card, styles.pending]}>
      <View style={styles.header}>
        <TopicGlyph title={topic.title} subject={topic.subject} size={46} />
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={2}>
            {topic.title}
          </Text>
          <Text style={styles.meta}>{label}</Text>
        </View>
      </View>
      {topic.outline && topic.outline.length > 0 ? (
        <Text style={styles.outline} numberOfLines={2}>
          Covers: {topic.outline.map((section) => section.title).join(' · ')}
        </Text>
      ) : null}
    </Card>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: { gap: 12, borderRadius: 22 },
    pending: { opacity: 0.8 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    emojiTile: { width: 46, height: 46, borderRadius: 14, borderWidth: 1, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-3deg' }] },
    topicEmoji: { fontSize: 26, lineHeight: 32 },
    icon: {
      width: 46,
      height: 46,
      borderRadius: 13,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emoji: { fontSize: 24 },
    headerText: { flex: 1, minWidth: 0, gap: 5 },
    sparkle: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    title: { ...Type.title3, fontSize: 17, lineHeight: 22, color: colors.text },
    pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    description: { fontSize: 13, lineHeight: 19, color: colors.textSecondary },
    progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    bar: { flex: 1 },
    progressText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
    memory: { marginTop: 2 },
    meta: { fontSize: 12, color: colors.textTertiary },
    outline: { fontSize: 12, lineHeight: 17, color: colors.textSecondary },
  });
}
