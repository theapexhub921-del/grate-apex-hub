import Tabs from 'expo-router/js-tabs';
import { useSegments } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { Atmosphere } from '@/components/atmosphere/atmosphere';
import { OnlinePresenceSync } from '@/components/online-presence-sync';
import { useAtmosphereMood } from '@/components/atmosphere/config';
import { LegacyBackground } from '@/components/experience/legacy-background';
import { LegacyFloatingBar } from '@/components/experience/legacy-navigation';
import { FloatingTabBar } from '@/components/floating-tab-bar';
import { HomeGreetingWallpaper } from '@/components/social/home-greeting-wallpaper';
import { NAV_ITEMS } from '@/components/nav-items';
import { Signature } from '@/components/signature';
import { MOTION } from '@/constants/motion';
import { useExperience } from '@/hooks/use-experience';

// Navigation for Android and iOS (web has its own app-tabs.web.tsx, which
// moves these destinations into a left rail on desktop).
//
// Uses JS tabs because native tabs can only show routes that are
// visible tabs, which made the learning screens unreachable on Android.
// Routes with `href: null` are hidden from the tab bar but can still
// be opened through the learning flow.
//
// The five destinations and their order come from nav-items, shared with the
// web shell so the two can never drift apart.
export default function AppTabs() {
  const segments = useSegments();
  const mood = useAtmosphereMood();
  const reduceMotion = useReducedMotion();
  const experience = useExperience();

  // Unauthenticated screens (login, forgot password, set new password) must
  // not show the authenticated navigation. The auth guard already keeps
  // signed-out users on /login; this simply hides the shell around it.
  const isAuthRoute = ['login', 'onboarding', 'privacy', 'terms'].includes(segments[0] as string);
  const isWidgetRoute = segments[0] === 'widget';

  return (
    <View style={styles.shell}>
      <OnlinePresenceSync />
      {experience === 'originate' ? <Atmosphere mood={mood} /> : <LegacyBackground lively={mood === 'lively' || mood === 'expressive'} />}
      {(segments[0] as string | undefined) === 'index' && experience !== 'originals' ? <HomeGreetingWallpaper /> : null}
      <Tabs
        // Back (incl. Android back button) returns to the page you came from.
        backBehavior="history"
        tabBar={({ navigation }) =>
          isAuthRoute || isWidgetRoute ? null : experience === 'originals' ? (
            <LegacyFloatingBar onNavigate={(route) => navigation.navigate(route as never)} />
          ) : (
            <FloatingTabBar onNavigate={(route) => navigation.navigate(route as never)} />
          )
        }
        screenOptions={{
          headerShown: false,
          // Transparent screens let the atmosphere show through.
          sceneStyle: styles.scene,
          // Transparent screens: inactive ones fade out instead of relying on
          // an opaque background (instant under reduced motion).
          animation: 'fade',
          transitionSpec: { animation: 'timing', config: { duration: reduceMotion ? 0 : MOTION.standard - 40 } },
        }}
      >
        {/* Tab order: see MOBILE_NAV_ITEMS in nav-items.tsx */}
        {NAV_ITEMS.map((item) => (
          <Tabs.Screen key={item.route} name={item.route} options={{ title: item.label, tabBarAccessibilityLabel: item.accessibilityLabel }} />
        ))}

        {/* Hidden routes used for navigation */}
        <Tabs.Screen name="progress" options={{ href: null }} />
        <Tabs.Screen name="settings" options={{ href: null }} />
        <Tabs.Screen name="login" options={{ href: null }} />
        <Tabs.Screen name="onboarding" options={{ href: null }} />
        <Tabs.Screen name="choose-username" options={{ href: null }} />
        <Tabs.Screen name="achievements" options={{ href: null }} />
        <Tabs.Screen name="choose-experience" options={{ href: null }} />
        <Tabs.Screen name="privacy" options={{ href: null }} />
        <Tabs.Screen name="terms" options={{ href: null }} />
          <Tabs.Screen name="widget" options={{ href: null }} />
        <Tabs.Screen name="social/friends" options={{ href: null }} />
          <Tabs.Screen name="social/person" options={{ href: null }} />
          <Tabs.Screen name="suggested" options={{ href: null }} />
          <Tabs.Screen name="social/battle" options={{ href: null }} />
          <Tabs.Screen name="learn/hb-course" options={{ href: null }} />
          <Tabs.Screen name="learn/hb-lesson" options={{ href: null }} />
          <Tabs.Screen name="learn/hb-practice" options={{ href: null }} />
        <Tabs.Screen name="explore/discovery" options={{ href: null }} />
        <Tabs.Screen name="learn/anatomy" options={{ href: null }} />
        <Tabs.Screen name="learn/biochemistry" options={{ href: null }} />
        <Tabs.Screen name="learn/physiology" options={{ href: null }} />
        <Tabs.Screen name="learn/course" options={{ href: null }} />
        <Tabs.Screen name="learn/fatty-acid-biosynthesis" options={{ href: null }} />
        <Tabs.Screen name="learn/lesson" options={{ href: null }} />
        <Tabs.Screen name="learn/quiz" options={{ href: null }} />
        <Tabs.Screen name="learn/results" options={{ href: null }} />
        <Tabs.Screen name="learn/topic" options={{ href: null }} />
        <Tabs.Screen name="learn/review" options={{ href: null }} />
        <Tabs.Screen name="learn/apex" options={{ href: null }} />
        <Tabs.Screen name="learn/flashcards" options={{ href: null }} />
        <Tabs.Screen name="learn/tutor" options={{ href: null }} />
      </Tabs>
      {!isWidgetRoute ? <Signature aboveTabBar={!isAuthRoute} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  scene: { backgroundColor: 'transparent' },
});
