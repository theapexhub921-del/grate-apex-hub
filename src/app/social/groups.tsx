import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, TextInput } from '@/components/ui/text';

import { BackLink } from '@/components/learning/nav-bits';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Card } from '@/components/ui/interactive';
import { Pill } from '@/components/ui/pill';
import { PageHeader, Screen } from '@/components/ui/screen';
import { InlineNotice, LoadingState } from '@/components/ui/state-views';
import { Radius, Type, type ThemeColors } from '@/constants/theme';
import { PersonAvatar } from '@/components/social/profile-card';
import { Interactive } from '@/components/ui/interactive';
import { createGroup } from '@/data/group-chat';
import { personName, useSocial } from '@/data/social';
import { createStudyGroup, joinStudyGroup, listVisibleStudyGroups, respondToGroupInvite, type StudyGroup } from '@/data/community';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

export default function StudyGroupsScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const social = useSocial();
  const [picked, setPicked] = useState<string[]>([]);
  // Friends who follow each other can be added (shared rules), up to 9 besides you.
  const friends = social.people.filter((person) => person.relationship === 'friends');

  const refresh = useCallback(async () => {
    setError(null);
    try {
      setGroups(await listVisibleStudyGroups());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load study groups.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { queueMicrotask(() => { void refresh(); }); }, [refresh]);

  async function create() {
    if (title.trim().length < 2 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const id = picked.length ? (await createGroup({ name: title, description, memberUids: picked })).id : await createStudyGroup({ title, description });
      setTitle('');
      setDescription('');
      setPicked([]);
      await refresh();
      router.push({ pathname: '/social/group', params: { group: id } } as never);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create the group.');
    } finally {
      setBusy(false);
    }
  }

  async function join(group: StudyGroup) {
    setBusy(true);
    setError(null);
    try {
      await joinStudyGroup(group.id);
      router.push({ pathname: '/social/group', params: { group: group.id } } as never);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not join this group.');
    } finally {
      setBusy(false);
    }
  }

  async function respondToInvite(group: StudyGroup, accept: boolean) {
    setBusy(true);
    setError(null);
    try {
      await respondToGroupInvite(group.id, accept);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update this invitation.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen width="wide">
      <BackLink fallback={'/social' as never} />
      <PageHeader title="Study groups" subtitle="Create your own room, work through assignments and discuss topics with classmates." />

      <Card style={styles.form}>
        <Text style={styles.heading}>Create a group</Text>
        <TextInput value={title} onChangeText={setTitle} maxLength={40} placeholder="Group name" placeholderTextColor={colors.textTertiary} accessibilityLabel="Study group name" style={styles.input} />
        <TextInput value={description} onChangeText={setDescription} maxLength={200} multiline placeholder="What will your group study? (optional)" placeholderTextColor={colors.textTertiary} accessibilityLabel="Study group description" style={[styles.input, styles.multiline]} />
        {/* Shared rules: groups are private to their members; the owner adds friends who follow each other. */}
        <Text style={styles.heading}>Add members{picked.length ? ` · ${picked.length}` : ''}</Text>
        {friends.length ? (
          <View style={styles.people}>
            {friends.map((person) => {
              const on = picked.includes(person.userId);
              return (
                <Interactive key={person.userId} onPress={() => setPicked((list) => (on ? list.filter((id) => id !== person.userId) : list.length < 9 ? [...list, person.userId] : list))} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={personName(person)} style={[styles.person, on && styles.personOn]}>
                  <PersonAvatar uid={person.userId} uri={person.avatarUrl} name={personName(person)} size={30} />
                  <Text style={styles.personName} numberOfLines={1}>{personName(person)}</Text>
                  <View style={[styles.check, on && styles.checkOn]}>{on ? <Icon name="check" size={11} color={colors.onPrimary} strokeWidth={3} /> : null}</View>
                </Interactive>
              );
            })}
          </View>
        ) : (
          <Text style={styles.label}>Friends who follow you back will appear here to add.</Text>
        )}
        <Text style={styles.label}>Groups are private: only members can see them. You can add more friends later (up to 10 people).</Text>
        <Button label="Create group" onPress={() => void create()} loading={busy} disabled={title.trim().length < 2 || busy} />
      </Card>

      <View style={styles.listHeading}>
        <Text style={styles.heading}>Your groups</Text>
        <Button label="Refresh" variant="ghost" size="sm" onPress={() => void refresh()} />
      </View>
      {loading ? <LoadingState label="Loading study groups" /> : null}
      {error ? <InlineNotice tone="warning" title="Study groups unavailable" message={error} /> : null}
      {!loading && !groups.length && !error ? (
        <Card style={styles.empty}>
          <Icon name="social" size={24} color={colors.primaryText} />
          <Text style={styles.body}>You are not in a group yet. Start one, then add friends who follow you back.</Text>
        </Card>
      ) : null}
      {groups.map((group) => (
        <Card key={group.id} style={styles.groupCard}>
          <View style={styles.groupTitleRow}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <Pill label={group.membership_role === 'owner' ? 'Owner' : 'Member'} />
          </View>
          {group.description ? <Text style={styles.body}>{group.description}</Text> : null}
          <View style={styles.actions}>
            {group.is_member ? <Button label="Open discussion" variant="secondary" size="sm" onPress={() => router.push({ pathname: '/social/group', params: { group: group.id } } as never)} /> : null}
            {group.membership_status === 'invited' ? (
              <>
                <Text style={styles.inviteNote}>You’ve been invited to this group.</Text>
                <Button label="Accept invitation" size="sm" onPress={() => void respondToInvite(group, true)} loading={busy} />
                <Button label="Decline" variant="ghost" size="sm" onPress={() => void respondToInvite(group, false)} loading={busy} />
              </>
            ) : null}
            {group.visibility === 'open' && !group.is_member ? <Button label="Join group" size="sm" onPress={() => void join(group)} loading={busy} /> : null}
          </View>
        </Card>
      ))}
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    people: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    person: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingLeft: 6, paddingRight: 10, borderRadius: 999, borderWidth: 1, borderColor: colors.border, maxWidth: 240 },
    personOn: { borderColor: colors.primary, backgroundColor: colors.primarySubtle },
    personName: { fontSize: 13.5, fontWeight: '600', color: colors.text, flexShrink: 1 },
    check: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
    checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    form: { gap: 12 },
    heading: { ...Type.title3, color: colors.text },
    label: { ...Type.caption, fontWeight: '800', color: colors.textSecondary },
    input: { width: '100%', borderWidth: 1, borderColor: colors.borderStrong, borderRadius: Radius.md, backgroundColor: colors.surfaceSunken, paddingHorizontal: 13, paddingVertical: 11, color: colors.text, fontSize: 14 },
    multiline: { minHeight: 76, textAlignVertical: 'top' },
    visibilityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    listHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 10 },
    groupCard: { gap: 10, marginBottom: 10 },
    groupTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    groupTitle: { ...Type.headline, flex: 1, color: colors.text },
    body: { ...Type.callout, color: colors.textSecondary },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    inviteNote: { ...Type.caption, color: colors.textSecondary, alignSelf: 'center' },
    empty: { alignItems: 'center', gap: 10, padding: 22 },
  });
}
