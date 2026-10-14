import { router, usePathname } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '@/components/ui/text';

import { LogoMark } from '@/components/logo-mark';
import { activeNavPath, NAV_ITEMS, NavIconView } from '@/components/nav-items';
import { Avatar } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { SidebarResizeHandle, useSidebarWidth } from '@/components/sidebar-resize';
import { webStyle } from '@/components/ui/web';
import { cssTransition, MOTION } from '@/constants/motion';
import { elevation, SIDEBAR_WIDTH, Type, type ThemeColors } from '@/constants/theme';
import { startOfDay } from '@/data/learning/time';
import { useNow } from '@/data/learning/use-learning';
import { useProgress } from '@/data/progress';
import { getRankProgress } from '@/data/ranks';
import { useAvatarUrl, useDisplayName } from '@/data/user';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

/**
 * GRATEAPEX desktop navigation rail.
 *
 * Docked ("Always visible" in Settings → Navigation): a full-height rail;
 * the content column is offset by SIDEBAR_WIDTH so nothing overlaps.
 *
 * Auto-hide: the rail waits off-screen and floats in over the page when
 * the pointer reaches the LEFT edge (like the Windows taskbar, on the
 * horizontal axis), when the edge handle is clicked, or when keyboard
 * focus enters it. Floating instead of pushing means the page never
 * jumps sideways.
 */

// How close to the left edge the pointer must get before the rail appears.
const REVEAL_ZONE_PX = 36;
// Grace period before hiding again, so it cannot flicker.
const HIDE_DELAY_MS = 600;
const FLOAT_INSET = 10;
/** The slim rail's width (auto-hide mode). */
export const COLLAPSED_WIDTH = 76;

