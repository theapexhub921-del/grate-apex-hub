import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { doc, setDoc } from 'firebase/firestore';

import { usePrivacyPreferences } from '@/data/settings';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';

/**
 * Keeps presence fresh while the app is open, and clears it when it backgrounds:
 * `appActiveAt` (always; turns a sent message's ✓ into ✓✓ delivered) and, only
 * when "Show when I'm online and last seen" is on, `isOnline` and `lastSeen`.
 */
export function OnlinePresenceSync() {
  const { user } = useAuth();
  const { shareOnlineStatus } = usePrivacyPreferences();

  useEffect(() => {
    if (!user) return;
    let foreground =
      Platform.OS !== 'web' || (typeof document !== 'undefined' && document.visibilityState === 'visible');
    const update = async () => {
      try {
        const now = Date.now();
        await setDoc(
          doc(db, 'users', user.id),
          {
            isOnline: shareOnlineStatus && foreground,
            lastSeen: shareOnlineStatus ? now : null,
            ...(foreground ? { appActiveAt: now } : {}),
          },
          { merge: true }
        );
      } catch {}
    };
    void update();
    const timer = setInterval(() => { if (foreground) void update(); }, 45_000);
    const appState = AppState.addEventListener('change', (state) => {
      foreground = state === 'active';
      void update();
    });
    const visibility = () => {
      foreground = document.visibilityState === 'visible';
      void update();
    };
    if (Platform.OS === 'web' && typeof document !== 'undefined')
      document.addEventListener('visibilitychange', visibility);
    return () => {
      clearInterval(timer);
      appState.remove();
      if (Platform.OS === 'web' && typeof document !== 'undefined')
        document.removeEventListener('visibilitychange', visibility);
      void setDoc(doc(db, 'users', user.id), { isOnline: false }, { merge: true }).catch(() => {});
    };
  }, [user?.id, shareOnlineStatus]);

  return null;
}
