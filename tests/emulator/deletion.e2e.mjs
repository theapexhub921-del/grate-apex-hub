// Full account deletion (server/account-deletion.mjs) with the admin SDK
// against the LOCAL Auth + Firestore emulators only. A learner deletes their
// account; everything of theirs goes, and their friend's data stays.
import { createRequire } from 'node:module';
import path from 'node:path';

import { auth as clientAuth, authProjectId, check, finish, freshUser, peek, projectId, seed } from './connect.mjs';

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8085';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
const dep = createRequire(path.join(process.env.DEPS, 'package.json'));
const { initializeApp } = dep('firebase-admin/app');
const { getAuth } = dep('firebase-admin/auth');
const { FieldValue, getFirestore } = dep('firebase-admin/firestore');
const { handleAccountDeletion, deleteAccount } = await import('../../server/account-deletion.mjs');
// Logins live under the Auth emulator's project; data under the app's project.
const deps = { auth: getAuth(initializeApp({ projectId: authProjectId }, 'deletion-auth')), db: getFirestore(initializeApp({ projectId }, 'deletion-db')), FieldValue };

const friend = await freshUser('del-friend');
const victim = await freshUser('del-victim'); // signed in as the victim from here
const v = victim.uid;
const f = friend.uid;
const T = 1791000000000;
await seed(`users/${v}`, { username: 'victim_x', hall: 'HB1', semester: 1, classLocked: true });
await seed(`users/${f}`, { username: 'friend_x' });
await seed(`users/${v}/notifications/n1`, { type: 'follow', from: f, fromName: 'friend_x', read: false, createdAt: T });
await seed(`users/${v}/stories/s1`, { username: 'victim_x', kind: 'text', text: 'hi', createdAt: T });
await seed(`usernames/victim_x`, { uid: v });
await seed(`usernames/victim_old`, { uid: v, login: 'victim_old' });
await seed(`scores/${v}`, { username: 'victim_x', xp: 10 });
await seed(`progress/${v}`, { xp: 10 });
await seed(`progress/${v}/completions/lesson-1`, { lessonId: 'lesson-1', completedAt: T, xp: 20 });
await seed(`follows/${v}_${f}`, { follower: v, followee: f });
await seed(`follows/${f}_${v}`, { follower: f, followee: v });
await seed(`follows/${f}_other`, { follower: f, followee: 'other' });
await seed('posts/victimPost', { authorUid: v, authorName: 'victim_x', title: 'Mine', body: 'Mine', replyCount: 1, likeCount: 1 });
await seed(`posts/victimPost/likes/${f}`, { username: 'friend_x', createdAt: T });
await seed('posts/victimPost/replies/r1', { authorUid: f, authorName: 'friend_x', body: 'nice', createdAt: T });
await seed('posts/friendPost', { authorUid: f, authorName: 'friend_x', title: 'Theirs', body: 'Theirs', replyCount: 2, likeCount: 2 });
await seed(`posts/friendPost/likes/${v}`, { username: 'victim_x', createdAt: T });
await seed('posts/friendPost/likes/someone', { username: 'someone', createdAt: T });
await seed('posts/friendPost/replies/rv', { authorUid: v, authorName: 'victim_x', body: 'mine', createdAt: T });
await seed('posts/friendPost/replies/rf', { authorUid: f, authorName: 'friend_x', body: 'theirs', createdAt: T });
await seed('groups/victimGroup', { ownerUid: v, memberUids: [v, f], name: 'V group', description: '' });
await seed('groups/friendGroup', { ownerUid: f, memberUids: [f, v], members: { [f]: 'friend_x', [v]: 'victim_x' }, name: 'F group', description: '' });
await seed('groups/friendGroup/messages/gv', { authorUid: v, authorName: 'victim_x', text: 'mine', createdAt: T });
await seed('groups/friendGroup/messages/gf', { authorUid: f, authorName: 'friend_x', text: 'theirs', createdAt: T });
const chat = [v, f].sort().join('_');
await seed(`chats/${chat}`, { members: [v, f].sort(), lastFrom: f });
await seed(`chats/${chat}/messages/cv`, { from: v, text: 'mine', createdAt: T });
await seed(`chats/${chat}/messages/cf`, { from: f, text: 'theirs', createdAt: T });

const token = await clientAuth.currentUser.getIdToken();
let result = await handleAccountDeletion(undefined, deps);
check('no token: refused, nothing deleted', result.status === 401 && Boolean(await peek(`users/${v}`)));
result = await handleAccountDeletion(`Bearer ${token}`, deps, Date.now() + 10 * 60 * 1000);
check('sign-in older than 5 minutes: refused, nothing deleted', result.status === 401 && result.body.code === 'recent-login' && Boolean(await peek(`scores/${v}`)));

result = await handleAccountDeletion(`Bearer ${token}`, deps);
check('deletion succeeds', result.status === 200 && result.body.deleted === true, result);
const gone = await Promise.all([`users/${v}`, `users/${v}/notifications/n1`, `users/${v}/stories/s1`, 'usernames/victim_x', 'usernames/victim_old', `scores/${v}`, `progress/${v}`, `progress/${v}/completions/lesson-1`, `follows/${v}_${f}`, `follows/${f}_${v}`, 'posts/victimPost', 'posts/victimPost/replies/r1', `posts/friendPost/likes/${v}`, 'posts/friendPost/replies/rv', 'groups/victimGroup', 'groups/friendGroup/messages/gv', `chats/${chat}/messages/cv`].map((p) => peek(p)));
check('all of their documents are gone (profile, subcollections, usernames, scores, progress, follows, posts, likes, replies, owned group, sent messages)', gone.every((doc) => doc === null), gone.map((doc, i) => (doc ? i : null)).filter((i) => i !== null));
let exists = true;
try { await deps.auth.getUser(v); } catch (error) { if (error.code !== 'auth/user-not-found') throw error; exists = false; }
check('their login is deleted', !exists);

const friendPost = await peek('posts/friendPost');
check('the friend keeps their post, with counters corrected', friendPost?.likeCount === 1 && friendPost.replyCount === 1 && Boolean(await peek('posts/friendPost/replies/rf')) && Boolean(await peek('posts/friendPost/likes/someone')), friendPost);
const friendGroup = await peek('groups/friendGroup');
check('the friend keeps their group (without them) and their own message', JSON.stringify(friendGroup?.memberUids) === JSON.stringify([f]) && !friendGroup.members?.[v] && Boolean(await peek('groups/friendGroup/messages/gf')), friendGroup);
check('the friend keeps their chat messages and other follows', Boolean(await peek(`chats/${chat}/messages/cf`)) && Boolean(await peek(`follows/${f}_other`)) && Boolean(await peek(`users/${f}`)));

const again = await deleteAccount(deps, v);
check('running it again is safe (nothing left, no error)', again.documents >= 0);
finish();
