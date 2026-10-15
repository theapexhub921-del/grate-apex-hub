import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { LEGACY_STYLE_THEMES } from '@/data/legacy-theme-colors';
import type { ThemeFamily } from '@/data/theme-portrayal';
import { getTabBarModePreference, setTabBarModeFromAccount } from '@/data/navigation-settings';

// App settings that belong to this device (not to an account).
// Saved with AsyncStorage under its own key, separate from progress.
//
// Account-related settings (name, Google account, privacy, …) will come
// from the future account/backend system — do not add them here.

export type AppearancePreference = 'apex' | 'light' | 'dark' | 'system' | 'violet' | 'black' | 'pink' | 'emerald';

export const APPEARANCE_OPTIONS: { value: AppearancePreference; label: string; description: string }[] = [
  { value: 'apex', label: 'Apex', description: 'Cobalt and deep navy with gold highlights.' },
  { value: 'light', label: 'Light', description: 'Soft off-white, easy in daylight.' },
  { value: 'dark', label: 'Dark', description: 'Layered charcoal for night study.' },
  { value: 'system', label: 'System', description: 'Follows your device: Light or Dark.' },
  { value: 'violet', label: 'Violet', description: 'A deep violet and lavender study space.' },
  { value: 'black', label: 'Pure black', description: 'True black surfaces with clean white accents.' },
  { value: 'pink', label: 'Pink', description: 'A warm rose palette with soft pink highlights.' },
  { value: 'emerald', label: 'Emerald', description: 'A deep green palette with mint highlights.' },
];
export type PageZoomPreference = 80 | 90 | 100 | 110 | 125;
export type FontSizePreference = 'small' | 'default' | 'large' | 'extra_large';
export type ProfileVisibility = 'public' | 'friends' | 'private';
export type MessagingPermission = 'everyone' | 'friends';
export type NotificationCategory =
  | 'friendActivity' | 'friendRequests' | 'messages' | 'groupActivity'
  | 'studyReminders' | 'learningReminders' | 'goalReminders' | 'streakReminders'
  | 'announcements' | 'socialEngagement' | 'battles' | 'league';
export type NotificationPreferences = Record<NotificationCategory, boolean>;

const defaultNotificationPreferences: NotificationPreferences = {
  friendActivity: true,
  friendRequests: true,
  messages: true,
  groupActivity: true,
  studyReminders: true,
  learningReminders: true,
  goalReminders: true,
  streakReminders: true,
  announcements: true,
  socialEngagement: true,
  battles: true,
  league: true,
};

type SettingsData = {
  appearance: AppearancePreference;
  pushNotificationsEnabled: boolean;
  pageZoom: PageZoomPreference;
  notifications: NotificationPreferences;
  fontSize: FontSizePreference;
  profileVisibility: ProfileVisibility;
  activityVisible: boolean;
  messagingPermission: MessagingPermission;
  friendRequestPermission: MessagingPermission;
  discoverable: boolean;
  shareOnlineStatus: boolean;
  /** Show and send read receipts (blue ticks) in messages. */
  readReceipts: boolean;
  answerBounceEnabled: boolean;
  /** Hour of the day (0-23, this device's time) for the streak reminder; null = the default evening window. */
  streakReminderHour: number | null;
  /** The original app's theme (The Originals; Hybrid when its family is 'originals'). */
  legacyTheme: string;
  /**
   * Which family the chosen theme is from: this app's newer themes (appearance)
   * or the legacy themes (legacyTheme). null = not chosen yet: The Originals then
   * uses the legacy theme, the other experiences the newer one.
   */
  themeFamily: ThemeFamily | null;
};

export type { ThemeFamily };
const isThemeFamily = (value: unknown): value is ThemeFamily => value === 'newer' || value === 'legacy';
const isLegacyThemeId = (value: unknown): value is string => typeof value === 'string' && LEGACY_STYLE_THEMES.some((theme) => theme.id === value);

