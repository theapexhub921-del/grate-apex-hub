// Tab bar visibility: auto-hide on scroll (Settings → Navigation).
//
// - Phones / narrow web → the floating bottom bar slides away while the
//                          learner scrolls DOWN through content and comes
//                          back as soon as they scroll UP, reach the end of
//                          the page, or open another screen.
// - Desktop web         → the left rail has its own auto-hide (pointer at
//                          the left edge; components/desktop-sidebar.tsx).
//
// Screens spread `useTabBarScroll()` on their main ScrollView; the Screen
// primitive already does. "Always visible" ignores scrolling entirely.

import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useSyncExternalStore, type ReactNode } from 'react';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

// Below this offset the bar is always shown (top of the page).
const TOP_ZONE = 48;
// Ignore tiny jitters; only a deliberate scroll changes the state.
const THRESHOLD = 8;

let hidden = false;
let pageAtBottom = false;
const listeners = new Set<() => void>();

function setHidden(next: boolean) {
  if (hidden === next) return;
  hidden = next;
  listeners.forEach((listener) => listener());
}

export function showTabBar() {
  setHidden(false);
}

function setPageAtBottom(next: boolean) {
  if (pageAtBottom === next) return;
  pageAtBottom = next;
  listeners.forEach((listener) => listener());
}

export function usePageAtBottom() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => pageAtBottom,
    () => false
  );
}

/** True while the bar is scrolled away (the caller decides if auto-hide applies). */
export function useTabBarHidden() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => hidden,
    () => false
  );
}

// Kept so the shells' structure does not churn; the store above is global.
export function TabBarVisibilityProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

// Spread onto a screen's main ScrollView:
//   const tabBarScroll = useTabBarScroll();
//   <ScrollView {...tabBarScroll} …>
// Each screen remembers its own last position, so switching between
// screens (which keep their scroll position) never misreads a direction.
export function useTabBarScroll() {
  const lastY = useRef(0);
  const contentHeight = useRef(0);
  const viewportHeight = useRef(0);
  const isFocused = useRef(false);

  // Only the active screen updates the shared state. Inactive tabs can stay
  // mounted and must not overwrite the active page's scroll position.
  useFocusEffect(
    useCallback(() => {
      isFocused.current = true;
      const hasMeasurements = contentHeight.current > 0 && viewportHeight.current > 0;
      setPageAtBottom(
        hasMeasurements &&
          (contentHeight.current <= viewportHeight.current + 1 ||
            lastY.current + viewportHeight.current >= contentHeight.current - 32)
      );
      showTabBar();
      return () => {
        isFocused.current = false;
        setPageAtBottom(false);
      };
    }, [])
  );

  return useMemo(
    () => ({
      onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (!isFocused.current) return;
        const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
        const y = contentOffset.y;
        const atEnd = y + layoutMeasurement.height >= contentSize.height - 32;
        setPageAtBottom(atEnd);
        const dy = y - lastY.current;
        if (y < TOP_ZONE || atEnd) {
          setHidden(false);
          lastY.current = y;
        } else if (dy > THRESHOLD) {
          setHidden(true);
          lastY.current = y;
        } else if (dy < -THRESHOLD) {
          setHidden(false);
          lastY.current = y;
        }
      },
      onLayout: (event: LayoutChangeEvent) => {
        viewportHeight.current = event.nativeEvent.layout.height;
        if (isFocused.current && contentHeight.current > 0) {
          setPageAtBottom(
            contentHeight.current <= viewportHeight.current + 1 ||
              lastY.current + viewportHeight.current >= contentHeight.current - 32
          );
        }
      },
      onContentSizeChange: (_width: number, height: number) => {
        contentHeight.current = height;
        if (isFocused.current && viewportHeight.current > 0) {
          setPageAtBottom(
            height <= viewportHeight.current + 1 ||
              lastY.current + viewportHeight.current >= height - 32
          );
        }
      },
      scrollEventThrottle: 32,
    }),
    []
  );
}
