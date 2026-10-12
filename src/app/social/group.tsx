import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';

import { BackLink } from '@/components/learning/nav-bits';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/interactive';
import { PageHeader, Screen } from '@/components/ui/screen';
import { InlineNotice, LoadingState } from '@/components/ui/state-views';
import { Radius, Type, type ThemeColors } from '@/constants/theme';
import { MentionInput } from '@/components/social/mention-input';
import { inviteFriendToGroup, listGroupDiscussion, listVisibleStudyGroups, postToGroupDiscussion, type GroupDiscussionPost } from '@/data/community';
import { personName, useSocial } from '@/data/social';
import { useAuth } from '@/hooks/use-auth';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

export default function StudyGroupScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const { user } = useAuth();
  const social = useSocial();
  const friends = social.people.filter((person) => person.relationship === 'friends');
  const params = useLocalSearchParams<{ group?: string | string[] }>();
  const groupId = Array.isArray(params.group) ? params.group[0] : params.group;
  const [posts, setPosts] = useState<GroupDiscussionPost[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);

  const refresh = useCallback(async () => {
    if (!groupId) return;
    setError(null);
    try {
      const [discussion, groups] = await Promise.all([listGroupDiscussion(groupId), listVisibleStudyGroups()]);
      setPosts(discussion);
      setCanManage(groups.find((group) => group.id === groupId)?.owner_id === user?.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load this discussion.');
    } finally {
      setLoading(false);
    }
  }, [groupId, user]);

  useEffect(() => { queueMicrotask(() => { void refresh(); }); }, [refresh]);

  // Refresh handled on load and after sending

  async function send() {
    if (!groupId || !draft.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await postToGroupDiscussion(groupId, draft);
      setDraft('');
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not post your message.');
    } finally {
      setBusy(false);
    }
  }

  async function invite(friendId: string) {
    if (!groupId) return;
    setBusy(true);
    setError(null);
    try { await inviteFriendToGroup(groupId, friendId); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not invite this classmate.'); }
    finally { setBusy(false); }
  }

  return (
    <Screen width="prose">
      <BackLink fallback={'/social/groups' as never} />
      <PageHeader title="Group discussion" subtitle="Share assignment questions, notes and explanations with your study group." />
      {canManage && friends.length ? (
        <Card style={styles.inviteCard}>
          <Text style={styles.author}>Add friends to your group</Text>
          {friends.map((friend) => <View key={friend.userId} style={styles.inviteRow}><Text style={styles.body}>{personName(friend)}</Text><Button label="Add" size="sm" variant="secondary" onPress={() => void invite(friend.userId)} loading={busy} accessibilityLabel={`Add ${personName(friend)} to the group`} /></View>)}
        </Card>
      ) : null}
      <Card style={styles.composer}>
        <MentionInput people={social.people} value={draft} onChangeText={setDraft} maxLength={5000} multiline placeholder="Start a group discussion…" placeholderTextColor={colors.textTertiary} accessibilityLabel="Write a group discussion post" style={styles.input} />
        <Button label="Post to group" onPress={() => void send()} loading={busy} disabled={!draft.trim() || busy || !groupId} />
      </Card>
      {error ? <InlineNotice tone="warning" title="Discussion unavailable" message={`${error} Only members can see a group’s discussion.`} /> : null}
      {loading ? <LoadingState label="Loading discussion" /> : null}
      {!loading && !posts.length && !error ? (
        <Card style={styles.empty}><Text style={styles.body}>No messages yet. Start with an assignment question or a topic you want to revise together.</Text></Card>
      ) : null}
      {posts.map((post) => (
        <Card key={post.id} style={styles.post}>
          <Text style={styles.author}>{post.author_id === user?.id ? 'You' : 'Group member'}</Text>
          <Text style={styles.body}>{post.body}</Text>
          <Text style={styles.when}>{new Date(post.created_at).toLocaleString()}</Text>
        </Card>
      ))}
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    composer: { gap: 10, marginBottom: 16 },
    inviteCard: { gap: 8, marginBottom: 14 },
    inviteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 8 },
    input: { minHeight: 88, maxHeight: 180, textAlignVertical: 'top', borderWidth: 1, borderColor: colors.borderStrong, borderRadius: Radius.md, backgroundColor: colors.surfaceSunken, padding: 13, color: colors.text, fontSize: 14 },
    post: { gap: 7, marginBottom: 10 },
    author: { ...Type.caption, fontWeight: '800', color: colors.primaryText },
    body: { ...Type.callout, color: colors.text },
    when: { ...Type.caption, color: colors.textTertiary },
    empty: { padding: 20 },
  });
}
