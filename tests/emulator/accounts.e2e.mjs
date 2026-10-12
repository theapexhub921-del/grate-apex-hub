// Accounts, usernames, display names and class selection: the app's real code
// (lib/accounts.ts, lib/profiles.ts) against the emulator with the rules
// DEPLOYED TODAY — none of this needs a rule change.
import { auth, check, db, fbAuth, finish, freshUser, fs, loadRules, loginExists, peek, rulesUnderTest, seed, signInAs } from './connect.mjs';

const accounts = await import('@/lib/accounts');
const profiles = await import('@/lib/profiles');
const { readClassSelection } = await import('@/data/class-curriculum');
const { needsUsername } = await import('@/lib/login-identifier');
await loadRules(rulesUnderTest());

const PASSWORD = 'emulator-only-password';
const stamp = Date.now().toString(36);
const uname = (base) => `${base}_${stamp}`.slice(0, 20);
const accountExists = loginExists;
async function failsWith(promise) {
  try { await promise; return null; } catch (error) { return error.message || String(error); }
}

// A. Register with email + username + display name.
const amara = { email: `amara-${stamp}@example.com`, password: PASSWORD };
const amaraName = uname('amara');
await accounts.registerWithEmail({ ...amara, username: amaraName, displayName: 'Amara K' });
amara.uid = auth.currentUser.uid;
let profile = await peek(`users/${amara.uid}`);
check('register: the login exists (lookup works)', await loginExists(amara.email));
check('register: profile with username and a separate display name', profile.username === amaraName && profile.displayName === 'Amara K' && profile.classLocked === false, profile);
check('register: username reserved as { uid }', JSON.stringify(await peek(`usernames/${amaraName}`)) === JSON.stringify({ uid: amara.uid }));

// B. The same username again is refused; no login is left behind.
if (auth.currentUser) await fbAuth.signOut(auth);
const second = `second-${stamp}@example.com`;
let message = await failsWith(accounts.registerWithEmail({ email: second, password: PASSWORD, username: amaraName }));
check('register: a taken username is refused before any account is made', message === accounts.USERNAME_TAKEN && !(await accountExists(second)), message);

// C. A name from before the registry (only in users/) is refused, and the new login removed.
await seed(`users/legacyowner${stamp}`, { username: uname('oldname') });
const third = `third-${stamp}@example.com`;
message = await failsWith(accounts.registerWithEmail({ email: third, password: PASSWORD, username: uname('oldname') }));
check('register: a pre-registry name is refused and the new login removed', message === accounts.USERNAME_TAKEN && !(await accountExists(third)) && !auth.currentUser, { message, signedIn: Boolean(auth.currentUser) });

// D. An original-app password account signs in with its username.
if (auth.currentUser) await fbAuth.signOut(auth);
const oldLogin = uname('kofi');
const kofi = { email: `${oldLogin}@grateapex.app`, password: PASSWORD };
kofi.uid = (await fbAuth.createUserWithEmailAndPassword(auth, kofi.email, PASSWORD)).user.uid;
await seed(`users/${kofi.uid}`, { username: oldLogin, hall: 'HB1', semester: 1, classLocked: true, onboardingDone: true });
await fbAuth.signOut(auth);
let email = await accounts.resolveSignInEmail({ kind: 'username', username: oldLogin });
await fbAuth.signInWithEmailAndPassword(auth, email, PASSWORD);
check('legacy: username sign-in reaches the same account (uid unchanged)', auth.currentUser?.uid === kofi.uid, { email, uid: auth.currentUser?.uid });
check('legacy: the locked class is recognised', JSON.stringify(readClassSelection(await peek(`users/${kofi.uid}`))) === JSON.stringify({ classId: 'HB1', semester: 1 }));

// E. Rename: the registry remembers the original login, so the new name signs in too.
const newName = uname('kofinew');
await accounts.chooseUsername(newName);
check('rename: registry entry { uid, login }', JSON.stringify(await peek(`usernames/${newName}`)) === JSON.stringify({ uid: kofi.uid, login: oldLogin }));
check('rename: profile username changed, class untouched', (await peek(`users/${kofi.uid}`)).username === newName && (await peek(`users/${kofi.uid}`)).hall === 'HB1');
await fbAuth.signOut(auth);
email = await accounts.resolveSignInEmail({ kind: 'username', username: newName });
await fbAuth.signInWithEmailAndPassword(auth, email, PASSWORD);
check('rename: the new username signs in with the original password', auth.currentUser?.uid === kofi.uid, email);

