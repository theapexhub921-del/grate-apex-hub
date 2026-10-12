import { Image } from 'expo-image';
import { Linking, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Interactive } from '@/components/ui/interactive';
import { Text } from '@/components/ui/text';
import { poster, safeUrl } from '@/lib/media-urls';

// Phones: shows the video's still frame; tapping plays it in the system player.
// (The web version, video-player.web.tsx, plays it inside the page.)
export function VideoPlayer({ url, height = 320, label = 'Video' }: { url: string; height?: number; autoPlay?: boolean; label?: string }) {
  return (
    <Interactive onPress={() => void Linking.openURL(url).catch(() => {})} accessibilityRole="button" accessibilityLabel={`Play ${label.toLowerCase()}`} style={[styles.frame, { height }]}>
      {safeUrl(url) ? <Image source={{ uri: poster(url) }} contentFit="cover" style={StyleSheet.absoluteFill} /> : null}
      <View style={styles.play}>
        <Icon name="play" size={24} color="#FFFFFF" filled />
        <Text style={styles.text}>Play</Text>
      </View>
    </Interactive>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', borderRadius: 14, overflow: 'hidden', backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  play: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.55)' },
  text: { color: '#FFFFFF', fontWeight: '700' },
});
