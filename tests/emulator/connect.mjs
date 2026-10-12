// Shared set-up for the emulator checks: points the APP'S OWN Firebase objects
// (src/lib/firebase.ts) at the local Auth + Firestore emulators, refuses to
// continue if that did not take effect, and loads the rules under test.
// Never talks to the live project.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const FIRESTORE = '127.0.0.1:8085';
const AUTH = 'http://127.0.0.1:9099';

const { app, auth, db } = await import('@/lib/firebase');
const fbAuth = await import('firebase/auth');
const fs = await import('firebase/firestore');

fbAuth.connectAuthEmulator(auth, AUTH, { disableWarnings: true });
fs.connectFirestoreEmulator(db, '127.0.0.1', 8085);
if (!auth.emulatorConfig || db._getSettings().host !== FIRESTORE) throw new Error('Not connected to the emulators — stopping.');

export { app, auth, db, fbAuth, fs };
export const projectId = app.options.projectId;
/** The Auth emulator keeps users under the emulators' own project, not the app's. */
export const authProjectId = process.env.GCLOUD_PROJECT || 'demo-grateapex';

/** Does a login with this email exist in the Auth emulator? */
export async function loginExists(email) {
  const response = await fetch(`http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/${authProjectId}/accounts:lookup`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer owner' }, body: JSON.stringify({ email: [email] }),
  });
  if (!response.ok) throw new Error(`Auth emulator lookup failed: ${response.status}`);
  return Boolean((await response.json()).users?.length);
}

/**
 * The rules a check runs under: the rules deployed today (default), or the
 * proposed firestore.rules with RULES=proposed — run the suite both ways to show
 * the proposed additions break nothing.
 */
export function rulesUnderTest() {
  const proposed = process.env.RULES === 'proposed';
  console.log(`rules: ${proposed ? 'firestore.rules (proposed)' : 'deployed-2026-10-09.rules'}`);
  return fileURLToPath(new URL(proposed ? '../../firestore.rules' : './deployed-2026-10-09.rules', import.meta.url));
}

/** Loads a rules file into the emulator for the app's project. Default: the repository's firestore.rules. */
export async function loadRules(file = process.env.RULES_FILE || fileURLToPath(new URL('../../firestore.rules', import.meta.url))) {
  const response = await fetch(`http://${FIRESTORE}/emulator/v1/projects/${projectId}:securityRules`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ rules: { files: [{ content: readFileSync(file, 'utf8') }] } }),
  });
  if (!response.ok) throw new Error(`Could not load rules: ${response.status} ${await response.text()}`);
}

/** Writes documents with rules switched off (test set-up only), via the emulator's admin bypass. */
export async function seed(path, data) {
  const fields = {};
  for (const [key, value] of Object.entries(data)) fields[key] = encode(value);
  const response = await fetch(`http://${FIRESTORE}/v1/projects/${projectId}/databases/(default)/documents/${path}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', authorization: 'Bearer owner' },
    body: JSON.stringify({ fields }),
  });
  if (!response.ok) throw new Error(`seed ${path}: ${response.status} ${await response.text()}`);
}
function encode(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === 'string') return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
  const fields = {};
  for (const [key, inner] of Object.entries(value)) fields[key] = encode(inner);
  return { mapValue: { fields } };
}

/** Reads a document with rules switched off (test checks only). */
export async function peek(path) {
  const response = await fetch(`http://${FIRESTORE}/v1/projects/${projectId}/databases/(default)/documents/${path}`, { headers: { authorization: 'Bearer owner' } });
  if (response.status === 404) return null;
  const json = await response.json();
  return decode({ mapValue: { fields: json.fields ?? {} } });
}
/** Lists a collection with rules switched off (test checks only). */
export async function peekAll(path) {
  const response = await fetch(`http://${FIRESTORE}/v1/projects/${projectId}/databases/(default)/documents/${path}`, { headers: { authorization: 'Bearer owner' } });
  const json = await response.json();
  return (json.documents ?? []).map((item) => ({ id: item.name.split('/').pop(), ...decode({ mapValue: { fields: item.fields ?? {} } }) }));
}
function decode(value) {
  if ('nullValue' in value) return null;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('stringValue' in value) return value.stringValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(decode);
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields ?? {}).map(([k, v]) => [k, decode(v)]));
  return value;
}

/** Signs in as a fresh emulator user (signing out whoever was signed in). */
export async function freshUser(prefix = 'user', password = 'emulator-only-password') {
  if (auth.currentUser) await fbAuth.signOut(auth);
  const email = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
  const cred = await fbAuth.createUserWithEmailAndPassword(auth, email, password);
  return { uid: cred.user.uid, email, password };
}
export async function signInAs(user) {
  if (auth.currentUser) await fbAuth.signOut(auth);
  await fbAuth.signInWithEmailAndPassword(auth, user.email, user.password);
}

let failures = 0;
export function check(label, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `\n      got: ${JSON.stringify(detail)}`}`);
}
export function finish() {
  console.log(failures === 0 ? 'ALL CHECKS PASSED\n' : `${failures} CHECK(S) FAILED\n`);
  process.exit(failures === 0 ? 0 : 1);
}
