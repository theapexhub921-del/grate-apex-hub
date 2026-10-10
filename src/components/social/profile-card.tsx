import { router, type Href } from 'expo-router';
import { type ReactNode, useEffect, useState, useSyncExternalStore } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Interactive } from '@/components/ui/interactive';
import { Pill } from '@/components/ui/pill';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { VerifiedBadge } from '@/components/ui/verified-badge';
import { Type, type ThemeColors } from '@/constants/theme';
import { legacyRank } from '@/data/legacy-theme-colors';
import { getPublicProfile, type PublicProfile, sendFriendRequest, unfollowLearner } from '@/data/social';
import { useAuth } from '@/hooks/use-auth';
import { useThemedStyles } from '@/hooks/use-theme';
import { db } from '@/lib/firebase';
import { routes } from '@/lib/routes';

// Tap anyone's profile picture → their profile card (like other social apps):
// picture, name with the gold tick, posts / followers / following, level and
// rank, bio, and Follow · Message · View profile. One card for the whole app,
// mounted once in the root layout.

let openUid: string | null = null;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const setOpen = (uid: string | null) => { openUid = uid; listeners.forEach((listener) => listener()); };

/** Opens a learner's profile card (your own picture opens your profile). */
export function openProfileCard(uid: string | null | undefined) {
  if (!uid) return;
  setOpen(uid);
}

const pictures = new Map<string, Promise<string | null>>();

/** A learner's profile picture from their account (cached), for places that only know their uid. */
function pictureOf(uid: string) {
  let promise = pictures.get(uid);
  if (!promise) {
    promise = getDoc(doc(db, 'users', uid))
      .then((snap) => (snap.data()?.avatar_url as string) || (snap.data()?.photo as string) || null)
      .catch(() => null);
    pictures.set(uid, promise);
  }
  return promise;
}

type AvatarProps = Parameters<typeof Avatar>[0];

/** Someone's profile picture that opens their profile card when tapped. */
export function PersonAvatar({ uid, ...avatar }: AvatarProps & { uid: string | null | undefined }) {
  const { user } = useAuth();
  const [fetched, setFetched] = useState<{ uid: string; uri: string | null } | null>(null);
  const needsPicture = Boolean(uid && !avatar.uri);
  useEffect(() => {
    if (!uid || !needsPicture) return;
    let live = true;
    void pictureOf(uid).then((uri) => { if (live) setFetched({ uid, uri }); });
    return () => { live = false; };
  }, [uid, needsPicture]);
  const uri = avatar.uri ?? (fetched && fetched.uid === uid ? fetched.uri : null);
  if (!uid) return <Avatar {...avatar} />;
  const mine = uid === user?.uid;
  return (
    <Interactive
      onPress={() => (mine ? router.push('/profile' as Href) : openProfileCard(uid))}
      accessibilityRole="button"
      accessibilityLabel={mine ? 'Your profile' : `${avatar.name ?? 'Learner'}'s profile card`}
      style={styles0.press}
    >
      <Avatar {...avatar} uri={uri} />
    </Interactive>
  );
}

const styles0 = StyleSheet.create({ press: { borderRadius: 999 } });

export function ProfileCardHost() {
  const uid = useSyncExternalStore(subscribe, () => openUid, () => null);
  return <ProfileCardSheet uid={uid} onClose={() => setOpen(null)} />;
}

