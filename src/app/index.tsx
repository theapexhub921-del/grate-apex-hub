import { router } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '@/components/ui/text';

import { ApexCoinButton } from '@/components/apex-coin-button';
import { LogoMark } from '@/components/logo-mark';
import { SocialActivityFeed } from '@/components/social/supabase-social-feed';
import { CommunityPostsFeed } from '@/components/social/community-posts-feed';
import { FeedSideRail } from '@/components/social/feed-side-rail';
import { NotificationBell } from '@/components/notifications';
import { IconButton } from '@/components/ui/icon-button';
import { Screen } from '@/components/ui/screen';
import { Type, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-theme';

// Feed is the social front door: people's stories and posts. Course progress,
// planning and review live in Study; rank and goals in You.
export default function HomeScreen() {
  const styles = useThemedStyles(createStyles);
  const wide = useWindowDimensions().width >= 1100;

  return (
    <Screen width="wide">
      <View style={[styles.feedColumn, wide && styles.feedColumnWide]}>
      <View style={styles.header}>
        <View style={styles.brand}>
          <LogoMark height={30} />
        </View>
        <View style={styles.headerActions}>
          <NotificationBell />
          <ApexCoinButton />
          <IconButton icon="settings" label="Settings" onPress={() => router.push('/settings')} />
        </View>
      </View>

      {/* Feed is people's posts: stories and community posts only. Rank is in
          You, "Your week" in Study, personal goals in Study and You. */}
      {/* Like other social apps: stories across the top, posts down the middle,
          and on wide screens you and suggested people on the right. */}
      <View style={wide ? styles.row : null}>
        <View style={[styles.socialFeed, wide && styles.center]}>
          <SocialActivityFeed showActivity={false}>
            <CommunityPostsFeed />
          </SocialActivityFeed>
        </View>
        {wide ? <FeedSideRail /> : null}
      </View>

      <Text style={styles.motto}>Reach the Apex of GrAteness</Text>
      </View>
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
    brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    feedColumn: { width: '100%', maxWidth: 760, alignSelf: 'center' },
    feedColumnWide: { maxWidth: 1040 },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: 56 },
    center: { flex: 1, maxWidth: 640, minWidth: 0 },
    socialFeed: { width: '100%' },
    motto: { textAlign: 'center', ...Type.overline, letterSpacing: 1.6, color: colors.textTertiary, marginTop: 28 },
  });
}
