// Accounts, usernames and class selection — written to match the deployed
// Firestore rules exactly (firestore.rules), shared with the original app.
//
// - users/{uid}: `username` (3–20 chars on create; changes need the 30-day
//   limit, `usernameChangedAt: serverTimestamp()` and a usernames claim in the
//   same batch). `displayName` is this app's separate, optional real name.
// - usernames/{name}: { uid } or { uid, login } (login = the original app's
//   hidden login, so a renamed password account can still sign in). Public get.
// - Class: `hall` (HB1…MB3) + `semester` (1|2) + `classLocked: true`; once
//   locked it can't change from the app.
//
// Every function either completes or throws a plain-language Error — nothing
// is reported as saved when it wasn't.
import {
  createUserWithEmailAndPassword,
  deleteUser,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { classSelectionMetadata, type ClassSelection } from '@/data/class-curriculum';
import { auth, db } from '@/lib/firebase';
import {
  cleanUsername,
  legacyLoginEmail,
  legacyLoginOf,
  type LoginIdentifier,
  loginFromRegistry,
  needsUsername,
  validateUsername,
} from '@/lib/login-identifier';

export const USERNAME_TAKEN = 'That username isn’t available. Try another one.';
const ACCOUNT_NOT_CREATED =
  'We couldn’t create an account with these details. If you already have an account, sign in or reset your password.';

const code = (error: unknown) => (error as { code?: string } | null)?.code ?? '';

// Fields every new profile starts with (the same ones the original app uses).
const NEW_PROFILE = {
  onboardingDone: false,
  tutorialDone: false,
  semester: 1,
  hall: '',
  autoHideNav: true,
  classLocked: false,
  remindersOff: false,
};

/** The email Firebase signs in with: an email as typed, or a username's hidden login (renamed accounts via the registry). */
export async function resolveSignInEmail(identifier: LoginIdentifier): Promise<string> {
  if (identifier.kind === 'email') return identifier.email;
  let login = identifier.username;
  try {
    const entry = await getDoc(doc(db, 'usernames', identifier.username));
    if (entry.exists()) login = loginFromRegistry(identifier.username, entry.data());
  } catch {
    // Registry unreadable, or the name can't be a document id: use the name.
  }
  return legacyLoginEmail(login);
}

/**
 * Is this username used by someone else? The registry is public; names from
 * before the registry existed only appear in users/{uid}, which needs a
 * signed-in learner to query.
 */
export async function isUsernameTaken(username: string, myUid: string | null): Promise<boolean> {
  const entry = await getDoc(doc(db, 'usernames', username));
  if (entry.exists() && entry.data().uid !== myUid) return true;
  if (!auth.currentUser) return false;
  const owners = await getDocs(query(collection(db, 'users'), where('username', '==', username), limit(2)));
  return owners.docs.some((owner) => owner.id !== myUid);
}

function cleanAndValidate(raw: string) {
  const username = cleanUsername(raw);
  const problem = validateUsername(username);
  if (problem) throw new Error(problem);
  return username;
}

/**
 * Create an email/password account with a username. The username is reserved
 * and the profile created in ONE batch; if anything fails, the just-created
 * login is removed again so no half-made account is left behind.
 */
export async function registerWithEmail(input: { email: string; password: string; username: string; displayName?: string }) {
  const username = cleanAndValidate(input.username);
  if (await isUsernameTaken(username, null)) throw new Error(USERNAME_TAKEN);

  let user: User;
  try {
    user = (await createUserWithEmailAndPassword(auth, input.email.trim(), input.password)).user;
  } catch (error) {
    if (code(error) === 'auth/email-already-in-use') throw new Error(ACCOUNT_NOT_CREATED);
    throw error;
  }

  try {
    if (await isUsernameTaken(username, user.uid)) throw new Error(USERNAME_TAKEN);
    const batch = writeBatch(db);
    batch.set(doc(db, 'usernames', username), { uid: user.uid });
    batch.set(doc(db, 'users', user.uid), {
      ...NEW_PROFILE,
      username,
      displayName: input.displayName?.trim() || null,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    await deleteUser(user).catch(() => undefined);
    if (error instanceof Error && error.message === USERNAME_TAKEN) throw error;
    if (code(error) === 'permission-denied') throw new Error(USERNAME_TAKEN);
    throw new Error('Your account could not be set up. Please try again.');
  }

  // A fresh, empty progress document (owner-only rule).
  await setDoc(doc(db, 'progress', user.uid), { xp: 0, updatedAt: Date.now(), savedAt: serverTimestamp() }, { merge: true }).catch(() => undefined);
  return user;
}

/**
 * Choose or change the signed-in learner's username: a first username (new
 * Google account), replacing an early new-app name that isn't in the shared
 * format, or a rename (at most once every 30 days, enforced by the rules).
 */
export async function chooseUsername(raw: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in again.');
  const username = cleanAndValidate(raw);

  const profileRef = doc(db, 'users', user.uid);
  const profile = await getDoc(profileRef);
  const current = profile.exists() ? profile.data() : null;
  if (current?.username === username) return username;
  if (await isUsernameTaken(username, user.uid)) throw new Error(USERNAME_TAKEN);

  const login = legacyLoginOf(user.email);
  const batch = writeBatch(db);
  batch.set(doc(db, 'usernames', username), login ? { uid: user.uid, login } : { uid: user.uid });
  if (current) {
    const update: Record<string, unknown> = { username, usernameChangedAt: serverTimestamp() };
    // An early new-app name such as "Amara Smith" becomes the display name.
    if (needsUsername(current.username) && typeof current.username === 'string' && !current.displayName) update.displayName = current.username;
    batch.set(profileRef, update, { merge: true });
  } else {
    batch.set(profileRef, { ...NEW_PROFILE, username, displayName: user.displayName || null, createdAt: serverTimestamp() });
  }
  try {
    await batch.commit();
  } catch (error) {
    if (code(error) === 'permission-denied') {
      throw new Error('That username couldn’t be saved. Someone may have just taken it, or you changed your username in the last 30 days.');
    }
    throw error;
  }
  return username;
}

/** Save and lock the learner's class (hall) and semester, the way the deployed rules require. */
export async function saveClassSelection(selection: ClassSelection) {
  const user = auth.currentUser;
  if (!user) throw new Error('Your sign-in could not be confirmed. Please sign in again and try once more.');
  try {
    await setDoc(
      doc(db, 'users', user.uid),
      { hall: selection.classId, semester: selection.semester, classLocked: true, ...classSelectionMetadata(selection) },
      { merge: true }
    );
  } catch (error) {
    if (code(error) === 'permission-denied') {
      throw new Error('Your class is already set and can’t be changed here. Ask an administrator if it is wrong.');
    }
    throw new Error('Your class selection could not be saved. Please check your connection and try again.');
  }
}

export const USERNAME_CHANGE_DAYS = 30;

/** When the signed-in learner may next change their username (null = any time now). The rules enforce the same 30 days. */
export async function nextUsernameChange(): Promise<Date | null> {
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) return null;
  const data = (await getDoc(doc(db, 'users', user.uid)).catch(() => null))?.data();
  const changedAt = (data?.usernameChangedAt as { toMillis?: () => number } | undefined)?.toMillis?.();
  if (!changedAt) return null;
  const next = changedAt + USERNAME_CHANGE_DAYS * 86_400_000;
  return next > Date.now() ? new Date(next) : null;
}
