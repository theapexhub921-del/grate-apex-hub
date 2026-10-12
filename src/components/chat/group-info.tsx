import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { PersonAvatar } from '@/components/social/profile-card';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Interactive } from '@/components/ui/interactive';
import { Pill } from '@/components/ui/pill';
import { Sheet } from '@/components/ui/sheet';
import { Text, TextInput } from '@/components/ui/text';
import { Radius, Type, type ThemeColors } from '@/constants/theme';
import { addGroupMember, createGroup, deleteGroup, type GroupInfo, leaveGroup } from '@/data/group-chat';
import { personName, useSocial } from '@/data/social';
import { useAuth } from '@/hooks/use-auth';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

const MAX_MEMBERS = 10; // the shared rules allow up to 10 people in a group

/** Group info (like WhatsApp): name, description, members, add members (owner), leave, report. */
export function GroupInfoSheet({ visible, group, onClose, onChanged, onReport }: { visible: boolean; group: GroupInfo; onClose: () => void; onChanged: () => void; onReport: () => void }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const { user } = useAuth();
  const social = useSocial();
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const owner = group.ownerUid === user?.uid;
  const addable = social.people.filter((person) => person.relationship === 'friends' && !group.memberUids.includes(person.userId));
  const nameOf = (uid: string) => {
    if (uid === user?.uid) return 'You';
    const person = social.people.find((p) => p.userId === uid);
    return person ? personName(person) : group.members[uid] ? `@${group.members[uid]}` : 'Member';
  };

  async function add(uid: string) {
    setBusy(uid);
    setError(null);
    try { await addGroupMember(group.id, uid); onChanged(); } catch (problem) { setError(problem instanceof Error ? problem.message : 'Could not add them.'); }
    setBusy(null);
  }
  async function leave() {
    setBusy('leave');
    try {
      if (owner) await deleteGroup(group.id);
      else await leaveGroup(group.id);
      onClose();
      router.replace('/social/messages' as Href);
    } catch {
      setError(owner ? 'The group could not be deleted.' : 'You could not leave the group.');
    }
    setBusy(null);
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Group info" width={460}>
      <ScrollView style={styles.scroll}>
        <View style={styles.top}>
          <Avatar name={group.name} size={84} ring="gold" />
          <Text style={styles.name}>{group.name}</Text>
          <Text style={styles.muted}>Group · {group.memberUids.length} member{group.memberUids.length === 1 ? '' : 's'}</Text>
          {group.description ? <Text style={styles.description}>{group.description}</Text> : null}
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.label}>{group.memberUids.length} MEMBERS</Text>
        {owner && group.memberUids.length < MAX_MEMBERS ? (
          <Interactive onPress={() => setAdding((value) => !value)} accessibilityRole="button" style={styles.row}>
            <View style={styles.addIcon}><Icon name="plus" size={18} color={colors.onPrimary} /></View>
            <Text style={styles.rowName}>Add members</Text>
          </Interactive>
        ) : null}
        {adding ? addable.map((person) => (
          <View key={person.userId} style={styles.row}>
            <PersonAvatar uid={person.userId} uri={person.avatarUrl} name={personName(person)} size={38} />
            <Text style={styles.rowName}>{personName(person)}</Text>
            <Button label="Add" size="sm" loading={busy === person.userId} onPress={() => void add(person.userId)} />
          </View>
        )) : null}
        {adding && !addable.length ? <Text style={styles.muted}>All your friends are already here.</Text> : null}
        {group.memberUids.map((uid) => (
          <View key={uid} style={styles.row}>
            <PersonAvatar uid={uid} name={nameOf(uid)} size={38} />
            <Text style={styles.rowName}>{nameOf(uid)}</Text>
            {uid === group.ownerUid ? <Pill label="Group admin" tone="success" /> : null}
          </View>
        ))}
        <View style={styles.actions}>
          <Button label={owner ? 'Delete group' : 'Exit group'} variant="danger" loading={busy === 'leave'} onPress={() => void leave()} />
          <Button label="Report group" variant="ghost" onPress={onReport} />
        </View>
      </ScrollView>
    </Sheet>
  );
}

