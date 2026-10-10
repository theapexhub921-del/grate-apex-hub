import { useCallback, useEffect, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';

import { PersonAvatar, PersonLink } from '@/components/social/profile-card';
import { Button } from '@/components/ui/button';
import { Card, Interactive } from '@/components/ui/interactive';
import { Pill } from '@/components/ui/pill';
import { SectionHeader } from '@/components/ui/screen';
import { Radius, Type, type ThemeColors } from '@/constants/theme';
import { claimWeeklyChallengeReward, loadFriendBattleResults, loadWeeklyChallengeStatus, loadWeeklyLeague, type FriendBattleResults, type WeeklyChallengeStatus, type WeeklyLeagueEntry } from '@/data/connect-features';
import { createFriendChallenge, listFriendChallenges, respondToFriendChallenge, type FriendChallenge } from '@/data/community';
import { publishedTopics, getTopic } from '@/data/curriculum';
import { type SocialPerson, personName, useSocial } from '@/data/social';
import { useThemedStyles } from '@/hooks/use-theme';

export function WeeklyChallengeCard() {
  const styles = useThemedStyles(createStyles);
  const [status, setStatus] = useState<WeeklyChallengeStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try { setStatus(await loadWeeklyChallengeStatus()); setError(null); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Weekly challenge is not available.'); }
  }, []);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  async function claim() {
    setBusy(true);
    setError(null);
    try { await claimWeeklyChallengeReward(); await refresh(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not claim your freeze.'); }
    finally { setBusy(false); }
  }

  const complete = Boolean(status && status.lessons_completed >= status.lesson_target);
  return (
    <Card style={styles.card}>
      <View style={styles.headingRow}>
        <SectionHeader title="Weekly challenge" subtitle="Complete five lessons by the end of the week." style={styles.noMargin} />
        {status ? <Pill label={`${Math.min(status.lessons_completed, status.lesson_target)}/${status.lesson_target}`} tone={complete ? 'success' : 'neutral'} /> : null}
      </View>
      {status ? <View style={styles.track}><View style={[styles.trackFill, { width: `${Math.min(100, Math.round(status.lessons_completed / status.lesson_target * 100))}%` }]} /></View> : null}
      <Text style={styles.muted}>Lessons completed this week. The streak-freeze reward is coming soon.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {status?.reward_claimed ? <Text style={styles.success}>This week’s reward has been claimed. Freeze balance: {status.freeze_balance}.</Text> : null}
      {status && !status.reward_claimed && complete ? (
        <Button label="Freeze reward coming soon" onPress={() => void claim()} disabled loading={busy} />
      ) : null}
    </Card>
  );
}

export function WeeklyLeagueCard() {
  const styles = useThemedStyles(createStyles);
  const social = useSocial();
  const [entries, setEntries] = useState<WeeklyLeagueEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try { setEntries(await loadWeeklyLeague()); setError(null); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Weekly league is not available.'); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const me = entries.find((entry) => entry.is_viewer);
  const shown = entries.filter((entry) => entry.league_position <= 5 || entry.is_viewer);

  return (
    <Card style={styles.card}>
      <View style={styles.headingRow}>
        <SectionHeader title="League" subtitle={me ? `${me.rank_name} · total XP` : 'Learners of your rank · total XP'} style={styles.noMargin} />
        {me ? <Pill label={`#${me.league_position} of ${me.league_size}`} tone="gold" /> : null}
      </View>
      {loading ? <Text style={styles.muted}>Loading the standings…</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && !error && !me ? <Text style={styles.muted}>You’ll appear here after your first XP is saved.</Text> : null}
      {shown.map((entry) => {
        const friend = social.people.find((person) => person.userId === entry.user_id);
        const name = entry.is_viewer ? 'You' : friend ? personName(friend) : entry.display_name?.trim() || (entry.username ? `@${entry.username}` : 'Username pending');
        return (
          <View key={entry.user_id} style={[styles.leagueRow, entry.is_viewer && styles.leagueMe]}>
          <Text style={styles.place}>{entry.league_position}</Text>
            <PersonAvatar uid={entry.user_id} uri={entry.avatar_url} name={name} size={30} />
            <PersonLink uid={entry.is_viewer ? null : entry.user_id} label={name} style={styles.nameBox}><Text style={[styles.name, entry.is_viewer && styles.success]} numberOfLines={1}>{name}</Text></PersonLink>
            <Text style={styles.score}>{entry.lifetime_xp} XP</Text>
          </View>
        );
      })}
      {/* Weekly XP, resets and promotion/relegation need weekly data neither app stores yet. */}
      <Text style={styles.muted}>Weekly standings with promotion and relegation are coming soon.</Text>
      <Button label="Refresh standings" variant="ghost" size="sm" onPress={() => void refresh()} />
    </Card>
  );
}

export function FriendBattlesCard({ friends }: { friends: readonly SocialPerson[] }) {
  const styles = useThemedStyles(createStyles);
  const social = useSocial();
  const [challenges, setChallenges] = useState<FriendChallenge[]>([]);
  const [results, setResults] = useState<Record<string, FriendBattleResults>>({});
  const [friendId, setFriendId] = useState<string | null>(friends[0]?.userId ?? null);
  const [topicId, setTopicId] = useState<string | null>(publishedTopics[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const rows = await listFriendChallenges();
      setChallenges(rows);
      const active = rows.filter((challenge) => challenge.status === 'active' || challenge.status === 'completed');
      const pairs = await Promise.all(active.map(async (challenge) => {
        try { return [challenge.id, await loadFriendBattleResults(challenge.id)] as const; }
        catch { return [challenge.id, { challenger: null, opponent: null }] as const; }
      }));
      setResults(Object.fromEntries(pairs));
      setError(null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Friend battles are not available.'); }
  }, []);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  useEffect(() => {
    if (!friends.some((friend) => friend.userId === friendId)) setFriendId(friends[0]?.userId ?? null);
  }, [friends, friendId]);

  async function challengeFriend() {
    if (!friendId || !topicId || busy) return;
    const topic = getTopic(topicId);
    if (!topic) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      await createFriendChallenge(friendId, `${topic.title} battle`, topic.id);
      setNotice(`Challenge sent for ${topic.title}.`);
      await refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not send the challenge.'); }
    finally { setBusy(false); }
  }

  async function respond(id: string, accept: boolean) {
    setBusy(true); setError(null);
    try { await respondToFriendChallenge(id, accept); await refresh(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not update the challenge.'); }
    finally { setBusy(false); }
  }

  const currentUserId = social.userId;
  return (
    <Card style={styles.card}>
      <View style={styles.headingRow}><SectionHeader title="Friend battles" subtitle="Earn the most verified learning XP in a seven-day round." style={styles.noMargin} /><Button label="Refresh" variant="ghost" size="sm" onPress={() => void refresh()} /></View>
      {friends.length ? <>
        <Text style={styles.fieldLabel}>Challenge a friend</Text>
        <View style={styles.chips}>
          {friends.map((friend) => <Interactive key={friend.userId} onPress={() => setFriendId(friend.userId)} accessibilityState={{ selected: friend.userId === friendId }} style={[styles.chip, friend.userId === friendId && styles.chipSelected]}><Text style={styles.chipText}>{personName(friend)}</Text></Interactive>)}
        </View>
        <Text style={styles.fieldLabel}>Topic</Text>
        <View style={styles.chips}>
          {publishedTopics.slice(0, 8).map((topic) => <Interactive key={topic.id} onPress={() => setTopicId(topic.id)} accessibilityState={{ selected: topic.id === topicId }} style={[styles.chip, topic.id === topicId && styles.chipSelected]}><Text style={styles.chipText}>{topic.title}</Text></Interactive>)}
        </View>
        <Button label="Battles coming soon" onPress={() => void challengeFriend()} loading={busy} disabled />
      </> : <Text style={styles.muted}>Add a friend to start a topic battle.</Text>}
      {notice ? <Text style={styles.success}>{notice}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {challenges.length ? <View style={styles.challengeList}>
        {challenges.slice(0, 8).map((challenge) => {
          const incoming = challenge.opponent_id === currentUserId;
          const otherId = incoming ? challenge.challenger_id : challenge.opponent_id;
          const friend = friends.find((person) => person.userId === otherId);
          const friendLabel = friend ? personName(friend) : 'Username pending';
          const topic = challenge.topic_id ? getTopic(challenge.topic_id) : null;
          const score = results[challenge.id];
          const mine = incoming ? score?.opponent : score?.challenger;
          const theirs = incoming ? score?.challenger : score?.opponent;
          return <View key={challenge.id} style={styles.challengeRow}>
            <View style={styles.challengeCopy}>
              <Text style={styles.challengeTitle}>{topic?.title ?? challenge.title}</Text>
              <Text style={styles.muted}>{incoming ? `From ${friendLabel}` : `With ${friendLabel}`} · {challenge.status}</Text>
              {challenge.status === 'active' || challenge.status === 'completed' ? <Text style={styles.muted}>You: {mine ? `${mine.xp} XP` : '0 XP'} · {friendLabel}: {theirs ? `${theirs.xp} XP` : '0 XP'}</Text> : null}
              {challenge.status === 'pending' && incoming ? <View style={styles.inlineActions}><Button label="Accept" size="sm" onPress={() => void respond(challenge.id, true)} loading={busy} /><Button label="Decline" size="sm" variant="secondary" onPress={() => void respond(challenge.id, false)} disabled={busy} /></View> : null}
              {challenge.status === 'active' && topic ? <Button label="Take the topic quiz" size="sm" variant="secondary" onPress={() => router.push({ pathname: '/learn/topic', params: { topic: topic.id } } as never)} /> : null}
            </View>
          </View>;
        })}
      </View> : null}
      <Text style={styles.muted}>Coming soon: battles need a server referee so neither player can change the result. That part is still being built.</Text>
    </Card>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: { gap: 12 }, noMargin: { marginTop: 0 },
    headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    muted: { ...Type.caption, color: colors.textTertiary }, success: { ...Type.caption, fontWeight: '800', color: colors.successText }, error: { ...Type.caption, color: colors.warningText },
    fieldLabel: { ...Type.caption, color: colors.textSecondary, fontWeight: '800' },
    track: { height: 8, overflow: 'hidden', borderRadius: 8, backgroundColor: colors.track },
    trackFill: { height: '100%', borderRadius: 8, backgroundColor: colors.primary },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
    chip: { maxWidth: '100%', paddingHorizontal: 10, paddingVertical: 7, borderRadius: Radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    chipSelected: { borderColor: colors.primary, backgroundColor: colors.primarySubtle },
    chipText: { ...Type.caption, color: colors.text },
    leagueRow: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 6 },
    leagueMe: { borderRadius: Radius.md, backgroundColor: colors.primarySubtle },
    place: { ...Type.caption, width: 22, color: colors.textTertiary, textAlign: 'center' },
    nameBox: { flex: 1, minWidth: 0 },
    name: { ...Type.caption, color: colors.text, flex: 1 }, score: { ...Type.caption, color: colors.textSecondary, fontWeight: '800' },
    challengeList: { gap: 8, marginTop: 6 },
    challengeRow: { borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 10 },
    challengeCopy: { gap: 6 }, challengeTitle: { ...Type.callout, color: colors.text, fontWeight: '800' },
    inlineActions: { flexDirection: 'row', gap: 8 },
  });
}
