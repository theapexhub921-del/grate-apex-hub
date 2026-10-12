import { StyleSheet, type TextStyle, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Icon } from '@/components/ui/icon';
import { Interactive } from '@/components/ui/interactive';
import { Text } from '@/components/ui/text';
import { webStyle } from '@/components/ui/web';
import { ACHIEVEMENT_COLORS, achievementEmoji, LOCKED_COLORS } from '@/data/achievement-art';
import type { AchievementState } from '@/data/achievements';
import { type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-theme';

// One achievement as a badge: a coloured tile with the original app's emoji
// and a "LEVEL n" ribbon. Not earned yet: a grey tile, faded emoji, "LOCKED".
// All five levels: a gold rim. Tap for the levels and progress.

export function AchievementBadge({ state, size = 76, onPress, showName = true }: { state: AchievementState; size?: number; onPress?: () => void; showName?: boolean }) {
  const styles = useThemedStyles(createStyles);
  const { def, level } = state;
  const earned = level > 0;
  const [top, bottom] = earned ? ACHIEVEMENT_COLORS[def.group] : LOCKED_COLORS;
  const id = `ach-${def.id}`;
  return (
    <Interactive
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${def.name}: ${earned ? `level ${level} of 5` : 'locked'}. ${state.next !== null ? `Next: ${def.goal(state.next)}.` : 'All five levels complete.'}`}
      style={({ hovered, pressed }) => [styles.wrap, { width: size + 8 }, hovered && styles.hover, pressed && styles.pressed]}
    >
      <View style={[styles.tile, { width: size, height: size, borderRadius: size * 0.22 }, level === 5 && styles.complete]}>
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={top} />
              <Stop offset="1" stopColor={bottom} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={size} height={size} rx={size * 0.22} fill={`url(#${id})`} />
          <Rect x={0} y={0} width={size} height={size * 0.5} rx={size * 0.22} fill="#FFFFFF" fillOpacity={0.12} />
        </Svg>
        <Text style={[styles.emoji, { fontSize: size * 0.44 }, !earned && styles.emojiLocked]}>{achievementEmoji(def.id)}</Text>
        <View style={[styles.ribbon, { bottom: size * 0.06 }]}>
          {earned ? null : <Icon name="lock" size={9} color={bottom} strokeWidth={2.4} />}
          <Text style={[styles.ribbonText, { color: bottom }]}>{earned ? `LEVEL ${level}` : 'LOCKED'}</Text>
        </View>
      </View>
      {showName ? (
        <Text style={styles.name} numberOfLines={2}>
          {def.name}
        </Text>
      ) : null}
    </Interactive>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { alignItems: 'center', gap: 6, ...webStyle({ transition: 'transform 120ms ease' }) },
    hover: { transform: [{ translateY: -2 }] },
    pressed: { transform: [{ scale: 0.96 }] },
    tile: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)' },
    complete: { borderColor: '#FDC00A', borderWidth: 3 },
    emoji: { marginTop: -8, zIndex: 1 },
    emojiLocked: { opacity: 0.45, ...webStyle({ filter: 'grayscale(1)' }) } as TextStyle,
    ribbon: { position: 'absolute', zIndex: 2, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: '#FFFFFF' },
    ribbonText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
    name: { fontSize: 11.5, lineHeight: 14, fontWeight: '700', color: colors.text, textAlign: 'center' },
  });
}
