import { router, type Href } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { ChatList } from '@/components/chat/chat-list';
import { ChatThread } from '@/components/chat/chat-thread';
import { BackLink } from '@/components/learning/nav-bits';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Card } from '@/components/ui/interactive';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Type, type ThemeColors } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

// Messages like Instagram / WhatsApp on the web: on a computer, the chats list
// on the left and the open chat on the right; on a phone, one at a time.
export function ChatShell({ friendId, groupId, name }: { friendId?: string | null; groupId?: string | null; name?: string | null }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const { width, height } = useWindowDimensions();
  const wide = width >= 900;
  const open = (id: string, label: string) => {
    const href = `/social/message?friend=${encodeURIComponent(id)}&name=${encodeURIComponent(label)}` as Href;
    if (wide && (friendId || groupId)) router.replace(href);
    else router.push(href);
  };
  const openGroup = (id: string, label: string) => {
    const href = `/social/message?group=${encodeURIComponent(id)}&name=${encodeURIComponent(label)}` as Href;
    if (wide && (friendId || groupId)) router.replace(href);
    else router.push(href);
  };
  const thread = groupId ? <ChatThread key={`g:${groupId}`} groupId={groupId} name={name} /> : friendId ? <ChatThread key={`f:${friendId}`} friendId={friendId} name={name} /> : null;
  const paneHeight = Math.max(480, height - (wide ? 70 : 150));

  if (!wide) {
    return (
      <Screen width="prose">
        <BackLink fallback={(friendId || groupId ? '/social/messages' : '/social') as never} />
        <Card style={[styles.pane, { height: paneHeight }]}>
          {thread ?? <ChatList onOpen={open} onOpenGroup={openGroup} />}
        </Card>
      </Screen>
    );
  }
  return (
    <Screen width="wide">
      <Card style={[styles.shell, { height: paneHeight }]}>
        <View style={styles.side}><ChatList activeId={groupId ?? friendId} onOpen={open} onOpenGroup={openGroup} /></View>
        <View style={styles.main}>
          {thread ? (
            thread
          ) : (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}><Icon name="comment" size={36} color={colors.primaryText} /></View>
              <Text style={styles.emptyTitle}>Your messages</Text>
              <Text style={styles.emptyText}>Send private messages, photos, documents and voice notes to your friends.</Text>
              <Button label="Find classmates" variant="secondary" onPress={() => router.push('/social/friends' as Href)} />
            </View>
          )}
        </View>
      </Card>
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    pane: { padding: 0, overflow: 'hidden' },
    shell: { flexDirection: 'row', padding: 0, overflow: 'hidden' },
    side: { width: 360, borderRightWidth: 1, borderRightColor: colors.divider },
    main: { flex: 1, minWidth: 0 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
    emptyIcon: { width: 84, height: 84, borderRadius: 42, borderWidth: 2, borderColor: colors.primaryBorder, alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { ...Type.title2, color: colors.text },
    emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', maxWidth: 360 },
  });
}