/** New group (like WhatsApp): pick friends, then name the group and say what it's for. */
export function NewGroupSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const social = useSocial();
  const [step, setStep] = useState<1 | 2>(1);
  const [picked, setPicked] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const friends = social.people.filter((person) => person.relationship === 'friends' && (!query.trim() || personName(person).toLowerCase().includes(query.trim().toLowerCase())));
  const close = () => { setStep(1); setPicked([]); setName(''); setDescription(''); setError(null); onClose(); };

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const { id, failed } = await createGroup({ name, description, memberUids: picked });
      close();
      router.push(`/social/message?group=${encodeURIComponent(id)}&name=${encodeURIComponent(name.trim())}` as Href);
      if (failed.length) setError(`${failed.length} could not be added.`);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'The group could not be created.');
    }
    setBusy(false);
  }

  return (
    <Sheet
      visible={visible}
      onClose={close}
      title={step === 1 ? 'New group' : 'Name your group'}
      subtitle={step === 1 ? `Add members · ${picked.length}/${MAX_MEMBERS - 1}` : `${picked.length} member${picked.length === 1 ? '' : 's'} and you`}
      width={460}
      footer={
        <View style={styles.footer}>
          {step === 2 ? <Button label="Back" variant="ghost" onPress={() => setStep(1)} /> : <Button label="Cancel" variant="ghost" onPress={close} />}
          {step === 1 ? <Button label="Next" trailing="→" disabled={!picked.length} onPress={() => setStep(2)} /> : <Button label="Create group" loading={busy} disabled={name.trim().length < 2} onPress={() => void create()} />}
        </View>
      }
    >
      {step === 1 ? (
        <View style={styles.pick}>
          {picked.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {picked.map((uid) => {
                const person = social.people.find((p) => p.userId === uid);
                return (
                  <Interactive key={uid} onPress={() => setPicked((list) => list.filter((id) => id !== uid))} accessibilityLabel={`Remove ${person ? personName(person) : ''}`} style={styles.chip}>
                    <PersonAvatar uid={uid} uri={person?.avatarUrl ?? null} name={person ? personName(person) : '?'} size={44} />
                    <Text style={styles.chipName} numberOfLines={1}>{person ? personName(person) : ''}</Text>
                  </Interactive>
                );
              })}
            </ScrollView>
          ) : null}
          <TextInput value={query} onChangeText={setQuery} placeholder="Search friends" placeholderTextColor={colors.textTertiary} accessibilityLabel="Search friends" style={styles.input} />
          {friends.map((person) => {
            const on = picked.includes(person.userId);
            return (
              <Interactive key={person.userId} onPress={() => setPicked((list) => (on ? list.filter((id) => id !== person.userId) : list.length < MAX_MEMBERS - 1 ? [...list, person.userId] : list))} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={styles.row}>
                <PersonAvatar uid={person.userId} uri={person.avatarUrl} name={personName(person)} size={40} />
                <View style={styles.flex}>
                  <Text style={styles.rowName}>{personName(person)}</Text>
                  {person.username ? <Text style={styles.muted}>@{person.username}</Text> : null}
                </View>
                <View style={[styles.check, on && styles.checkOn]}>{on ? <Icon name="check" size={12} color={colors.onPrimary} strokeWidth={3} /> : null}</View>
              </Interactive>
            );
          })}
          {!friends.length ? <Text style={styles.muted}>Groups are for friends who follow each other.</Text> : null}
        </View>
      ) : (
        <View style={styles.pick}>
          <View style={styles.nameRow}>
            <Avatar name={name.trim() || 'Group'} size={56} />
            <TextInput value={name} onChangeText={setName} maxLength={40} placeholder="Group name (required)" placeholderTextColor={colors.textTertiary} accessibilityLabel="Group name" style={[styles.input, styles.flex]} autoFocus />
          </View>
          <TextInput value={description} onChangeText={setDescription} maxLength={200} multiline placeholder="Description (optional) — e.g. HB2 anatomy revision" placeholderTextColor={colors.textTertiary} accessibilityLabel="Group description" style={[styles.input, styles.area]} />
          <Text style={styles.muted}>{name.trim().length}/40 · You are the group admin and can add up to {MAX_MEMBERS - 1} friends.</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      )}
    </Sheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    scroll: { maxHeight: 560 },
    top: { alignItems: 'center', gap: 6, paddingBottom: 14 },
    name: { ...Type.title2, color: colors.text, textAlign: 'center' },
    description: { fontSize: 14, lineHeight: 20, color: colors.text, textAlign: 'center' },
    muted: { fontSize: 13, color: colors.textSecondary },
    error: { fontSize: 13, color: colors.error, marginVertical: 6 },
    label: { ...Type.overline, color: colors.textTertiary, marginTop: 8, marginBottom: 4 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 7 },
    rowName: { flex: 1, fontSize: 14.5, color: colors.text },
    addIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
    actions: { gap: 8, marginTop: 16 },
    footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
    pick: { gap: 8 },
    chips: { gap: 10, paddingBottom: 6 },
    chip: { width: 60, alignItems: 'center', gap: 2 },
    chipName: { fontSize: 11, color: colors.textSecondary },
    input: { borderWidth: 1, borderColor: colors.borderStrong, borderRadius: Radius.md, backgroundColor: colors.surfaceSunken, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 14.5 },
    area: { minHeight: 70, textAlignVertical: 'top' },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    check: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
    checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  });
}
