// Full account deletion — runs on a TRUSTED SERVER with the Firebase admin key
// (the deployed Firestore rules don't let the app delete users/{uid},
// scores/{uid} or usernames/{name}). NOT deployed: see "Enabling" below.
//
// What it removes for the requesting learner (and nothing of anyone else's):
//   users/{uid} with every subcollection · usernames/* owned by them ·
//   scores/{uid} · progress/{uid} with attempts and completions · their follows
//   (both directions) · their posts (with likes/replies) · their likes and
//   replies on other posts (counters kept right) · their group memberships
//   (groups they own are deleted) · messages they sent in groups and chats ·
//   finally the Auth account itself.
// Order: data first, login last — if anything fails, the request can simply be
// sent again (every step is safe to repeat).
// Not removed: files on Cloudinary (the unsigned preset can't delete; the
// Cloudinary admin API would need its API secret) and the anonymous Question
// of the Day tallies.
//
// Enabling (owner's approval needed — it is a server-side function):
//   1. A service-account key for grate-apex, set as a server-only secret
//      (e.g. Vercel env FIREBASE_SERVICE_ACCOUNT, never EXPO_PUBLIC_*).
//   2. A tiny route, e.g. api/delete-account.mjs:
//        import { cert, getApps, initializeApp } from 'firebase-admin/app';
//        import { getAuth } from 'firebase-admin/auth';
//        import { FieldValue, getFirestore } from 'firebase-admin/firestore';
//        import { handleAccountDeletion } from '../server/account-deletion.mjs';
//        const app = getApps()[0] ?? initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
//        export default async function handler(req, res) {
//          if (req.method !== 'POST') return res.status(405).end();
//          const { status, body } = await handleAccountDeletion(req.headers.authorization, { auth: getAuth(app), db: getFirestore(app), FieldValue });
//          res.status(status).json(body);
//        }
//   3. Firestore collection-group indexes (single field, ascending) for
//      likes.username and replies.authorUid — Firestore asks for them with a
//      link the first time; the emulator doesn't need them.
//   4. EXPO_PUBLIC_ACCOUNT_DELETION_URL=https://<site>/api/delete-account in the
//      app's build settings — the app then uses it (src/lib/account.ts).

const RECENT_SIGN_IN_SECONDS = 5 * 60;

/** Verifies the request and deletes the account. Returns { status, body } for any HTTP framework. */
export async function handleAccountDeletion(authorization, deps, now = Date.now()) {
  const token = typeof authorization === 'string' && authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return { status: 401, body: { error: 'Sign in again, then try deleting your account.' } };
  let decoded;
  try {
    decoded = await deps.auth.verifyIdToken(token, true); // also refuses revoked tokens
  } catch {
    return { status: 401, body: { error: 'Sign in again, then try deleting your account.' } };
  }
  if (now / 1000 - Number(decoded.auth_time || 0) > RECENT_SIGN_IN_SECONDS) {
    return { status: 401, body: { error: 'For your security, sign in again and delete your account within a few minutes.', code: 'recent-login' } };
  }
  try {
    const removed = await deleteAccount(deps, decoded.uid);
    return { status: 200, body: { deleted: true, removed } };
  } catch (error) {
    console.error('Account deletion failed part-way (safe to retry):', error);
    return { status: 500, body: { error: 'Your account could not be fully deleted. Please try again.' } };
  }
}

/** Deletes everything belonging to `uid`, then the Auth account. Safe to repeat. */
export async function deleteAccount({ auth, db, FieldValue }, uid) {
  const removed = { documents: 0 };
  const del = async (ref) => {
    await db.recursiveDelete(ref);
    removed.documents += 1;
  };
  const profile = (await db.doc(`users/${uid}`).get()).data() ?? {};
  const username = typeof profile.username === 'string' ? profile.username : null;

  // Others' posts: my likes and replies, with their counters kept right.
  if (username) {
    for (const like of (await db.collectionGroup('likes').where('username', '==', username).get()).docs) {
      if (like.id !== uid) continue;
      const parent = like.ref.parent.parent;
      await like.ref.delete();
      removed.documents += 1;
      if (parent?.parent?.id === 'posts') await parent.update({ likeCount: FieldValue.increment(-1) }).catch(() => undefined);
    }
  }
  for (const reply of (await db.collectionGroup('replies').where('authorUid', '==', uid).get()).docs) {
    const post = reply.ref.parent.parent;
    await reply.ref.delete();
    removed.documents += 1;
    if (post) await post.update({ replyCount: FieldValue.increment(-1) }).catch(() => undefined);
  }

  // My posts (with their likes and replies).
  for (const post of (await db.collection('posts').where('authorUid', '==', uid).get()).docs) await del(post.ref);

  // Groups: leave the ones I'm in; delete the ones I own.
  for (const group of (await db.collection('groups').where('memberUids', 'array-contains', uid).get()).docs) {
    if (group.data().ownerUid === uid) await del(group.ref);
    else {
      await group.ref.update({ memberUids: FieldValue.arrayRemove(uid), [`members.${uid}`]: FieldValue.delete() });
      for (const message of (await group.ref.collection('messages').where('authorUid', '==', uid).get()).docs) {
        await message.ref.delete();
        removed.documents += 1;
      }
    }
  }

  // Chats: remove the messages I sent; the other person's messages stay theirs.
  for (const chat of (await db.collection('chats').where('members', 'array-contains', uid).get()).docs) {
    for (const message of (await chat.ref.collection('messages').where('from', '==', uid).get()).docs) {
      await message.ref.delete();
      removed.documents += 1;
    }
  }

  // Follows in both directions.
  for (const field of ['follower', 'followee']) {
    for (const follow of (await db.collection('follows').where(field, '==', uid).get()).docs) {
      await follow.ref.delete();
      removed.documents += 1;
    }
  }

  // Username registry entries I own.
  for (const entry of (await db.collection('usernames').where('uid', '==', uid).get()).docs) {
    await entry.ref.delete();
    removed.documents += 1;
  }

  // My own documents (with every subcollection), then the login.
  for (const path of [`scores/${uid}`, `progress/${uid}`, `users/${uid}`]) await del(db.doc(path));
  await auth.deleteUser(uid).catch((error) => {
    if (error?.code !== 'auth/user-not-found') throw error; // already gone on a retry
  });
  return removed;
}
