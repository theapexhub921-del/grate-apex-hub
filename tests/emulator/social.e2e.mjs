// Friends, followers and suggestions: the app's real social store against the
// emulator with the rules DEPLOYED TODAY, starting from follows written in the
// original app's format (follows/{follower}_{followee} = { follower, followee, … }).
import { check, db, finish, freshUser, fs, loadRules, peek, peekAll, rulesUnderTest, seed, signInAs } from './connect.mjs';

const social = await import('@/data/social');
await loadRules(rulesUnderTest());

const s = Date.now().toString(36).slice(-5);
const people = {};
for (const key of ['a', 'b', 'c', 'd', 'e']) {
  people[key] = await freshUser(`social-${key}`);
  people[key].username = `${key}_user_${s}`;
}
const { a, b, c, d, e } = people;
const T = 1791000000000;
for (const p of Object.values(people)) await seed(`users/${p.uid}`, { username: p.username, hall: p === e || p === a ? 'HB1' : 'HB3', semester: 1, classLocked: true });
await seed(`scores/${e.uid}`, { username: e.username, xp: 9000, hall: 'HB1', semester: 1 });
await seed(`scores/${d.uid}`, { username: d.username, xp: 10, hall: 'HB3', semester: 1 });
// Existing relationships from the original app: b → a (a request), a ↔ c (friends), c → d.
const follow = (x, y) => seed(`follows/${x.uid}_${y.uid}`, { follower: x.uid, followee: y.uid, followerName: x.username, followeeName: y.username, createdAt: T });
await follow(b, a); await follow(a, c); await follow(c, a); await follow(c, d);

await signInAs(a);
social.startSocial();
const ready = async () => { for (let i = 0; i < 100 && social.socialState().status !== 'ready'; i++) await new Promise((r) => setTimeout(r, 50)); return social.socialState(); };
await social.refreshSocial();
let state = await ready();
const rel = (who) => state.people.find((p) => p.userId === who.uid)?.relationship ?? 'not listed';
check('existing friendship (mutual follows) is restored', rel(c) === 'friends', state.people);
check('a one-way follow towards me is a request, not a friendship', rel(b) === 'incoming');
check('people with no follow either way are not listed', rel(d) === 'not listed' && rel(e) === 'not listed');
check('names come from the profiles', state.people.find((p) => p.userId === c.uid)?.username === c.username);

const suggestions = await social.getRecommendedFriends();
const ids = suggestions.map((x) => x.userId);
check('suggestions: my follower first', ids[0] === b.uid && suggestions[0].reason === 'Follows you', suggestions.map((x) => [x.username, x.reason]));
check('suggestions: classmate who is a top student, and a friend-of-a-friend', ids.includes(e.uid) && suggestions.find((x) => x.userId === e.uid).sameClass && suggestions.find((x) => x.userId === d.uid)?.sharedConnections === 1);
check('suggestions never include me or people I already follow', !ids.includes(a.uid) && !ids.includes(c.uid));

const found = await social.searchLearners(c.username.slice(0, 6));
check('search by username prefix finds a friend with the right relationship', found.some((p) => p.userId === c.uid && p.relationship === 'friends'), found);

await social.sendFriendRequest(d.uid);
const created = await peek(`follows/${a.uid}_${d.uid}`);
check('follow saved in the shared format', created?.follower === a.uid && created?.followee === d.uid && created?.followerName === a.username && created?.followeeName === d.username, created);
check('the followed student gets a notification (both apps read these)', (await peekAll(`users/${d.uid}/notifications`)).some((n) => n.type === 'follow' && n.from === a.uid && n.fromName === a.username));
state = social.socialState();
check('after following: shown as outgoing (until they follow back)', rel(d) === 'outgoing');

await social.respondToFriendRequest(`${b.uid}_${a.uid}`, true);
state = social.socialState();
check('accepting a request follows back → friends', rel(b) === 'friends' && Boolean(await peek(`follows/${a.uid}_${b.uid}`)));

await social.removeFriendship(`${a.uid}_${c.uid}`);
state = social.socialState();
check('removing a friend deletes only my follow; theirs stays (direction kept)', !(await peek(`follows/${a.uid}_${c.uid}`)) && Boolean(await peek(`follows/${c.uid}_${a.uid}`)) && rel(c) === 'incoming');

await social.respondToFriendRequest(`${c.uid}_${a.uid}`, false);
state = social.socialState();
check('hiding a request hides it here but their follow is untouched', rel(c) === 'not listed' && Boolean(await peek(`follows/${c.uid}_${a.uid}`)));

let denied = false;
try { await fs.deleteDoc(fs.doc(db, 'follows', `${c.uid}_${a.uid}`)); } catch (error) { denied = error.code === 'permission-denied'; }
check('I cannot delete someone else’s follow', denied);
denied = false;
try { await fs.setDoc(fs.doc(db, 'follows', `${a.uid}_${e.uid}`), { followerId: a.uid, followingId: e.uid }); } catch (error) { denied = error.code === 'permission-denied'; }
check('for the record: the format production writes today is refused', denied);

finish();
