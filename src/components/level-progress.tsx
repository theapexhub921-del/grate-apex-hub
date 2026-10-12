import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Text } from '@/components/ui/text';

import { getLevelProgress } from '@/data/progression';
import { ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-theme';

type LevelProgressCardProps = {
  xp: number;
  // Compact: bar + one line, for use inside another card.
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

// Shows progress toward the next level, calculated from existing XP.
export function LevelProgressCard({ xp, compact, style }: LevelProgressCardProps) {
  const styles = useThemedStyles(createStyles);

  const progress = getLevelProgress(xp);

  const bar = (
    <View
      style={styles.track}
      accessibilityRole="progressbar"
      accessibilityLabel={`${progress.xpIntoLevel} of ${progress.xpForLevel} XP toward Level ${progress.nextLevel}`}
      accessibilityValue={{
        min: 0,
        max: progress.xpForLevel,
        now: progress.xpIntoLevel,
      }}
    >
      <View style={[styles.fill, { width: `${progress.percent}%` }]} />
    </View>
  );

  if (compact) {
    return (
      <View style={[styles.compact, style]}>
        {bar}
        <Text style={[styles.caption, styles.captionCentered]}>
          {progress.xpIntoLevel} / {progress.xpForLevel} XP ·{' '}
          {progress.xpToNextLevel} XP to Level {progress.nextLevel}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, style]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Progress to Level {progress.nextLevel}</Text>
        <Text style={styles.xpText}>
          {progress.xpIntoLevel} / {progress.xpForLevel} XP
        </Text>
      </View>

      {bar}

      <Text style={styles.caption}>
        {progress.xpToNextLevel} XP to go
      </Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
    },
    compact: {
      width: '100%',
      maxWidth: 280,
      marginTop: 12,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 10,
    },
    title: {
      flexShrink: 1,
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      marginRight: 8,
    },
    xpText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    track: {
      height: 10,
      backgroundColor: colors.track,
      borderRadius: 10,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 10,
    },
    caption: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 8,
      textAlign: 'left',
    },
    captionCentered: {
      textAlign: 'center',
    },
  });
}
