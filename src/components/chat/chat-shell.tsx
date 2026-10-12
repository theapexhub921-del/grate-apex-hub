import { router, type Href } from 'expo-router';
import { useSyncExternalStore } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ChatList } from '@/components/chat/chat-list';
import { ChatThread } from '@/components/chat/chat-thread';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { webStyle } from '@/components/ui/web';
import { Type, type ThemeColors } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

// The part of the screen not covered by the phone keyboard (web only).
const viewport = () => (Platform.OS === 'web' && typeof window !== 'undefined' ? window.visualViewport : null);
function subscribeViewport(onChange: () => void) {
  const vv = viewport();
  vv?.addEventListener('resize', onChange);
  vv?.addEventListener('scroll', onChange);
  return () => { vv?.removeEventListener('resize', onChange); vv?.removeEventListener('scroll', onChange); };
}
const viewportSnapshot = () => { const vv = viewport(); return vv ? `${Math.round(vv.height)}|${Math.round(vv.offsetTop)}` : ''; };
function useVisibleViewport() {
  const snap = useSyncExternalStore(subscribeViewport, viewportSnapshot, () => '');
  if (!snap) return null;
  const [height, top] = snap.split('|').map(Number);
  return { height, top };
}

// Messages like Instagram / WhatsApp on the web: on a computer, the chats list
// on the left and the open chat on the right; on a phone, one at a time.
export function ChatShell({ friendId, groupId, name }: { friendId?: string | null; groupId?: string | null; name?: string | null }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const visible = useVisibleViewport();
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

  if (!wide) {
    // The chats list leaves room for the bottom bar; an open chat has the whole screen.
    return (
      <View style={[styles.phone, thread && visible ? [styles.fixed, { top: visible.top, height: visible.height }] : { height }, { paddingTop: insets.top, paddingBottom: thread ? insets.bottom : 96 + insets.bottom }]}>
        {thread ?? <ChatList onOpen={open} onOpenGroup={openGroup} />}
      </View>
    );
  }
  return (
    <View style={[styles.shell, styles.full, { height }]}>
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
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    phone: { width: '100%', backgroundColor: colors.surface, overflow: 'hidden' },
    fixed: { left: 0, right: 0, zIndex: 50, ...(webStyle({ position: 'fixed' }) as object) },
    shell: { flexDirection: 'row', padding: 0, overflow: 'hidden' },
    full: { width: '100%', backgroundColor: colors.surface },
    side: { width: 360, borderRightWidth: 1, borderRightColor: colors.divider },
    main: { flex: 1, minWidth: 0 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
    emptyIcon: { width: 84, height: 84, borderRadius: 42, borderWidth: 2, borderColor: colors.primaryBorder, alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { ...Type.title2, color: colors.text },
    emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', maxWidth: 360 },
  });
}