const STORAGE_KEY = 'grateapex_settings';

// Apex (light-blue GRATEAPEX theme) is the default for now.
const defaultSettings: SettingsData = {
  appearance: 'apex',
  pushNotificationsEnabled: false,
  pageZoom: 100,
  notifications: { ...defaultNotificationPreferences },
  fontSize: 'default',
  profileVisibility: 'friends',
  activityVisible: true,
  messagingPermission: 'friends',
  friendRequestPermission: 'everyone',
  discoverable: true,
  shareOnlineStatus: false,
  readReceipts: true,
  answerBounceEnabled: true,
  streakReminderHour: null,
  legacyTheme: 'dark', // the original app's default
  themeFamily: null,
};

type PrivacySettings = Pick<SettingsData, 'profileVisibility' | 'activityVisible' | 'messagingPermission' | 'friendRequestPermission' | 'discoverable' | 'shareOnlineStatus' | 'readReceipts'>;
const defaultPrivacySettings: PrivacySettings = {
  profileVisibility: defaultSettings.profileVisibility,
  activityVisible: defaultSettings.activityVisible,
  messagingPermission: defaultSettings.messagingPermission,
  friendRequestPermission: defaultSettings.friendRequestPermission,
  discoverable: defaultSettings.discoverable,
  shareOnlineStatus: defaultSettings.shareOnlineStatus,
  readReceipts: defaultSettings.readReceipts,
};
let cachedPrivacySettings: PrivacySettings = { ...defaultPrivacySettings };

function getPrivacySnapshot(): PrivacySettings {
  if (Object.keys(defaultPrivacySettings).some((key) => cachedPrivacySettings[key as keyof PrivacySettings] !== settings[key as keyof SettingsData])) {
    cachedPrivacySettings = {
      profileVisibility: settings.profileVisibility,
      activityVisible: settings.activityVisible,
      messagingPermission: settings.messagingPermission,
      friendRequestPermission: settings.friendRequestPermission,
      discoverable: settings.discoverable,
      shareOnlineStatus: settings.shareOnlineStatus,
      readReceipts: settings.readReceipts,
    };
  }
  return cachedPrivacySettings;
}

let settings: SettingsData = { ...defaultSettings };
let loadPromise: Promise<void> | null = null;

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  // Load the saved settings the first time any screen asks for them.
  ensureSettingsLoaded();

  return () => {
    listeners.delete(listener);
  };
}

function isAppearance(value: unknown): value is AppearancePreference {
  return (
    value === 'apex' ||
    value === 'light' ||
    value === 'dark' ||
    value === 'system'
    || value === 'violet'
    || value === 'black'
    || value === 'pink'
    || value === 'emerald'
  );
}

function isPageZoom(value: unknown): value is PageZoomPreference {
  return value === 80 || value === 90 || value === 100 || value === 110 || value === 125;
}

