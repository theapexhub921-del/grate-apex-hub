import { router } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '@/components/ui/text';

import { Button } from '@/components/ui/button';
import { PersonAvatar, PersonLink } from '@/components/social/profile-card';
import { NotificationBell } from '@/components/notifications';
import { Icon, type IconName } from '@/components/ui/icon';
import { Card, PressableCard } from '@/components/ui/interactive';
import { Pill } from '@/components/ui/pill';
import { Columns, PageHeader, Screen } from '@/components/ui/screen';
import { WeeklyChallengeCard } from '@/components/social/connect-challenges';
import { LeagueCard } from '@/components/social/league-card';
import { BattlesCard } from '@/components/social/battles-card';
import { RecentMessagesCard } from '@/components/social/recent-messages-card';
import { LearningWeekCard } from '@/components/learning/learning-week-card';
import { Type, type ThemeColors } from '@/constants/theme';
import { addDays, startOfDay } from '@/data/learning/time';
import { useLearning } from '@/data/learning/use-learning';
import { findLesson, getTopic } from '@/data/curriculum';
import { type FriendActivity, personName, useSocial } from '@/data/social';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

// The voice tutor remains the only Connect feature still in development.
const comingSoon: { id: string; icon: IconName; title: string; description: string }[] = [
  { id: 'tutor', icon: 'sparkle', title: 'AI tutor and GrAte Apex Hub voice', description: 'Open the voice study preview from Study. Lecture-file grounding is still in development.' },
];

