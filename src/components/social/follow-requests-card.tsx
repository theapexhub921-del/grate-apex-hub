import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PersonAvatar, PersonLink } from '@/components/social/profile-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/interactive';
import { Text } from '@/components/ui/text';
import { VerifiedBadge } from '@/components/ui/verified-badge';
import { Type, type ThemeColors } from '@/constants/theme';
import { personName, sendFriendRequest, useSocial } from '@/data/social';
import { useThemedStyles } from '@/hooks/use-theme';

// Connect → Follow requests (like Instagram): people who follow you that you
// don't follow yet, newest first, each with Follow back. Following back makes
// you friends (messages, battles, groups).
export function FollowRequestsCard() {
  const styles = useThemedStyles(createStyles);
  const social = useSocial();
  const [done, setDone] = useState<readonly string[]>([]);
  const requests = social.people
    .filter((person) => person.relationship === 'incoming' && !done.includes(person.userId))
    .sort((a, b) => (b.since ?? 0) - (a.since ?? 0));
  if (!requests.length) return null;

  async function followBack(uid: string) {
    setDone((list) => [...list, uid]);
    try { await sendFriendRequest(uid); } catch { setDone((list) => list.filter((id) => id !== uid)); }
  }

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title}>Follow requests</Text>
        <Text style={styles.count}>{requests.length}</Text>
      </View>
      {requests.slice(0, 5).map((person) => (
        <View key={person.userId} style={styles.row}>
          <PersonAvatar uid={person.userId} uri={person.avatarUrl} name={personName(person)} size={44} />
          <PersonLink uid={person.userId} label={personName(person)} style={styles.who}>
            <View style={styles.nameRow}><Text style={styles.name} numberOfLines={1}>{personName(person)}</Text><VerifiedBadge username={person.username} uid={person.userId} size={13} /></View>
            <Text style={styles.sub} numberOfLines={1}>{person.username ? `@${person.username} · ` : ''}follows you</Text>
          </PersonLink>
          <Button label="Follow back" size="sm" onPress={() => void followBack(person.userId)} />
        </View>
      ))}
      {requests.length > 5 ? <Button label={`See all ${requests.length}`} variant="ghost" size="sm" onPress={() => router.push('/social/friends' as Href)} /> : null}
    </Card>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: { gap: 10, marginBottom: 16 },
    head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { ...Type.title3, color: colors.text },
    count: { fontSize: 12, fontWeight: '800', color: colors.onPrimary, backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    who: { flex: 1, minWidth: 0 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    name: { fontSize: 15, fontWeight: '700', color: colors.text, flexShrink: 1 },
    sub: { fontSize: 12.5, color: colors.textSecondary },
  });
}
