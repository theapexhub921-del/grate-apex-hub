import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteUser, signOut } from 'firebase/auth';
import { deleteDoc, doc } from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';

// Firebase only deletes an account that signed in within the last 5 minutes
// (otherwise "auth/requires-recent-login"). Check this BEFORE deleting any
// data, so a refused final step never leaves a half-deleted account.
const RECENT_SIGN_IN_MS = 4 * 60 * 1000;

/**
 * Full deletion (profile, username, leaderboard entry, everything shared) needs a
 * trusted server with the admin key: server/account-deletion.mjs. It is used
 * only when its address is configured; until then the app deletes what the
 * rules allow (the login and private progress) and says so.
 */
export const ACCOUNT_DELETION_URL = process.env.EXPO_PUBLIC_ACCOUNT_DELETION_URL || '';
export const FULL_ACCOUNT_DELETION = Boolean(ACCOUNT_DELETION_URL);

const SIGN_IN_AGAIN =
  'For your security, please sign out, sign in again, and then delete your account within a few minutes.';

async function clearLocalCache(userId: string) {
  try {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys.filter((key) => key.includes(userId)));
  } catch {
    // Leftover cache is harmless
  }
}

export async function deleteMyAccount(): Promise<{ error: string | null }> {
  const user = auth.currentUser;
  if (!user) return { error: 'You are not signed in.' };
  const userId = user.uid;

  try {
    const { authTime, token } = await user.getIdTokenResult();
    if (!(Date.now() - Date.parse(authTime) < RECENT_SIGN_IN_MS)) return { error: SIGN_IN_AGAIN };

    if (FULL_ACCOUNT_DELETION) {
      // Everything, on the trusted server (server/account-deletion.mjs).
      const response = await fetch(ACCOUNT_DELETION_URL, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const body = (await response.json().catch(() => ({}))) as { deleted?: boolean; error?: string };
      if (!response.ok || !body.deleted) return { error: body.error || 'Your account could not be deleted. Please try again.' };
      await clearLocalCache(userId);
      await signOut(auth).catch(() => undefined);
      return { error: null };
    }

    // Private progress (the rules allow the owner to delete it). The
    // deployed rules refuse deletes of users/{uid}, scores/{uid} and
    // usernames/{name} from the app, so those stay until a trusted server
    // removes them — see docs/firestore-compatibility.md.
    await deleteDoc(doc(db, 'progress', userId));

    // Delete Firebase Auth user
    await deleteUser(user);

    await clearLocalCache(userId);

    return { error: null };
  } catch (error: any) {
    if (error?.code === 'auth/requires-recent-login') return { error: SIGN_IN_AGAIN };
    return { error: error?.message || 'Your account could not be deleted. Please try again.' };
  }
}
