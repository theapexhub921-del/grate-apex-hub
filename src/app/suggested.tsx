import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { openProfileCard, PersonAvatar } from '@/components/social/profile-card';
import { Button } from '@/components/ui/button';
import { Card, Interactive } from '@/components/ui/interactive';
import { LoadingState } from '@/components/ui/state-views';
import { PageHeader, Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { VerifiedBadge } from '@/components/ui/verified-badge';
import { Type, type ThemeColors } from '@/constants/theme';
import { refreshSocial, sendFriendRequest, useSocial } from '@/data/social';
import { loadGoldAccounts, type SuggestedAccount } from '@/data/verified';
import { useThemedStyles } from '@/hooks/use-theme';

// Shown once, right after the introduction: the gold-tick accounts to follow.
export default function SuggestedScreen() {
  const styles = useThemedStyles(createStyles);
  const social = useSocial();
  const [accounts, setAccounts] = useState<SuggestedAccount[] | null>(null);
  const [followed, setFollowed] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void loadGoldAccounts().then((list) => { if (live) setAccounts(list); }).catch(() => { if (live) setAccounts([]); });
    return () => { live = false; };
  }, []);

  const following = (uid: string) => followed.includes(uid) || social.people.some((person) => person.userId === uid && (person.relationship === 'friends' || person.relationship === 'outgoing'));

  async function follow(uids: string[]) {
    setError(null);
    for (const uid of uids) {
      setBusy(uid);
      try {
        await sendFriendRequest(uid);
        setFollowed((list) => [...list, uid]);
      } catch (problem) {
        setError(problem instanceof Error ? problem.message : 'Could not follow right now.');
      }
    }
    setBusy(null);
    void refreshSocial();
  }

  const left = (accounts ?? []).filter((account) => !following(account.uid)).map((account) => account.uid);

  return (
    <Screen width="prose">
      <PageHeader eyebrow="WELCOME TO GRATE APEX" title="Suggested for you" subtitle="Follow official and verified accounts for updates, tips and study help." />
      {accounts === null ? <LoadingState /> : null}
      {accounts && accounts.length > 1 && left.length ? <Button label={`Follow all (${left.length})`} variant="secondary" loading={busy !== null} onPress={() => void follow(left)} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.list}>
        {(accounts ?? []).map((account) => {
          const name = account.displayName ?? `@${account.username}`;
          const on = following(account.uid);
          return (
            <Card key={account.uid} style={styles.row}>
              <Interactive onPress={() => openProfileCard(account.uid)} accessibilityRole="button" accessibilityLabel={`View ${name}`} style={styles.who}>
                <PersonAvatar uid={account.uid} uri={account.avatarUrl} name={name} size={48} ring="gold" />
                <View style={styles.text}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>{name}</Text>
                    <VerifiedBadge username={account.username} uid={account.uid} size={15} />
                  </View>
                  <Text style={styles.handle} numberOfLines={1}>@{account.username}</Text>
                  {account.bio ? <Text style={styles.bio} numberOfLines={2}>{account.bio}</Text> : null}
                </View>
              </Interactive>
              <Button label={on ? 'Following' : 'Follow'} size="sm" variant={on ? 'secondary' : 'primary'} disabled={on} loading={busy === account.uid} onPress={() => void follow([account.uid])} />
            </Card>
          );
        })}
        {accounts && !accounts.length ? <Text style={styles.bio}>No suggestions right now. You can find classmates any time in Connect.</Text> : null}
      </View>
      <Button label="Continue to GrAte Apex" trailing="→" onPress={() => router.replace('/')} />
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    list: { gap: 10 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    who: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
    text: { flex: 1, minWidth: 0, gap: 2 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    name: { ...Type.headline, color: colors.text, flexShrink: 1 },
    handle: { fontSize: 13, color: colors.textSecondary },
    bio: { fontSize: 13, lineHeight: 18, color: colors.textSecondary },
    error: { fontSize: 13, color: colors.error },
  });
}
