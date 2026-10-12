import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { type NativeScrollEvent, type NativeSyntheticEvent, ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Interactive } from '@/components/ui/interactive';
import { VideoPlayer } from '@/components/ui/video-player';
import { type ThemeColors } from '@/constants/theme';
import { type CommunityPost, type PostMedia } from '@/data/community';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

/**
 * A post's photos and videos (up to 3), like Instagram: swipe between them on
 * a phone, use the arrows on a computer; dots show which one you're on.
 */
export function MediaCarousel({ items, height, fit = 'cover', rounded = true, onPress }: { items: readonly PostMedia[]; height: number; fit?: 'cover' | 'contain'; rounded?: boolean; onPress?: () => void }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const scroller = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  if (!items.length) return null;

  const go = (next: number) => {
    const target = Math.max(0, Math.min(items.length - 1, next));
    scroller.current?.scrollTo({ x: target * width, animated: true });
    setIndex(target);
  };
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!width) return;
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  };
  const slide = (item: PostMedia, at: number) =>
    item.type === 'video' ? (
      <VideoPlayer url={item.url} height={height} label={`Video ${at + 1} of ${items.length}`} />
    ) : (
      <Image source={{ uri: item.url }} contentFit={fit} style={[styles.image, { height }]} accessibilityLabel={`Photo ${at + 1} of ${items.length}`} />
    );

  return (
    <View style={styles.wrap} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <View style={[styles.frame, rounded && styles.rounded, { height }]}>
        <ScrollView ref={scroller} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={32} scrollEnabled={items.length > 1}>
          {items.map((item, at) => (
            <View key={`${item.url}-${at}`} style={{ width: width || 1, height }}>
              {onPress && item.type === 'image' ? <Interactive onPress={onPress} accessibilityRole="button" accessibilityLabel="Open post">{slide(item, at)}</Interactive> : slide(item, at)}
            </View>
          ))}
        </ScrollView>
        {items.length > 1 && index > 0 ? (
          <Interactive onPress={() => go(index - 1)} accessibilityRole="button" accessibilityLabel="Previous photo" style={[styles.arrow, styles.left]}>
            <Icon name="chevronLeft" size={16} color={colors.text} strokeWidth={2.4} />
          </Interactive>
        ) : null}
        {items.length > 1 && index < items.length - 1 ? (
          <Interactive onPress={() => go(index + 1)} accessibilityRole="button" accessibilityLabel="Next photo" style={[styles.arrow, styles.right]}>
            <Icon name="chevronRight" size={16} color={colors.text} strokeWidth={2.4} />
          </Interactive>
        ) : null}
      </View>
      {items.length > 1 ? (
        <View style={styles.dots} accessibilityLabel={`${index + 1} of ${items.length}`}>
          {items.map((item, at) => <View key={`${item.url}-dot-${at}`} style={[styles.dot, at === index && styles.dotOn]} />)}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { width: '100%', gap: 8 },
    frame: { width: '100%', overflow: 'hidden', backgroundColor: colors.surfaceMuted },
    rounded: { borderRadius: 14 },
    image: { width: '100%' },
    arrow: { position: 'absolute', top: '50%', marginTop: -15, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceElevated, opacity: 0.92 },
    left: { left: 10 },
    right: { right: 10 },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: 5 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.borderStrong },
    dotOn: { backgroundColor: colors.primary },
  });
}

/** A post's photos and videos (older posts only carry the first one). */
export function postMedia(post: CommunityPost): PostMedia[] {
  if (post.media_list?.length) return post.media_list;
  return post.media_url ? [{ type: post.media_type === 'video' ? 'video' : 'image', url: post.media_url }] : [];
}
