import { usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-theme';

// Installed shortcuts (PWA) resume from memory with the version they started
// with. This compares the running version (its entry script) with the live
// site's whenever the app comes back to the screen and every few minutes; when
// a new version is out it reloads — or, in the middle of a lesson, quiz or
// battle, shows a "New version ready" bar instead so nobody loses progress.

const ENTRY = /\/_expo\/static\/js\/web\/entry-[a-f0-9]+\.js/;
const EVERY_MS = 5 * 60_000;
const BUSY = /^\/(learn\/(quiz|lesson|hb-lesson|hb-practice|review|apex)|social\/battle)/;

function runningEntry() {
  if (typeof document === 'undefined') return null;
  for (const script of Array.from(document.scripts)) {
    const match = ENTRY.exec(script.src);
    if (match) return match[0];
  }
  return null;
}

async function liveEntry() {
  const response = await fetch(`/?version-check=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) return null;
  return ENTRY.exec(await response.text())?.[0] ?? null;
}

export function AppUpdateWatcher() {
  const styles = useThemedStyles(createStyles);
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const busyRef = useRef(false);
  useEffect(() => {
    busyRef.current = BUSY.test(pathname);
  }, [pathname]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const current = runningEntry();
    if (!current) return; // development server: nothing to compare
    let stopped = false;
    const check = async () => {
      if (stopped || document.visibilityState !== 'visible') return;
      try {
        const live = await liveEntry();
        if (!live || live === current) return;
        if (busyRef.current) setReady(true);
        else window.location.reload();
      } catch {
        // offline: try again later
      }
    };
    const onVisible = () => { void check(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    const timer = setInterval(() => void check(), EVERY_MS);
    // Soon after opening (an installed app may start from an old copy), and whenever it comes back.
    const first = setTimeout(() => void check(), 2_500);
    window.addEventListener('pageshow', onVisible);
    window.addEventListener('online', onVisible);
    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('pageshow', onVisible);
      window.removeEventListener('online', onVisible);
      clearInterval(timer);
      clearTimeout(first);
    };
  }, []);

  if (!ready) return null;
  return (
    <View style={styles.bar} accessibilityRole="alert">
      <Text style={styles.text}>A new version of GrAte Apex Hub is ready.</Text>
      <Button label="Refresh" size="sm" onPress={() => window.location.reload()} />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    bar: { position: 'absolute', top: 12, alignSelf: 'center', zIndex: 60, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingLeft: 16, paddingRight: 8, borderRadius: 999, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, boxShadow: `0px 8px 24px ${colors.shadowStrong}` },
    text: { fontSize: 13.5, fontWeight: '700', color: colors.text },
  });
}
