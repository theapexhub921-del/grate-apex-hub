import type { Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { Text, TextInput } from '@/components/ui/text';

import { BackLink } from '@/components/learning/nav-bits';
import { PersonAvatar, PersonLink } from '@/components/social/profile-card';
import { VerifiedBadge } from '@/components/ui/verified-badge';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { PageHeader, Screen } from '@/components/ui/screen';
import { EmptyState, InlineNotice, LoadingState } from '@/components/ui/state-views';
import { elevation, Radius, Type, type ThemeColors } from '@/constants/theme';
import {
  personName,
  removeFriendship,
  respondToFriendRequest,
  searchLearners,
  sendFriendRequest,
  setShareActivity,
  setUsername,
  type SocialPerson,
  useSocial,
} from '@/data/social';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { blockCommunityUser, reportCommunityContent } from '@/data/community';
import { nextUsernameChange, USERNAME_CHANGE_DAYS } from '@/lib/accounts';

// '/social' is the Social hub (social/index.tsx). Cast because the
// generated route types can lag behind newly added routes.
const SOCIAL_HREF = '/social' as Href;

// Real friends, backed by Supabase (data/social.ts): your username, search
// for classmates, requests in and out, and your friends' weekly progress.
export default function FriendsScreen() {
  const styles = useThemedStyles(createStyles);
  const social = useSocial();
  const incoming = social.people.filter((person) => person.relationship === 'incoming');
  const outgoing = social.people.filter((person) => person.relationship === 'outgoing');
  const friends = social.people
    .filter((person) => person.relationship === 'friends')
    .sort((a, b) => (b.weeklyXp ?? 0) - (a.weeklyXp ?? 0));

  return (
    <Screen width="prose">
      <BackLink fallback={SOCIAL_HREF} />
      <PageHeader title="Friends" subtitle="Your study circle." style={styles.header} />

      <UsernameCard username={social.username} />
      <ShareActivityCard share={social.shareActivity} />
      <SearchCard />

      {social.status === 'loading' && social.people.length === 0 ? (
        <LoadingState label="Loading your friends" />
      ) : null}
      {social.status === 'error' ? <InlineNotice tone="warning" title="Couldn’t load friends" message={social.error ?? 'Please try again.'} /> : null}

      {incoming.length > 0 ? (
        <>
          <SectionHeader title="Friend requests" count={incoming.length} highlight />
          <View style={styles.list}>
            {incoming.map((person, index) => (
              <PersonRow key={person.userId} person={person} first={index === 0} />
            ))}
          </View>
        </>
      ) : null}

      {outgoing.length > 0 ? (
        <>
          <SectionHeader title="Sent requests" count={outgoing.length} />
          <View style={styles.list}>
            {outgoing.map((person, index) => (
              <PersonRow key={person.userId} person={person} first={index === 0} />
            ))}
          </View>
        </>
      ) : null}

      <SectionHeader title="Your friends" count={friends.length} />
      {friends.length > 0 ? (
        <View style={styles.list}>
          {friends.map((person, index) => (
            <PersonRow key={person.userId} person={person} first={index === 0} />
          ))}
        </View>
      ) : social.status === 'ready' ? (
        <EmptyState icon="social" title="No friends yet" message="Search for classmates above, or share your username so they can find you." />
      ) : null}
    </Screen>
  );
}

function SectionHeader({ title, count, highlight }: { title: string; count: number; highlight?: boolean }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {highlight ? <Pill label={`${count}`} tone="gold" /> : <Text style={styles.sectionCount}>{count}</Text>}
    </View>
  );
}

