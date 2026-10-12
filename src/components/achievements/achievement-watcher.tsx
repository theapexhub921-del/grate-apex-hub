import { type Href, router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { elevation, Radius, TAB_BAR_HEIGHT, TAB_BAR_INSET, type ThemeColors, Type } from '@/constants/theme';
import { claimNewLevels, dismissAnnouncement, loadLegacyAchievementStats, rewardLevels, useAchievements, useAchievementStore } from '@/data/achievements-store';
import type { AchievementState } from '@/data/achievements';
import { waitForProgressSync } from '@/data/progress';
import { useAuth } from '@/hooks/use-auth';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

// One claim at a time; a change while one runs schedules exactly one more.
let running: Promise<void> | null = null;
let again: { uid: string; states: readonly AchievementState[] } | null = null;
async function claim(uid: string, states: readonly AchievementState[]) {
  if (running) {
    again = { uid, states };
    return;
  }
  running = (async () => {
    try {
      // The first (recognition-only) check must see everything already
      // synced, or history would later look like new levels.
      await waitForProgressSync();
      const { claimed } = await claimNewLevels(uid, states);
      if (claimed.length) await rewardLevels(claimed);
    } catch (error) {
      console.warn('Could not update achievements:', error);
    }
  })();
  await running;
  running = null;
  if (again) {
    const next = again;
    again = null;
    await claim(next.uid, next.states);
  }
}

/**
 * Watches the learner's achievement levels, claims new ones on the account and
 * shows the reward (one random timed boost per level). Mounted once in the
 * app shell; renders nothing until there is something to announce.
 */
export function AchievementWatcher() {
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const { states, ready } = useAchievements();
  const { recorded, announcements } = useAchievementStore();
  const firstClaimFor = useRef<string | null>(null);

  useEffect(() => {
    if (uid) void loadLegacyAchievementStats(uid);
  }, [uid]);

  const levelsKey = states.map((state) => state.level).join(',');
  useEffect(() => {
    if (!uid || !ready || !user?.profileLoaded || !user.profile?.username) return;
    const isFirst = firstClaimFor.current !== uid;
    const ahead = states.some((state) => state.level > (recorded[state.def.id] ?? 0));
    if (!isFirst && !ahead) return;
    const timer = setTimeout(() => {
      firstClaimFor.current = uid;
      void claim(uid, states);
    }, 1500);
    return () => clearTimeout(timer);
    // levelsKey stands for `states`: only level changes matter here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, ready, levelsKey, user?.profileLoaded, user?.profile?.username]);

  const current = announcements[0];
  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => dismissAnnouncement(current.key), 9000);
    return () => clearTimeout(timer);
  }, [current]);

  if (!current) return null;
  return <LevelNotice announcement={current} more={announcements.length - 1} />;
}

function LevelNotice({ announcement, more }: { announcement: ReturnType<typeof useAchievementStore>['announcements'][number]; more: number }) {
  const colors = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_INSET + 12 }]}>
      <View style={[styles.card, elevation(colors, 3)]} accessibilityRole="alert" accessibilityLiveRegion="polite">
        <View style={styles.mark}>
          <Icon name="xp" size={20} color={colors.accentText} filled />
        </View>
        <View style={styles.body}>
          <Text style={styles.eyebrow}>LEVEL COMPLETE{more > 0 ? ` · ${more} more` : ''}</Text>
          <Text style={styles.title}>{announcement.title}</Text>
          <Text style={styles.detail}>{announcement.detail}</Text>
          <Text style={styles.reward}>
            {announcement.reward
              ? `You received a boost: ${announcement.reward}, from the moment you activate it.`
              : 'This level’s boost was already given on another device.'}
          </Text>
          <View style={styles.actions}>
            <Button label="View achievements" size="sm" onPress={() => { dismissAnnouncement(announcement.key); router.push('/achievements' as Href); }} />
            <Button label="Dismiss" size="sm" variant="ghost" onPress={() => dismissAnnouncement(announcement.key)} />
          </View>
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
    card: {
      width: '100%',
      maxWidth: 460,
      flexDirection: 'row',
      gap: 12,
      padding: 16,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.hairline,
      backgroundColor: colors.surfaceElevated,
    },
    mark: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSubtle },
    body: { flex: 1, minWidth: 0, gap: 3 },
    eyebrow: { ...Type.overline, color: colors.accentText },
    title: { ...Type.headline, color: colors.text },
    detail: { fontSize: 13, lineHeight: 18, color: colors.textSecondary },
    reward: { fontSize: 13, lineHeight: 18, color: colors.text, marginTop: 4 },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  });
}
