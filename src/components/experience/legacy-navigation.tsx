import { usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LEGACY_NAV, LegacyIcon } from '@/components/experience/legacy-icon';
import { useSidebarWidth } from '@/components/sidebar-resize';
import { useLegacyPalette } from '@/components/experience/use-legacy-palette';
import { useTheme, useUsesLegacyTheme } from '@/hooks/use-theme';
import { LogoMark } from '@/components/logo-mark';
import { activeNavPath, MOBILE_NAV_ITEMS, NAV_ITEMS } from '@/components/nav-items';
import { NotificationBell } from '@/components/notifications';
import { showTabBar, useTabBarHidden } from '@/components/tab-bar-visibility';
import { Avatar } from '@/components/ui/avatar';
import { VerifiedBadge } from '@/components/ui/verified-badge';
import { Text } from '@/components/ui/text';
import { webStyle } from '@/components/ui/web';
import { legacyRank } from '@/data/legacy-theme-colors';
import { useProgress } from '@/data/progress';
import { useAvatarUrl, useDisplayName } from '@/data/user';
import { useAuth } from '@/hooks/use-auth';

// The Originals' navigation, ported from the original app (screens/Tabs.tsx):
//   phones   — a floating pill with a raised Study button; only the active
//              tab shows its label; auto-hide leaves a small handle.
//   desktop  — a 250px sidebar with emoji destinations, the logo, the bell and
//              a "me" card; auto-hide collapses it to a 12px strip.
// Destinations and labels are this app's: Feed · Connect · Study · Explore · You.

/** The original app's desktop width (src/responsive.ts). */
export const LEGACY_DESKTOP_MIN = 1200;
/** The slim rail's width (auto-hide). */
const SLIM_WIDTH = 76;
/**
 * The original app's own navigation setting (users/{uid}.autoHideNav; off unless
 * the student turned it on), so The Originals behaves as it did — including for
 * students who set it in the original app.
 */
export function useOriginalAutoHide() {
  const { user } = useAuth();
  return user?.profile?.autoHideNav === true;
}

/** Room the original app kept below phone content for the floating bar. */
export const LEGACY_NAV_RESERVE = 96;

/**
 * The original navigation's colours, from the active theme: exactly the
 * original app's for a legacy theme; the same roles in a newer theme's colours.
 */
function useOriginalNavColors() {
  const colors = useTheme();
  const legacy = useLegacyPalette();
  const usesLegacy = useUsesLegacyTheme();
  return {
    border: colors.border,
    bar: colors.tabBar,
    side: colors.navSurface,
    // Solid behind the widened rail, so the page under it doesn't show through.
    solid: colors.surfaceElevated,
    primary: colors.primary,
    onPrimary: colors.onPrimary,
    accent: colors.accent,
    muted: colors.textTertiary,
    silver: colors.textSecondary,
    text: colors.text,
    card: colors.surface,
    // The raised Study button's ring when not selected.
    ring: usesLegacy ? (legacy.light ? '#ffffff' : '#0a1fa0') : colors.background,
  };
}

// Drives a 0..1 "shown" value: eases out when the nav appears, eases in when it hides.
function useNavProgress(visible: boolean, native: boolean) {
  const [p] = useState(() => new Animated.Value(visible ? 1 : 0));
  useEffect(() => {
    const anim = Animated.timing(p, {
      toValue: visible ? 1 : 0,
      duration: visible ? 320 : 240,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: native && Platform.OS !== 'web',
    });
    anim.start();
    return () => anim.stop();
  }, [visible, p, native]);
  return p;
}

