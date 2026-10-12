import { useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Icon } from '@/components/ui/icon';
import { useTheme } from '@/hooks/use-theme';

/** True on phones and touch screens (phone browsers count as web, so check for touch). */
export const canSwipe = Platform.OS !== 'web' || (typeof window !== 'undefined' && ('ontouchstart' in window || (navigator.maxTouchPoints ?? 0) > 0));

/** Swipe right to reply (like WhatsApp). Used by chat messages and post comments. */
export function SwipeToReply({ children, onReply, enabled }: { children: React.ReactNode; onReply: () => void; enabled: boolean }) {
  const colors = useTheme();
  const x = useSharedValue(0);
  const start = useRef<{ x: number; y: number; locked: boolean | null } | null>(null);
  const [pulled, setPulled] = useState(false);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const hint = useAnimatedStyle(() => ({ opacity: Math.min(1, x.value / 50), transform: [{ scale: 0.6 + Math.min(0.4, x.value / 150) }] }));
  if (!enabled) return <View>{children}</View>;
  const point = (event: { nativeEvent: { touches?: ArrayLike<{ pageX: number; pageY: number }>; pageX?: number; pageY?: number } }) => {
    const touch = event.nativeEvent.touches?.[0];
    return { x: touch?.pageX ?? event.nativeEvent.pageX ?? 0, y: touch?.pageY ?? event.nativeEvent.pageY ?? 0 };
  };
  return (
    <View
      onTouchStart={(event) => { const p = point(event); start.current = { ...p, locked: null }; }}
      onTouchMove={(event) => {
        const s0 = start.current;
        if (!s0) return;
        const p = point(event);
        const dx = p.x - s0.x;
        const dy = p.y - s0.y;
        // Decide once: a sideways swipe (reply) or a vertical scroll.
        if (s0.locked === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) s0.locked = Math.abs(dx) > Math.abs(dy) && dx > 0;
        if (!s0.locked) return;
        const next = Math.max(0, Math.min(80, dx));
        x.set(next);
        if ((next > 55) !== pulled) setPulled(next > 55);
      }}
      onTouchEnd={() => {
        if (x.get() > 55) onReply();
        x.set(withSpring(0));
        start.current = null;
        setPulled(false);
      }}
      onTouchCancel={() => { x.set(withSpring(0)); start.current = null; setPulled(false); }}
    >
      <Animated.View style={[swipeStyles.hint, hint]} pointerEvents="none">
        <View style={[swipeStyles.hintCircle, { backgroundColor: pulled ? colors.primary : colors.surfaceMuted }]}>
          <Icon name="reply" size={16} color={pulled ? colors.onPrimary : colors.textSecondary} />
        </View>
      </Animated.View>
      <Animated.View style={style}>{children}</Animated.View>
    </View>
  );
}

const swipeStyles = StyleSheet.create({
  hint: { position: 'absolute', left: 4, top: 0, bottom: 0, justifyContent: 'center' },
  hintCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