// Social — the academic community. Your own week is real; classmate
// features wait for real connections (nothing here is a fake person).
export default function SocialScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const { width } = useWindowDimensions();
  const social = useSocial();
  const friends = social.people.filter((person) => person.relationship === 'friends');
  const requests = social.people.filter((person) => person.relationship === 'incoming');
  const { progress, now } = useLearning();

  const today = startOfDay(now);
  const weekStart = addDays(today, -6);
  const xpThisWeek = progress.xpLedger.filter((entry) => entry.at >= weekStart).reduce((sum, entry) => sum + entry.amount, 0);

  const activityCard = (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Friend activity</Text>
        <Pill label="Last 14 days" />
      </View>
      {social.activity.length > 0 ? (
        <View style={styles.activityList}>
          {social.activity.slice(0, 8).map((item) => (
            <View key={item.id} style={styles.activityRow}>
              <Icon name={item.type === 'APEX_CHALLENGE_COMPLETED' ? 'challenge' : item.type === 'TOPIC_COMPLETED' ? 'course' : 'lesson'} size={16} color={colors.primaryText} />
              <Text style={styles.activityText}>
                <Text style={styles.activityName}>{item.name}</Text> {describeActivity(item)}
              </Text>
              <Text style={styles.activityWhen}>{relativeDay(item.at, today)}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.note}>
          {friends.length > 0 ? 'When your friends complete lessons, topics or the Apex Challenge, it shows up here.' : 'Add friends to see what they’re working on.'}
        </Text>
      )}
    </Card>
  );

  // Weekly XP among you and your friends (friends' figures come from the
  // server; yours from your own ledger).
  const board = [
    { id: 'me', name: 'You', uri: null as string | null, xp: xpThisWeek, me: true },
    ...friends.map((friend) => ({ id: friend.userId, name: personName(friend), uri: friend.avatarUrl, xp: friend.weeklyXp ?? 0, me: false })),
  ].sort((a, b) => b.xp - a.xp);

  const circle = (
    <PressableCard onPress={() => router.push('/social/friends')} accessibilityLabel="Open Friends" style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Study circle</Text>
        {requests.length ? <Pill label={`${requests.length} request${requests.length === 1 ? '' : 's'}`} tone="gold" /> : <Icon name="chevronRight" size={18} color={colors.textTertiary} />}
      </View>
      {friends.length > 0 ? (
        <View style={styles.board}>
          <Text style={styles.boardLabel}>THIS WEEK</Text>
          {board.slice(0, 6).map((entry, index) => (
            <View key={entry.id} style={styles.boardRow}>
              <Text style={styles.boardPlace}>{index + 1}</Text>
              <PersonLink uid={entry.me ? null : entry.id} label={entry.name} style={styles.boardNameBox}><Text style={[styles.boardName, entry.me && styles.boardMe]} numberOfLines={1}>{entry.name}</Text></PersonLink>
              <Text style={styles.boardXp}>{entry.xp} XP</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.circleRow}>
          <Icon name="social" size={26} color={colors.primaryText} />
          <View style={styles.flex}>
            <Text style={styles.circleText}>{social.status === 'loading' ? 'Loading your friends…' : 'No friends yet'}</Text>
            <Text style={styles.note}>Find classmates by username and compare weekly XP.</Text>
          </View>
        </View>
      )}
    </PressableCard>
  );

  const friendStreaks = (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Friend streaks</Text>
        <Pill label="Real stats" tone="success" />
      </View>
      {friends.length ? friends.map((friend) => (
        <View key={friend.userId} style={styles.friendStreakRow}>
          <PersonAvatar uid={friend.userId} uri={friend.avatarUrl} name={personName(friend)} size={36} ring={friend.streak ? 'gold' : 'subtle'} />
          <PersonLink uid={friend.userId} label={personName(friend)} style={styles.boardNameBox}><Text style={styles.boardName} numberOfLines={1}>{personName(friend)}</Text></PersonLink>
          <Text style={styles.boardXp}>{friend.streak ?? 0} days</Text>
        </View>
      )) : <Text style={styles.note}>Connect with classmates to see their current learning streaks here.</Text>}
      <Text style={styles.note}>An earned freeze protects one missed day. A lapsed streak can be restored for 100 Apex Coins.</Text>
    </Card>
  );

  const soon = (
    <Card style={styles.card} tone="outline">
      <Text style={styles.cardTitle}>Coming next</Text>
      {comingSoon.map((item) => (
        <View key={item.id} style={styles.soonRow}>
          <View style={styles.soonIcon}>
            <Icon name={item.icon} size={18} color={colors.primaryText} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.soonTitle}>{item.title}</Text>
            <Text style={styles.note}>{item.description}</Text>
          </View>
        </View>
      ))}
    </Card>
  );

  return (
    <Screen width="content">
      <PageHeader title="Connect" subtitle="Find classmates, message friends and study together." right={<NotificationBell />} />
      <RecentMessagesCard />
      <View style={styles.quickActions}>
        <Button label="Study groups" variant="secondary" icon={<Icon name="social" size={16} color={colors.text} />} onPress={() => router.push('/social/groups' as never)} />
        <Button label="Table conferences" variant="secondary" icon={<Icon name="connection" size={16} color={colors.text} />} onPress={() => router.push('/social/conferences' as never)} />
        <Button label="Find classmates" variant="secondary" icon={<Icon name="profile" size={16} color={colors.text} />} onPress={() => router.push('/social/friends')} />
      </View>
      <Columns
        sideWidth={width >= 1180 ? 380 : 340}
        main={
          <View style={styles.column}>
            {activityCard}
            <WeeklyChallengeCard />
            <LearningWeekCard />
            <LeagueCard />
            <BattlesCard />
          </View>
        }
        side={
          <View style={styles.column}>
            {circle}
            {friendStreaks}
            {soon}
          </View>
        }
      />
    </Screen>
  );
}

function describeActivity(item: FriendActivity) {
  if (item.type === 'APEX_CHALLENGE_COMPLETED') return 'took on the Apex Challenge';
  if (item.type === 'TOPIC_COMPLETED') return `finished ${getTopic(item.topicId)?.title ?? 'a topic'}`;
  const title = findLesson(item.lessonId)?.lesson.title;
  return title ? `completed “${title}”` : 'completed a lesson';
}

function relativeDay(at: number, today: number) {
  const days = Math.floor((today - startOfDay(at)) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    column: { gap: 16 },
    card: { gap: 14 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    cardTitle: { ...Type.title3, color: colors.text },
    body: { ...Type.callout, color: colors.textSecondary },
    note: { fontSize: 12.5, lineHeight: 18, color: colors.textSecondary },
    weekStats: { flexDirection: 'row', gap: 8 },
    weekStat: { flex: 1, minWidth: 0, gap: 4, padding: 12, borderRadius: 14, backgroundColor: colors.surfaceMuted },
    weekValue: { ...Type.numeral, fontSize: 20, color: colors.text },
    weekLabel: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
    chart: { height: 116, gap: 6 },
    graph: { width: '100%', height: 96 },
    chartLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 5 },
    chartLabel: { fontSize: 11, fontWeight: '700', color: colors.textTertiary },
    chartLabelToday: { color: colors.text },
    zones: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', gap: 3 },
    zone: { height: '100%', borderRadius: 4 },
    circleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
    circleText: { fontSize: 14, fontWeight: '700', color: colors.text },
    soonRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    friendStreakRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 5 },
    soonIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primarySubtle, alignItems: 'center', justifyContent: 'center' },
    soonTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
    board: { gap: 8 },
    activityList: { gap: 10 },
    activityRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    activityText: { flex: 1, minWidth: 0, fontSize: 13.5, lineHeight: 19, color: colors.textSecondary },
    activityName: { fontWeight: '800', color: colors.text },
    activityWhen: { fontSize: 11.5, fontWeight: '700', color: colors.textTertiary },
    boardLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: colors.textSecondary },
    boardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    boardPlace: { ...Type.numeral, fontSize: 13, width: 18, color: colors.textTertiary },
    boardNameBox: { flex: 1, minWidth: 0 },
    boardName: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: '600', color: colors.text },
    boardMe: { fontWeight: '800', color: colors.primaryText },
    boardXp: { ...Type.numeral, fontSize: 13, color: colors.textSecondary },
  });
}
