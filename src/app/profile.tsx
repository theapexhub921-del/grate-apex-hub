import { type Href, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '@/components/ui/text';

import { PersonalGoalsCard } from '@/components/learning/personal-goals-card';
import { RankProgressCard } from '@/components/rank-progress';
import { useAuth } from '@/hooks/use-auth';
import { VerifiedBadge } from '@/components/ui/verified-badge';
import { AboutEditor } from '@/components/social/about-editor';
import { AchievementBadge } from '@/components/achievements/achievement-badge';
import { ApexCoinWalletCard } from '@/components/apex-coin-wallet-card';
import { AvatarPicker } from '@/components/avatar/avatar-picker';
import { FollowListSheet } from '@/components/social/follow-list-sheet';
import { PersonAvatar, PersonLink } from '@/components/social/profile-card';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { Card, Interactive } from '@/components/ui/interactive';
import { Columns, PageHeader, Screen, SectionHeader } from '@/components/ui/screen';
import { webStyle } from '@/components/ui/web';
import { elevation, isDesktopWidth, Radius, Type, type ThemeColors } from '@/constants/theme';
import { curriculumProgress } from '@/data/learning/progress-model';
import { useAchievements } from '@/data/achievements-store';
import { useLearning } from '@/data/learning/use-learning';
import { getRankProgress } from '@/data/ranks';
import { useAvatarUrl, useDisplayName } from '@/data/user';
import { getRecommendedFriends, personName, sendFriendRequest, useSocial, type SocialRecommendation, getPublicProfile } from '@/data/social';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

type MenuItem = { icon: IconName; label: string; detail: string; href: Href };

const menuItems: MenuItem[] = [
  { icon: 'chart', label: 'My Progress', detail: 'Quizzes, subjects and memory', href: '/progress' },
  { icon: 'xp', label: 'Achievements', detail: 'Five levels per milestone, and your boosts', href: '/achievements' as Href },
  { icon: 'social', label: 'Friends', detail: 'Find classmates and requests', href: '/social/friends' },
  { icon: 'settings', label: 'Settings', detail: 'Appearance, navigation, account', href: '/settings' as Href },
];

// Profile — academic identity: who you are in GRATEAPEX, your rank, your
// record and the milestones you have actually reached.
export default function ProfileScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const { width } = useWindowDimensions();
  const desktop = isDesktopWidth(width);
  const { progress, inputs } = useLearning();
  const overall = useMemo(() => curriculumProgress(inputs), [inputs]);
  const displayName = useDisplayName();
  const avatarUrl = useAvatarUrl();
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const social = useSocial();
  const friends = social.people.filter((person) => person.relationship === 'friends');
  const [recommendations, setRecommendations] = useState<SocialRecommendation[]>([]);
  const relationshipKey = social.people.map((person) => `${person.userId}:${person.relationship}`).sort().join('|');
  const rank = getRankProgress(progress.xp);

  useEffect(() => {
    if (social.status !== 'ready') return;
    let active = true;
    getRecommendedFriends()
      .then((people) => { if (active) setRecommendations(people); })
      .catch(() => { if (active) setRecommendations([]); });
    return () => { active = false; };
  }, [social.status, relationshipKey]);

  // Milestones are derived from the learning record — earned, never given.
  // These six are this app's own, now with five levels each (data/achievements.ts).
  const achievementStates = useAchievements().states;
  // Posts, followers and following — the same counts everyone sees on a profile.
  const { user } = useAuth();
  const [myCounts, setMyCounts] = useState<{ posts: number; followers: number; following: number } | null>(null);
  const [followSheetOpen, setFollowSheetOpen] = useState(false);
  const [followTab, setFollowTab] = useState<'followers' | 'following'>('followers');

  const openFollowList = (tab: 'followers' | 'following') => {
    setFollowTab(tab);
    setFollowSheetOpen(true);
  };

  useEffect(() => {
    if (!user?.uid) return;
    let live = true;
    getPublicProfile(user.uid).then((p) => { if (live) setMyCounts({ posts: p.posts, followers: p.followers, following: p.following }); }).catch(() => {});
    return () => { live = false; };
  }, [user?.uid]);
  const levelsDone = achievementStates.reduce((sum, state) => sum + state.level, 0);
  // Badges on You: earned ones first (highest level), then the closest to their next level.
  const badgeStates = [...achievementStates].sort((x, y) => y.level - x.level || y.progress - x.progress).slice(0, 8);

  const stats: { icon: IconName; value: number; label: string }[] = [
    { icon: 'xp', value: progress.xp, label: 'Lifetime XP' },
    { icon: 'lesson', value: progress.lessonsCompleted, label: 'Lessons' },
    { icon: 'streak', value: progress.streak, label: 'Day streak' },
    { icon: 'course', value: overall.topicsCompleted, label: 'Topics' },
    { icon: 'mastery', value: overall.counts.mastered, label: 'Mastered' },
    { icon: 'reinforce', value: overall.due, label: 'Due now' },
  ];

  const identity = (
    <View style={[styles.identity, elevation(colors, 2)]}>
      <View style={styles.profileAvatar}>
        <Avatar uri={avatarUrl} name={displayName ?? 'Doc.'} size={76} ring="gold" />
        <Interactive
          onPress={() => setAvatarPickerOpen(true)}
          accessibilityLabel="Change profile picture"
          style={styles.changeAvatar}
        >
          <Icon name="camera" size={15} color={colors.onPrimary} />
        </Interactive>
      </View>
      <View style={styles.identityText}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {displayName ? `Doc. ${displayName}` : 'Doc.'}
          </Text>
          <VerifiedBadge username={social.username} uid={user?.uid} size={20} />
        </View>
        {myCounts ? (
          <View style={styles.countsRow}>
            <Text style={styles.countText}>
              <Text style={styles.countValue}>{myCounts.posts}</Text> posts
            </Text>
            <Text style={styles.countDivider}> · </Text>
            <Interactive
              onPress={() => openFollowList('followers')}
              accessibilityLabel={`View ${myCounts.followers} followers`}
              style={styles.countPressable}
            >
              <Text style={styles.countText}>
                <Text style={styles.countValueTappable}>{myCounts.followers}</Text> followers
              </Text>
            </Interactive>
            <Text style={styles.countDivider}> · </Text>
            <Interactive
              onPress={() => openFollowList('following')}
              accessibilityLabel={`View ${myCounts.following} following`}
              style={styles.countPressable}
            >
              <Text style={styles.countText}>
                <Text style={styles.countValueTappable}>{myCounts.following}</Text> following
              </Text>
            </Interactive>
          </View>
        ) : null}
        <AboutEditor />
        <Text style={styles.username}>
          {social.status === 'loading' ? 'Username: Loading…' : `Username: ${social.username ? `@${social.username}` : '—'}`}
        </Text>
        <View style={styles.badges}>
          <View style={styles.rankBadge}>
            <Icon name="rank" size={14} color="#0A1F5C" strokeWidth={2.2} />
            <Text style={styles.rankBadgeText}>{rank ? rank.rank.name : 'Fresher'}</Text>
          </View>
          <View style={styles.levelBadge}>
            <Icon name="level" size={13} color={colors.primaryText} />
            <Text style={styles.levelBadgeText}>Level {progress.level}</Text>
          </View>
        </View>
        <View style={styles.identityActions}>
          <Button label={displayName ? 'Edit name' : 'Set your name'} size="sm" variant="ghost" onPress={() => router.push('/settings' as Href)} />
          <Button label="Change picture" size="sm" variant="ghost" onPress={() => setAvatarPickerOpen(true)} />
        </View>
      </View>
    </View>
  );

  const socialConnections = (
    <Card style={styles.socialCard}>
      <SectionHeader
        title="Your circle"
        subtitle="Friends make the GrAte Apex Hub journey more social."
        style={styles.noMargin}
        right={<Text style={styles.cardMeta}>{friends.length} friends</Text>}
      />
      {friends.length ? friends.slice(0, 3).map((friend) => (
        <View key={friend.userId} style={styles.friendRow}>
          <PersonAvatar uid={friend.userId} uri={friend.avatarUrl} name={personName(friend)} size={40} status={friend.isOnline ? 'online' : null} />
          <PersonLink uid={friend.userId} label={personName(friend)} style={styles.friendText}>
            <View style={styles.nameLine}><Text style={styles.friendName}>{personName(friend)}</Text><VerifiedBadge username={friend.username} uid={friend.userId} size={14} /></View>
            <Text style={styles.friendHandle}>{`${friend.username ? `Username: @${friend.username}` : 'Username: —'}${friend.isOnline ? ' · Online' : ''}`}</Text>
          </PersonLink>
          {friend.totalXp !== null ? <Text style={styles.friendXp}>{friend.totalXp} XP</Text> : null}
        </View>
      )) : (
        <Text style={styles.cardMeta}>
          {social.status === 'loading' ? 'Loading your friends...' : 'Your friend list is empty. Find classmates to build your circle.'}
        </Text>
      )}
      <Button
        label={friends.length ? 'Show all friends' : 'Find classmates'}
        variant="secondary"
        size="sm"
        onPress={() => router.push('/social/friends' as Href)}
      />
    </Card>
  );
  const recommendationsCard = (
    <Card style={styles.socialCard}>
      <SectionHeader title="People you may know" right={<Text style={styles.cardMeta}>{recommendations.length} suggestions</Text>} />
      <Text style={styles.cardMeta}>Classmates and learners connected to your study circle.</Text>
      {recommendations.map((person) => <RecommendedFriendRow key={person.userId} person={person} />)}
      {!recommendations.length ? (
        <Text style={styles.cardMeta}>{social.status === 'ready' ? 'No suggestions yet. Try again as more classmates join GrAte Apex Hub.' : 'Looking for classmates to recommend…'}</Text>
      ) : null}
      <Button label="Find more classmates" variant="secondary" size="sm" onPress={() => router.push('/social/friends' as Href)} />
    </Card>
  );
  const statGrid = (
    <View style={styles.statGrid}>
      {stats.map((stat) => (
        <View key={stat.label} style={[styles.stat, desktop ? styles.statDesktop : styles.statMobile]}>
          <Icon name={stat.icon} size={16} color={stat.icon === 'xp' || stat.icon === 'streak' ? colors.accentText : colors.primaryText} filled={stat.icon === 'xp' || stat.icon === 'streak'} />
          <AnimatedNumber value={stat.value} style={styles.statValue} />
          <Text style={styles.statLabel}>{stat.label}</Text>
        </View>
      ))}
      <ApexCoinWalletCard
        style={[styles.stat, desktop ? styles.statDesktop : styles.statMobile]}
        valueStyle={styles.statValue}
        labelStyle={styles.statLabel}
      />
    </View>
  );

  const achievementsCard = (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Milestones</Text>
        <Text style={styles.cardMeta}>
          {levelsDone} of {achievementStates.length * 5} levels
        </Text>
      </View>
      <View style={styles.badgeGrid}>
        {badgeStates.map((state) => (
          <AchievementBadge key={state.def.id} state={state} size={64} onPress={() => router.push('/achievements' as Href)} />
        ))}
      </View>
      <Button label="View all achievements" variant="secondary" size="sm" onPress={() => router.push('/achievements' as Href)} />
    </Card>
  );

  const menu = (
    <View style={[styles.menu, elevation(colors, 1)]}>
      {menuItems.map((item, index) => (
        <Interactive
          key={item.label}
          onPress={() => router.push(item.href)}
          accessibilityRole="link"
          accessibilityLabel={item.label}
          style={({ hovered }) => [styles.menuItem, index > 0 && styles.menuDivider, hovered && styles.menuHover]}
        >
          {({ hovered }) => (
            <>
              <View style={styles.menuIcon}>
                <Icon name={item.icon} size={18} color={colors.primaryText} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.menuText}>{item.label}</Text>
                <Text style={styles.menuDetail}>{item.detail}</Text>
              </View>
              <Icon name="chevronRight" size={18} color={hovered ? colors.text : colors.textTertiary} />
            </>
          )}
        </Interactive>
      ))}
    </View>
  );

  return (
    <Screen width="content">
      <PageHeader title="You" subtitle="Your identity, connections and achievements." right={<IconButton icon="settings" label="Settings" onPress={() => router.push('/settings' as Href)} />} />
      {identity}
      <View style={styles.gap} />
      <AvatarPicker visible={avatarPickerOpen} onClose={() => setAvatarPickerOpen(false)} />
      {desktop ? (
        <Columns
          sideWidth={360}
          main={
            <View style={styles.column}>
              {statGrid}
              {achievementsCard}
            </View>
          }
          side={
            <View style={styles.column}>
              <RankProgressCard lifetimeXp={progress.xp} />
              <PersonalGoalsCard />
              {socialConnections}
              {recommendationsCard}
              {menu}
            </View>
          }
        />
      ) : (
        <View style={styles.column}>
          <RankProgressCard lifetimeXp={progress.xp} />
          <PersonalGoalsCard />
          {statGrid}
          {achievementsCard}
          {socialConnections}
          {recommendationsCard}
          {menu}
        </View>
      )}
      {user?.uid ? (
        <FollowListSheet visible={followSheetOpen} onClose={() => setFollowSheetOpen(false)} uid={user.uid} tab={followTab} onTabChange={setFollowTab} counts={myCounts} />
      ) : null}
    </Screen>
  );
}

