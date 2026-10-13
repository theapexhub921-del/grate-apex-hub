import { type Href, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/icon';
import { Interactive } from '@/components/ui/interactive';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Sheet } from '@/components/ui/sheet';
import { EmptyState, LoadingState } from '@/components/ui/state-views';
import { Text } from '@/components/ui/text';
import { VerifiedBadge } from '@/components/ui/verified-badge';
import { Radius, type ThemeColors } from '@/constants/theme';
import { type FollowUser, getFollowList } from '@/data/social';
import { useAuth } from '@/hooks/use-auth';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

export type FollowTab = 'followers' | 'following';

/**
 * Followers / Following of any learner (yours or someone else's), as one sheet
 * with two tabs. Tapping a row opens that learner's profile.
 */
export function FollowListSheet({
  visible,
  onClose,
  uid,
  tab,
  onTabChange,
  counts,
  ownerName,
}: {
  visible: boolean;
  onClose: () => void;
  uid: string;
  tab: FollowTab;
  onTabChange: (tab: FollowTab) => void;
  counts?: { followers: number; following: number } | null;
  /** Shown in the subtitle; leave out for your own list ("you"). */
  ownerName?: string | null;
}) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const { user } = useAuth();
  const [loaded, setLoaded] = useState<{ key: string; list: FollowUser[] } | null>(null);
  const key = `${uid}:${tab}`;

  useEffect(() => {
    if (!visible || !uid) return;
    let active = true;
    getFollowList(uid, tab)
      .then((list) => { if (active) setLoaded({ key, list }); })
      .catch(() => { if (active) setLoaded({ key, list: [] }); });
    return () => { active = false; };
  }, [visible, uid, tab, key]);

  const loading = !loaded || loaded.key !== key;
  const list = loaded && loaded.key === key ? loaded.list : [];
  const mine = uid === user?.uid;
  const who = mine ? 'you' : ownerName || 'them';
  const subtitle = tab === 'followers' ? `People who follow ${who} on GRATEAPEX` : `People ${mine ? 'you follow' : `${who} follows`}`;

  return (
    <Sheet visible={visible} onClose={onClose} title={tab === 'followers' ? 'Followers' : 'Following'} subtitle={subtitle}>
      <SegmentedControl
        value={tab}
        onChange={onTabChange}
        options={[
          { value: 'followers', label: 'Followers', count: counts?.followers },
          { value: 'following', label: 'Following', count: counts?.following },
        ]}
        style={styles.tabs}
      />
      {loading ? (
        <View style={styles.loading}>
          <LoadingState label={`Loading ${tab}…`} />
        </View>
      ) : list.length === 0 ? (
        <View style={styles.empty}>
          <EmptyState
            icon="social"
            title={tab === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
            message={mine ? (tab === 'followers' ? 'When classmates follow your learning journey, they will appear here.' : 'Find classmates in Your Circle or search in Friends to start following them.') : tab === 'followers' ? 'Nobody follows this learner yet.' : 'This learner is not following anyone yet.'}
          />
        </View>
      ) : (
        <View style={styles.list}>
          {list.map((person) => {
            const name = person.displayName || person.username || 'Learner';
            return (
              <Interactive
                key={person.userId}
                style={styles.row}
                accessibilityRole="link"
                accessibilityLabel={`Open ${name}'s profile`}
                onPress={() => {
                  onClose();
                  router.push((person.userId === user?.uid ? '/profile' : `/social/person?user=${person.userId}`) as Href);
                }}
              >
                <Avatar uri={person.avatarUrl} name={name} size={44} />
                <View style={styles.info}>
                  <View style={styles.nameLine}>
                    <Text style={styles.name} numberOfLines={1}>{name}</Text>
                    <VerifiedBadge username={person.username} uid={person.userId} size={14} />
                  </View>
                  <Text style={styles.handle}>{person.username ? `@${person.username}` : '—'}</Text>
                  {person.bio ? <Text style={styles.bio} numberOfLines={1}>{person.bio}</Text> : null}
                </View>
                {person.totalXp !== null ? (
                  <View style={styles.xpPill}>
                    <Icon name="xp" size={12} color={colors.accentText} filled />
                    <Text style={styles.xp}>{person.totalXp} XP</Text>
                  </View>
                ) : null}
              </Interactive>
            );
          })}
        </View>
      )}
    </Sheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    tabs: { marginBottom: 14 },
    loading: { paddingVertical: 32, alignItems: 'center', justifyContent: 'center' },
    empty: { paddingVertical: 24 },
    list: { gap: 10, paddingVertical: 4 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: Radius.md, backgroundColor: colors.surfaceMuted },
    info: { flex: 1, minWidth: 0, gap: 2 },
    nameLine: { flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 0 },
    name: { fontSize: 14, fontWeight: '800', color: colors.text, flexShrink: 1 },
    handle: { fontSize: 12, color: colors.textSecondary },
    bio: { fontSize: 11.5, color: colors.textTertiary, marginTop: 2 },
    xpPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: Radius.pill, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.hairline },
    xp: { fontSize: 11.5, fontWeight: '800', color: colors.accentText },
  });
}
