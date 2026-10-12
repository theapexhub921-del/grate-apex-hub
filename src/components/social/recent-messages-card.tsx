import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PersonAvatar } from '@/components/social/profile-card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Card, Interactive } from '@/components/ui/interactive';
import { Text } from '@/components/ui/text';
import { VerifiedBadge } from '@/components/ui/verified-badge';
import { Type, type ThemeColors } from '@/constants/theme';
import { listMyConversations, type ConversationSummary } from '@/data/community';
import { personName, useSocial } from '@/data/social';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

const openChat = (friendId: string, name: string) =>
  router.push({ pathname: '/social/message', params: { friend: friendId, name } } as never);

function when(at: number) {
  const date = new Date(at);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const days = Math.floor((today.getTime() - at) / 86_400_000);
  if (days < 7) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

// Connect opens on your messages (like other social apps): recent chats with
// unread ones marked, friends to start a chat with, or — with no friends yet —
// a clear way to find classmates.
export function RecentMessagesCard() {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const social = useSocial();
  const friends = social.people.filter((person) => person.relationship === 'friends');
  const [chats, setChats] = useState<ConversationSummary[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      const load = () => listMyConversations(6).then((list) => { if (live) setChats(list); }).catch(() => { if (live) setChats([]); });
      void load();
      const timer = setInterval(() => void load(), 20_000);
      return () => { live = false; clearInterval(timer); };
    }, [])
  );

  const known = new Map(social.people.map((person) => [person.userId, person]));
  const chatting = new Set((chats ?? []).map((chat) => chat.otherId));
  const startWith = friends.filter((friend) => !chatting.has(friend.userId)).slice(0, 8);
  const unread = (chats ?? []).filter((chat) => chat.unread).length;

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <View style={styles.titleRow}>
          <Icon name="mail" size={20} color={colors.primaryText} />
          <Text style={styles.title}>Messages</Text>
          {unread ? <View style={styles.badge}><Text style={styles.badgeText}>{unread} new</Text></View> : null}
        </View>
        {friends.length ? <Button label="New message" size="sm" icon={<Icon name="plus" size={15} color={colors.onPrimary} />} onPress={() => router.push('/social/messages' as Href)} /> : null}
      </View>

      {chats === null ? <Text style={styles.note}>Loading your chats…</Text> : null}
      {chats?.map((chat) => {
        const person = known.get(chat.otherId);
        const name = person ? personName(person) : chat.otherName ? `@${chat.otherName}` : 'Friend';
        return (
          <View key={chat.id} style={styles.chatRow}>
            <PersonAvatar uid={chat.otherId} uri={person?.avatarUrl ?? null} name={name} size={46} status={person?.isOnline ? 'online' : null} />
            <Interactive onPress={() => openChat(chat.otherId, name)} accessibilityRole="link" accessibilityLabel={`Chat with ${name}${chat.unread ? ', unread' : ''}`} style={styles.chatBody}>
              <View style={styles.chatTop}>
                <View style={styles.nameRow}>
                  <Text style={[styles.name, chat.unread && styles.nameUnread]} numberOfLines={1}>{name}</Text>
                  <VerifiedBadge username={person?.username ?? chat.otherName} uid={chat.otherId} size={14} />
                </View>
                <Text style={[styles.time, chat.unread && styles.timeUnread]}>{when(chat.lastAt)}</Text>
              </View>
              <View style={styles.chatTop}>
                {chat.lastText === 'Voice note' ? (
                  <View style={styles.voicePreview} accessibilityLabel={chat.lastFromMe ? 'You sent a recording' : 'Recording'}>
                    {chat.lastFromMe ? <Text style={styles.preview}>You:</Text> : null}
                    <Icon name="mic" size={15} color={chat.unread ? colors.text : colors.textSecondary} />
                  </View>
                ) : (
                  <Text style={[styles.preview, chat.unread && styles.previewUnread]} numberOfLines={1}>{chat.lastFromMe ? `You: ${chat.lastText}` : chat.lastText}</Text>
                )}
                {chat.unread ? <View style={styles.dot} /> : null}
              </View>
            </Interactive>
          </View>
        );
      })}

      {chats && friends.length > 0 && startWith.length > 0 ? (
        <View style={styles.start}>
          <Text style={styles.kicker}>{chats.length ? 'START A CHAT' : 'SAY HELLO TO A FRIEND'}</Text>
          <View style={styles.people}>
            {startWith.map((friend) => (
              <Interactive key={friend.userId} onPress={() => openChat(friend.userId, personName(friend))} accessibilityRole="button" accessibilityLabel={`Message ${personName(friend)}`} style={styles.person}>
                <PersonAvatar uid={friend.userId} uri={friend.avatarUrl} name={personName(friend)} size={48} ring="subtle" status={friend.isOnline ? 'online' : null} />
                <Text style={styles.personName} numberOfLines={1}>{personName(friend)}</Text>
              </Interactive>
            ))}
          </View>
        </View>
      ) : null}

      {chats && friends.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{social.status === 'loading' ? 'Loading your friends…' : 'Make friends to start messaging'}</Text>
          <Text style={styles.note}>Follow classmates; when they follow you back you can message each other, share notes and battle.</Text>
          <View style={styles.actions}>
            <Button label="Find classmates" icon={<Icon name="profile" size={15} color={colors.onPrimary} />} onPress={() => router.push('/social/friends' as Href)} />
            {social.people.some((person) => person.relationship === 'incoming') ? <Button label="Follow back requests" variant="secondary" onPress={() => router.push('/social/friends' as Href)} /> : null}
          </View>
        </View>
      ) : null}

      {chats && chats.length > 0 ? (
        <Interactive onPress={() => router.push('/social/messages' as Href)} accessibilityRole="link" style={styles.all}>
          <Text style={[styles.allText, { color: colors.primaryText }]}>All messages</Text>
          <Icon name="chevronRight" size={16} color={colors.primaryText} />
        </Interactive>
      ) : null}
    </Card>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: { gap: 12 },
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { ...Type.title3, color: colors.text },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: colors.primary },
    badgeText: { fontSize: 11.5, fontWeight: '800', color: colors.onPrimary },
    note: { fontSize: 13, lineHeight: 19, color: colors.textSecondary },
    chatRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    chatBody: { flex: 1, minWidth: 0, gap: 2, paddingVertical: 4 },
    chatTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1, minWidth: 0 },
    name: { fontSize: 15, fontWeight: '700', color: colors.text, flexShrink: 1 },
    nameUnread: { fontWeight: '800' },
    time: { fontSize: 12, color: colors.textTertiary },
    timeUnread: { color: colors.primaryText, fontWeight: '700' },
    preview: { flex: 1, fontSize: 13.5, color: colors.textSecondary },
    previewUnread: { color: colors.text, fontWeight: '700' },
    voicePreview: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
    dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary },
    start: { gap: 8 },
    kicker: { fontSize: 11.5, fontWeight: '800', letterSpacing: 0.6, color: colors.textTertiary },
    people: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
    person: { width: 64, alignItems: 'center', gap: 4 },
    personName: { fontSize: 12, color: colors.text, textAlign: 'center' },
    empty: { gap: 8 },
    emptyTitle: { ...Type.headline, color: colors.text },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
    all: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6 },
    allText: { fontSize: 13.5, fontWeight: '800' },
  });
}
