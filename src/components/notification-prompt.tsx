import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { isDesktopWidth, Type, type ThemeColors } from '@/constants/theme';
import { setPushNotificationsPreference, usePushNotificationsPreference } from '@/data/settings';
import { useAuth } from '@/hooks/use-auth';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { enableDeviceNotifications } from '@/lib/device-notifications';

// Asks once (and again a week after "Not now") to turn on notifications on
// this phone or laptop, so new messages, league promotions and streak
// reminders reach the learner. The browser's own permission prompt only
// appears after they tap "Turn on" (browsers require a tap).

const KEY = 'grateapex_notification_prompt'; // when "Not now" was last tapped
const ASK_AGAIN_MS = 7 * 86_400_000;
const HIDDEN_ON = /^\/(login|onboarding|learn\/(quiz|lesson|hb-lesson|hb-practice|review|apex)|social\/battle)/;

const permission = () => (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : null);

export function NotificationPrompt() {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const { user } = useAuth();
  const enabled = usePushNotificationsPreference();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user || enabled) return;
    const state = permission();
    if (state === null) return;
    let live = true;
    const timer = setTimeout(() => {
      void AsyncStorage.getItem(KEY).catch(() => null).then((last) => {
        if (live && (!last || Date.now() - Number(last) > ASK_AGAIN_MS)) setReady(true);
      });
    }, 8000);
    return () => { live = false; clearTimeout(timer); };
  }, [user, enabled]);

  if (!ready || enabled || !user || HIDDEN_ON.test(pathname)) return null;

  async function turnOn() {
    setBusy(true);
    try {
      const result = await enableDeviceNotifications();
      await setPushNotificationsPreference(result.granted);
      if (result.granted) setReady(false);
      else setMessage(result.message ?? 'Notifications are off. You can allow them later in your browser settings.');
    } finally {
      setBusy(false);
    }
  }

  function notNow() {
    void AsyncStorage.setItem(KEY, String(Date.now())).catch(() => {});
    setReady(false);
  }

  const desktop = isDesktopWidth(width);
  return (
    <View style={[styles.card, desktop ? styles.desktop : styles.phone]} accessibilityRole="alert">
      <View style={styles.head}>
        <View style={styles.icon}><Icon name="bell" size={18} color={colors.onPrimary} /></View>
        <View style={styles.flex}>
          <Text style={styles.title}>Turn on notifications</Text>
          <Text style={styles.text}>Get alerts on this {desktop ? 'computer' : 'phone'} for new messages, league promotions and your streak.</Text>
        </View>
      </View>
      {message ? <Text style={styles.note}>{message}</Text> : null}
      <View style={styles.actions}>
        <Button label="Not now" variant="ghost" size="sm" onPress={notNow} />
        <Button label="Turn on" size="sm" loading={busy} onPress={() => void turnOn()} />
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: { position: 'absolute', zIndex: 65, gap: 10, padding: 14, borderRadius: 18, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, boxShadow: `0px 12px 32px ${colors.shadowStrong}` },
    desktop: { right: 24, bottom: 56, width: 360 },
    phone: { left: 12, right: 12, bottom: 96 },
    head: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
    flex: { flex: 1, minWidth: 0, gap: 2 },
    title: { ...Type.headline, color: colors.text },
    text: { fontSize: 13, lineHeight: 18, color: colors.textSecondary },
    note: { fontSize: 12.5, color: colors.warningText },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  });
}