function ProfileCardSheet({ uid, onClose }: { uid: string | null; onClose: () => void }) {
  const styles = useThemedStyles(createStyles);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!uid) return;
    let live = true;
    queueMicrotask(() => { if (live) { setProfile(null); setError(null); } });
    getPublicProfile(uid)
      .then((value) => { if (live) setProfile(value); })
      .catch((problem) => { if (live) setError(problem instanceof Error ? problem.message : 'This profile could not be loaded.'); });
    return () => { live = false; };
  }, [uid]);

  const shown = profile && profile.userId === uid ? profile : null;
  const name = shown ? shown.displayName || shown.username || 'Learner' : 'Learner';
  const rank = shown?.totalXp != null ? legacyRank(shown.totalXp) : null;
  const friends = Boolean(shown?.iFollow && shown?.followsMe);

  async function toggleFollow() {
    if (!shown || busy) return;
    setBusy(true);
    try {
      if (shown.iFollow) await unfollowLearner(shown.userId);
      else await sendFriendRequest(shown.userId);
      setProfile(await getPublicProfile(shown.userId));
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'That did not work. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function go(href: Href) {
    onClose();
    router.push(href);
  }

  return (
    <Sheet visible={uid !== null} onClose={onClose} title="Profile" width={420}>
      {!shown && !error ? <Text style={styles.muted}>Loading profile…</Text> : null}
      {error && !shown ? <Text style={styles.error}>{error}</Text> : null}
      {shown ? (
        <View style={styles.card}>
          <Interactive onPress={() => go(routes.profile(shown.userId))} accessibilityRole="link" accessibilityLabel={`Open ${name}'s full profile`} style={styles.top}>
            <Avatar uri={shown.avatarUrl} name={name} size={84} ring="gold" />
            <View style={styles.nameRow}>
              <Text style={styles.username} numberOfLines={1}>{shown.username ?? name}</Text>
              <VerifiedBadge username={shown.username} uid={shown.userId} size={18} />
            </View>
            {shown.username && shown.displayName && shown.displayName !== shown.username ? <Text style={styles.muted}>{shown.displayName}</Text> : null}
            {friends ? <Pill label="Friends" tone="success" /> : shown.followsMe ? <Pill label="Follows you" tone="primary" /> : null}
          </Interactive>
          <View style={styles.counts}>
            <Count label="posts" value={shown.posts} />
            <Count label="followers" value={shown.followers} />
            <Count label="following" value={shown.following} />
          </View>
          {shown.classLabel || rank ? (
            <Text style={styles.meta}>{[shown.classLabel, rank ? `Level ${rank.level} · ${rank.title}` : null, shown.totalXp != null ? `${shown.totalXp.toLocaleString()} XP` : null].filter(Boolean).join(' · ')}</Text>
          ) : null}
          {shown.bio ? <Text style={styles.bio}>{shown.bio}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Button label={shown.iFollow ? 'Following' : shown.followsMe ? 'Follow back' : 'Follow'} variant={shown.iFollow ? 'secondary' : 'primary'} size="sm" loading={busy} onPress={() => void toggleFollow()} />
            {friends ? <Button label="Message" variant="secondary" size="sm" onPress={() => go({ pathname: '/social/message', params: { friend: shown.userId, name } } as never)} /> : null}
            <Button label="View profile" variant="ghost" size="sm" onPress={() => go(routes.profile(shown.userId))} />
          </View>
        </View>
      ) : null}
    </Sheet>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.count}>
      <Text style={styles.countValue}>{value.toLocaleString()}</Text>
      <Text style={styles.countLabel}>{label}</Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: { gap: 14, alignItems: 'center', paddingBottom: 6 },
    top: { alignItems: 'center', gap: 8, borderRadius: 16, paddingHorizontal: 8 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    username: { ...Type.title3, color: colors.text },
    muted: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
    counts: { flexDirection: 'row', justifyContent: 'center', gap: 28 },
    count: { alignItems: 'center' },
    countValue: { fontSize: 17, fontWeight: '800', color: colors.text },
    countLabel: { fontSize: 12.5, color: colors.textSecondary },
    meta: { fontSize: 13, color: colors.textTertiary, textAlign: 'center' },
    bio: { fontSize: 14, lineHeight: 21, color: colors.text, textAlign: 'center' },
    actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
    error: { fontSize: 13, color: colors.error, textAlign: 'center' },
  });
}

/** Someone's name (or any row content) that opens their profile card when tapped. */
export function PersonLink({ uid, label, style, children }: { uid: string | null | undefined; label?: string; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const { user } = useAuth();
  if (!uid) return <View style={style}>{children}</View>;
  const mine = uid === user?.uid;
  return (
    <Interactive onPress={() => (mine ? router.push('/profile' as Href) : openProfileCard(uid))} accessibilityRole="button" accessibilityLabel={mine ? 'Your profile' : `${label ?? 'Learner'}'s profile card`} style={style}>
      {children}
    </Interactive>
  );
}
