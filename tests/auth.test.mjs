// Sign-in identifiers: an email, or a username from the original app.
// Run with: npm test
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const {
  cleanUsername,
  legacyLoginEmail,
  loginFromRegistry,
  parseLoginIdentifier,
} = await import('@/lib/login-identifier');

describe('sign-in identifiers', () => {
  it('uses an email exactly as typed (trimmed)', () => {
    assert.deepEqual(parseLoginIdentifier('  Amara@Example.com '), { kind: 'email', email: 'Amara@Example.com' });
    // A legacy hidden login typed in full is still an email: never doubled up.
    assert.deepEqual(parseLoginIdentifier('kofi_a@grateapex.app'), { kind: 'email', email: 'kofi_a@grateapex.app' });
  });

  it('treats anything without "@" as a username, cleaned like the old app', () => {
    assert.deepEqual(parseLoginIdentifier('  King_Kube '), { kind: 'username', username: 'king_kube' });
    assert.equal(cleanUsername(' Kofi_A '), 'kofi_a');
  });

  it('builds the legacy hidden email', () => {
    assert.equal(legacyLoginEmail('king_kube'), 'king_kube@grateapex.app');
  });

  it('follows a renamed account to its original login', () => {
    assert.equal(loginFromRegistry('new_name', { uid: 'u1', login: 'old_name' }), 'old_name');
  });

  it('uses the name itself when the registry gives no login', () => {
    assert.equal(loginFromRegistry('kofi_a', { uid: 'u1' }), 'kofi_a');
    assert.equal(loginFromRegistry('kofi_a', { uid: 'u1', login: '' }), 'kofi_a');
    assert.equal(loginFromRegistry('kofi_a', { uid: 'u1', login: 42 }), 'kofi_a');
    assert.equal(loginFromRegistry('kofi_a', undefined), 'kofi_a');
  });
});

const { validateUsername, needsUsername, legacyLoginOf } = await import('@/lib/login-identifier');
const { readClassSelection } = await import('@/data/class-curriculum');

describe('usernames (shared format ^[a-z0-9_]{3,20}$)', () => {
  it('accepts valid names and explains invalid ones', () => {
    assert.equal(validateUsername('kofi_a'), null);
    assert.match(validateUsername('ab'), /3–20/);
    assert.match(validateUsername('a'.repeat(21)), /3–20/);
    assert.match(validateUsername('kofi a'), /lowercase/);
    assert.match(validateUsername('Kofi'), /lowercase/);
  });
  it('asks for a username when the profile has none in the shared format', () => {
    assert.equal(needsUsername('kofi_a'), false);
    assert.equal(needsUsername('Amara Smith'), true);
    assert.equal(needsUsername(undefined), true);
    assert.equal(needsUsername(''), true);
  });
  it('recognises the original app’s hidden logins only', () => {
    assert.equal(legacyLoginOf('Kofi_A@grateapex.app'), 'kofi_a');
    assert.equal(legacyLoginOf('amara@example.com'), null);
    assert.equal(legacyLoginOf(null), null);
  });
});

describe('class selection', () => {
  it('reads this app’s saved selection', () => {
    assert.deepEqual(readClassSelection({ grateapex_academic_selection: { classId: 'HB2', semester: 2 } }), { classId: 'HB2', semester: 2 });
  });
  it('reads the original app’s locked hall and semester', () => {
    assert.deepEqual(readClassSelection({ hall: 'HB1', semester: 1, classLocked: true }), { classId: 'HB1', semester: 1 });
  });
  it('ignores an unlocked or empty hall (a new account)', () => {
    assert.equal(readClassSelection({ hall: '', semester: 1, classLocked: false }), null);
    assert.equal(readClassSelection({ hall: 'HB1', semester: 1 }), null);
  });
});
