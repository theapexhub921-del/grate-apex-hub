import { Platform } from 'react-native';

import type { AppNotification } from '@/data/notifications';
import * as WebPush from '@/lib/web-push';

export type DeviceNotificationResult = {
  granted: boolean;
  message?: string;
};

/** The browser's permission prompt (older Safari uses a callback instead of a promise). */
function askPermission(): Promise<NotificationPermission> {
  return new Promise((resolve) => {
    try {
      const result = Notification.requestPermission((value) => resolve(value));
      if (result && typeof result.then === 'function') void result.then(resolve, () => resolve('default'));
    } catch {
      resolve('default');
    }
  });
}

/** The service worker, if it becomes ready within a few seconds (it may never, e.g. in a private window). */
function readyWorker(ms = 3000): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return Promise.resolve(null);
  return Promise.race([navigator.serviceWorker.ready, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);
}

function isSupported() {
  return Platform.OS === 'web'
    && typeof window !== 'undefined'
    && 'Notification' in window;
}

/** Ask from a learner-initiated action, then confirm that alerts are ready. */
export async function enableDeviceNotifications(): Promise<DeviceNotificationResult> {
  if (!isSupported()) {
    const ios = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
    return { granted: false, message: ios
      ? 'On iPhone and iPad, notifications only work in the app installed on your Home Screen (iOS 16.4 or newer): tap Share → Add to Home Screen, open GrAte Apex Hub from that icon, then turn notifications on there.'
      : 'Device notifications are available in the installed web app on supported browsers.' };
  }

  // Blocked before: browsers never ask again, so say how to unblock.
  if (Notification.permission === 'denied') {
    return { granted: false, message: 'Notifications are blocked for this site. Allow them in your browser’s site settings (tap the lock or ⓘ next to the address, or the app’s settings on your phone), then tap Turn on again.' };
  }
  const permission = Notification.permission === 'granted' ? 'granted' : await askPermission();

  if (permission !== 'granted') {
    return { granted: false, message: 'Notifications are off. You can allow them later in your browser or device settings.' };
  }

  // Register for push now so a failure is shown here instead of staying silent.
  const registered = await WebPush.registerWebPush();
  if (!registered && WebPush.webPushError) {
    return { granted: false, message: `Allowed, but this device could not register for push: ${WebPush.webPushError}` };
  }

  // A confirmation alert, without waiting long for the background worker.
  void showDeviceNotification({
    id: 'grateapex-notifications-enabled',
    title: 'Notifications are on',
    body: 'GrAte Apex Hub will alert you about the updates you choose.',
    href: '/settings',
  });
  return { granted: true };
}

/** Show a system notification when the learner has moved away from the app. */
export async function showDeviceNotification(item: Pick<AppNotification, 'id' | 'title' | 'body' | 'href'>) {
  if (!isSupported() || Notification.permission !== 'granted') return;

  const options: NotificationOptions = {
    body: item.body,
    icon: '/icons/grateapex-192.png',
    badge: '/icons/grateapex-192.png',
    tag: item.id,
    data: { href: item.href ?? '/' },
  };

  try {
    const registration = await readyWorker();
    if (registration) {
      await registration.showNotification(item.title, options);
    } else {
      new Notification(item.title, options);
    }
  } catch {
    // A system notification is supplementary. The in-app notification
    // remains available even if a browser blocks the device-level alert.
  }
}

/** Clears the number on the app icon and the waiting alerts (call when the app is opened or comes back to the screen). */
export async function clearAppBadge() {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return;
  try {
    await (navigator as Navigator & { clearAppBadge?: () => Promise<void> }).clearAppBadge?.();
    const registration = await readyWorker(1500);
    const waiting = (await registration?.getNotifications()) ?? [];
    waiting.forEach((item) => item.close());
  } catch {
    // badges are optional
  }
}
