import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { PressableCard } from '@/components/ui/interactive';
import { Pill } from '@/components/ui/pill';
import { Text } from '@/components/ui/text';
import { Type, type ThemeColors } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

export type Tile = { id: string; icon: IconName; title: string; detail: string; badge?: string; onPress: () => void; disabled?: boolean; hidden?: boolean };

const rows = <T,>(items: readonly T[], size: number) => Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, i * size + size));

/**
 * Uniform tiles: every tile has the same layout (icon, title, one or two lines,
 * an optional badge) and the same width and height in its row; an odd last
 * row keeps its tiles the same size. `columns` is the most per row; narrow
 * screens show fewer.
 */
export function TileGrid({ tiles, columns = 2 }: { tiles: readonly Tile[]; columns?: number }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const { width } = useWindowDimensions();
  const perRow = width < 640 ? 1 : width < 1100 ? Math.min(2, columns) : columns;
  const shown = tiles.filter((tile) => !tile.hidden);
  return (
    <View style={styles.grid}>
      {rows(shown, perRow).map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((tile) => (
            <PressableCard key={tile.id} onPress={tile.onPress} disabled={tile.disabled} accessibilityLabel={`${tile.title}. ${tile.detail}`} style={[styles.tile, tile.disabled && styles.off]}>
              <View style={styles.icon}><Icon name={tile.icon} size={20} color={colors.accentText} /></View>
              <View style={styles.text}>
                <View style={styles.head}>
                  <Text style={styles.title} numberOfLines={1}>{tile.title}</Text>
                  {tile.badge ? <Pill label={tile.badge} tone="gold" /> : null}
                </View>
                <Text style={styles.detail} numberOfLines={3}>{tile.detail}</Text>
              </View>
            </PressableCard>
          ))}
          {Array.from({ length: perRow - row.length }, (_, i) => <View key={`gap${i}`} style={styles.gap} />)}
        </View>
      ))}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    grid: { gap: 12 },
    row: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
    tile: { flex: 1, minWidth: 0, minHeight: 116, flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 16 },
    off: { opacity: 0.6 },
    gap: { flex: 1 },
    icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSubtle },
    text: { flex: 1, minWidth: 0, gap: 3 },
    head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { ...Type.headline, color: colors.text, flexShrink: 1 },
    detail: { fontSize: 13.5, lineHeight: 20, color: colors.textSecondary },
  });
}
