import { usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { type LayoutChangeEvent, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LegacyIcon } from '@/components/experience/legacy-icon';
import { activeNavPath, MOBILE_NAV_ITEMS, NavIconView } from '@/components/nav-items';
import { useTabBarHidden } from '@/components/tab-bar-visibility';
import { webStyle } from '@/components/ui/web';
import { MOTION, SPRING } from '@/constants/motion';
import { elevation, TAB_BAR_HEIGHT, TAB_BAR_INSET, type ThemeColors } from '@/constants/theme';
import { useTabBarMode } from '@/data/navigation-settings';
import { useExperience } from '@/hooks/use-experience';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

const MAX_BAR_WIDTH = 520;

// Distance from the bottom of the window to the top of the bar, so other
// floating elements (the OrigiNate signature, toasts) can sit above it.
export function useTabBarClearance() {
  const insets = useSafeAreaInsets();
  return insets.bottom + TAB_BAR_INSET + TAB_BAR_HEIGHT;
}

/**
 * The mobile navigation: a floating bar in the thumb zone with a sliding
 * selection pill. Touch-first (no hover states), 44px+ targets, and it
 * slides away while reading when "Auto-hide" is selected in Settings.
 */
export function FloatingTabBar({ onNavigate }: { onNavigate: (route: string) => void }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const mode = useTabBarMode();
  const scrolledAway = useTabBarHidden();
  const hidden = mode === 'autoHide' && scrolledAway;

  const active = activeNavPath(pathname);
  const hybrid = useExperience() === 'hybrid';
  const activeIndex = MOBILE_NAV_ITEMS.findIndex((item) => item.path === active);
  const learnIndex = MOBILE_NAV_ITEMS.findIndex((item) => item.path === '/learn');

  const [barWidth, setBarWidth] = useState(0);
  const itemWidth = barWidth > 0 ? (barWidth - 8) / MOBILE_NAV_ITEMS.length : 0;

  const pillX = useSharedValue(0);
  const pillOpacity = useSharedValue(activeIndex >= 0 ? 1 : 0);
  const offset = useSharedValue(0);

  useEffect(() => {
    if (itemWidth <= 0) return;
    const x = Math.max(0, activeIndex) * itemWidth;
    pillX.value = reduceMotion ? x : withSpring(x, SPRING.snappy);
    pillOpacity.value = withTiming(activeIndex >= 0 ? 1 : 0, { duration: MOTION.micro });
  }, [activeIndex, itemWidth, pillX, pillOpacity, reduceMotion]);

  useEffect(() => {
    const distance = TAB_BAR_HEIGHT + TAB_BAR_INSET + insets.bottom + 24;
    offset.value = withTiming(hidden ? distance : 0, { duration: reduceMotion ? 0 : MOTION.standard });
  }, [hidden, insets.bottom, offset, reduceMotion]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: pillOpacity.value,
    transform: [{ translateX: pillX.value }],
  }));
  const barStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
  }));

  return (
    <Animated.View
      pointerEvents={hidden ? 'none' : 'box-none'}
      style={[styles.wrap, { bottom: insets.bottom + TAB_BAR_INSET }, barStyle]}
    >
      <View
        style={[styles.bar, elevation(colors, 3)]}
        onLayout={(event: LayoutChangeEvent) => setBarWidth(event.nativeEvent.layout.width)}
        accessibilityRole="tablist"
      >
        {itemWidth > 0 && activeIndex !== learnIndex ? <Animated.View style={[styles.pill, { width: itemWidth }, pillStyle]} /> : null}
        {MOBILE_NAV_ITEMS.map((item, index) => {
          const selected = item.path === active;
          const isLearn = index === learnIndex;
          return (
            <Pressable
              key={item.route}
              onPress={() => onNavigate(item.route)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={item.accessibilityLabel}
              style={({ pressed }) => [styles.item, isLearn && styles.learnItem, pressed && styles.itemPressed]}
            >
              {isLearn && hybrid ? (
                // Hybrid: The Originals' raised Study button and book icon.
                <View style={[styles.learnIcon, styles.learnHybrid, { borderColor: selected ? colors.accent : colors.surfaceElevated }, elevation(colors, 3)]}>
                  <LegacyIcon name="book" size={26} color={colors.onPrimary} />
                </View>
              ) : isLearn ? (
                <View style={[styles.learnIcon, elevation(colors, 3)]}>
                  <NavIconView icon={item.icon} color={colors.onPrimary} size={26} active />
                </View>
              ) : <NavIconView icon={item.icon} color={selected ? colors.navActive : colors.navInactive} size={22} active={selected} />}
              <Text style={[styles.label, selected && styles.labelActive, isLearn && styles.learnLabel]} numberOfLines={1}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      position: 'absolute',
      left: TAB_BAR_INSET,
      right: TAB_BAR_INSET,
      alignItems: 'center',
      zIndex: 40,
    },
    bar: {
      width: '100%',
      maxWidth: MAX_BAR_WIDTH,
      height: TAB_BAR_HEIGHT,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 4,
      borderRadius: 24,
      backgroundColor: colors.navSurface,
      borderWidth: 1,
      borderColor: colors.navBorder,
      ...webStyle({ backdropFilter: 'blur(18px) saturate(150%)', WebkitBackdropFilter: 'blur(18px) saturate(150%)' }),
      // No backdrop blur on native: a solid elevated surface keeps labels crisp.
      ...(Platform.OS !== 'web' ? { backgroundColor: colors.surfaceElevated } : null),
    },
    pill: {
      position: 'absolute',
      left: 4,
      top: 6,
      bottom: 6,
      borderRadius: 18,
      backgroundColor: colors.navActiveSubtle,
    },
    item: {
      flex: 1,
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      ...webStyle({ cursor: 'pointer', outlineStyle: 'none', WebkitTapHighlightColor: 'transparent' }),
    },
    learnItem: { overflow: 'visible', justifyContent: 'flex-end', paddingBottom: 7 },
    learnIcon: {
      position: 'absolute',
      top: -18,
      width: 56,
      height: 56,
      borderRadius: 28,
      borderWidth: 4,
      borderColor: colors.surfaceElevated,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    learnLabel: { paddingTop: 0 },
    learnHybrid: { width: 62, height: 62, borderRadius: 31, top: -24 },
    itemPressed: { transform: [{ scale: 0.94 }] },
    label: { fontSize: 10.5, fontWeight: '700', color: colors.navInactive, letterSpacing: 0.2 },
    labelActive: { color: colors.navActive },
  });
}