async function loadSettings() {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);

    const data = saved ? JSON.parse(saved) : {};

    settings = {
      appearance: isAppearance(data?.appearance)
        ? data.appearance
        : defaultSettings.appearance,
      pushNotificationsEnabled: data?.pushNotificationsEnabled === true,
      pageZoom: isPageZoom(data?.pageZoom) ? data.pageZoom : defaultSettings.pageZoom,
      notifications: Object.fromEntries(
        Object.keys(defaultNotificationPreferences).map((key) => [
          key,
          typeof data?.notifications?.[key] === 'boolean' ? data.notifications[key] : defaultNotificationPreferences[key as NotificationCategory],
        ])
      ) as NotificationPreferences,
      fontSize: ['small', 'default', 'large', 'extra_large'].includes(data?.fontSize) ? data.fontSize : 'default',
      profileVisibility: ['public', 'friends', 'private'].includes(data?.profileVisibility) ? data.profileVisibility : 'friends',
      activityVisible: data?.activityVisible !== false,
      messagingPermission: data?.messagingPermission === 'everyone' ? 'everyone' : 'friends',
      friendRequestPermission: data?.friendRequestPermission === 'friends' ? 'friends' : 'everyone',
      discoverable: data?.discoverable !== false,
      shareOnlineStatus: data?.shareOnlineStatus === true,
      readReceipts: data?.readReceipts !== false,
      answerBounceEnabled: data?.answerBounceEnabled !== false,
      streakReminderHour: Number.isInteger(data?.streakReminderHour) && data.streakReminderHour >= 0 && data.streakReminderHour <= 23 ? data.streakReminderHour : null,
      legacyTheme: isLegacyThemeId(data?.legacyTheme) ? data.legacyTheme : defaultSettings.legacyTheme,
      // (Before 2026-10-10 only Hybrid had a family: 'originals' meant legacy.)
      // A brand-new install starts on Apex Legacy, one of the four free themes;
      // an existing device keeps the theme it already uses.
      themeFamily: isThemeFamily(data?.themeFamily) ? data.themeFamily : data?.hybridThemeFamily === 'originals' ? 'legacy' : saved ? null : 'legacy',
    };

    notify();
  } catch (error) {
    console.log('Could not load settings:', error);
  }
}

function ensureSettingsLoaded() {
  if (!loadPromise) {
    loadPromise = loadSettings();
  }

  return loadPromise;
}

