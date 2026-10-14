import { Href, router } from 'expo-router';

import { EXPERIENCE_INFO, EXPERIENCES_ENABLED, isExperience } from '@/data/experience';
import { type ReactNode, useEffect, useState } from 'react';
import { Linking, Platform, Share, StyleSheet, Switch, useWindowDimensions, View } from 'react-native';
import { Text, TextInput } from '@/components/ui/text';

import { ATMOSPHERE } from '@/components/atmosphere/config';
import { useOriginalAutoHide } from '@/components/experience/legacy-navigation';
import { useIsAdmin, useThemeLocks } from '@/components/experience/experience-sync';
import { BackLink } from '@/components/learning/nav-bits';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Interactive } from '@/components/ui/interactive';
import { Sheet } from '@/components/ui/sheet';
import { PageHeader, Screen } from '@/components/ui/screen';
import { webStyle } from '@/components/ui/web';
import { cssTransition, MOTION } from '@/constants/motion';
import { elevation, isDesktopWidth, Radius, Type, type ThemeColors } from '@/constants/theme';
import { setTabBarMode, type TabBarMode, useTabBarMode } from '@/data/navigation-settings';
import {
  type AppearancePreference,
  type FontSizePreference,
  setPageZoomPreference,
  chooseLegacyTheme,
  chooseNewerTheme,
  useLegacyThemePreference,
  setPushNotificationsPreference,
  setAnswerBouncePreference,
  setNotificationPreference,
  usePageZoomPreference,
  useAppearancePreference,
  usePushNotificationsPreference,
  useAnswerBouncePreference,
  useNotificationPreferences,
  setFontSizePreference,
  useFontSizePreference,
  usePrivacyPreferences,
  setPrivacyPreference,
  syncSettingsFromAccount,
  type NotificationCategory,
} from '@/data/settings';
import { setDisplayName, useDisplayName } from '@/data/user';
import { ABOUT_US } from '@/data/about';
import { EXPLORE_TEAM } from '@/data/explore';
import { grantPowerup } from '@/data/learning/powerups';
import { dayKey } from '@/data/learning/time';
import { resetAllLearningProgress, useProgress } from '@/data/progress';
import { legacyLevel, legacyThemeById } from '@/data/legacy-theme-colors';
import { THEME_CATALOG, themeLockText } from '@/data/theme-catalog';
import { legacyColorsOf } from '@/data/legacy-themes';
import { useAuth } from '@/hooks/use-auth';
import { useExperience } from '@/hooks/use-experience';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { themeColorsFor, useTheme, useThemedStyles, useThemeFamily } from '@/hooks/use-theme';
import { legacyAtmosphere, paletteGradient } from '@/data/theme-portrayal';
import { deleteMyAccount, FULL_ACCOUNT_DELETION } from '@/lib/account';
import { updateCurrentProfile } from '@/lib/profiles';
import { routes } from '@/lib/routes';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { enableDeviceNotifications } from '@/lib/device-notifications';
import { unregisterWebPush } from '@/lib/web-push';

const HOME_HREF = '/' as Href;
type ThemeSwatchScheme = Exclude<AppearancePreference, 'system'>;

const navigationOptions: { value: TabBarMode; label: string; description: string }[] = [
  {
    value: 'autoHide',
    label: 'Auto-hide',
    description: 'Phones: the tab bar slides away while you scroll down and returns when you scroll up. Laptops: the side navigation waits at the left edge.',
  },
  {
    value: 'alwaysVisible',
    label: 'Always visible',
    description: 'Keep the tab bar on screen and the side navigation docked.',
  },
];

const MAX_NAME_LENGTH = 30;
const notificationOptions: { key: NotificationCategory; label: string; description: string }[] = [
  { key: 'friendActivity', label: 'Friend activity', description: 'Learning milestones from friends.' },
  { key: 'friendRequests', label: 'Friend requests', description: 'Requests to connect with classmates.' },
  { key: 'messages', label: 'Messages', description: 'New direct messages.' },
  { key: 'groupActivity', label: 'Group activity', description: 'Invitations and study group discussions.' },
  { key: 'studyReminders', label: 'Study reminders', description: 'Reminders for your planned study time.' },
  { key: 'learningReminders', label: 'Learning reminders', description: 'Lessons and reviews you planned to complete.' },
  { key: 'goalReminders', label: 'Goal reminders', description: 'Progress toward your personal goals.' },
  { key: 'streakReminders', label: 'Streak reminders', description: 'A reminder in the evening when your learning streak is at risk.' },
  { key: 'announcements', label: 'Announcements', description: 'Platform news and feature updates.' },
  { key: 'socialEngagement', label: 'Social engagement', description: 'Reactions and replies to your posts.' },
  { key: 'battles', label: 'Battles', description: 'Challenges from friends and how your battles ended.' },
  { key: 'league', label: 'League', description: 'Your weekly league standing and promotions.' },
];

