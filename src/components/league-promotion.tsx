import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, type Href } from 'expo-router';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Type, type ThemeColors } from '@/constants/theme';
import { LEAGUE_TIERS, loadLeague, type LeagueView } from '@/data/leagues';
import { markNotificationsRead, type AppNotification } from '@/data/notifications';
import { useAuth } from '@/hooks/use-auth';
import { useThemedStyles } from '@/hooks/use-theme';

// League promotions: when a learner finishes a week in the top 20% they move up
// a league. The app settles the week when it next runs (data/leagues.ts), then:
//  - adds "Promoted to … League" to the bell, which also alerts the phone or
//    laptop if the app is in the background (DeviceNotificationBridge), and
//  - shows a congratulations card when the app is open — unless the learner
//    already came in by tapping that notification.

const KEY = 'grateapex_league_congrats'; // the last promotion week congratulated
const CHECK_EVERY_MS = 30 * 60_000;

let items: AppNotification[] = [];
const listeners = new Set<() => void>();
const setItems = (next: AppNotification[]) => { items = next; listeners.forEach((listener) => listener()); };

export function usePromotionNotifications() {
  return useSyncExternalStore((listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => items, () => items);
}

type Promotion = { week: string; id: string; tier: number; prevTier: number; position: number; size: number; weeklyXp: number };

function promotionOf(view: LeagueView): Promotion | null {
  if (!view.prev || view.prev.outcome !== 'promoted') return null;
  return { week: view.prev.week, id: `league:${view.prev.week}`, tier: view.tier, prevTier: view.prev.tier, position: view.prev.position, size: view.prev.size, weeklyXp: view.prev.weeklyXp };
}

/** Came in from the promotion notification (its link carries ?leagueCongrats=<week>). */
const openedFromNotification = (week: string) =>
  Platform.OS === 'web' && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('leagueCongrats') === week;

export function LeaguePromotionWatcher() {
  const styles = useThemedStyles(createStyles);
  const { user } = useAuth();
  const [card, setCard] = useState<Promotion | null>(null);

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }
    let live = true;
    const check = async () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible' && items.length) return;
      try {
        const promotion = promotionOf(await loadLeague());
        if (!live || !promotion) return;
        const tier = LEAGUE_TIERS[promotion.tier];
        setItems([{
          id: promotion.id,
          group: 'updates',
          title: `Promoted to the ${tier.name} League!`,
          body: `You finished #${promotion.position} of ${promotion.size} in ${LEAGUE_TIERS[promotion.prevTier].name} with ${promotion.weeklyXp.toLocaleString()} XP.`,
          at: Date.now(),
          href: `/social?leagueCongrats=${promotion.week}` as Href,
          icon: 'rank',
          tone: 'gold',
        }]);
        const shown = await AsyncStorage.getItem(KEY).catch(() => null);
        if (shown === promotion.week) return;
        if (openedFromNotification(promotion.week)) {
          await AsyncStorage.setItem(KEY, promotion.week).catch(() => {});
          markNotificationsRead([promotion.id]);
          return;
        }
        if (typeof document === 'undefined' || document.visibilityState === 'visible') setCard(promotion);
      } catch {
        // offline or signed out: try again later
      }
    };
    const first = setTimeout(() => void check(), 4000);
    const timer = setInterval(() => void check(), CHECK_EVERY_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') void check(); };
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible);
    return () => {
      live = false;
      clearTimeout(first);
      clearInterval(timer);
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user]);

  function close(go?: boolean) {
    if (!card) return;
    void AsyncStorage.setItem(KEY, card.week).catch(() => {});
    markNotificationsRead([card.id]);
    setCard(null);
    if (go) router.push('/social' as Href);
  }

  const tier = card ? LEAGUE_TIERS[card.tier] : null;
  return (
    <Sheet visible={card !== null} onClose={() => close()} title="Promoted!" width={420} footer={<View style={styles.actions}><Button label="See the league" variant="secondary" onPress={() => close(true)} /><Button label="Nice!" onPress={() => close()} /></View>}>
      {card && tier ? (
        <View style={styles.body}>
          <View style={[styles.badge, { backgroundColor: tier.color }]}><Text style={styles.emoji}>{tier.emoji}</Text></View>
          <Text style={styles.title}>Welcome to the {tier.name} League</Text>
          <Text style={styles.text}>
            You finished #{card.position} of {card.size} in {LEAGUE_TIERS[card.prevTier].name} last week with {card.weeklyXp.toLocaleString()} XP and moved up a league. Keep earning XP this week to climb again.
          </Text>
        </View>
      ) : null}
    </Sheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    body: { alignItems: 'center', gap: 12, paddingVertical: 6 },
    badge: { width: 76, height: 76, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    emoji: { fontSize: 40 },
    title: { ...Type.title3, color: colors.text, textAlign: 'center' },
    text: { fontSize: 14.5, lineHeight: 21, color: colors.textSecondary, textAlign: 'center' },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  });
}
