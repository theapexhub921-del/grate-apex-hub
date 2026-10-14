import { router, usePathname } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { Interactive } from '@/components/ui/interactive';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Sheet } from '@/components/ui/sheet';
import { EmptyState } from '@/components/ui/state-views';
import { Type, type ThemeColors } from '@/constants/theme';
import { useLearningEvents } from '@/data/learning/events';
import { describeAgo, startOfDay } from '@/data/learning/time';
import { useLearning } from '@/data/learning/use-learning';
import { type AppNotification, buildNotifications, markNotificationsRead, useReadNotifications } from '@/data/notifications';
import { useNotificationPreferences, usePushNotificationsPreference } from '@/data/settings';
import { markSocialNotificationsRead, readSocialNotificationIds, socialAppNotifications, useSocial } from '@/data/social';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { showDeviceNotification } from '@/lib/device-notifications';
import { registerWebPush } from '@/lib/web-push';
import { useMessageNotifications } from '@/data/message-notifications';
import { markAccountNotificationsRead, useAccountNotifications } from '@/data/account-notifications';
import { sendFriendRequest } from '@/data/social';
import { usePromotionNotifications } from '@/components/league-promotion';

type Filter = 'all' | 'learning' | 'updates';

export function useNotifications() {
  const { memory, progress, now } = useLearning();
  const events = useLearningEvents();
  const localRead = useReadNotifications();
  const preferences = useNotificationPreferences();
  const social = useSocial();
  const messages = useMessageNotifications();
  const promotions = usePromotionNotifications();
  const account = useAccountNotifications();
  const items = useMemo(
    () =>
      [
        ...messages,
        ...promotions,
        ...account,
        ...socialAppNotifications(social.notifications),
        ...buildNotifications({
          memory,
          events,
          streak: progress.streak,
          lastActivityDate: progress.lastActivityDate,
          xp: progress.xp,
          now,
        }),
      ].filter((item) => preferences[preferenceFor(item)]).sort((a, b) => b.at - a.at),
    [messages, promotions, account, social.notifications, memory, events, progress.streak, progress.lastActivityDate, progress.xp, now, preferences]
  );
  const read = useMemo(() => new Set([...localRead, ...readSocialNotificationIds(social.notifications), ...account.filter((item) => item.read).map((item) => item.id)]), [localRead, social.notifications, account]);
  const unread = items.filter((item) => !read.has(item.id)).length;
  return { items, read, unread, now };
}

export function preferenceFor(item: AppNotification) {
  if (item.id.startsWith('acct:')) return ((item as { kind?: string }).kind === 'follow' ? 'friendRequests' : 'socialEngagement') as 'friendRequests' | 'socialEngagement';
  if (item.id.startsWith('msg:')) return 'messages' as const;
  if (item.id.startsWith('league:')) return 'socialEngagement' as const;
  if (item.id.startsWith('inapp:')) return 'socialEngagement' as const;
  if (item.id.startsWith('social:')) return 'friendRequests' as const;
  if (item.group === 'updates') return 'announcements' as const;
  if (item.id.startsWith('streak-')) return 'streakReminders' as const;
  return 'learningReminders' as const;
}