// Settings are grouped into collapsible sections and opened from the gear
// on Home, the rail and Profile.
export default function SettingsScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const { width } = useWindowDimensions();
  const desktop = isDesktopWidth(width);
  const experience = useExperience();
  const originalAutoHide = useOriginalAutoHide();
  const pageZoom = usePageZoomPreference();
  const fontSize = useFontSizePreference();
  const privacy = usePrivacyPreferences();
  const pushNotificationsEnabled = usePushNotificationsPreference();
  const answerBounceEnabled = useAnswerBouncePreference();
  const notificationPreferences = useNotificationPreferences();
  const tabBarMode = useTabBarMode();
  const systemScheme = useColorScheme();

  // Display name.
  const savedName = useDisplayName();
  const [nameDraft, setNameDraft] = useState(savedName ?? '');
  const [nameSaved, setNameSaved] = useState(false);

  // Authentication session.
  const { user } = useAuth();
  const [preferenceSyncError, setPreferenceSyncError] = useState(false);
  const [pushNotificationNotice, setPushNotificationNotice] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [resetProgressOpen, setResetProgressOpen] = useState(false);
  const [resettingProgress, setResettingProgress] = useState(false);
  const [resetProgressError, setResetProgressError] = useState<string | null>(null);
  const [resetProgressDone, setResetProgressDone] = useState(false);
  const [sharingApp, setSharingApp] = useState(false);
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    syncSettingsFromAccount(user.id).then(() => {
      if (active) setPreferenceSyncError(false);
    }).catch(() => {
      if (active) setPreferenceSyncError(true);
    });
    return () => { active = false; };
  }, [user?.id]);

  // Refill the box whenever the saved name changes (e.g. after it loads).
  const [lastSavedName, setLastSavedName] = useState(savedName);
  if (savedName !== lastSavedName) {
    setLastSavedName(savedName);
    setNameDraft(savedName ?? '');
  }

  const nameChanged = nameDraft.trim() !== (savedName ?? '');

  async function saveName() {
    await setDisplayName(nameDraft);
    setNameSaved(true);
  }

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Unexpected error signing out:', err);
    } finally {
      setSigningOut(false);
      router.replace('/login');
    }
  }

  async function handleDeleteAccount() {
    if (deleting) return;
    setDeleting(true);
    setDeleteError(null);
    const { error } = await deleteMyAccount();
    setDeleting(false);
    if (error) {
      setDeleteError(error);
      return;
    }
    router.replace('/login');
  }

  async function handleResetProgress() {
    if (resettingProgress) return;
    setResettingProgress(true);
    setResetProgressError(null);
    setResetProgressDone(false);
    try {
      await resetAllLearningProgress();
      setResetProgressOpen(false);
      setResetProgressDone(true);
    } catch (error) {
      const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
      if (code === 'PGRST202' || code === '42883') {
        setResetProgressError('Apply Supabase migration 20261007100000_reset_learning_progress.sql, then try again.');
      } else {
        setResetProgressError(error instanceof Error ? error.message : 'Could not reset progress. Please try again.');
      }
    } finally {
      setResettingProgress(false);
    }
  }

  async function updatePushNotifications(enabled: boolean) {
    setPushNotificationNotice(null);
    if (!enabled) {
      await setPushNotificationsPreference(false);
      void unregisterWebPush();
      return;
    }
    const result = await enableDeviceNotifications();
    await setPushNotificationsPreference(result.granted);
    if (!result.granted) setPushNotificationNotice(result.message ?? 'Notifications could not be enabled.');
  }

  async function shareApp() {
    if (sharingApp) return;
    setSharingApp(true);
    setShareNotice(null);
    try {
      let shared = false;
      let copiedLink = false;
      if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
        const browserNavigator = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
        if (browserNavigator.share) {
          await browserNavigator.share({ title: 'GrAte Apex Hub', text: 'Study, practise and connect with GrAte Apex Hub.', url: 'https://grateapex.vercel.app/' });
          shared = true;
        } else if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText('https://grateapex.vercel.app/');
          shared = true;
          copiedLink = true;
        }
      } else {
        const result = await Share.share({ title: 'GrAte Apex Hub', message: 'Study, practise and connect with GrAte Apex Hub: https://grateapex.vercel.app/' });
        shared = result.action === Share.sharedAction;
      }
      if (!shared) {
        setShareNotice('Sharing was cancelled or is not available in this browser.');
        return;
      }
      const awarded = await grantPowerup('share', dayKey(Date.now()), 1.5);
      setShareNotice(awarded
        ? `${copiedLink ? 'Link copied.' : 'Thanks for sharing GrAte Apex Hub.'} A 1.5× XP power-up is ready for your next lesson or quiz.`
        : `${copiedLink ? 'Link copied.' : 'Thanks for sharing GrAte Apex Hub.'} You have already earned today’s share power-up.`);
    } catch (error) {
      const aborted = error instanceof Error && error.name === 'AbortError';
      setShareNotice(aborted ? 'Sharing was cancelled.' : 'Could not share the app. Please try again.');
    } finally {
      setSharingApp(false);
    }
  }

  return (
    <Screen width="prose">
      <BackLink fallback={HOME_HREF} />
      <PageHeader title="Settings" subtitle="Your profile, appearance and navigation." style={styles.header} />

      <SettingsSection title="Profile">
        <Text style={styles.optionLabel}>Display name</Text>
        <Text style={styles.optionDescription}>{nameSaved && !nameChanged ? 'Saved.' : 'Shown on Feed as "Doc. <name>".'}</Text>
        <View style={styles.nameInputRow}>
          <TextInput
            style={styles.nameInput}
            value={nameDraft}
            onChangeText={(text) => {
              setNameDraft(text);
              setNameSaved(false);
            }}
            onSubmitEditing={() => nameChanged && saveName()}
            placeholder="Your name"
            placeholderTextColor={colors.textTertiary}
            maxLength={MAX_NAME_LENGTH}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            accessibilityLabel="Display name"
          />
          <Button label="Save" onPress={() => void saveName()} disabled={!nameChanged} />
        </View>
      </SettingsSection>

      {EXPERIENCES_ENABLED ? (
        <SettingsSection title="Experience">
          <Text style={styles.optionLabel}>{isExperience(user?.profile?.experience) ? EXPERIENCE_INFO[user.profile.experience].name : 'Not chosen yet'}</Text>
          <Text style={styles.optionDescription}>Changes how the app looks and is laid out. Your account, progress, friends, messages, achievements, XP and theme stay as they are.</Text>
          <Button label="Change experience" variant="secondary" size="sm" onPress={() => router.push('/choose-experience' as Href)} />
        </SettingsSection>
      ) : null}

      <SettingsSection title="Appearance">
        <ThemeGrid desktop={desktop} systemScheme={systemScheme === 'dark' ? 'dark' : 'light'} />
      </SettingsSection>

      <SettingsSection title="Font size and zoom">
        <Text style={styles.optionDescription}>Font size changes text while preserving the page layout. Zoom changes the whole web app.</Text>
        <Text style={styles.optionLabel}>Font size</Text>
        <View style={styles.zoomOptions}>
          {([{ value: 'small', label: 'Small' }, { value: 'default', label: 'Default' }, { value: 'large', label: 'Large' }, { value: 'extra_large', label: 'Extra Large' }] as const).map((option) => (
            <Interactive key={option.value} onPress={() => void setFontSizePreference(option.value as FontSizePreference)} accessibilityRole="radio" accessibilityState={{ checked: fontSize === option.value }} style={[styles.zoomOption, fontSize === option.value && styles.zoomOptionSelected]}>
              <Text style={[styles.zoomText, fontSize === option.value && styles.zoomTextSelected]}>{option.label}</Text>
            </Interactive>
          ))}
        </View>
        {Platform.OS === 'web' ? (
          <View style={styles.zoomOptions}>
            {([80, 90, 100, 110, 125] as const).map((value) => (
              <Interactive
                key={value}
                onPress={() => void setPageZoomPreference(value)}
                accessibilityRole="radio"
                accessibilityState={{ checked: pageZoom === value }}
                accessibilityLabel={`${value}% app zoom`}
                style={[styles.zoomOption, pageZoom === value && styles.zoomOptionSelected]}
              >
                <Text style={[styles.zoomText, pageZoom === value && styles.zoomTextSelected]}>{value}%</Text>
              </Interactive>
            ))}
          </View>
        ) : null}
        {Platform.OS !== 'web' ? <Text style={styles.optionDescription}>App zoom is currently available in the web experience. Native screens continue to respect your device accessibility settings.</Text> : null}
      </SettingsSection>

      <SettingsSection title="Quiz experience">
        <View style={styles.optionRow}>
          <View style={styles.flex}>
            <Text style={styles.optionLabel}>Bounce after an answer</Text>
            <Text style={styles.optionDescription}>Show the short feedback bounce when a quiz answer is revealed.</Text>
          </View>
          <Switch
            value={answerBounceEnabled}
            onValueChange={(enabled) => void setAnswerBouncePreference(enabled)}
            trackColor={{ false: colors.track, true: colors.primary }}
            thumbColor={colors.surface}
            accessibilityLabel="Bounce after a quiz answer"
          />
        </View>
      </SettingsSection>

      <SettingsSection title="Privacy">
        <Text style={styles.optionLabel}>Profile visibility</Text>
        <Text style={styles.optionDescription}>This preference is saved to your account. Privacy filtering is being applied to social queries as that backend migration is enabled.</Text>
        <View style={styles.zoomOptions}>{(['public', 'friends', 'private'] as const).map((value) => <Interactive key={value} onPress={() => void setPrivacyPreference('profileVisibility', value)} accessibilityRole="radio" accessibilityState={{ checked: privacy.profileVisibility === value }} style={[styles.zoomOption, privacy.profileVisibility === value && styles.zoomOptionSelected]}><Text style={[styles.zoomText, privacy.profileVisibility === value && styles.zoomTextSelected]}>{value[0].toUpperCase() + value.slice(1)}</Text></Interactive>)}</View>
        <PrivacySwitch label="Show my activity to friends" value={privacy.activityVisible} onChange={(value) => void setPrivacyPreference('activityVisible', value)} />
        <PrivacySwitch label="Show when I’m online and last seen" value={privacy.shareOnlineStatus} onChange={(value) => void setPrivacyPreference('shareOnlineStatus', value)} />
        <Text style={styles.optionDescription}>People you message see “Online” or when you were last seen. When this is off you can’t see theirs either. It turns off automatically when you sign out.</Text>
        <PrivacySwitch label="Read receipts" value={privacy.readReceipts} onChange={(value) => void setPrivacyPreference('readReceipts', value)} />
        <Text style={styles.optionDescription}>Blue ticks show when a message has been read. When this is off, others don’t see when you’ve read their messages and you don’t see theirs.</Text>
        <PrivacySwitch label="Let students find me" value={privacy.discoverable} onChange={(value) => void setPrivacyPreference('discoverable', value)} />
        <View style={styles.optionRow}><View style={styles.flex}><Text style={styles.optionLabel}>Messages</Text><Text style={styles.optionDescription}>Choose who may start a conversation.</Text></View><View style={styles.zoomOptions}>{(['friends', 'everyone'] as const).map((value) => <Interactive key={value} onPress={() => void setPrivacyPreference('messagingPermission', value)} accessibilityRole="radio" accessibilityState={{ checked: privacy.messagingPermission === value }} style={[styles.zoomOption, privacy.messagingPermission === value && styles.zoomOptionSelected]}><Text style={[styles.zoomText, privacy.messagingPermission === value && styles.zoomTextSelected]}>{value}</Text></Interactive>)}</View></View>
        <View style={styles.optionRow}><View style={styles.flex}><Text style={styles.optionLabel}>Friend requests</Text><Text style={styles.optionDescription}>Choose who may send you a request.</Text></View><View style={styles.zoomOptions}>{(['everyone', 'friends'] as const).map((value) => <Interactive key={value} onPress={() => void setPrivacyPreference('friendRequestPermission', value)} accessibilityRole="radio" accessibilityState={{ checked: privacy.friendRequestPermission === value }} style={[styles.zoomOption, privacy.friendRequestPermission === value && styles.zoomOptionSelected]}><Text style={[styles.zoomText, privacy.friendRequestPermission === value && styles.zoomTextSelected]}>{value}</Text></Interactive>)}</View></View>
      </SettingsSection>

      <SettingsSection title="Navigation">
        {/* The Originals uses the original app's own setting (autoHideNav on the account). */}
        {navigationOptions.map((option, index) => {
          const selected = experience === 'originals' ? (option.value === 'autoHide') === originalAutoHide : tabBarMode === option.value;
          return (
            <Interactive
              key={option.value}
              onPress={() => (experience === 'originals' ? void updateCurrentProfile({ autoHideNav: option.value === 'autoHide' }) : setTabBarMode(option.value))}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${option.label}. ${option.description}`}
              style={({ hovered }) => [styles.optionRow, index > 0 && styles.rowDivider, hovered && styles.rowHover]}
            >
              <View style={styles.flex}>
                <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{option.label}</Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
              <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioDot} /> : null}</View>
            </Interactive>
          );
        })}
      </SettingsSection>

      <SettingsSection title="Notifications">
        {preferenceSyncError ? <Text style={styles.optionDescription}>Your choices are saved on this device. Account sync is unavailable until the preferences database migration is applied.</Text> : null}
        <Text style={styles.optionDescription}>Choose which updates you want. When device notifications are enabled, new eligible updates can also appear outside the app.</Text>
        <View style={styles.optionRow}>
          <Icon name="bell" size={18} color={colors.primaryText} />
          <View style={styles.flex}>
            <Text style={styles.optionLabel}>Push notification preference</Text>
            <Text style={styles.optionDescription}>Allow browser notifications for new updates while GrAte Apex Hub is in the background.</Text>
          </View>
          <Switch
            value={pushNotificationsEnabled}
            onValueChange={(enabled) => void updatePushNotifications(enabled)}
            trackColor={{ false: colors.track, true: colors.primary }}
            thumbColor={colors.surface}
            accessibilityLabel="Push notification preference"
          />
        </View>
        {pushNotificationNotice ? <Text style={styles.optionDescription}>{pushNotificationNotice}</Text> : null}
        {notificationOptions.map((option) => (
          <View key={option.key} style={styles.optionRow}>
            <View style={styles.flex}>
              <Text style={styles.optionLabel}>{option.label}</Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </View>
            <Switch
              value={notificationPreferences[option.key]}
              onValueChange={(enabled) => void setNotificationPreference(option.key, enabled)}
              trackColor={{ false: colors.track, true: colors.primary }}
              thumbColor={colors.surface}
              accessibilityLabel={`${option.label} notification preference`}
            />
          </View>
        ))}
      </SettingsSection>

      <SettingsSection title="Legal">
        <Interactive onPress={() => router.push('/terms' as Href)} accessibilityRole="link" style={styles.optionRow}>
          <View style={styles.flex}><Text style={styles.optionLabel}>Terms & Conditions</Text><Text style={styles.optionDescription}>Read the terms that apply to your account.</Text></View>
          <Icon name="chevronRight" size={18} color={colors.textTertiary} />
        </Interactive>
        <Interactive onPress={() => router.push('/privacy' as Href)} accessibilityRole="link" style={[styles.optionRow, styles.rowDivider]}>
          <View style={styles.flex}><Text style={styles.optionLabel}>Privacy Policy</Text><Text style={styles.optionDescription}>Review how account and learning data are handled.</Text></View>
          <Icon name="chevronRight" size={18} color={colors.textTertiary} />
        </Interactive>
      </SettingsSection>

      <SettingsSection title="Help">
        <Interactive
          onPress={() => router.push(routes.onboarding({ replay: true }))}
          accessibilityLabel="Replay the introduction"
          style={({ hovered }) => [styles.optionRow, hovered && styles.rowHover]}
        >
          <Icon name="play" size={18} color={colors.primaryText} />
          <View style={styles.flex}>
            <Text style={styles.optionLabel}>Replay the introduction</Text>
            <Text style={styles.optionDescription}>The interactive tour of how GrAte Apex Hub works. Nothing in it affects your progress.</Text>
          </View>
          <Icon name="chevronRight" size={18} color={colors.textTertiary} />
        </Interactive>
      </SettingsSection>

      <SettingsSection title="Install on your devices">
        <Text style={styles.optionDescription}>Install GrAte Apex Hub from your browser and open it once while online. Lessons and your saved progress remain available on this device offline; new learning activity syncs to your account when you reconnect.</Text>
        <View style={styles.optionRow}>
          <View style={styles.flex}>
            <Text style={styles.optionLabel}>iPhone and iPad</Text>
            <Text style={styles.optionDescription}>Open this site in Safari, tap Share, then choose Add to Home Screen.</Text>
          </View>
        </View>
        <View style={[styles.optionRow, styles.rowDivider]}>
          <View style={styles.flex}>
            <Text style={styles.optionLabel}>Android phones and tablets</Text>
            <Text style={styles.optionDescription}>Open in Chrome, tap ⋮, then choose Install app or Add to Home screen.</Text>
          </View>
        </View>
        <View style={[styles.optionRow, styles.rowDivider]}>
          <View style={styles.flex}>
            <Text style={styles.optionLabel}>Windows, Mac, Linux and Chromebook</Text>
            <Text style={styles.optionDescription}>In Chrome or Edge, use the install icon in the address bar or choose Install GrAte Apex Hub from the browser menu. On Mac Safari, choose File → Add to Dock.</Text>
          </View>
        </View>
        <Interactive onPress={() => void Linking.openURL('https://grateapex.vercel.app/')} accessibilityRole="link" style={styles.optionRow}>
          <Icon name="share" size={18} color={colors.primaryText} />
          <View style={styles.flex}><Text style={styles.optionLabel}>Open GrAte Apex Hub</Text><Text style={styles.optionDescription}>grateapex.vercel.app</Text></View>
          <Icon name="chevronRight" size={18} color={colors.textTertiary} />
        </Interactive>
      </SettingsSection>

      <SettingsSection title="Share the app">
        <Text style={styles.optionDescription}>Invite a classmate to study with you. After a successful share, earn one 1.5× XP power-up per day for your next lesson or quiz.</Text>
        <Button label={sharingApp ? 'Sharing…' : 'Share GrAte Apex Hub'} variant="secondary" icon={<Icon name="share" size={17} color={colors.text} />} onPress={() => void shareApp()} disabled={sharingApp} />
        {shareNotice ? <Text style={styles.optionDescription} accessibilityLiveRegion="polite">{shareNotice}</Text> : null}
      </SettingsSection>

      <SettingsSection title="About us">
        <Text style={styles.optionDescription}>{ABOUT_US}</Text>
        <Text style={[styles.optionLabel, { marginTop: 16 }]}>Meet the team</Text>
        <View>
          {EXPLORE_TEAM.map((member, index) => (
            <View key={member.name} style={[styles.optionRow, index > 0 && styles.rowDivider]}>
              <Icon name={member.icon} size={18} color={colors.primaryText} />
              <View style={styles.flex}>
                <Text style={styles.optionLabel}>{member.name}</Text>
                <Text style={styles.optionDescription}>{member.role}</Text>
              </View>
            </View>
          ))}
        </View>
      </SettingsSection>

      <SettingsSection title="Account">
        {user ? (
          <>
            <View style={styles.optionRow}>
              <Icon name="mail" size={18} color={colors.textTertiary} />
              <View style={styles.flex}>
                <Text style={styles.optionLabel}>Signed in as</Text>
                <Text style={styles.optionDescription}>{user.email}</Text>
              </View>
            </View>
            <Interactive
              onPress={() => void handleSignOut()}
              disabled={signingOut}
              accessibilityLabel="Sign out"
              style={({ hovered }) => [styles.optionRow, styles.rowDivider, hovered && styles.rowHover]}
            >
              <Icon name="logout" size={18} color={colors.error} />
              <View style={styles.flex}>
                <Text style={[styles.optionLabel, styles.signOutText]}>{signingOut ? 'Signing out…' : 'Sign out'}</Text>
                <Text style={styles.optionDescription}>Sign out of your account on this device.</Text>
              </View>
            </Interactive>
            <Interactive
              onPress={() => setDeleteOpen(true)}
              accessibilityLabel="Delete account"
              style={({ hovered }) => [styles.optionRow, styles.rowDivider, hovered && styles.rowHover]}
            >
              <Icon name="warning" size={18} color={colors.error} />
              <View style={styles.flex}>
                <Text style={[styles.optionLabel, styles.signOutText]}>Delete account</Text>
                <Text style={styles.optionDescription}>Permanently erase your account and all your data.</Text>
              </View>
            </Interactive>
          </>
        ) : (
          <Interactive onPress={() => router.push('/login')} accessibilityLabel="Sign in" style={({ hovered }) => [styles.optionRow, hovered && styles.rowHover]}>
            <Icon name="key" size={18} color={colors.primaryText} />
            <View style={styles.flex}>
              <Text style={[styles.optionLabel, styles.signInText]}>Sign in</Text>
              <Text style={styles.optionDescription}>Sign in to sync your profile across devices.</Text>
            </View>
          </Interactive>
        )}
        <View style={styles.accountDivider} />
        <Text style={styles.optionLabel}>Learning progress</Text>
        <Text style={styles.optionDescription}>Clear your XP, streak, completed lessons, quiz and question history, review schedule, and learning activity from this device and your account.</Text>
        {resetProgressDone ? <Text style={styles.resetSuccess}>All learning progress has been reset.</Text> : null}
        <View style={styles.resetAction}>
          <Button label="Reset all progress" variant="danger" icon={<Icon name="trash" size={16} color="#FFFFFF" />} onPress={() => { setResetProgressError(null); setResetProgressOpen(true); }} />
        </View>
      </SettingsSection>

      <Sheet visible={deleteOpen} onClose={() => { if (!deleting) { setDeleteOpen(false); setDeleteError(null); } }} title="Delete your account?" subtitle="This action cannot be undone." footer={<View style={styles.confirmActions}><Button label="Cancel" variant="secondary" onPress={() => { setDeleteOpen(false); setDeleteError(null); }} disabled={deleting} /><Button label="Delete account" variant="danger" onPress={() => void handleDeleteAccount()} loading={deleting} /> </View>}>
        <Text style={styles.optionDescription}>{FULL_ACCOUNT_DELETION ? 'Your profile, learning progress, XP, quiz and review history, friends, posts, messages and notifications will be permanently erased.' : 'Your sign-in and your private learning progress will be deleted now. Your public profile, username, leaderboard entry and what you shared stay until the GrAte Apex Hub team removes them — email theapexhub921@gmail.com first to ask for that.'}</Text>
        {deleteError ? <Text style={styles.signOutText}>{deleteError}</Text> : null}
      </Sheet>

      <Sheet visible={resetProgressOpen} onClose={() => { if (!resettingProgress) { setResetProgressOpen(false); setResetProgressError(null); } }} title="Reset all progress?" subtitle="This action cannot be undone." footer={<View style={styles.confirmActions}><Button label="Cancel" variant="secondary" onPress={() => { setResetProgressOpen(false); setResetProgressError(null); }} disabled={resettingProgress} /><Button label="Reset progress" variant="danger" onPress={() => void handleResetProgress()} loading={resettingProgress} /> </View>}>
        <Text style={styles.optionDescription}>Your learning history, XP, level, streaks, lesson completions, quiz and question attempts, review schedule, and saved learning activity will be cleared from your account and this device.</Text>
        {resetProgressError ? <Text style={styles.signOutText}>{resetProgressError}</Text> : null}
      </Sheet>

    </Screen>
  );
}

function PrivacySwitch({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  const colors = useTheme();
  const styles = useThemedStyles(createStyles);
  return <View style={styles.optionRow}><Text style={[styles.optionLabel, styles.flex]}>{label}</Text><Switch value={value} onValueChange={onChange} trackColor={{ false: colors.track, true: colors.primary }} thumbColor={colors.surface} accessibilityLabel={label} /></View>;
}

// A miniature of the theme: its page light, a card and its accent.
// A theme's preview in the current experience's style: its page background
// (Originate: the atmosphere light; The Originals and Hybrid: the original
// gradient), a card, two text lines and the button colour.
function ThemeSwatch({ scheme, split, legacyId }: { scheme?: ThemeSwatchScheme; split?: boolean; legacyId?: string }) {
  const styles = useThemedStyles(createStyles);
  const experience = useExperience();
  const render = (name: ThemeSwatchScheme | null) => {
    const family = name ? 'newer' : 'legacy';
    const palette = themeColorsFor(experience, name ?? 'dark', legacyId ?? 'dark', family);
    let background: string;
    let image: string;
    if (experience === 'originate') {
      const field = name ? ATMOSPHERE[name] : legacyAtmosphere(legacyThemeById(legacyId));
      background = field.base;
      image = `radial-gradient(120% 90% at 0% 0%, ${field.fieldA[0]}88, transparent 60%)`;
    } else {
      const wash = name ? paletteGradient(name) : (() => { const c = legacyColorsOf(legacyThemeById(legacyId)); return { colors: c.gradient, bg: c.bg }; })();
      background = wash.bg;
      image = `linear-gradient(160deg, ${wash.colors.join(', ')})`;
    }
    return (
      <View key={name ?? 'legacy'} style={[styles.swatchHalf, { backgroundColor: background }, webStyle({ backgroundImage: image })]}>
        <View style={[styles.swatchCard, { backgroundColor: palette.surface, borderColor: palette.hairline }]}>
          <View style={[styles.swatchLine, { backgroundColor: palette.text, opacity: 0.85 }]} />
          <View style={[styles.swatchLine, styles.swatchLineShort, { backgroundColor: palette.textTertiary }]} />
          <View style={[styles.swatchPill, { backgroundColor: palette.primary }]} />
        </View>
      </View>
    );
  };
  return <View style={styles.swatch}>{legacyId ? render(null) : split ? [render('light'), render('dark')] : render(scheme ?? 'dark')}</View>;
}

// Every theme in one grid (data/theme-catalog.ts): four are free, the rest
// unlock with XP. Each preview is drawn the way the current experience draws it.
function ThemeGrid({ desktop, systemScheme }: { desktop: boolean; systemScheme: 'light' | 'dark' }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const appearance = useAppearancePreference();
  const legacyTheme = useLegacyThemePreference();
  const family = useThemeFamily();
  const { isAdmin } = useIsAdmin();
  const lockOf = useThemeLocks();
  const level = legacyLevel(useProgress().xp);
  return (
    <>
      <Text style={[styles.optionDescription, styles.legacyLevel]}>You&apos;re Level {level}. Earn XP to unlock more themes — every theme works in every experience.</Text>
      <View style={[styles.themeGrid, desktop && styles.themeGridDesktop]}>
        {THEME_CATALOG.filter((entry) => !entry.adminOnly || isAdmin).map((entry) => {
          const lock = lockOf(entry);
          const selected = entry.family === family && (entry.family === 'newer' ? appearance === entry.id : legacyTheme === entry.id);
          const detail = lock.unlocked ? entry.description : themeLockText(lock);
          return (
            <Interactive
              key={entry.key}
              disabled={!lock.unlocked}
              onPress={() => void (entry.family === 'newer' ? chooseNewerTheme(entry.id as AppearancePreference) : chooseLegacyTheme(entry.id))}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled: !lock.unlocked }}
              accessibilityLabel={`${entry.name} theme. ${detail}`}
              style={({ hovered, pressed }) => [
                styles.themeCard,
                desktop ? styles.themeCardDesktop : styles.themeCardMobile,
                hovered && styles.themeCardHover,
                selected && styles.themeCardSelected,
                pressed && styles.pressed,
              ]}
            >
              {entry.family === 'newer' ? (
                <ThemeSwatch scheme={entry.id === 'system' ? systemScheme : (entry.id as ThemeSwatchScheme)} split={entry.id === 'system'} />
              ) : (
                <ThemeSwatch legacyId={entry.id} />
              )}
              <View style={styles.themeText}>
                <View style={styles.themeTitleRow}>
                  <Text style={[styles.themeLabel, selected && styles.themeLabelSelected]}>{entry.name}</Text>
                  {selected ? (
                    <View style={styles.check}>
                      <Icon name="check" size={11} color={colors.onPrimary} strokeWidth={3} />
                    </View>
                  ) : !lock.unlocked ? (
                    <Icon name="lock" size={13} color={colors.textTertiary} />
                  ) : null}
                </View>
                <Text style={styles.themeDescription}>{detail}</Text>
              </View>
            </Interactive>
          );
        })}
      </View>
    </>
  );
}

// A titled group of settings rows.
function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const colors = useTheme();
  const styles = useThemedStyles(createStyles);
  return <View style={styles.section}><Interactive onPress={() => setOpen((value) => !value)} accessibilityRole="button" accessibilityState={{ expanded: open }} style={styles.sectionToggle}><View style={styles.sectionTitleRow}><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionCount}>{open ? 'Hide' : 'Show'}</Text><Icon name={open ? 'chevronUp' : 'chevronDown'} size={16} color={colors.textTertiary} /></View></Interactive>{open ? <View style={styles.sectionCard}>{children}</View> : null}</View>;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    header: { marginTop: 14 },
    pressed: { transform: [{ scale: 0.98 }] },
    section: { marginBottom: 22 },
    sectionToggle: { paddingVertical: 8, paddingHorizontal: 4 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sectionTitle: { ...Type.title3, color: colors.text, flex: 1 },
    sectionCount: { fontSize: 12, color: colors.textTertiary },
    sectionCard: {
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.hairline,
      ...elevation(colors, 1),
    },
    profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    editBadge: {
      position: 'absolute',
      right: -2,
      bottom: -2,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.surface,
    },
    inlineButton: { alignSelf: 'flex-start', marginTop: 8 },
    divider: { height: 1, backgroundColor: colors.divider, marginVertical: 16 },
    accountDivider: { height: 1, backgroundColor: colors.divider, marginVertical: 16 },
    optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4, borderRadius: 12 },
    rowDivider: { borderTopWidth: 1, borderTopColor: colors.divider, borderRadius: 0 },
    rowHover: { backgroundColor: colors.surfaceMuted },
    optionLabel: { ...Type.headline, fontSize: 15, color: colors.text },
    optionLabelSelected: { color: colors.primaryText },
    optionDescription: { fontSize: 13, lineHeight: 18, color: colors.textSecondary, marginTop: 2 },
    nameInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
    nameInput: {
      flex: 1,
      minHeight: 46,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: 14,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.surfaceSunken,
    },
    themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    themeFamily: { ...Type.overline, color: colors.textTertiary, marginTop: 14, marginBottom: 8 },
    legacyLevel: { marginTop: -4, marginBottom: 10 },
    themeGridDesktop: { flexWrap: 'wrap' },
    zoomOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    zoomOption: { minWidth: 54, minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    zoomOptionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySubtle },
    zoomText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
    zoomTextSelected: { color: colors.primaryText },
    themeCard: {
      borderRadius: 16,
      borderWidth: 2,
      borderColor: colors.hairline,
      backgroundColor: colors.surfaceMuted,
      padding: 8,
      gap: 10,
      ...webStyle(cssTransition('border-color, transform', MOTION.micro)),
    },
    themeCardMobile: { width: '48%', flexGrow: 1 },
    themeCardDesktop: { width: '31%', flexGrow: 1, minWidth: 180 },
    themeCardHover: { borderColor: colors.primaryBorder },
    themeCardSelected: { borderColor: colors.primary },
    themeText: { paddingHorizontal: 4, paddingBottom: 4 },
    themeTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    themeLabel: { fontSize: 14, fontWeight: '800', color: colors.text },
    themeLabelSelected: { color: colors.primaryText },
    themeDescription: { fontSize: 11.5, lineHeight: 16, color: colors.textSecondary, marginTop: 2 },
    check: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    swatch: { height: 74, borderRadius: 11, overflow: 'hidden', flexDirection: 'row' },
    swatchHalf: { flex: 1, padding: 10, justifyContent: 'flex-end' },
    swatchCard: { borderRadius: 7, padding: 7, gap: 4, borderWidth: 1 },
    swatchLine: { height: 4, borderRadius: 2, width: '70%' },
    swatchLineShort: { width: '45%' },
    swatchPill: { height: 8, width: 26, borderRadius: 4, marginTop: 2 },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioSelected: { borderColor: colors.primary },
    radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.primary },
    signOutText: { color: colors.error },
    resetSuccess: { ...Type.callout, color: colors.primaryText, marginTop: 10 },
    resetAction: { alignItems: 'flex-start', marginTop: 14 },
    confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
    signInText: { color: colors.primaryText },
  });
}