function UsernameCard({ username }: { username: string | null }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A username can be changed again 30 days after a change (the shared rules enforce it too).
  const [nextChange, setNextChange] = useState<Date | null>(null);
  useEffect(() => {
    let live = true;
    void nextUsernameChange().then((date) => { if (live) setNextChange(date); });
    return () => { live = false; };
  }, [username]);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const had = Boolean(username);
      await setUsername(value);
      setEditing(false);
      if (had) setNextChange(await nextUsernameChange());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (username && !editing) {
    return (
      <View style={[styles.card, styles.usernameRow]}>
        <View style={styles.rowInfo}>
          <Text style={styles.cardLabel}>YOUR USERNAME</Text>
          <Text style={styles.username}>@{username}</Text>
          <Text style={styles.rowDetail}>
            {nextChange
              ? `Classmates can find you by this name. You can change it again on ${nextChange.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}.`
              : 'Classmates can find you by this name.'}
          </Text>
        </View>
        <Button label="Change" variant="secondary" size="sm" disabled={Boolean(nextChange)} onPress={() => { setValue(username); setEditing(true); }} accessibilityLabel={nextChange ? 'Change username (not available yet)' : 'Change username'} />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{username ? 'CHANGE YOUR USERNAME' : 'CHOOSE A USERNAME'}</Text>
      <Text style={styles.rowDetail}>So classmates can find you. 3–20 lowercase letters, numbers or underscores.{username ? ` After a change you can’t change it again for ${USERNAME_CHANGE_DAYS} days.` : ''}</Text>
      <View style={styles.inputRow}>
        <TextInput
          value={value}
          onChangeText={(text) => setValue(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
          placeholder="e.g. doc_amara"
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
          onSubmitEditing={save}
          accessibilityLabel="Username"
          style={styles.input}
        />
        <Button label="Save" size="sm" onPress={save} loading={busy} disabled={value.length < 3 || busy} />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function ShareActivityCard({ share }: { share: boolean }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const [error, setError] = useState<string | null>(null);
  return (
    <View style={[styles.card, styles.usernameRow]}>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>Share my activity with friends</Text>
        <Text style={styles.rowDetail}>Friends see when you complete a lesson, a topic or the Apex Challenge — never your answers or scores.</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
      <Switch
        value={share}
        onValueChange={(next) => {
          setError(null);
          setShareActivity(next).catch((caught) => setError(caught instanceof Error ? caught.message : 'Please try again.'));
        }}
        trackColor={{ true: colors.primary, false: colors.track }}
        accessibilityLabel="Share my activity with friends"
      />
    </View>
  );
}

function SearchCard() {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const social = useSocial();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SocialPerson[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const relationshipKey = social.people.map((person) => `${person.userId}:${person.relationship}`).sort().join('|');

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      searchLearners(trimmed)
        .then((found) => {
          if (!cancelled) {
            setResults(found);
            setError(null);
          }
        })
        .catch((caught) => {
          if (!cancelled) setError(caught instanceof Error ? caught.message : 'Search failed.');
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // Re-run when friendships change so result buttons stay accurate.
  }, [query, relationshipKey]);

  const showResults = query.trim().length >= 2 && results;

  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>FIND CLASSMATES</Text>
      <TextInput
        value={query}
        onChangeText={(text) => {
          setQuery(text);
          setResults(null);
        }}
        placeholder="Search by username or name"
        placeholderTextColor={colors.textTertiary}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Search learners"
        style={styles.input}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {showResults ? (
        results.length > 0 ? (
          <View style={styles.results}>
            {results.map((person, index) => (
              <PersonRow key={person.userId} person={person} first={index === 0} compact />
            ))}
          </View>
        ) : (
          <Text style={styles.rowDetail}>No learners match “{query.trim()}”.</Text>
        )
      ) : query.trim().length >= 2 && !error ? <Text style={styles.rowDetail}>Searching…</Text> : null}
    </View>
  );
}

function PersonRow({ person, first, compact }: { person: SocialPerson; first: boolean; compact?: boolean }) {
  const styles = useThemedStyles(createStyles);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [blockConfirm, setBlockConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = personName(person);

  async function act(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      setConfirm(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const detail =
    person.relationship === 'friends' && person.isOnline
      ? `${person.username ? `@${person.username} · ` : ''}Online now`
      : person.relationship === 'friends' && person.weeklyXp !== null
        ? `${person.username ? `@${person.username} · ` : ''}${person.weeklyXp} XP this week · ${person.streak ?? 0}-day streak`
      : person.username
        ? `@${person.username}`
        : 'Username pending';

  let actions: React.ReactNode = null;
  if (person.relationship === 'incoming' && person.friendshipId) {
    const id = person.friendshipId;
    actions = (
      <View style={styles.actions}>
        <Button label="Accept" size="sm" onPress={() => act(() => respondToFriendRequest(id, true))} loading={busy} />
        <Button label="Hide" size="sm" variant="secondary" onPress={() => act(() => respondToFriendRequest(id, false))} disabled={busy} accessibilityLabel={`Hide the request from ${name} on this device`} />
      </View>
    );
  } else if (person.relationship === 'outgoing' && person.friendshipId) {
    const id = person.friendshipId;
    actions = (
      <View style={styles.actions}>
        <Pill label="Pending" />
        <Button label="Cancel" size="sm" variant="secondary" onPress={() => act(() => removeFriendship(id))} loading={busy} />
      </View>
    );
  } else if (person.relationship === 'friends' && person.friendshipId) {
    const id = person.friendshipId;
    actions = compact ? (
      <Pill label="Friends" tone="success" />
    ) : confirm ? (
      <View style={styles.actions}>
        <Button label="Remove" size="sm" variant="secondary" onPress={() => act(() => removeFriendship(id))} loading={busy} />
        <Button label="Keep" size="sm" variant="secondary" onPress={() => setConfirm(false)} disabled={busy} />
      </View>
    ) : (
      <Button label="Remove" size="sm" variant="secondary" onPress={() => setConfirm(true)} accessibilityLabel={`Remove ${name} from friends`} />
    );
  } else {
    actions = <Button label="Add friend" size="sm" onPress={() => act(() => sendFriendRequest(person.userId))} loading={busy} />;
  }

  if (!compact) actions = <View style={styles.actions}>
    {actions}
    {blockConfirm ? <>
      <Button label="Confirm block" size="sm" variant="secondary" onPress={() => act(() => blockCommunityUser(person.userId, person.friendshipId))} loading={busy} />
      <Button label="Cancel" size="sm" variant="ghost" onPress={() => setBlockConfirm(false)} disabled={busy} />
    </> : <Button label="Block" size="sm" variant="ghost" onPress={() => setBlockConfirm(true)} disabled={busy} accessibilityLabel={`Block ${name}`} />}
    <Button label="Report" size="sm" variant="ghost" onPress={() => act(() => reportCommunityContent('user', person.userId))} loading={busy} accessibilityLabel={`Report ${name}`} />
  </View>;

  return (
    <View style={[styles.row, !first && styles.rowDivider]}>
      <PersonAvatar uid={person.userId} uri={person.avatarUrl} name={name} size={compact ? 38 : 44} ring={person.relationship === 'friends' ? 'subtle' : 'none'} status={person.isOnline ? 'online' : null} />
      <PersonLink uid={person.userId} label={name} style={styles.rowInfo}>
        <View style={styles.nameLine}><Text style={styles.rowName} numberOfLines={1}>{name}</Text><VerifiedBadge username={person.username} uid={person.userId} size={14} /></View>
        <Text style={styles.rowDetail} numberOfLines={1}>{detail}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </PersonLink>
      {actions}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    header: { marginTop: 14, marginBottom: 14 },
    card: {
      gap: 8,
      padding: 16,
      marginBottom: 12,
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.hairline,
      ...elevation(colors, 1),
    },
    cardLabel: { fontSize: 11.5, fontWeight: '800', letterSpacing: 0.8, color: colors.textSecondary },
    username: { ...Type.title3, color: colors.text },
    usernameRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    input: {
      flex: 1,
      minHeight: 44,
      paddingHorizontal: 14,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSunken,
      color: colors.text,
      fontSize: 15,
    },
    results: { marginTop: 4 },
    error: { fontSize: 12.5, color: colors.error, marginTop: 2 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20, marginBottom: 10 },
    sectionTitle: { ...Type.title3, color: colors.text },
    sectionCount: { ...Type.numeral, fontSize: 14, color: colors.textTertiary },
    list: {
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.hairline,
      overflow: 'hidden',
      ...elevation(colors, 1),
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 },
    rowDivider: { borderTopWidth: 1, borderTopColor: colors.divider },
    rowInfo: { flex: 1, minWidth: 0 },
    nameLine: { flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 0 },
    rowName: { fontSize: 15, fontWeight: '700', color: colors.text },
    rowDetail: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  });
}