async function saveSettings() {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.log('Could not save settings:', error);
  }
  try {
    const userId = auth.currentUser?.uid;
    if (userId) {
      await setDoc(
        doc(db, 'users', userId),
        {
          preferences: {
            appearance: settings.appearance,
            legacy_theme: settings.legacyTheme,
            theme_family: settings.themeFamily,
            font_size: settings.fontSize,
            zoom: settings.pageZoom,
            navigation_auto_hide: (await getTabBarModePreference()) === 'autoHide',
            notification_preferences: {
              pushEnabled: settings.pushNotificationsEnabled,
              answerBounceEnabled: settings.answerBounceEnabled,
              ...settings.notifications,
            },
            privacy_preferences: {
              profileVisibility: settings.profileVisibility,
              activityVisible: settings.activityVisible,
              messagingPermission: settings.messagingPermission,
              friendRequestPermission: settings.friendRequestPermission,
              discoverable: settings.discoverable,
              shareOnlineStatus: settings.shareOnlineStatus,
              readReceipts: settings.readReceipts,
            },
          },
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    }
  } catch (error) {
    console.warn('Could not sync account settings:', error);
  }
}

/** Load account preferences onto this device after sign-in, seeding the account on first use. */
export async function syncSettingsFromAccount(userId: string) {
  await ensureSettingsLoaded();
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    const data = snap.data()?.preferences;
    if (!data) {
      await saveSettings();
      return;
    }

    const notifications = data.notification_preferences as Record<string, unknown> | null;
    const privacy = data.privacy_preferences as Record<string, unknown> | null;
    settings = {
      ...settings,
      appearance: isAppearance(data.appearance) ? data.appearance : settings.appearance,
      legacyTheme: isLegacyThemeId(data.legacy_theme) ? data.legacy_theme : settings.legacyTheme,
      themeFamily: isThemeFamily(data.theme_family)
        ? data.theme_family
        : data.hybrid_theme_family === 'originals'
          ? 'legacy'
          : typeof data.appearance === 'string'
            ? null // an account from before theme families: keep its appearance
            : settings.themeFamily,
      fontSize: ['small', 'default', 'large', 'extra_large'].includes(data.font_size)
        ? (data.font_size as FontSizePreference)
        : settings.fontSize,
      pageZoom: isPageZoom(data.zoom) ? data.zoom : settings.pageZoom,
      pushNotificationsEnabled:
        typeof notifications?.pushEnabled === 'boolean'
          ? notifications.pushEnabled
          : settings.pushNotificationsEnabled,
      notifications: Object.fromEntries(
        Object.keys(defaultNotificationPreferences).map((key) => [
          key,
          typeof notifications?.[key] === 'boolean'
            ? notifications[key]
            : settings.notifications[key as NotificationCategory],
        ])
      ) as NotificationPreferences,
      profileVisibility: ['public', 'friends', 'private'].includes(String(privacy?.profileVisibility))
        ? (privacy?.profileVisibility as ProfileVisibility)
        : settings.profileVisibility,
      activityVisible:
        typeof privacy?.activityVisible === 'boolean' ? privacy.activityVisible : settings.activityVisible,
      messagingPermission:
        privacy?.messagingPermission === 'everyone'
          ? 'everyone'
          : privacy?.messagingPermission === 'friends'
            ? 'friends'
            : settings.messagingPermission,
      friendRequestPermission:
        privacy?.friendRequestPermission === 'friends'
          ? 'friends'
          : privacy?.friendRequestPermission === 'everyone'
            ? 'everyone'
            : settings.friendRequestPermission,
      discoverable: typeof privacy?.discoverable === 'boolean' ? privacy.discoverable : settings.discoverable,
      shareOnlineStatus: privacy?.shareOnlineStatus === true,
      readReceipts: privacy?.readReceipts !== false,
      answerBounceEnabled:
        typeof notifications?.answerBounceEnabled === 'boolean'
          ? notifications.answerBounceEnabled
          : settings.answerBounceEnabled,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    if (typeof data.navigation_auto_hide === 'boolean') {
      await setTabBarModeFromAccount(data.navigation_auto_hide ? 'autoHide' : 'alwaysVisible');
    }
    notify();
  } catch (error) {
    console.warn('Could not sync settings from Firestore:', error);
  }
}

export function useFontSizePreference(): FontSizePreference {
  return useSyncExternalStore(subscribe, () => settings.fontSize, () => defaultSettings.fontSize);
}

export async function setFontSizePreference(fontSize: FontSizePreference) {
  await ensureSettingsLoaded();
  settings = { ...settings, fontSize };
  notify();
  await saveSettings();
}

export function usePrivacyPreferences() {
  return useSyncExternalStore(subscribe, getPrivacySnapshot, () => defaultPrivacySettings);
}

export async function setPrivacyPreference<
  K extends
    | 'profileVisibility'
    | 'activityVisible'
    | 'messagingPermission'
    | 'friendRequestPermission'
    | 'discoverable'
    | 'shareOnlineStatus'
    | 'readReceipts',
>(key: K, value: SettingsData[K]) {
  await ensureSettingsLoaded();
  settings = { ...settings, [key]: value };
  notify();
  await saveSettings();
  if (key === 'readReceipts') {
    const userId = auth.currentUser?.uid;
    // Others' apps read this: read receipts apply only when both share them.
    if (userId) await setDoc(doc(db, 'users', userId), { readReceipts: value }, { merge: true }).catch(() => {});
  }
  if (key === 'activityVisible') {
    const userId = auth.currentUser?.uid;
    if (userId) {
      await setDoc(doc(db, 'users', userId), { share_activity: value }, { merge: true }).catch((err) =>
        console.warn('Could not sync activity visibility:', err)
      );
    }
  }
}

// The learner's appearance choice: 'light', 'dark' or 'system'.
export function useAppearancePreference(): AppearancePreference {
  return useSyncExternalStore(
    subscribe,
    () => settings.appearance,
    // Web pages are pre-rendered with the default (light) theme.
    () => defaultSettings.appearance
  );
}

// Changes the appearance immediately and saves it for next time.
export async function setAppearancePreference(
  appearance: AppearancePreference
) {
  // Make sure a slow first load can't overwrite this choice later.
  await ensureSettingsLoaded();

  settings = { ...settings, appearance };
  notify();

  await saveSettings();
}

/** The learner's notification preference, saved on this device. */
export function usePushNotificationsPreference(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => settings.pushNotificationsEnabled,
    () => defaultSettings.pushNotificationsEnabled
  );
}

