import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BackLink } from '@/components/learning/nav-bits';
import { CommunityPostsFeed } from '@/components/social/community-posts-feed';
import { FollowListSheet } from '@/components/social/follow-list-sheet';
import { Avatar } from '@/components/ui/avatar';
import { VerifiedBadge } from '@/components/ui/verified-badge';
import { Button } from '@/components/ui/button';
import { Card, Interactive } from '@/components/ui/interactive';
import { Pill } from '@/components/ui/pill';
import { Screen } from '@/components/ui/screen';
import { ErrorScreen, LoadingState } from '@/components/ui/state-views';
import { Text } from '@/components/ui/text';
import { Type, type ThemeColors } from '@/constants/theme';
import { legacyRank } from '@/data/legacy-theme-colors';
import { getPublicProfile, type PublicProfile, sendFriendRequest, unfollowLearner } from '@/data/social';
import { useAuth } from '@/hooks/use-auth';
import { useThemedStyles } from '@/hooks/use-theme';
import { param } from '@/lib/routes';

// /social/person?user=<uid> — another learner's profile: who they are, their
// real follower / following counts, Follow (or Follow back / Following),
// Message once you follow each other, and their posts.
export default function PersonScreen() {
  const styles = useThemedStyles(createStyles);
  const params = useLocalSearchParams<{ user?: string | string[] }>();
  const uid = param(params.user);
  const { user } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [followSheetOpen, setFollowSheetOpen] = useState(false);
  const [followTab, setFollowTab] = useState<'followers' | 'following'>('followers');

  const openFollowList = (tab: 'followers' | 'following') => {
    setFollowTab(tab);
    setFollowSheetOpen(true);
  };

  const load = useCallback(async () => {
    if (!uid) return;
    try {
      setProfile(await getPublicProfile(uid));
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'This profile could not be loaded.');
    }
  }, [uid]);

  useEffect(() => {
    if (uid && uid === user?.uid) {
      router.replace('/profile');
      return;
    }
    queueMicrotask(() => { void load(); });
  }, [uid, user?.uid, load]);

  async function toggleFollow() {
    if (!profile || busy) return;
    setBusy(true);
    try {
      if (profile.iFollow) await unfollowLearner(profile.userId);
      else await sendFriendRequest(profile.userId);
      await load();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'That did not work. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (!uid) return <ErrorScreen title="No profile chosen" message="Open a profile from a post or from Connect." primary={{ label: 'Back to Feed', onPress: () => router.replace('/') }} />;
  if (error && !profile) return <ErrorScreen title="Profile unavailable" message={error} primary={{ label: 'Try again', onPress: () => { setError(null); void load(); } }} />;
  if (!profile) return <LoadingState />;

  const friends = profile.iFollow && profile.followsMe;
  const name = profile.displayName || profile.username || 'Learner';
  const rank = profile.totalXp !== null ? legacyRank(profile.totalXp) : null;

  return (
    <Screen width="content">
      <BackLink fallback={'/' as never} />
      <Card style={styles.header}>
        <Avatar uri={profile.avatarUrl} name={name} size={92} ring="gold" />
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.username}>{profile.username ?? name}</Text>
            <VerifiedBadge username={profile.username} uid={profile.userId} size={20} />
            {friends ? <Pill label="Friends" tone="success" /> : profile.followsMe ? <Pill label="Follows you" tone="primary" /> : null}
          </View>
          <Text style={styles.display}>{name}</Text>
          <View style={styles.counts}>
            <Count label="posts" value={profile.posts} />
            <Interactive
              onPress={() => openFollowList('followers')}
              accessibilityRole="button"
              accessibilityLabel={`View ${profile.followers} followers`}
              style={styles.countPressable}
            >
              <Count label="followers" value={profile.followers} tappable />
            </Interactive>
            <Interactive
              onPress={() => openFollowList('following')}
              accessibilityRole="button"
              accessibilityLabel={`View ${profile.following} following`}
              style={styles.countPressable}
            >
              <Count label="following" value={profile.following} tappable />
            </Interactive>
            {profile.totalXp !== null ? <Count label="XP" value={profile.totalXp} /> : null}
          </View>
          {profile.classLabel || rank ? (
            <Text style={styles.meta}>
              {[profile.classLabel, rank ? `Level ${rank.level} · ${rank.title}` : null].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
          {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
          <View style={styles.actions}>
            <Button label={profile.iFollow ? 'Following' : profile.followsMe ? 'Follow back' : 'Follow'} variant={profile.iFollow ? 'secondary' : 'primary'} size="sm" loading={busy} onPress={() => void toggleFollow()} />
            {friends ? (
              <Button label="Message" variant="secondary" size="sm" onPress={() => router.push({ pathname: '/social/message', params: { friend: profile.userId, name } } as never)} />
            ) : null}
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </Card>
      <Text style={styles.section}>Posts</Text>
      <CommunityPostsFeed authorId={profile.userId} showComposer={false} />
      <FollowListSheet
        visible={followSheetOpen}
        onClose={() => setFollowSheetOpen(false)}
        userId={profile.userId}
        userName={name}
        initialTab={followTab}
        followersCount={profile.followers}
        followingCount={profile.following}
      />
    </Screen>
  );
}

function Count({ label, value, tappable }: { label: string; value: number; tappable?: boolean }) {
  const styles = useThemedStyles(createStyles);
  return (
    <Text style={styles.count}>
      <Text style={[styles.countValue, tappable && styles.countValueTappable]}>{value.toLocaleString()}</Text> {label}
    </Text>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 22, padding: 22, marginTop: 8 },
    info: { flex: 1, minWidth: 220, gap: 6 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
    username: { ...Type.title2, color: colors.text },
    display: { fontSize: 14, color: colors.textSecondary },
    counts: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 14, marginTop: 4 },
    count: { fontSize: 14, color: colors.textSecondary },
    countPressable: { paddingVertical: 2, paddingHorizontal: 4, borderRadius: 6 },
    countValue: { fontWeight: '800', color: colors.text },
    countValueTappable: { color: colors.primaryText, textDecorationLine: 'underline' },
    meta: { fontSize: 13, color: colors.textTertiary },
    bio: { fontSize: 14, lineHeight: 21, color: colors.text, marginTop: 2 },
    actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
    error: { fontSize: 13, color: colors.error },
    section: { ...Type.title3, color: colors.text, marginTop: 22, marginBottom: 10 },
  });
}
