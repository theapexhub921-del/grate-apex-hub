import * as WebBrowser from 'expo-web-browser';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/interactive';
import { Text } from '@/components/ui/text';
import { Type, type ThemeColors } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { ATLAS_PAGE_DEPLOYED, atlasHash, atlasThemeVars } from '@/lib/atlas-theme';

// Where the atlas page is hosted for the phone apps (same address the app already uses for its API).
const SITE = process.env.EXPO_PUBLIC_API_BASE || 'https://grateapex.vercel.app';

// The 3D skeleton atlas (phone apps): opens the same viewer in the in-app browser, painted
// with the app's current theme. (The web version shows it inside the page: skeleton-atlas.web.tsx.)
export function SkeletonAtlas() {
  const colors = useTheme();
  const styles = useThemedStyles(createStyles);

  const open = () => {
    void WebBrowser.openBrowserAsync(`${SITE}${ATLAS_PAGE_DEPLOYED}${atlasHash(atlasThemeVars(colors))}`);
  };

  return (
    <Card style={styles.card}>
      <View style={styles.text}>
        <Text style={styles.title}>Skeleton atlas</Text>
        <Text style={styles.body}>
          Rotate a 3D skeleton, tap any bone to see its name and notes, then quiz yourself by region.
        </Text>
      </View>
      <Button label="Open atlas" onPress={open} accessibilityHint="Opens the 3D skeleton atlas" />
    </Card>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: { gap: 14 },
    text: { gap: 4 },
    title: { ...Type.title3, color: colors.text },
    body: { fontSize: 15, lineHeight: 22, color: colors.textSecondary },
  });
}