export function LegacyFloatingBar({ onNavigate }: { onNavigate: (route: string) => void }) {
  const C = useOriginalNavColors();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const active = activeNavPath(pathname);
  const autoHide = useOriginalAutoHide();
  const scrolledAway = useTabBarHidden();
  const shown = !autoHide || !scrolledAway;
  const p = useNavProgress(shown, true);

  return (
    <View pointerEvents="box-none" style={[styles.barWrap, { bottom: 14 + insets.bottom }]}>
      {/* Collapsed handle: fades in as the bar slides away. */}
      <Animated.View pointerEvents={shown ? 'none' : 'auto'} style={[StyleSheet.absoluteFill, { opacity: p.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
        <TouchableOpacity onPress={showTabBar} accessibilityRole="button" accessibilityLabel="Show navigation" style={styles.handleTouch}>
          <View style={[styles.handle, { backgroundColor: C.muted }]} />
        </TouchableOpacity>
      </Animated.View>
      <Animated.View
        pointerEvents={shown ? 'box-none' : 'none'}
        style={{
          width: '100%',
          alignItems: 'center',
          opacity: p,
          transform: [
            { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [90, 0] }) },
            { scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
          ],
        }}
      >
        <View
          accessibilityRole="tablist"
          style={[styles.bar, { borderColor: C.border, backgroundColor: C.bar }]}
        >
          {MOBILE_NAV_ITEMS.map((item) => {
            const focused = item.path === active;
            const go = () => {
              if (!focused) onNavigate(item.route);
            };
            if (item.path === '/learn') {
              return (
                <View key={item.route} style={styles.studySlot}>
                  <TouchableOpacity
                    onPress={go}
                    activeOpacity={0.85}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: focused }}
                    accessibilityLabel={item.label}
                    style={[styles.study, { backgroundColor: C.primary, borderColor: focused ? C.accent : C.ring }]}
                  >
                    <LegacyIcon name="book" size={26} color={C.onPrimary} />
                  </TouchableOpacity>
                </View>
              );
            }
            return (
              <TouchableOpacity key={item.route} onPress={go} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={item.label} style={styles.barItem}>
                <LegacyIcon name={LEGACY_NAV[item.path].icon} size={24} color={focused ? C.accent : C.muted} />
                {focused ? <Text style={[styles.barLabel, { color: C.accent }]}>{item.label}</Text> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}

export function LegacySidebar({ onNavigate }: { onNavigate: (route: string) => void }) {
  const C = useOriginalNavColors();
  const pathname = usePathname();
  const active = activeNavPath(pathname);
  const { user } = useAuth();
  const progress = useProgress();
  const displayName = useDisplayName();
  const avatarUrl = useAvatarUrl();
  const rank = legacyRank(progress.xp);
  const username = typeof user?.profile?.username === 'string' ? user.profile.username : displayName;

  const autoHide = useOriginalAutoHide();
  const [hovered, setHovered] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const visible = !autoHide || hovered;
  const collapsed = autoHide && !hovered;
  const sideWidth = useSidebarWidth(250);
  const p = useNavProgress(visible, false); // width can't use the native driver

  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  const hoverProps = {
    onMouseEnter: () => {
      setHovered(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    onMouseLeave: () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setHovered(false), 180);
    },
  } as object;


  return (
    // Auto-hide (Instagram-style): a slim emoji rail that widens over the page
    // while the pointer is on it. Always visible: the full sidebar beside the page.
    <View style={{ width: autoHide ? SLIM_WIDTH : sideWidth, height: '100%', zIndex: 20 }}>
    <Animated.View {...hoverProps} style={[styles.sideShell, { backgroundColor: autoHide && visible ? C.solid : C.side, borderRightColor: C.border, width: autoHide ? p.interpolate({ inputRange: [0, 1], outputRange: [SLIM_WIDTH, sideWidth] }) : sideWidth }, autoHide && styles.overlay]}>
      <View style={[styles.sideInner, { width: '100%' }, collapsed && styles.sideInnerSlim]}>
        <View style={styles.brand}>
          <View style={styles.brandLogo}>
            <LogoMark height={30} />
          </View>
          {collapsed ? null : (
            <>
              <View style={{ flex: 1 }}>
                <Text style={[styles.brandName, { color: C.text }]}>GrAte Apex Hub</Text>
              </View>
              <NotificationBell />
            </>
          )}
        </View>
        <View style={{ marginTop: 18 }} accessibilityRole="tablist">
          {NAV_ITEMS.map((item) => {
            const focused = item.path === active;
            const hover = hoveredItem === item.path;
            return (
              <Pressable
                key={item.route}
                onPress={() => {
                  if (!focused) onNavigate(item.route);
                }}
                onHoverIn={() => setHoveredItem(item.path)}
                onHoverOut={() => setHoveredItem(null)}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={item.accessibilityLabel}
                style={({ pressed }) => [
                  styles.item,
                  focused && { backgroundColor: C.card, borderColor: C.border },
                  hover && { borderColor: C.accent, transform: [{ translateY: -1 }] },
                  pressed && { opacity: 0.85 },
                  webStyle({ cursor: 'pointer' }),
                ]}
              >
                <Text style={styles.itemIcon}>{LEGACY_NAV[item.path].emoji}</Text>
                {collapsed ? null : <Text style={[styles.itemLabel, { color: focused ? C.accent : C.silver }]}>{item.label}</Text>}
              </Pressable>
            );
          })}
        </View>
        <View style={{ flex: 1 }} />
        <View style={[styles.me, collapsed ? styles.meSlim : { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={{ marginRight: collapsed ? 0 : 10 }}>
            <Avatar uri={avatarUrl} name={displayName} size={38} />
          </View>
          <View style={[{ flex: 1 }, collapsed && styles.hidden]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={[styles.meName, { color: C.text }]} numberOfLines={1}>
              @{username}
            </Text>
            <VerifiedBadge username={username} uid={user?.uid} size={13} />
            </View>
            <Text style={[styles.meSub, { color: C.muted }]}>
              Lv {rank.level} · {rank.title}
              {progress.streak ? `  🔥${progress.streak}` : ''}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  barWrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center', height: 66, justifyContent: 'center', zIndex: 40 },
  handleTouch: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 60, height: 6, borderRadius: 3, opacity: 0.3 },
  bar: { flexDirection: 'row', alignItems: 'center', height: 66, width: '100%', maxWidth: 520, borderRadius: 30, borderWidth: 1, paddingHorizontal: 6 },
  studySlot: { flex: 1, alignItems: 'center' },
  study: { width: 62, height: 62, borderRadius: 31, marginTop: -30, alignItems: 'center', justifyContent: 'center', borderWidth: 4 },
  barItem: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 66 },
  barLabel: { fontSize: 11.5, fontWeight: '700', marginTop: 3 },

  sideShell: { overflow: 'hidden', borderRightWidth: 1, height: '100%', zIndex: 2 },
  sideHandleWrap: { position: 'absolute', left: 3, top: 0, bottom: 0, justifyContent: 'center' },
  sideHandle: { width: 6, height: 40, borderRadius: 3, opacity: 0.3 },
  overlay: { position: 'absolute', left: 0, top: 0, bottom: 0, ...webStyle({ boxShadow: '0px 10px 40px rgba(0,0,0,0.25)' }) },
  sideInnerSlim: { paddingHorizontal: 10, alignItems: 'center' },
  // Slim rail: just the round picture, no card around it.
  meSlim: { padding: 0, justifyContent: 'center', borderWidth: 0, backgroundColor: 'transparent' },
  hidden: { display: 'none' },
  sideInner: { width: 249, flex: 1, paddingHorizontal: 16, paddingVertical: 22 },
  brand: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 },
  brandLogo: { marginRight: 12 },
  brandName: { fontSize: 15, fontWeight: '800' },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, marginBottom: 6, borderWidth: 1, borderColor: 'transparent' },
  itemIcon: { fontSize: 20, width: 34 },
  itemLabel: { fontSize: 15, fontWeight: '600' },
  me: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 1 },
  meName: { fontWeight: '700', fontSize: 14 },
  meSub: { fontSize: 11.5, marginTop: 1 },
});
