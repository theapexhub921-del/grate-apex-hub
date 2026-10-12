import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, TextInput } from '@/components/ui/text';

import { Avatar } from '@/components/ui/avatar';
import { BackLink } from '@/components/learning/nav-bits';
import { MentionInput } from '@/components/social/mention-input';
import { Button } from '@/components/ui/button';
import { Card, Interactive } from '@/components/ui/interactive';
import { InlineNotice } from '@/components/ui/state-views';
import { PageHeader, Screen, SectionHeader } from '@/components/ui/screen';
import { Radius, Type, type ThemeColors } from '@/constants/theme';
import { conferenceParticipants, createConference, joinConference, leaveConference, listConferenceMessages, listConferences, sendConferenceMessage, type ConferenceMessage, type TableConference } from '@/data/conferences';
import { listVisibleStudyGroups, type StudyGroup } from '@/data/community';
import { personName, useSocial } from '@/data/social';
import { auth } from '@/lib/firebase';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

export default function ConferencesScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const social = useSocial();
  const friends = social.people.filter((person) => person.relationship === 'friends');
  const [conferences, setConferences] = useState<TableConference[]>([]);
  const [selected, setSelected] = useState<TableConference | null>(null);
  const [messages, setMessages] = useState<ConferenceMessage[]>([]);
  const [participants, setParticipants] = useState<string[]>([]);
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [invitees, setInvitees] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [userId, setUserId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function reload() {
    try {
      const [upcoming, groupList] = await Promise.all([listConferences(), listVisibleStudyGroups()]);
      setUserId(auth.currentUser?.uid ?? '');
      setConferences(upcoming);
      setGroups(groupList);
    }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load conferences.'); }
  }
  useEffect(() => { queueMicrotask(() => { void reload(); }); }, []);

  async function open(conf: TableConference) {
    setSelected(conf);
    try {
      const [thread, people] = await Promise.all([listConferenceMessages(conf.id), conferenceParticipants(conf.id)]);
      setMessages(thread); setParticipants(people.filter((p) => p.status !== 'left').map((p) => p.user_id)); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not open this conference.'); }
  }

  async function create() {
    if (!name.trim() || !topic.trim()) { setError('Add a name and discussion topic.'); return; }
    try {
      setBusy(true); setError('');
      const start = startsAt.trim() ? new Date(startsAt) : new Date(Date.now() + 3600000);
      if (Number.isNaN(start.getTime())) throw new Error('Enter a valid conference date and time.');
      const conf = await createConference({ name: name.trim(), topic: topic.trim(), starts_at: start.toISOString(), group_id: groupId }, invitees);
      setName(''); setTopic(''); setInvitees([]); await reload(); await open(conf);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not schedule the conference.'); }
    finally { setBusy(false); }
  }

  async function respond(join: boolean) {
    if (!selected) return;
    try {
      setBusy(true); setError('');
      if (join) await joinConference(selected.id); else await leaveConference(selected.id);
      await open(selected);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update your attendance.'); }
    finally { setBusy(false); }
  }

  async function send() {
    if (!selected || !draft.trim()) return;
    try { const msg = await sendConferenceMessage(selected.id, draft); setMessages((old) => [...old, msg]); setDraft(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not send the message.'); }
  }

  return <Screen width="wide">
    <BackLink fallback="/social" />
    <PageHeader title="Table Conferences" subtitle="Schedule a text-first study session with friends. Voice and video can connect here later." />
    {/* The deployed rules keep `calls` for the original app's voice calls, so scheduled
        sessions need their own collection and rule before they can be saved. */}
    <InlineNotice tone="info" title="Coming soon" message="Scheduled study sessions are being rebuilt on the shared database. You can’t schedule one yet." />
    {error ? <InlineNotice tone="error" title="Conference update" message={error} /> : null}
    <View style={styles.columns}>
      <View style={styles.main}>
        <SectionHeader title="Schedule a session" subtitle="Invite friends and give your discussion a clear focus." />
        <Card style={styles.card}>
          <TextInput value={name} onChangeText={setName} maxLength={100} placeholder="Conference name" placeholderTextColor={colors.textTertiary} style={styles.input} />
          <TextInput value={topic} onChangeText={setTopic} maxLength={300} placeholder="Topic or question to work through" placeholderTextColor={colors.textTertiary} style={styles.input} />
          <TextInput value={startsAt} onChangeText={setStartsAt} placeholder="Optional: 2026-10-05T18:00:00Z" placeholderTextColor={colors.textTertiary} style={styles.input} accessibilityLabel="Conference start time in ISO date format" />
          <Text style={styles.muted}>Start time (ISO date/time). Leave empty for one hour from now.</Text>
          <Text style={styles.label}>Group context (optional)</Text>
          <View style={styles.friendGrid}>
            <Interactive onPress={() => setGroupId(null)} accessibilityRole="radio" accessibilityState={{ checked: groupId === null }} style={[styles.friendChoice, groupId === null && styles.friendChoiceActive]}><Text style={styles.friendName}>No group</Text></Interactive>
            {groups.filter((group) => group.is_member).map((group) => <Interactive key={group.id} onPress={() => setGroupId(group.id)} accessibilityRole="radio" accessibilityState={{ checked: groupId === group.id }} style={[styles.friendChoice, groupId === group.id && styles.friendChoiceActive]}><Text style={styles.friendName}>{group.title}</Text></Interactive>)}
          </View>
          <Text style={styles.label}>Invite friends</Text>
          <View style={styles.friendGrid}>{friends.map((friend) => {
            const active = invitees.includes(friend.userId);
            return <Interactive key={friend.userId} onPress={() => setInvitees((old) => active ? old.filter((id) => id !== friend.userId) : [...old, friend.userId])} accessibilityRole="checkbox" accessibilityState={{ checked: active }} style={[styles.friendChoice, active && styles.friendChoiceActive]}><Avatar uri={friend.avatarUrl} name={personName(friend)} size={28} /><Text style={styles.friendName}>{personName(friend)}</Text></Interactive>;
          })}</View>
          <Button label="Scheduling coming soon" loading={busy} disabled onPress={() => void create()} />
        </Card>
        <SectionHeader title="Upcoming and recent" subtitle="Only conferences you host, are invited to, or can access through a group appear here." style={styles.section} />
        {conferences.length ? conferences.map((conf) => <Interactive key={conf.id} onPress={() => void open(conf)} accessibilityRole="button" style={styles.confRow}>
          <View style={styles.flex}><Text style={styles.confTitle}>{conf.name}</Text><Text style={styles.muted}>{conf.topic}</Text><Text style={styles.muted}>{new Date(conf.starts_at).toLocaleString()} · {conf.status}</Text></View>
        </Interactive>) : <Card style={styles.card}><Text style={styles.muted}>No conferences yet. Create one above.</Text></Card>}
      </View>
      <View style={styles.detail}>
        {selected ? <Card style={styles.card}>
          <Text style={styles.title}>{selected.name}</Text><Text style={styles.body}>{selected.topic}</Text>
          <Text style={styles.label}>Participants ({participants.length})</Text>
          <Text style={styles.muted}>{participants.map((id) => id === userId ? 'You' : personName(friends.find((f) => f.userId === id) ?? { displayName: null, username: null })).join(' · ') || 'No participants yet'}</Text>
          {participants.includes(userId) ? <Button label="Leave session" variant="secondary" onPress={() => void respond(false)} disabled={busy} /> : <Button label="Join session" onPress={() => void respond(true)} disabled={busy} />}
          <View style={styles.thread}>{messages.map((message) => <View key={message.id} style={styles.message}><Text style={styles.messageBody}>{message.body}</Text><Text style={styles.muted}>{message.author_id === userId ? 'You' : 'Participant'} · {new Date(message.created_at).toLocaleTimeString()}</Text></View>)}</View>
          {participants.includes(userId) ? <View style={styles.composer}><MentionInput people={social.people} value={draft} onChangeText={setDraft} multiline maxLength={4000} placeholder="Add to the discussion…" placeholderTextColor={colors.textTertiary} style={[styles.input, styles.flex]} /><Button label="Send" onPress={() => void send()} disabled={!draft.trim()} /></View> : <Text style={styles.muted}>Join to read and take part in the discussion.</Text>}
        </Card> : <Card style={styles.card}><Text style={styles.body}>Choose a conference to view its participant list and discussion.</Text></Card>}
      </View>
    </View>
  </Screen>;
}

function createStyles(c: ThemeColors) { return StyleSheet.create({
  columns: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 20 }, main: { flex: 1.1, minWidth: 320, gap: 12 }, detail: { flex: 1, minWidth: 320 }, card: { gap: 12, marginTop: 8 }, section: { marginTop: 24 },
  input: { minWidth: 0, borderWidth: 1, borderColor: c.borderStrong, borderRadius: Radius.md, backgroundColor: c.surfaceSunken, paddingHorizontal: 12, paddingVertical: 10, color: c.text, fontSize: 14 }, flex: { flex: 1, minWidth: 0 }, label: { ...Type.caption, color: c.textSecondary, fontWeight: '800' }, muted: { ...Type.caption, color: c.textTertiary }, body: { ...Type.callout, color: c.textSecondary }, title: { ...Type.title2, color: c.text },
  friendGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, friendChoice: { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 7, borderRadius: 24, borderWidth: 1, borderColor: c.border }, friendChoiceActive: { borderColor: c.primary, backgroundColor: c.primarySubtle }, friendName: { ...Type.caption, color: c.text },
  confRow: { padding: 15, borderRadius: Radius.lg, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, marginTop: 8 }, confTitle: { ...Type.headline, color: c.text }, thread: { gap: 8, maxHeight: 420, overflow: 'scroll' as never }, message: { padding: 10, borderRadius: Radius.md, backgroundColor: c.surfaceMuted, gap: 5 }, messageBody: { ...Type.callout, color: c.text }, composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
}); }