export function DesktopSidebar({ docked }: { docked: boolean }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const railWidth = useSidebarWidth();
  const { height: viewportHeight } = useWindowDimensions();
  const pathname = usePathname();
  const active = activeNavPath(pathname);
  const railHeight = Math.max(0, viewportHeight - (docked ? 0 : FLOAT_INSET * 2));
  const navIconSize = Math.min(24, railHeight / (NAV_ITEMS.length * 2));

  const progress = useProgress();
  const displayName = useDisplayName();
  const avatarUrl = useAvatarUrl();
  const rank = getRankProgress(progress.xp);
  const now = useNow();
  const todayStart = startOfDay(now);
  const xpToday = progress.xpLedger.filter((entry) => entry.at >= todayStart).reduce((sum, entry) => sum + entry.amount, 0);

  const [revealed, setRevealed] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // In "Always show" (docked), the slim rail is always visible and widens on hover.
  // In "Auto-hide" (!docked), the rail stays completely hidden until the pointer approaches the left edge.
  const shown = docked || revealed;
  const collapsed = docked && !revealed;

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const reveal = useCallback(() => {
    clearTimer();
    setRevealed(true);
  }, []);

  const scheduleHide = useCallback(() => {
    clearTimer();
    timer.current = setTimeout(() => setRevealed(false), HIDE_DELAY_MS);
  }, []);

  // Pointer approaching the left edge reveals the sidebar in auto-hide mode;
  // leaving the rail hides it again.
  useEffect(() => {
    if (docked || Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onMove = (event: MouseEvent) => {
      if (event.clientX <= REVEAL_ZONE_PX) {
        reveal();
      } else if (revealed && event.clientX <= railWidth + FLOAT_INSET * 2) {
        clearTimer();
      } else if (revealed && !timer.current) {
        scheduleHide();
      }
    };
    document.addEventListener('mousemove', onMove);
    return () => {
      document.removeEventListener('mousemove', onMove);
      clearTimer();
    };
  }, [docked, revealed, reveal, scheduleHide, railWidth]);

  // Navigating from the floating rail tucks it away again.
  const go = (path: string) => {
    router.navigate(path as never);
    if (!docked) {
      clearTimer();
      setRevealed(false);
    }
  };

  return (
    <>
      {!docked && !shown ? (
        <View
          style={styles.revealTrigger}
          // @ts-expect-error web pointer enter
          onMouseEnter={reveal}
          aria-hidden="true"
        />
      ) : null}

      <View
        style={[
          styles.rail,
          { width: collapsed ? COLLAPSED_WIDTH : railWidth },
          docked ? styles.railDocked : styles.railFloating,
          docked && (collapsed ? styles.railDockedCollapsed : styles.railDockedExpanded),
          !docked && !shown && styles.railHidden,
          !docked && shown && elevation(colors, 3),
          collapsed && styles.railCollapsed,
          { pointerEvents: shown ? 'auto' : 'none' },
        ]}
        // Keyboard users: tabbing into the rail reveals it.
        onFocus={!docked ? reveal : undefined}
        onBlur={!docked ? scheduleHide : undefined}
        {...(!docked
          ? ({
              onMouseEnter: reveal,
              onMouseLeave: scheduleHide,
            } as object)
          : ({
              onMouseEnter: reveal,
              onMouseLeave: () => {
                clearTimer();
                timer.current = setTimeout(() => setRevealed(false), 200);
              },
            } as object))}
        role="navigation"
        aria-hidden={!shown}
      >
        <View style={styles.brandRow}>
          <LogoMark height={26} />
          {collapsed ? null : <Text style={styles.wordmark}>GrAte Apex Hub</Text>}
        </View>

        <View style={styles.navList}>
          {NAV_ITEMS.map((item) => {
            const selected = item.path === active;
            const isHovered = hovered === item.route;
            return (
              <Pressable
                key={item.route}
                onPress={() => go(item.path)}
                onHoverIn={() => setHovered(item.route)}
                onHoverOut={() => setHovered(null)}
                accessibilityRole="link"
                accessibilityLabel={item.accessibilityLabel}
                accessibilityState={{ selected }}
                tabIndex={shown ? 0 : -1}
                style={[styles.navItem, isHovered && styles.navItemHovered, selected && styles.navItemActive]}
              >
                {selected ? <View style={styles.activeBar} /> : null}
                <NavIconView icon={item.icon} color={selected ? colors.navActive : isHovered ? colors.text : colors.navInactive} size={navIconSize} active={selected} />
                {collapsed ? null : (
                  <Text style={[styles.navLabel, (selected || isHovered) && styles.navLabelActive]} numberOfLines={1}>
                    {item.label}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Today at a glance: real streak and XP. */}
        <View style={[styles.today, collapsed && styles.hiddenBlock]}>
          <View style={styles.todayItem}>
            <Icon name="streak" size={16} color={progress.streak > 0 ? colors.accent : colors.textTertiary} filled={progress.streak > 0} />
            <Text style={styles.todayText}>
              {progress.streak} day{progress.streak === 1 ? '' : 's'}
            </Text>
          </View>
          <View style={styles.todayItem}>
            <Icon name="xp" size={16} color={colors.accent} filled />
            <Text style={styles.todayText}>{xpToday >= 0 ? `+${xpToday}` : xpToday} XP today</Text>
          </View>
        </View>

        <View style={[styles.footer, collapsed && styles.footerCollapsed]}>
          <Pressable
            onPress={() => go('/profile')}
            accessibilityRole="link"
            accessibilityLabel="Your profile"
            tabIndex={shown ? 0 : -1}
            onHoverIn={() => setHovered('identity')}
            onHoverOut={() => setHovered(null)}
            style={[styles.identity, collapsed && styles.identitySlim, hovered === 'identity' && !collapsed && styles.navItemHovered]}
          >
            <Avatar uri={avatarUrl} name={displayName} size={34} ring="gold" />
            <View style={[styles.identityText, collapsed && styles.hiddenBlock]}>
              <Text style={styles.footerName} numberOfLines={1}>
                {displayName ? `Doc. ${displayName}` : 'Doc.'}
              </Text>
              <Text style={styles.footerRank} numberOfLines={1}>
                {rank ? rank.rank.name : 'Fresher'}
              </Text>
            </View>
          </Pressable>
          {collapsed ? null : <IconButton icon="settings" label="Settings" onPress={() => go('/settings')} size={36} />}
        </View>
      </View>
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    revealTrigger: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: REVEAL_ZONE_PX,
      zIndex: 29,
    },
    handleZone: {
      position: 'absolute',
      left: 0,
      top: '50%',
      marginTop: -48,
      width: 18,
      height: 96,
      justifyContent: 'center',
      zIndex: 29,
      ...webStyle({ cursor: 'pointer', ...cssTransition('opacity', MOTION.standard) }),
    },
    hidden: { opacity: 0 },
    hiddenBlock: { display: 'none' },
    railCollapsed: { paddingHorizontal: 10, alignItems: 'center' },
    handle: {
      marginLeft: 4,
      width: 4,
      height: 56,
      borderRadius: 2,
      backgroundColor: colors.accent,
      opacity: 0.55,
    },
    rail: {
      position: 'absolute',
      zIndex: 30,
      width: SIDEBAR_WIDTH,
      paddingTop: 20,
      paddingBottom: 14,
      paddingHorizontal: 12,
      ...webStyle({
        ...cssTransition('transform, opacity, width, background-color, box-shadow', MOTION.standard),
      }),
    },
    railDocked: {
      top: 0,
      bottom: 0,
      left: 0,
      borderRightWidth: 0,
      borderRightColor: 'transparent',
    },
    railDockedCollapsed: {
      backgroundColor: 'transparent',
      ...webStyle({
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
      }),
    },
    railDockedExpanded: {
      backgroundColor: colors.navSurface,
      borderTopRightRadius: 20,
      borderBottomRightRadius: 20,
      ...elevation(colors, 3),
      ...webStyle({
        backdropFilter: 'blur(20px) saturate(150%)',
        WebkitBackdropFilter: 'blur(20px) saturate(150%)',
      }),
    },
    railFloating: {
      top: FLOAT_INSET,
      bottom: FLOAT_INSET,
      left: FLOAT_INSET,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.navBorder,
      backgroundColor: colors.surfaceElevated,
      ...webStyle({
        backdropFilter: 'blur(20px) saturate(150%)',
        WebkitBackdropFilter: 'blur(20px) saturate(150%)',
      }),
    },
    railHidden: {
      opacity: 0,
      transform: [{ translateX: -(SIDEBAR_WIDTH + FLOAT_INSET * 2) }],
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      paddingHorizontal: 8,
      paddingBottom: 24,
    },
    wordmark: { fontSize: 16, fontWeight: '800', letterSpacing: 0.3, color: colors.logoLetters },
    navList: { flex: 1, gap: 4 },
    navItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: 44,
      paddingHorizontal: 12,
      borderRadius: 12,
      overflow: 'hidden',
      ...webStyle({ cursor: 'pointer', outlineStyle: 'none', ...cssTransition('background-color', MOTION.micro) }),
    },
    navItemHovered: { backgroundColor: colors.surfaceMuted },
    navItemActive: { backgroundColor: colors.navActiveSubtle },
    activeBar: {
      position: 'absolute',
      left: 0,
      top: 10,
      bottom: 10,
      width: 3,
      borderTopRightRadius: 3,
      borderBottomRightRadius: 3,
      backgroundColor: colors.accent,
    },
    navLabel: { fontSize: 14, fontWeight: '600', color: colors.navInactive },
    navLabelActive: { color: colors.text, fontWeight: '700' },
    today: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingHorizontal: 6,
      paddingBottom: 12,
    },
    todayItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: colors.surfaceMuted,
    },
    todayText: { ...Type.caption, fontWeight: '700', color: colors.textSecondary },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
    },
    footerCollapsed: {
      borderTopWidth: 0,
      borderTopColor: 'transparent',
      justifyContent: 'center',
    },
    identity: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 6,
      borderRadius: 12,
      ...webStyle({ cursor: 'pointer', outlineStyle: 'none' }),
    },
    // Slim rail: just the round picture.
    identitySlim: { flex: 0, padding: 0, borderRadius: 999, alignSelf: 'center' },
    identityText: { flex: 1, minWidth: 0 },
    footerName: { fontSize: 13, fontWeight: '700', color: colors.text },
    footerRank: { fontSize: 11, color: colors.textTertiary, marginTop: 1 },
  });
}
