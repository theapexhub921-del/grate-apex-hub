import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { PersonAvatar } from '@/components/social/profile-card';
import { VerifiedBadge } from '@/components/ui/verified-badge';
import { Interactive } from '@/components/ui/interactive';
import { Text } from '@/components/ui/text';
import { Type, type ThemeColors } from '@/constants/theme';
import { getRecommendedFriends, personName, sendFriendRequest, type SocialRecommendation } from '@/data/social';
import { useAvatarUrl, useDisplayName } from '@/data/user';
import { useAuth } from '@/hooks/use-auth';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { routes } from '@/lib/routes';

// Feed's right-hand column on wide screens (like other social apps): you,
// "Suggested for you" with Follow, and the small links.
export function FeedSideRail() {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const { user } = useAuth();
  const displayName = useDisplayName();
  const avatarUrl = useAvatarUrl();
  const username = typeof user?.profile?.username === 'string' ? user.profile.username : null;
  const [suggestions, setSuggestions] = useState<SocialRecommendation[] | null>(null);
  const [followed, setFollowed] = useState<readonly string[]>([]);

  useEffect(() => {
    let live = true;
    getRecommendedFriends()
      .then((people) => { if (live) setSuggestions(people.filter((person) => person.relationship !== 'friends' && person.relationship !== 'outgoing').slice(0, 5)); })
      .catch(() => { if (live) setSuggestions([]); });
    return () => { live = false; };
  }, []);

  async function follow(person: SocialRecommendation) {
    setFollowed((all) => [...all, person.userId]);
    try { await sendFriendRequest(person.userId); } catch { setFollowed((all) => all.filter((id) => id !== person.userId)); }
  }

  return (
    <View style={styles.rail}>
      <View style={styles.me}>
        <Interactive onPress={() => router.push('/profile' as Href)} accessibilityRole="link" accessibilityLabel="Your profile" style={styles.meLink}>
          <Avatar uri={avatarUrl} name={displayName} size={46} ring="gold" />
          <View style={styles.flex}>
            <View style={styles.nameRow}><Text style={styles.handle} numberOfLines={1}>{username ? username : displayName || 'You'}</Text><VerifiedBadge username={username} uid={user?.uid} size={14} /></View>
            <Text style={styles.sub} numberOfLines={1}>{displayName}</Text>
          </View>
        </Interactive>
        <Interactive onPress={() => router.push('/settings' as Href)} accessibilityRole="link" style={styles.textButton}>
          <Text style={[styles.link, { color: colors.primaryText }]}>Edit</Text>
        </Interactive>
      </View>

      <View style={styles.headRow}>
        <Text style={styles.heading}>Suggested for you</Text>
        <Interactive onPress={() => router.push('/social/friends' as Href)} accessibilityRole="link" style={styles.textButton}>
          <Text style={styles.seeAll}>See all</Text>
        </Interactive>
      </View>
      {suggestions === null ? <Text style={styles.sub}>Finding people…</Text> : null}
      {suggestions?.length === 0 ? <Text style={styles.sub}>No suggestions yet. Search for classmates in Connect.</Text> : null}
      {suggestions?.map((person) => {
        const done = followed.includes(person.userId);
        return (
          <View key={person.userId} style={styles.person}>
            <View style={styles.meLink}>
              <PersonAvatar uid={person.userId} uri={person.avatarUrl} name={personName(person)} size={36} />
              <Interactive onPress={() => router.push(routes.profile(person.userId))} accessibilityRole="link" accessibilityLabel={`View ${personName(person)}'s profile`} style={styles.flex}>
                <View style={styles.nameRow}><Text style={styles.personName} numberOfLines={1}>{person.username ?? personName(person)}</Text><VerifiedBadge username={person.username} uid={person.userId} size={13} /></View>
                <Text style={styles.sub} numberOfLines={1}>{person.reason ?? 'Suggested for you'}</Text>
              </Interactive>
            </View>
            <Interactive onPress={() => void follow(person)} disabled={done} accessibilityRole="button" accessibilityLabel={done ? 'Following' : `Follow ${personName(person)}`} style={styles.textButton}>
              <Text style={[styles.link, { color: done ? colors.textTertiary : colors.primaryText }]}>{done ? 'Following' : person.relationship === 'incoming' ? 'Follow back' : 'Follow'}</Text>
            </Interactive>
          </View>
        );
      })}

      <View style={styles.footer}>
        <Text style={styles.footerLinks}>
          {[
            ['About', '/explore'],
            ['Help', '/settings'],
            ['Privacy', '/privacy'],
            ['Terms', '/terms'],
          ].map(([label, href], index) => (
            <Text key={label}>
              {index ? ' · ' : ''}
              <Text style={styles.footerLink} onPress={() => router.push(href as Href)}>{label}</Text>
            </Text>
          ))}
        </Text>
        <Text style={styles.copyright}>© {new Date().getFullYear()} GRATE APEX HUB</Text>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    rail: { width: 320, gap: 14, paddingTop: 8 },
    flex: { flex: 1, minWidth: 0 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    me: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    meLink: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 },
    handle: { ...Type.headline, fontSize: 14.5, color: colors.text },
    sub: { fontSize: 12.5, color: colors.textSecondary },
    textButton: { paddingVertical: 6, paddingHorizontal: 4 },
    link: { fontSize: 13, fontWeight: '800' },
    headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
    heading: { fontSize: 14, fontWeight: '800', color: colors.textSecondary },
    seeAll: { fontSize: 12.5, fontWeight: '800', color: colors.text },
    person: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    personName: { fontSize: 13.5, fontWeight: '700', color: colors.text },
    footer: { gap: 10, marginTop: 14 },
    footerLinks: { fontSize: 12, lineHeight: 18, color: colors.textTertiary },
    footerLink: { color: colors.textTertiary },
    copyright: { fontSize: 11.5, letterSpacing: 0.4, color: colors.textTertiary },
  });
}
