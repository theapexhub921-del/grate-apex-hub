import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Interactive } from '@/components/ui/interactive';
import { Text } from '@/components/ui/text';
import { type ThemeColors } from '@/constants/theme';
import type { TimetableBlock } from '@/data/planning';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

// The personal timetable as a real week calendar: days across (Monday first,
// today highlighted), hours down, each block drawn at its time and length in
// a colour for its subject, and a line for "now". Tap a block to edit it.

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOUR = 56; // pixels per hour

const minutes = (time: string) => {
  const [h, m] = time.slice(0, 5).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
const label = (hour: number) => `${String(hour).padStart(2, '0')}:00`;

/** Monday of this week (local time). */
function mondayOf(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

export function WeekTimetable({ entries, onSelect }: { entries: readonly TimetableBlock[]; onSelect?: (entry: TimetableBlock) => void }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Hours shown: the blocks' span, at least 08:00–18:00.
  const [first, last] = useMemo(() => {
    let start = 8 * 60;
    let end = 18 * 60;
    for (const entry of entries) {
      start = Math.min(start, minutes(entry.start_time));
      end = Math.max(end, minutes(entry.end_time));
    }
    return [Math.max(0, Math.floor(start / 60)), Math.min(24, Math.ceil(end / 60))];
  }, [entries]);
  const hours = Array.from({ length: last - first }, (_, i) => first + i);

  // A colour per subject (the theme's tints), so a subject looks the same all week.
  const palette = useMemo(
    () => [
      { bg: colors.primarySubtle, edge: colors.primary, text: colors.primaryText },
      { bg: colors.successSubtle, edge: colors.success, text: colors.successText },
      { bg: colors.accentSubtle, edge: colors.accent, text: colors.accentText },
      { bg: colors.infoSubtle, edge: colors.info, text: colors.infoText },
      { bg: colors.errorSubtle, edge: colors.error, text: colors.error },
      { bg: colors.warningSubtle, edge: colors.warningStrong, text: colors.warningText },
    ],
    [colors]
  );
  const colourOf = (entry: TimetableBlock) => {
    const key = (entry.subject || entry.title).toLowerCase();
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
    return palette[h % palette.length];
  };

  const monday = mondayOf(now);
  const todayIndex = (now.getDay() + 6) % 7;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowTop = ((nowMinutes - first * 60) / 60) * HOUR;
  const showNow = nowMinutes >= first * 60 && nowMinutes <= last * 60;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroller}>
      <View style={styles.grid}>
        {/* Day headers */}
        <View style={styles.headRow}>
          <View style={styles.gutter} />
          {DAYS.map((day, i) => {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            const today = i === todayIndex;
            return (
              <View key={day} style={styles.dayHead}>
                <View style={[styles.dayChip, today && styles.dayChipToday]}>
                  <Text style={[styles.dayName, today && styles.dayTodayText]}>{day}</Text>
                  <Text style={[styles.dayDate, today && styles.dayTodayText]}>{date.getDate()}</Text>
                </View>
              </View>
            );
          })}
        </View>
        {/* Hours and blocks */}
        <View style={styles.body}>
          <View style={styles.gutter}>
            {hours.map((hour) => (
              <Text key={hour} style={[styles.hour, { height: HOUR }]}>{label(hour)}</Text>
            ))}
          </View>
          {DAYS.map((day, dayIndex) => (
            <View key={day} style={[styles.column, { height: hours.length * HOUR }, dayIndex === todayIndex && styles.columnToday]}>
              {hours.map((hour) => <View key={hour} style={[styles.hourLine, { top: (hour - first) * HOUR }]} />)}
              {entries
                .filter((entry) => entry.weekday === dayIndex)
                .map((entry) => {
                  const start = minutes(entry.start_time);
                  const end = Math.max(start + 15, minutes(entry.end_time));
                  const tint = colourOf(entry);
                  return (
                    <Interactive
                      key={entry.id}
                      onPress={onSelect ? () => onSelect(entry) : undefined}
                      accessibilityRole="button"
                      accessibilityLabel={`${entry.title}, ${day} ${entry.start_time.slice(0, 5)} to ${entry.end_time.slice(0, 5)}${entry.subject ? `, ${entry.subject}` : ''}`}
                      style={[styles.block, { top: ((start - first * 60) / 60) * HOUR + 2, height: ((end - start) / 60) * HOUR - 4, backgroundColor: tint.bg, borderLeftColor: tint.edge }]}
                    >
                      <Text style={[styles.blockTitle, { color: tint.text }]} numberOfLines={2}>{entry.title}</Text>
                      <Text style={styles.blockTime} numberOfLines={1}>{entry.start_time.slice(0, 5)}–{entry.end_time.slice(0, 5)}</Text>
                      {entry.subject && end - start >= 60 ? <Text style={styles.blockSubject} numberOfLines={1}>{entry.subject}</Text> : null}
                    </Interactive>
                  );
                })}
              {dayIndex === todayIndex && showNow ? (
                <View style={[styles.now, { top: nowTop }]} pointerEvents="none">
                  <View style={styles.nowDot} />
                </View>
              ) : null}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    scroller: { minWidth: '100%' },
    grid: { flex: 1, minWidth: 720 },
    headRow: { flexDirection: 'row', marginBottom: 6 },
    gutter: { width: 52 },
    dayHead: { flex: 1, alignItems: 'center' },
    dayChip: { alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12, minWidth: 54 },
    dayChipToday: { backgroundColor: colors.primary },
    dayName: { fontSize: 11.5, fontWeight: '700', color: colors.textTertiary },
    dayDate: { fontSize: 17, fontWeight: '800', color: colors.text },
    dayTodayText: { color: colors.onPrimary },
    body: { flexDirection: 'row' },
    hour: { fontSize: 11, color: colors.textTertiary, marginTop: -7 },
    column: { flex: 1, borderLeftWidth: 1, borderLeftColor: colors.divider, position: 'relative' },
    columnToday: { backgroundColor: colors.surfaceMuted },
    hourLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.divider },
    block: { position: 'absolute', left: 4, right: 4, borderRadius: 10, borderLeftWidth: 3, paddingVertical: 5, paddingHorizontal: 7, overflow: 'hidden', gap: 1 },
    blockTitle: { fontSize: 12, fontWeight: '800' },
    blockTime: { fontSize: 10.5, color: colors.textSecondary },
    blockSubject: { fontSize: 10.5, color: colors.textTertiary },
    now: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: colors.error },
    nowDot: { position: 'absolute', left: -4, top: -3, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error },
  });
}