export async function setPushNotificationsPreference(enabled: boolean) {
  await ensureSettingsLoaded();
  settings = { ...settings, pushNotificationsEnabled: enabled };
  notify();
  await saveSettings();
}

/** The hour (0-23) the learner wants the streak reminder, or null for the default evening window. */
export function useStreakReminderHour(): number | null {
  return useSyncExternalStore(subscribe, () => settings.streakReminderHour, () => defaultSettings.streakReminderHour);
}

export async function readStreakReminderHour(): Promise<number | null> {
  await ensureSettingsLoaded();
  return settings.streakReminderHour;
}

export async function setStreakReminderHour(hour: number | null) {
  await ensureSettingsLoaded();
  settings = { ...settings, streakReminderHour: hour };
  notify();
  await saveSettings();
}

/** Whether correct-answer feedback has its short bounce animation. */
export function useAnswerBouncePreference(): boolean {
  return useSyncExternalStore(subscribe, () => settings.answerBounceEnabled, () => defaultSettings.answerBounceEnabled);
}

export async function setAnswerBouncePreference(enabled: boolean) {
  await ensureSettingsLoaded();
  settings = { ...settings, answerBounceEnabled: enabled };
  notify();
  await saveSettings();
}

export function useNotificationPreferences(): NotificationPreferences {
  return useSyncExternalStore(subscribe, () => settings.notifications, () => defaultSettings.notifications);
}

export async function setNotificationPreference(category: NotificationCategory, enabled: boolean) {
  await ensureSettingsLoaded();
  settings = { ...settings, notifications: { ...settings.notifications, [category]: enabled } };
  notify();
  await saveSettings();
}

export function usePageZoomPreference(): PageZoomPreference {
  return useSyncExternalStore(subscribe, () => settings.pageZoom, () => defaultSettings.pageZoom);
}

export async function setPageZoomPreference(pageZoom: PageZoomPreference) {
  await ensureSettingsLoaded();
  settings = { ...settings, pageZoom };
  notify();
  await saveSettings();
}

/** The original app's theme the learner chose (id from LEGACY_THEMES). */
export function useLegacyThemePreference(): string {
  return useSyncExternalStore(subscribe, () => settings.legacyTheme, () => defaultSettings.legacyTheme);
}

/** Saves an original-app theme. The caller checks the unlock rules first. */
export async function setLegacyThemePreference(legacyTheme: string) {
  if (!isLegacyThemeId(legacyTheme)) return;
  await ensureSettingsLoaded();
  settings = { ...settings, legacyTheme };
  notify();
  await saveSettings();
}

/** The chosen theme family, or null when the learner hasn't picked a theme yet. */
export function useThemeFamilyPreference(): ThemeFamily | null {
  return useSyncExternalStore(subscribe, () => settings.themeFamily, () => defaultSettings.themeFamily);
}

export async function setThemeFamilyPreference(themeFamily: ThemeFamily) {
  await ensureSettingsLoaded();
  settings = { ...settings, themeFamily };
  notify();
  await saveSettings();
}

/** Picks one of this app's newer themes (any experience draws it its own way). */
export async function chooseNewerTheme(appearance: AppearancePreference) {
  await ensureSettingsLoaded();
  settings = { ...settings, appearance, themeFamily: 'newer' };
  notify();
  await saveSettings();
}

/** Picks a legacy theme. The caller checks the original unlock rules first. */
export async function chooseLegacyTheme(legacyTheme: string) {
  if (!isLegacyThemeId(legacyTheme)) return;
  await ensureSettingsLoaded();
  settings = { ...settings, legacyTheme, themeFamily: 'legacy' };
  notify();
  await saveSettings();
}