function RecommendedFriendRow({ person }: { person: SocialRecommendation }) {
  const styles = useThemedStyles(createStyles);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addFriend() {
    setBusy(true);
    setError(null);
    try {
      await sendFriendRequest(person.userId);
      setSent(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not send request. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.recommendationWrap}>
      <View style={styles.friendRow}>
        <PersonAvatar uid={person.userId} uri={person.avatarUrl} name={personName(person)} size={40} />
        <PersonLink uid={person.userId} label={personName(person)} style={styles.friendText}>
          <View style={styles.nameLine}><Text style={styles.friendName} numberOfLines={1}>{personName(person)}</Text><VerifiedBadge username={person.username} uid={person.userId} size={14} /></View>
          <Text style={styles.friendHandle} numberOfLines={1}>
            {`${person.username ? `Username: @${person.username}` : 'Username: —'}${person.sameClass ? ' · Same class' : person.sharedConnections ? ` · ${person.sharedConnections} mutual ${person.sharedConnections === 1 ? 'connection' : 'connections'}` : ''}`}
          </Text>
        </PersonLink>
        <Button label={sent ? 'Requested' : 'Add'} size="sm" variant={sent ? 'secondary' : 'primary'} onPress={() => void addFriend()} loading={busy} disabled={sent || busy} />
      </View>
      {error ? <Text style={styles.recommendationError}>{error}</Text> : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    gap: { height: 16 },
    column: { gap: 16 },
    pressed: { transform: [{ scale: 0.97 }] },
    identity: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 20,
      padding: 22,
      borderRadius: Radius.xl,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.hairline,
      overflow: 'hidden',
      ...webStyle({ backgroundImage: `radial-gradient(90% 140% at 100% 0%, ${colors.accent}1F, transparent 55%)` }),
    },
    editBadge: {
      position: 'absolute',
      right: 2,
      bottom: 2,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.surfaceElevated,
    },
    identityText: { flex: 1, minWidth: 220, gap: 8 },
    profileAvatar: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
    changeAvatar: { position: 'absolute', right: -2, bottom: -2, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
    username: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    counts: { fontSize: 13.5, color: colors.textSecondary, marginTop: 2 },
    countsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 2 },
    countText: { fontSize: 13.5, color: colors.textSecondary },
    countDivider: { fontSize: 13.5, color: colors.textTertiary },
    countPressable: { paddingVertical: 2, paddingHorizontal: 4, borderRadius: Radius.sm },
    countValue: { fontWeight: '800', color: colors.text },
    countValueTappable: { fontWeight: '800', color: colors.primaryText, textDecorationLine: 'underline' },
    sheetTabs: { marginBottom: 14 },
    sheetLoading: { paddingVertical: 32, alignItems: 'center', justifyContent: 'center' },
    sheetEmpty: { paddingVertical: 24 },
    followUserList: { gap: 10, paddingVertical: 4 },
    followUserRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 10,
      borderRadius: Radius.md,
      backgroundColor: colors.surfaceMuted,
    },
    followUserInfo: { flex: 1, minWidth: 0, gap: 2 },
    followUserName: { fontSize: 14, fontWeight: '800', color: colors.text },
    followUserHandle: { fontSize: 12, color: colors.textSecondary },
    followUserBio: { fontSize: 11.5, color: colors.textTertiary, marginTop: 2 },
    followUserXpPill: {
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
    followUserXp: { fontSize: 11.5, fontWeight: '800', color: colors.accentText },
    name: { ...Type.title1, color: colors.text },
    badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    rankBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: colors.accent,
    },
    rankBadgeText: { fontSize: 12, fontWeight: '800', color: '#0A1F5C' },
    levelBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: colors.primarySubtle,
      borderWidth: 1,
      borderColor: colors.primaryBorder,
    },
    levelBadgeText: { fontSize: 12, fontWeight: '800', color: colors.primaryText },
    identityActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    stat: {
      gap: 4,
      padding: 14,
      borderRadius: Radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.hairline,
      ...elevation(colors, 1),
    },
    statDesktop: { width: '31.8%', flexGrow: 1 },
    statMobile: { width: '30%', flexGrow: 1, minWidth: 96 },
    statValue: { ...Type.numeral, fontSize: 22, color: colors.text, marginTop: 4 },
    statLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
    card: { gap: 14 },
    socialCard: { gap: 12, marginTop: 12 },
    noMargin: { marginBottom: 0 },
    friendRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 3 },
    friendText: { flex: 1, minWidth: 0, gap: 2 },
    nameLine: { flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 0 },
    friendName: { fontSize: 13.5, fontWeight: '800', color: colors.text },
    friendHandle: { fontSize: 11.5, color: colors.textTertiary },
    friendXp: { fontSize: 11.5, fontWeight: '800', color: colors.accentText },
    recommendationWrap: { gap: 2 },
    recommendationError: { fontSize: 11, color: colors.textSecondary, marginLeft: 50 },
    cardHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
    cardTitle: { ...Type.title3, color: colors.text },
    cardMeta: { fontSize: 12, fontWeight: '700', color: colors.textTertiary },
    badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, rowGap: 14, marginBottom: 12 },
    achievementGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    achievement: { width: '31%', flexGrow: 1, minWidth: 96, alignItems: 'center', gap: 4, padding: 12, borderRadius: 14, backgroundColor: colors.surfaceMuted },
    achievementLocked: { opacity: 0.6 },
    achievementMark: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceSunken,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 4,
    },
    achievementMarkEarned: { backgroundColor: colors.accent, borderColor: colors.accent },
    achievementTitle: { fontSize: 12.5, fontWeight: '800', color: colors.text, textAlign: 'center' },
    achievementDetail: { fontSize: 11, lineHeight: 15, color: colors.textTertiary, textAlign: 'center' },
    menu: { backgroundColor: colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.hairline, overflow: 'hidden' },
    menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14 },
    menuDivider: { borderTopWidth: 1, borderTopColor: colors.divider },
    menuHover: { backgroundColor: colors.surfaceMuted },
    menuIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.primarySubtle, alignItems: 'center', justifyContent: 'center' },
    menuText: { fontSize: 15, fontWeight: '700', color: colors.text },
    menuDetail: { fontSize: 12, color: colors.textTertiary, marginTop: 1 },
  });
}
