// Verified learners: a tick next to their name (like X), seen by everyone.
// Gold for the owner's gold list, blue for the blue list, and blue for anyone
// the original app verified (verified/{uid}, written only by admins under the
// deployed rules).
//
// Most places know a learner's uid but not their username (posts, comments,
// stories, chats), so the list's accounts are looked up once per session by
// username (users and scores, readable by every signed-in learner) and the
// tick is shown wherever that uid appears.
import { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';

export const VERIFIED_USERNAMES: readonly string[] = ['prince', 'theapexhub', 'originate', 'robotnik', 'stbretro', 'grate_apex', 'myuncletouchesme', 'grate_apex02', 'stickyfingers', 'retro', 'retr0', 'patricia_a', 'atu', 'grateapex_official', 'nate', 'echocircuitnkn07'];
export const BLUE_VERIFIED_USERNAMES: readonly string[] = ['bevelyn', 'amtul', 'akua'];

export type VerifiedTier = 'gold' | 'blue';

const normalise = (username: string) => username.trim().replace(/^@/, '').toLowerCase();

/** The tick a username gets from the owner's lists, if any. */
export function verifiedTierOf(username: string | null | undefined): VerifiedTier | null {
  if (!username) return null;
  const name = normalise(String(username));
  return VERIFIED_USERNAMES.includes(name) ? 'gold' : BLUE_VERIFIED_USERNAMES.includes(name) ? 'blue' : null;
}

export const isVerifiedUsername = (username: string | null | undefined) => verifiedTierOf(username) !== null;

/** Spellings a username may be stored with (Firestore `in` matches exactly). */
export function usernameSpellings(names: readonly string[] = [...VERIFIED_USERNAMES, ...BLUE_VERIFIED_USERNAMES]) {
  return [...new Set(names.flatMap((name) => [name, name[0].toUpperCase() + name.slice(1), name.toUpperCase()]))];
}

let listUids: Promise<Map<string, VerifiedTier>> | null = null;

/** The uids of the owner's verified usernames (one lookup per session). */
function verifiedListUids() {
  if (!listUids) {
    listUids = (async () => {
      await auth.authStateReady();
      if (!auth.currentUser) {
        listUids = null;
        return new Map<string, VerifiedTier>();
      }
      // Firestore 'in' takes up to 30 values, so the spellings are looked up in batches.
      const spellings = usernameSpellings();
      const batches = Array.from({ length: Math.ceil(spellings.length / 30) }, (_, index) => spellings.slice(index * 30, index * 30 + 30));
      const snaps = await Promise.all(
        ['users', 'scores'].flatMap((name) => batches.map((batch) => getDocs(query(collection(db, name), where('username', 'in', batch))).catch(() => null)))
      );
      const uids = new Map<string, VerifiedTier>();
      for (const snap of snaps) {
        for (const item of snap?.docs ?? []) {
          const tier = verifiedTierOf(item.data().username as string);
          if (tier && uids.get(item.id) !== 'gold') uids.set(item.id, tier);
        }
      }
      return uids;
    })();
  }
  return listUids;
}

const checked = new Map<string, Promise<VerifiedTier | null>>();

/** A learner's tick: from the owner's lists (by uid), or blue when the original app verified them. Cached per session. */
export function verifiedTierOfUid(uid: string) {
  let promise = checked.get(uid);
  if (!promise) {
    promise = verifiedListUids()
      .then(async (list) => list.get(uid) ?? ((await getDoc(doc(db, 'verified', uid)).then((snap) => snap.exists())) ? 'blue' : null))
      .catch(() => null);
    checked.set(uid, promise);
  }
  return promise;
}

export function useVerifiedTier(uid: string | null | undefined): VerifiedTier | null {
  const [verified, setVerified] = useState<{ uid: string; value: VerifiedTier | null } | null>(null);
  useEffect(() => {
    if (!uid) return;
    let live = true;
    void verifiedTierOfUid(uid).then((value) => { if (live) setVerified({ uid, value }); });
    return () => { live = false; };
  }, [uid]);
  return uid && verified?.uid === uid ? verified.value : null;
}

export type SuggestedAccount = { uid: string; username: string; displayName: string | null; avatarUrl: string | null; bio: string | null };

/** The gold-tick accounts, for "Suggested for you" after onboarding (not including you). */
export async function loadGoldAccounts(): Promise<SuggestedAccount[]> {
  await auth.authStateReady();
  const me = auth.currentUser?.uid;
  if (!me) return [];
  const spellings = usernameSpellings(VERIFIED_USERNAMES);
  const batches = Array.from({ length: Math.ceil(spellings.length / 30) }, (_, index) => spellings.slice(index * 30, index * 30 + 30));
  const snaps = await Promise.all(batches.map((batch) => getDocs(query(collection(db, 'users'), where('username', 'in', batch))).catch(() => null)));
  const seen = new Set<string>();
  const accounts: SuggestedAccount[] = [];
  for (const snap of snaps) {
    for (const item of snap?.docs ?? []) {
      const data = item.data();
      if (item.id === me || seen.has(item.id) || verifiedTierOf(data.username as string) !== 'gold') continue;
      seen.add(item.id);
      accounts.push({
        uid: item.id,
        username: String(data.username),
        displayName: typeof data.displayName === 'string' && data.displayName.trim() ? data.displayName.trim() : null,
        avatarUrl: data.avatar_url || data.photo || null,
        bio: typeof data.bio === 'string' && data.bio.trim() ? data.bio.trim() : null,
      });
    }
  }

  // @grateapex_official first, then the owner's order (the list above).
  const order = (name: string) => (name.toLowerCase() === 'grateapex_official' ? -1 : VERIFIED_USERNAMES.indexOf(name.toLowerCase()));
  return accounts.sort((a, b) => order(a.username) - order(b.username));
}