// F. A second rename within 30 days is refused by the rules (and explained).
message = await failsWith(accounts.chooseUsername(uname('again')));
check('rename: a second change within 30 days is refused with an explanation', /30 days/.test(message ?? ''), message);

// G. First Google-style sign-in: no profile yet → choosing a username creates it.
const google = await freshUser('google');
check('first sign-in without a profile needs a username', needsUsername((await peek(`users/${google.uid}`))?.username));
await accounts.chooseUsername(uname('newbie'));
profile = await peek(`users/${google.uid}`);
check('choose: profile created with the username and starting fields', profile?.username === uname('newbie') && profile.classLocked === false && profile.hall === '', profile);

// H. An early new-app account whose "username" was a full name keeps it as the display name.
const early = await freshUser('early');
await seed(`users/${early.uid}`, { username: 'Amara Smith', semester: 1, hall: '', classLocked: false });
check('early account needs a username', needsUsername('Amara Smith'));
await accounts.chooseUsername(uname('amara_s'));
profile = await peek(`users/${early.uid}`);
check('early account: new username, old value kept as display name', profile.username === uname('amara_s') && profile.displayName === 'Amara Smith', profile);

// I. Class selection: saved as hall + semester, then locked.
await signInAs(amara);
await accounts.saveClassSelection({ classId: 'HB2', semester: 1 });
profile = await peek(`users/${amara.uid}`);
check('class: hall, semester and lock saved the way the rules require', profile.hall === 'HB2' && profile.semester === 1 && profile.classLocked === true, profile);
check('class: read back as the selection', JSON.stringify(readClassSelection(profile)) === JSON.stringify({ classId: 'HB2', semester: 1 }));
message = await failsWith(accounts.saveClassSelection({ classId: 'HB3', semester: 2 }));
check('class: a locked class cannot be changed from the app (explained)', /already set/.test(message ?? '') && (await peek(`users/${amara.uid}`)).hall === 'HB2', message);

// J. Display name changes never touch the username.
const result = await profiles.updateCurrentProfile({ display_name: 'Amara Kwarteng' });
profile = await peek(`users/${amara.uid}`);
check('display name saved separately; username unchanged', !result.error && profile.displayName === 'Amara Kwarteng' && profile.username === amaraName, { result, profile });

// L. Profile photos on Cloudinary are shared with the original app (users.photo).
const photoUrl = 'https://res.cloudinary.com/test/image/upload/v1/avatar.jpg';
await profiles.updateCurrentProfile({ avatar_url: photoUrl });
profile = await peek(`users/` + amara.uid);
check('a Cloudinary profile photo is saved for both apps (avatar_url and photo)', profile.avatar_url === photoUrl && profile.photo === photoUrl, profile);
await profiles.updateCurrentProfile({ avatar_url: 'preset:female-1' });
profile = await peek(`users/` + amara.uid);
check('choosing an illustrated avatar keeps the original app photo', profile.avatar_url === 'preset:female-1' && profile.photo === photoUrl, profile);
await seed(`users/` + kofi.uid, { username: newName, hall: 'HB1', semester: 1, classLocked: true, photo: 'https://res.cloudinary.com/test/image/upload/v1/kofi.jpg', usernameChangedAt: 1 });
check('an original-app photo shows in this app', (await profiles.getProfileById(kofi.uid)).data?.avatar_url === 'https://res.cloudinary.com/test/image/upload/v1/kofi.jpg');

// K. What production does today is refused by these rules (for the record).
let denied = false;
try { await fs.setDoc(fs.doc(db, 'users', amara.uid), { username: 'Amara Kwarteng' }, { merge: true }); } catch (error) { denied = error.code === 'permission-denied'; }
check('for the record: writing a display name into username is refused', denied);

finish();
