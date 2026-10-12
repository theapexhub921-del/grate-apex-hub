import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PersonAvatar } from '@/components/social/profile-card';
import { VerifiedBadge } from '@/components/ui/verified-badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Card, Interactive } from '@/components/ui/interactive';
import { SectionHeader } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Type, type ThemeColors } from '@/constants/theme';
import { useNow } from '@/data/learning/use-learning';
import { LEAGUE_TIERS, type LeagueView, loadLeague, outcomeFor } from '@/data/leagues';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { routes } from '@/lib/routes';

// Connect → League: this week's league with everyone in your tier (friends
// and strangers), ranked by XP earned this week. Top 20% move up a tier, the
// bottom 20% move down, when the week ends (Monday 00:00).
export function LeagueCard() {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const now = useNow();
  const [view, setView] = useState<LeagueView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setView(await loadLeague());
      setError(null);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'The league could not be loaded.');
    }
  }, []);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const tier = view ? LEAGUE_TIERS[view.tier] : LEAGUE_TIERS[0];
  const msLeft = view ? Math.max(0, view.endsAt - now) : 0;
  const days = Math.floor(msLeft / 86_400_000);
  const hours = Math.floor((msLeft % 86_400_000) / 3_600_000);
  const size = view?.rows.length ?? 0;
  const prevTier = view?.prev ? LEAGUE_TIERS[view.prev.tier] : null;

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <View style={[styles.badge, { backgroundColor: tier.color }]}>
          <Text style={styles.badgeEmoji}>{tier.emoji}</Text>
        </View>
        <View style={styles.flex}>
          <SectionHeader title={`${tier.name} League`} subtitle={view ? `${size} learner${size === 1 ? '' : 's'} · ends in ${days}d ${hours}h` : 'Loading…'} style={styles.noMargin} />
        </View>
        <Button label="Refresh" variant="ghost" size="sm" onPress={() => void refresh()} />
      </View>
      {view?.prev && prevTier ? (
        <View style={[styles.prev, view.prev.outcome === 'promoted' ? styles.prevUp : view.prev.outcome === 'relegated' ? styles.prevDown : null]}>
          <Text style={styles.prevText}>
            Last week: #{view.prev.position} of {view.prev.size} in {prevTier.name} with {view.prev.weeklyXp} XP —{' '}
            {view.prev.outcome === 'promoted' ? `promoted to ${tier.name}! 🎉` : view.prev.outcome === 'relegated' ? `moved down to ${tier.name}.` : `stayed in ${tier.name}.`}
          </Text>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.rules}>Top 20% move up a league, the bottom 20% move down. Earn XP this week to climb.</Text>
      <View style={styles.list}>
        {view?.rows.slice(0, 30).map((row, index) => {
          const position = index + 1;
          const zone = outcomeFor(position, size, row.weeklyXp);
          return (
            <Interactive
              key={row.userId}
              onPress={() => router.push(row.isMe ? ('/profile' as never) : routes.profile(row.userId))}
              accessibilityRole="link"
              accessibilityLabel={`${position}. ${row.isMe ? 'You' : row.username ?? 'learner'}, ${row.weeklyXp} XP this week`}
              style={[styles.row, row.isMe && styles.rowMe]}
            >
              <Text style={styles.place}>{position}</Text>
              <PersonAvatar uid={row.userId} name={row.username ?? '?'} size={30} />
              <Text style={[styles.name, row.isMe && styles.nameMe]} numberOfLines={1}>{row.isMe ? 'You' : row.username ? `@${row.username}` : 'Learner'}</Text>
              <VerifiedBadge username={row.username} uid={row.userId} size={13} />
              {zone === 'promoted' ? <Icon name="chevronUp" size={14} color={colors.success} strokeWidth={2.6} /> : zone === 'relegated' ? <Icon name="chevronDown" size={14} color={colors.error} strokeWidth={2.6} /> : null}
              <Text style={styles.xp}>{row.weeklyXp.toLocaleString()} XP</Text>
            </Interactive>
          );
        })}
      </View>
    </Card>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: { gap: 12 },
    flex: { flex: 1, minWidth: 0 },
    noMargin: { marginBottom: 0 },
    head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    badge: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    badgeEmoji: { fontSize: 24 },
    prev: { padding: 12, borderRadius: 12, backgroundColor: colors.surfaceMuted },
    prevUp: { backgroundColor: colors.successSubtle },
    prevDown: { backgroundColor: colors.errorSubtle },
    prevText: { fontSize: 13, lineHeight: 19, color: colors.text },
    rules: { fontSize: 12.5, color: colors.textTertiary },
    error: { fontSize: 13, color: colors.error },
    list: { gap: 4 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12 },
    rowMe: { backgroundColor: colors.primarySubtle },
    place: { width: 22, fontSize: 13, fontWeight: '800', color: colors.textSecondary, textAlign: 'center' },
    name: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
    nameMe: { color: colors.primaryText },
    xp: { ...Type.numeral, fontSize: 13, color: colors.textSecondary },
  });
}
