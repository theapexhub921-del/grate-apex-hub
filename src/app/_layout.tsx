import { DarkTheme, DefaultTheme, type Href, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { type ReactNode, useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

import { AchievementWatcher } from '@/components/achievements/achievement-watcher';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AppUpdateWatcher } from '@/components/app-update-watcher';
import { ProfileCardHost } from '@/components/social/profile-card';
import { CoinGiftSync } from '@/components/coin-gift-sync';
import { ExperienceSync } from '@/components/experience/experience-sync';
import { LearningSync } from '@/components/learning/learning-sync';
import { DeviceNotificationBridge } from '@/components/notifications';
import { PageTitle } from '@/components/page-title';
import { EXPERIENCES_ENABLED, needsExperience } from '@/data/experience';
import { needsOnboarding, useOnboardingState } from '@/data/onboarding';
import { useFontSizePreference, usePageZoomPreference } from '@/data/settings';
import { applyWebFontScale } from '@/lib/web-font-scaling';
import { readClassSelection } from '@/data/class-curriculum';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { useIsClient } from '@/hooks/use-is-client';
import { needsUsername } from '@/lib/login-identifier';
import { useResolvedColorScheme, useTheme } from '@/hooks/use-theme';
import { loadWebFonts } from '@/lib/web-fonts';
import { routes } from '@/lib/routes';

SplashScreen.preventAutoHideAsync();

// Returns true if the current URL contains a Supabase password-recovery
// token (e.g. "?type=recovery" or "#type=recovery").  These params are
// set by Supabase when the user opens a reset link and are read at
// module load time in login.tsx.  We check here so the guard never
// bounces the user away from /login while a recovery is in progress.
function isRecoveryUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const combined = `${window.location.search}&${window.location.hash}`;
  const params = new URLSearchParams(combined.replace(/[?#]/g, '&'));
  return params.get('type') === 'recovery';
}

// Inner component: must be a child of AuthProvider so it can call useAuth().
// Runs the auth guard and renders nothing extra — all children pass through.
function AppGuard({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const onboarding = useOnboardingState();

  useEffect(() => {
    // Don't redirect until the session state is known.
    if (loading) return;

    // Determine whether the user is currently on the /login route.
    // useSegments() returns an array like ['login'] or ['index'] etc.
    const onLoginScreen = segments[0] === 'login';
    const onOnboarding = (segments[0] as string) === 'onboarding';

    // Privacy policy and terms are public (Google and visitors must be able
    // to read them without an account).
    const first = segments[0] as string;
    if (first === 'privacy' || first === 'terms') return;

    if (!session) {
      // Unauthenticated: push to /login unless already there.
      if (!onLoginScreen) {
        router.replace('/login');
      }
      return;
    }

    // Authenticated on a password-recovery link: stay to set the password.
    if (onLoginScreen && isRecoveryUrl()) return;

    // A username in the shared format comes first (new Google accounts, and
    // early new-app accounts whose "username" was a full name). Only once the
    // profile was actually read — never because it couldn't be loaded.
    const onChooseUsername = first === 'choose-username';
    if (session.user.profileLoaded && needsUsername(session.user.profile?.username)) {
      if (!onChooseUsername) router.replace('/choose-username' as Href);
      return;
    }
    if (onChooseUsername) {
      router.replace('/');
      return;
    }

    // The app experience (no default) — only while EXPERIENCES_ENABLED is on.
    const onChooseExperience = first === 'choose-experience';
    if (needsExperience(session.user.profile, session.user.profileLoaded)) {
      if (!onChooseExperience) router.replace('/choose-experience' as Href);
      return;
    }
    if (onChooseExperience && !EXPERIENCES_ENABLED) {
      router.replace('/');
      return;
    }

    // Wait for the saved introduction state (read from the device).
    if (!onboarding.ready) return;

    // A new account's first visit: the interactive introduction first.
    // (Finished or skipped, it never comes back unless replayed.)
    if (needsOnboarding(session.user, onboarding.records)) {
      if (!onOnboarding) router.replace('/onboarding' as Href);
      return;
    }

    const onClassSelection = first === 'class-selection';
    const classSelection = readClassSelection(session.user.user_metadata);
    if (!classSelection) {
      if (!onClassSelection) router.replace('/class-selection' as Href);
      return;
    }
    if (onClassSelection) {
      router.replace(routes.learnEnvironment(classSelection));
      return;
    }
    // Authenticated on /login: send them to the app home.
    if (onLoginScreen) {
      router.replace('/');
    }
  }, [session, loading, segments, router, onboarding]);

  return <>{children}</>;
}

export default function TabLayout() {
  const [appShellReady, setAppShellReady] = useState(false);
  const isClient = useIsClient();
  const pageZoom = usePageZoomPreference();
  const fontSize = useFontSizePreference();

  // Web: fetch the display font once the app is running (never blocks paint).
  useEffect(() => {
    loadWebFonts();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.style.zoom = String(pageZoom / 100);
    }
  }, [pageZoom]);

  useEffect(() => {
    if (Platform.OS === 'web') applyWebFontScale(fontSize);
  }, [fontSize]);

  // Light / Dark from Settings ("System" follows the device).
  const scheme = useResolvedColorScheme();
  const colors = useTheme();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;

  // Navigation background matches GRATEAPEX surfaces, so no white
  // flashes appear behind screens in dark mode.
  const navigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
    },
  };

  return (
    <AuthProvider>
      <ThemeProvider value={navigationTheme}>
        {/* Dark icons only on the white Light theme */}
        <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />
        <AnimatedSplashOverlay appReady={appShellReady} />
        <View onLayout={() => setAppShellReady(true)} style={{ flex: 1 }}>
          {isClient ? (
            <AppGuard>
              <ExperienceSync />
              <AppTabs />
              <LearningSync />
              <CoinGiftSync />
              <AppUpdateWatcher />
              <ProfileCardHost />
              <AchievementWatcher />
              <DeviceNotificationBridge />
            </AppGuard>
          ) : (
            // Pre-rendered web HTML: just the shell and the page title, so
            // the first browser render matches it exactly (see useIsClient).
            <PageTitle />
          )}
        </View>
      </ThemeProvider>
    </AuthProvider>
  );
}