// Delivers an alert at device level while the installed web app is in the
// background. Existing unread items are deliberately not replayed on launch.
export function DeviceNotificationBridge() {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const pathname = usePathname();
  const { items, read } = useNotifications();
  const enabled = usePushNotificationsPreference();
  const seen = useRef(new Set<string>());
  const started = useRef(false);
  const [toast, setToast] = useState<AppNotification | null>(null);

  // With alerts on, this browser also registers for push, so messages arrive even when the app is closed.
  // It is repeated whenever the app comes back to the screen: phones rotate push
  // addresses and clear them, and a stale one means silent notifications.
  useEffect(() => {
    if (!enabled) return;
    void registerWebPush();
    const onVisible = () => { if (document.visibilityState === 'visible') void registerWebPush(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [enabled]);

  useEffect(() => {
    const unread = items.filter((item) => !read.has(item.id));
    if (!started.current) {
      unread.forEach((item) => seen.current.add(item.id));
      started.current = true;
      return;
    }

    for (const item of unread) {
      if (seen.current.has(item.id)) continue;
      seen.current.add(item.id);
      const away = typeof document !== 'undefined' && document.visibilityState !== 'visible';
      if (enabled && away) void showDeviceNotification(item);
      // On screen: a short toast for new messages (not while already in that chat).
      else if (!away && item.id.startsWith('msg:') && pathname !== '/social/message') queueMicrotask(() => setToast(item));
    }
  }, [items, read, enabled, pathname]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;
  return (
    <Interactive
      onPress={() => { const href = toast.href; setToast(null); if (href) router.push(href); }}
      accessibilityRole="alert"
      accessibilityLabel={`${toast.title}. ${toast.body}`}
      style={styles.toast}
    >
      <View style={styles.toastIcon}><Icon name={toast.icon} size={18} color={colors.onPrimary} /></View>
      <View style={styles.toastText}>
        <Text style={styles.toastTitle} numberOfLines={1}>{toast.title}</Text>
        <Text style={styles.toastBody} numberOfLines={1}>{toast.body}</Text>
      </View>
      <Interactive onPress={() => setToast(null)} accessibilityRole="button" accessibilityLabel="Dismiss" style={styles.toastClose}>
        <Icon name="close" size={16} color={colors.textSecondary} />
      </Interactive>
    </Interactive>
  );
}

// Local read marks for derived notifications; social ones are also marked
// read on the account (so the badge clears on every device).
function markRead(ids: string[]) {
  markNotificationsRead(ids);
  markSocialNotificationsRead(ids);
  void markAccountNotificationsRead(ids);
}

// The bell in the Home header: unread badge + the notification centre.
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { unread } = useNotifications();
  return (
    <>
      <IconButton icon="bell" label="Notifications" badge={unread} onPress={() => setOpen(true)} />
      <NotificationCenter visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function NotificationCenter({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const styles = useThemedStyles(createStyles);
  const { items, read, unread, now } = useNotifications();
  const social = useSocial();
  const [filter, setFilter] = useState<Filter>('all');
  // A follow notification offers Follow back while I don't follow them yet.
  const followBackFor = (item: AppNotification) => {
    const entry = item as AppNotification & { kind?: string; from?: string };
    if (entry.kind !== 'follow' || !entry.from) return null;
    const person = social.people.find((p) => p.userId === entry.from);
    return person && (person.relationship === 'friends' || person.relationship === 'outgoing') ? null : entry.from;
  };
  const shown = items.filter((item) => filter === 'all' || item.group === filter);
  const today = startOfDay(now);
  const groups = [
    { title: 'Today', items: shown.filter((item) => item.at >= today) },
    { title: 'Earlier', items: shown.filter((item) => item.at < today) },
  ].filter((group) => group.items.length > 0);

  function open(item: AppNotification) {
    markRead([item.id]);
    if (item.href) {
      onClose();
      router.push(item.href);
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Notifications"
      subtitle={unread > 0 ? `${unread} unread` : 'You are all caught up.'}
      footer={
        unread > 0 ? (
          <Button label="Mark all as read" variant="secondary" onPress={() => markRead(items.map((item) => item.id))} fullWidth />
        ) : undefined
      }
    >
      <SegmentedControl<Filter>
        label="Filter notifications"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'All' },
          { value: 'learning', label: 'Learning', count: items.filter((item) => item.group === 'learning' && !read.has(item.id)).length },
          { value: 'updates', label: 'Updates', count: items.filter((item) => item.group === 'updates' && !read.has(item.id)).length },
        ]}
      />
      {groups.length === 0 ? (
        <EmptyState icon="bell" title="Nothing new" message="Reviews that come due, streak reminders, milestones and new features appear here." />
      ) : (
        groups.map((group) => (
          <View key={group.title} style={styles.group}>
            <Text style={styles.groupTitle}>{group.title.toUpperCase()}</Text>
            <View style={styles.list}>
              {group.items.map((item, index) => (
                <NotificationItem key={item.id} item={item} unread={!read.has(item.id)} now={now} first={index === 0} onPress={() => open(item)} followBack={followBackFor(item)} />
              ))}
            </View>
          </View>
        ))
      )}
    </Sheet>
  );
}

function NotificationItem({ item, unread, now, first, onPress, followBack }: { item: AppNotification; unread: boolean; now: number; first: boolean; onPress: () => void; followBack?: string | null }) {
  const [followed, setFollowed] = useState(false);
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const tint =
    item.tone === 'gold'
      ? { bg: colors.accentSubtle, fg: colors.accentText }
      : item.tone === 'warning'
        ? { bg: colors.warningSubtle, fg: colors.warningStrong }
        : item.tone === 'success'
          ? { bg: colors.successSubtle, fg: colors.successText }
          : { bg: colors.primarySubtle, fg: colors.primaryText };
  return (
    <Interactive
      onPress={onPress}
      accessibilityLabel={`${unread ? 'Unread. ' : ''}${item.title} ${item.body}`}
      style={({ hovered }) => [styles.item, !first && styles.itemDivider, hovered && styles.itemHover]}
    >
      <View style={[styles.medallion, { backgroundColor: tint.bg }]}>
        <Icon name={item.icon} size={18} color={tint.fg} filled={item.icon === 'xp' || item.icon === 'streak'} />
      </View>
      <View style={styles.itemText}>
        <Text style={[styles.itemTitle, unread && styles.itemTitleUnread]}>{item.title}</Text>
        <Text style={styles.itemBody}>{item.body}</Text>
        <Text style={styles.itemTime}>{describeAgo(item.at, now)}</Text>
      </View>
      {followBack ? (
        // Like other social apps: accept a follow straight from the notification.
        <Button label={followed ? 'Following' : 'Follow back'} size="sm" variant={followed ? 'secondary' : 'primary'} disabled={followed} onPress={() => { setFollowed(true); void sendFriendRequest(followBack).catch(() => setFollowed(false)); }} />
      ) : unread ? <View style={styles.unreadDot} /> : null}
    </Interactive>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    toast: { position: 'absolute', top: 14, alignSelf: 'center', zIndex: 70, width: 360, maxWidth: '92%', flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, boxShadow: `0px 10px 28px ${colors.shadowStrong}` },
    toastIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
    toastText: { flex: 1, minWidth: 0 },
    toastTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
    toastBody: { fontSize: 13, color: colors.textSecondary },
    toastClose: { padding: 6 },
    group: { gap: 8 },
    groupTitle: { ...Type.overline, color: colors.textTertiary },
    list: { borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, overflow: 'hidden' },
    item: { flexDirection: 'row', gap: 12, padding: 14, alignItems: 'flex-start' },
    itemDivider: { borderTopWidth: 1, borderTopColor: colors.divider },
    itemHover: { backgroundColor: colors.surfaceMuted },
    medallion: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    itemText: { flex: 1, minWidth: 0, gap: 2 },
    itemTitle: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
    itemTitleUnread: { fontWeight: '800', color: colors.text },
    itemBody: { fontSize: 13, lineHeight: 18, color: colors.textSecondary },
    itemTime: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, marginTop: 6 },
  });
}
