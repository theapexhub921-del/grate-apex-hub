import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { webStyle } from '@/components/ui/web';
import { SIDEBAR_WIDTH } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// The desktop sidebar's width, which the learner can change by dragging its
// right edge (the pointer turns into the double-headed resize arrow there).
// Remembered on this device. Both sidebars (Originate, The Originals) use it.

export const SIDEBAR_MIN = 200;
export const SIDEBAR_MAX = 380;
const KEY = 'grateapex_sidebar_width';

let width: number | null = null;
let loaded = false;
const listeners = new Set<() => void>();
const clamp = (value: number) => Math.round(Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, value)));

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!loaded) {
    loaded = true;
    AsyncStorage.getItem(KEY)
      .then((saved) => {
        const value = Number(saved);
        if (saved && Number.isFinite(value) && width === null) {
          width = clamp(value);
          listeners.forEach((l) => l());
        }
      })
      .catch(() => {});
  }
  return () => {
    listeners.delete(listener);
  };
}

export function setSidebarWidth(next: number, save = true) {
  width = clamp(next);
  listeners.forEach((l) => l());
  if (save) AsyncStorage.setItem(KEY, String(width)).catch(() => {});
}

/** The sidebar width in pixels (`fallback` until the learner resizes it). */
export function useSidebarWidth(fallback = SIDEBAR_WIDTH) {
  const value = useSyncExternalStore(subscribe, () => width, () => null);
  return value ?? fallback;
}

/**
 * A thin strip on the sidebar's right edge (web, mouse only): hover shows the
 * resize arrow and a line; dragging changes the width; double-click resets it.
 */
export function SidebarResizeHandle({ left = 0, fallback = SIDEBAR_WIDTH }: { left?: number; fallback?: number }) {
  const colors = useTheme();
  const current = useSidebarWidth(fallback);
  const [active, setActive] = useState(false);
  useEffect(() => () => {
    if (typeof document !== 'undefined') document.body.style.cursor = '';
  }, []);
  if (Platform.OS !== 'web') return null;

  const onMouseDown = (event: { clientX: number; preventDefault: () => void }) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = current;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    setActive(true);
    const move = (e: MouseEvent) => setSidebarWidth(startWidth + (e.clientX - startX), false);
    const up = (e: MouseEvent) => {
      setSidebarWidth(startWidth + (e.clientX - startX), true);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setActive(false);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const handlers = { onMouseDown, onDoubleClick: () => setSidebarWidth(fallback, true), onMouseEnter: () => setActive(true), onMouseLeave: () => setActive(false) } as object;
  return (
    <View
      {...handlers}
      accessibilityLabel="Drag to resize the sidebar"
      style={[styles.handle, { left: left + current - 4 }, webStyle({ cursor: 'col-resize', opacity: active ? 1 : 0 })]}
    >
      <View style={[styles.line, { backgroundColor: colors.primary }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  handle: { position: 'absolute', top: 0, bottom: 0, width: 8, zIndex: 35, alignItems: 'center', ...webStyle({ transition: 'opacity 120ms ease' }) },
  line: { width: 2, height: '100%' },
});
