import { type Href, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PersonAvatar } from '@/components/social/profile-card';
import { Icon } from '@/components/ui/icon';
import { Interactive } from '@/components/ui/interactive';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Sheet } from '@/components/ui/sheet';
import { EmptyState, LoadingState } from '@/components/ui/state-views';
import { Text } from '@/components/ui/text';
import { VerifiedBadge } from '@/components/ui/verified-badge';
import { Radius, type ThemeColors } from '@/constants/theme';
import { getFollowList, type FollowUser } from '@/data/social';
import { useAuth } from '@/hooks/use-auth';
import { useThemedStyles } from '@/hooks/use-theme';
import { routes } from '@/lib/routes';

export type FollowListSheetProps = {
  visible: boolean;
  onClose: () => void;
  userId: string | null | undefined;
  userName?: string | null;
  initialTab?: 'followers' | 'following';
  followersCount?: number;
  followingCount?: number;
};

export function FollowListSheet({
  visible,
  onClose,
  userId,
  userName,
  initialTab = 'followers',
  followersCount,
  followingCount,
}: FollowListSheetProps) {
  const styles = useThemedStyles(createStyles);
  const { user } = useAuth();
  const [tab, setTab] = useState<'followers' | 'following'>(initialTab);
  const [list, setList] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setTab(initialTab);
    }
  }, [visible, initialTab]);

  useEffect(() => {
    if (!visible || !userId) return;
    let active = true;
    setLoading(true);
    getFollowList(userId, tab)
      .then((users) => {
        if (active) {
          setList(users);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setList([]);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [visible, tab, userId]);

  const isMe = userId === user?.uid;
  const title = tab === 'followers' ? 'Followers' : 'Following';
  const subtitle = isMe
    ? tab === 'followers'
      ? 'People who follow you on GRATEAPEX'
      : 'People you follow'
    : tab === 'followers'
    ? `People who follow ${userName || 'this learner'}`
    : `People ${userName || 'this learner'} follows`;

  return (
    <Sheet visible={visible} onClose={onClose} title={title} subtitle={subtitle}>
      <SegmentedControl
        value={tab}
        onChange={(nextTab) => setTab(nextTab)}
        options={[
          { value: 'followers', label: 'Followers', count: followersCount },
          { value: 'following', label: 'Following', count: followingCount },
        ]}
        style={styles.sheetTabs}
      />
      {loading ? (
        <View style={styles.sheetLoading}>
          <LoadingState label={`Loading ${tab}…`} />
        </View>
      ) : list.length === 0 ? (
        <View style={styles.sheetEmpty}>
          <EmptyState
            icon="social"
            title={tab === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
            message={
              isMe
                ? tab === 'followers'
                  ? 'When classmates follow your learning journey, they will appear here.'
                  : 'Find classmates in Your circle or search in Friends to start following them.'
                : tab === 'followers'
                ? 'No one is following this learner yet.'
                : 'This learner is not following anyone yet.'
            }
          />
        </View>
      ) : (
        <View style={styles.userList}>
          {list.map((person) => {
            const isSelf = person.userId === user?.uid;
            const targetRoute = isSelf ? ('/profile' as Href) : routes.profile(person.userId);
            const displayName = person.displayName || person.username || 'Learner';

            return (
              <Interactive
                key={person.userId}
                style={styles.userRow}
                onPress={() => {
                  onClose();
                  router.push(targetRoute);
                }}
                accessibilityRole="button"
                accessibilityLabel={`View ${displayName}'s profile`}
              >
                <PersonAvatar uid={person.userId} uri={person.avatarUrl} name={displayName} size={44} />
                <View style={styles.userInfo}>
                  <View style={styles.nameLine}>
                    <Text style={styles.userName} numberOfLines={1}>
                      {displayName}
                    </Text>
                    <VerifiedBadge username={person.username} uid={person.userId} size={14} />
                  </View>
                  <Text style={styles.userHandle} numberOfLines={1}>
                    {person.username ? `@${person.username}` : '—'}
                  </Text>
                  {person.bio ? (
                    <Text style={styles.userBio} numberOfLines={1}>
                      {person.bio}
                    </Text>
                  ) : null}
                </View>
                {person.totalXp !== null ? (
                  <View style={styles.xpPill}>
                    <Icon name="xp" size={12} color={styles.xpColor.color} filled />
                    <Text style={styles.xpText}>{person.totalXp} XP</Text>
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
    sheetTabs: { marginBottom: 14 },
    sheetLoading: { paddingVertical: 32, alignItems: 'center', justifyContent: 'center' },
    sheetEmpty: { paddingVertical: 24 },
    userList: { gap: 10, paddingVertical: 4 },
    userRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 10,
      borderRadius: Radius.md,
      backgroundColor: colors.surfaceMuted,
    },
    userInfo: { flex: 1, minWidth: 0, gap: 2 },
    nameLine: { flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 0 },
    userName: { fontSize: 14, fontWeight: '800', color: colors.text },
    userHandle: { fontSize: 12, color: colors.textSecondary },
    userBio: { fontSize: 11.5, color: colors.textTertiary, marginTop: 2 },
    xpPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: Radius.pill,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.hairline,
    },
    xpColor: { color: colors.accentText },
    xpText: { fontSize: 11.5, fontWeight: '800', color: colors.accentText },
  });
}
