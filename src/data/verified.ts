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

export const VERIFIED_USERNAMES: readonly string[] = ['prince', 'theapexhub', 'originate', 'robotnik', 'stbretro'];
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
      const spellings = usernameSpellings();
      const [users, scores] = await Promise.all(
        ['users', 'scores'].map((name) => getDocs(query(collection(db, name), where('username', 'in', spellings))).catch(() => null))
      );
      const uids = new Map<string, VerifiedTier>();
      for (const snap of [users, scores]) {
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
