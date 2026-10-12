// Firestore rules tests (emulator only; not part of npm test — they need Java and
// firebase-tools). From tests/emulator, with @firebase/rules-unit-testing and
// firebase installed in the folder named by DEPS:
//   firebase emulators:exec --only firestore,auth --project demo-grateapex "node --test ../rules/progress.rules-test.cjs"
// PROPOSED_RULES defaults to firestore.rules, BASELINE_RULES to the deployed copy.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { after, before, beforeEach, describe, it } = require('node:test');

const ROOT = path.resolve(process.cwd(), process.env.GRATEAPEX_ROOT || "../..");
const PROPOSED = process.env.PROPOSED_RULES || path.join(ROOT, 'firestore.rules');
const BASELINE = process.env.BASELINE_RULES || path.join(ROOT, 'tests', 'emulator', 'deployed-2026-10-09.rules');

const req = createRequire(path.join(process.env.DEPS, 'package.json'));
const { initializeTestEnvironment, assertFails, assertSucceeds } = req('@firebase/rules-unit-testing');
const { collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } = req('firebase/firestore');

const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8085').split(':');
const ALICE = 'alice';
const BOB = 'bob';
const ID = '3f2b8c1e-9a4d-4e6f-8b2a-1c5d7e9f0a3b';

function attempt(overrides = {}) {
  return {
    id: ID,
    userId: ALICE,
    attemptType: 'lesson',
    courseId: 'biochemistry',
    lessonId: 'blood-coagulation-and-fibrinolysis-1',
    score: 18,
    total: 25,
    percentage: 72,
    timeSeconds: 410.5,
    wrongConcepts: ['factor-viii'],
    wrongQuestionIds: ['q1-3'],
    practice: false,
    completedAt: 1791591792619,
    savedAt: serverTimestamp(),
    ...overrides,
  };
}
const without = (key) => { const a = attempt(); delete a[key]; return a; };

async function environment(rulesFile, projectId) {
  return initializeTestEnvironment({ projectId, firestore: { rules: fs.readFileSync(rulesFile, 'utf8'), host, port: Number(port) } });
}

describe('proposed rules: progress/{uid}/attempts', () => {
  let env;
  const db = (uid) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore();
  const ref = (uid, owner = ALICE, id = ID) => doc(db(uid), 'progress', owner, 'attempts', id);
  const seed = () => env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'progress', ALICE, 'attempts', ID), { ...attempt(), savedAt: new Date() }));

  before(async () => { env = await environment(PROPOSED, 'demo-grateapex-proposed'); });
  beforeEach(async () => { await env.clearFirestore(); });
  after(async () => { await env.cleanup(); });

  it('ALLOW owner creates a valid attempt', async () => { await assertSucceeds(setDoc(ref(ALICE), attempt())); });
  it('ALLOW owner reads an own attempt', async () => { await seed(); await assertSucceeds(getDoc(ref(ALICE))); });
  it('ALLOW owner lists own attempts (newest first)', async () => {
    await seed();
    await assertSucceeds(getDocs(query(collection(db(ALICE), 'progress', ALICE, 'attempts'), orderBy('completedAt', 'desc'), limit(200))));
  });
  it('ALLOW owner deletes an own attempt (reset / account deletion)', async () => { await seed(); await assertSucceeds(deleteDoc(ref(ALICE))); });
  it('ALLOW optional course and lesson ids may be null', async () => { await assertSucceeds(setDoc(ref(ALICE), attempt({ courseId: null, lessonId: null, attemptType: 'apex_challenge', total: 30, score: 30, percentage: 100 }))); });

  it('DENY sending the same attempt again (no duplicate, no overwrite)', async () => { await seed(); await assertFails(setDoc(ref(ALICE), attempt({ score: 25, percentage: 100 }))); });
  it('DENY editing an attempt', async () => { await seed(); await assertFails(updateDoc(ref(ALICE), { score: 25 })); });
  it('DENY another student reading my attempt', async () => { await seed(); await assertFails(getDoc(ref(BOB))); });
  it('DENY another student listing my attempts', async () => { await seed(); await assertFails(getDocs(collection(db(BOB), 'progress', ALICE, 'attempts'))); });
  it('DENY another student writing into my attempts', async () => { await assertFails(setDoc(ref(BOB), attempt())); });
  it('DENY another student deleting my attempt', async () => { await seed(); await assertFails(deleteDoc(ref(BOB))); });
  it('DENY signed-out read', async () => { await seed(); await assertFails(getDoc(ref(null))); });
  it('DENY signed-out create', async () => { await assertFails(setDoc(ref(null), attempt())); });
  it('DENY an extra field (e.g. xp)', async () => { await assertFails(setDoc(ref(ALICE), attempt({ xp: 500 }))); });
  it('DENY a missing field', async () => { await assertFails(setDoc(ref(ALICE), without('wrongQuestionIds'))); });
  it('DENY id in the data different from the document id', async () => { await assertFails(setDoc(ref(ALICE), attempt({ id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' }))); });
  it('DENY userId of another student', async () => { await assertFails(setDoc(ref(ALICE), attempt({ userId: BOB }))); });
  it('DENY a document id that is not a UUID', async () => { await assertFails(setDoc(ref(ALICE, ALICE, 'attempt-1'), attempt({ id: 'attempt-1' }))); });
  it('DENY score above total', async () => { await assertFails(setDoc(ref(ALICE), attempt({ score: 26 }))); });
  it('DENY total of 0', async () => { await assertFails(setDoc(ref(ALICE), attempt({ total: 0, score: 0 }))); });
  it('DENY total above 100', async () => { await assertFails(setDoc(ref(ALICE), attempt({ total: 101, score: 50 }))); });
  it('DENY percentage above 100', async () => { await assertFails(setDoc(ref(ALICE), attempt({ percentage: 101 }))); });
  it('DENY negative time', async () => { await assertFails(setDoc(ref(ALICE), attempt({ timeSeconds: -1 }))); });
  it('DENY unknown attempt type', async () => { await assertFails(setDoc(ref(ALICE), attempt({ attemptType: 'bonus' }))); });
  it('DENY a client-chosen savedAt instead of server time', async () => { await assertFails(setDoc(ref(ALICE), attempt({ savedAt: 1791591792619 }))); });
  it('DENY practice that is not true/false', async () => { await assertFails(setDoc(ref(ALICE), attempt({ practice: 'no' }))); });
  it('DENY a decimal score', async () => { await assertFails(setDoc(ref(ALICE), attempt({ score: 18.5 }))); });

  // Everything else must behave exactly as before.
  it('UNCHANGED owner still reads and writes progress/{uid}', async () => {
    await assertSucceeds(setDoc(doc(db(ALICE), 'progress', ALICE), { xp: 10, lessons: { 'biolchem-1': 3 } }));
    await assertSucceeds(getDoc(doc(db(ALICE), 'progress', ALICE)));
  });
  it('UNCHANGED another student still cannot read progress/{uid}', async () => { await assertFails(getDoc(doc(db(BOB), 'progress', ALICE))); });
  it('UNCHANGED other subcollections of progress/{uid} stay closed', async () => { await assertFails(setDoc(doc(db(ALICE), 'progress', ALICE, 'other', 'x'), { a: 1 })); });
  it('UNCHANGED an attempt at scores/{attemptId} is still refused', async () => { await assertFails(setDoc(doc(db(ALICE), 'scores', ID), attempt())); });
  it('UNCHANGED scores/{uid} accepts only the leaderboard summary', async () => {
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'users', ALICE), { username: 'alice_a' }));
    await assertSucceeds(setDoc(doc(db(ALICE), 'scores', ALICE), { username: 'alice_a', xp: 120, level: 2 }));
    await assertFails(setDoc(doc(db(ALICE), 'scores', ALICE), { username: 'alice_a', xp: 120, attemptType: 'lesson', score: 18 }));
  });
});

describe('deployed rules today (baseline)', () => {
  let env;
  before(async () => { env = await environment(BASELINE, 'demo-grateapex-baseline'); });
  after(async () => { await env.cleanup(); });

  it('DENY today: the attempts path is closed until the new rule is deployed', async () => {
    await assertFails(setDoc(doc(env.authenticatedContext(ALICE).firestore(), 'progress', ALICE, 'attempts', ID), attempt()));
  });
  it('DENY today: the current app\'s write to scores/{attemptId}', async () => {
    await assertFails(setDoc(doc(env.authenticatedContext(ALICE).firestore(), 'scores', ID), { ...attempt(), userId: ALICE }));
  });
});

describe('proposed rules: progress/{uid}/completions', () => {
  let env;
  const L = 'blood-coagulation-and-fibrinolysis-1';
  const db = (uid) => (uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore());
  const ref = (uid, owner = ALICE, id = L) => doc(db(uid), 'progress', owner, 'completions', id);
  const row = (o = {}) => ({ lessonId: L, completedAt: 1791591792619, xp: 20, savedAt: serverTimestamp(), ...o });
  const seedRow = () => env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'progress', ALICE, 'completions', L), { ...row(), savedAt: new Date() }));

  before(async () => { env = await environment(PROPOSED, 'demo-grateapex-completions'); });
  beforeEach(async () => { await env.clearFirestore(); });
  after(async () => { await env.cleanup(); });

  it('ALLOW owner creates a completion', async () => { await assertSucceeds(setDoc(ref(ALICE), row())); });
  it('ALLOW owner updates a completion (earlier time)', async () => { await seedRow(); await assertSucceeds(setDoc(ref(ALICE), row({ completedAt: 1791000000000 }))); });
  it('ALLOW owner reads and lists completions', async () => { await seedRow(); await assertSucceeds(getDoc(ref(ALICE))); await assertSucceeds(getDocs(collection(db(ALICE), 'progress', ALICE, 'completions'))); });
  it('ALLOW owner deletes a completion (reset)', async () => { await seedRow(); await assertSucceeds(deleteDoc(ref(ALICE))); });
  it('DENY another student reading, listing, writing or deleting', async () => {
    await seedRow();
    await assertFails(getDoc(ref(BOB)));
    await assertFails(getDocs(collection(db(BOB), 'progress', ALICE, 'completions')));
    await assertFails(setDoc(ref(BOB), row()));
    await assertFails(deleteDoc(ref(BOB)));
  });
  it('DENY signed out', async () => { await assertFails(setDoc(ref(null), row())); });
  it('DENY lessonId different from the document id', async () => { await assertFails(setDoc(ref(ALICE), row({ lessonId: 'other-1' }))); });
  it('DENY an id outside ^[a-z0-9-]{1,120}$', async () => { await assertFails(setDoc(ref(ALICE, ALICE, 'Bad_ID'), row({ lessonId: 'Bad_ID' }))); });
  it('DENY an extra field', async () => { await assertFails(setDoc(ref(ALICE), row({ bonus: 1 }))); });
  it('DENY a missing field', async () => { const r = row(); delete r.xp; await assertFails(setDoc(ref(ALICE), r)); });
  it('DENY XP above 1000 or negative', async () => { await assertFails(setDoc(ref(ALICE), row({ xp: 1001 }))); await assertFails(setDoc(ref(ALICE), row({ xp: -1 }))); });
  it('DENY a decimal or zero completion time', async () => { await assertFails(setDoc(ref(ALICE), row({ completedAt: 1.5 }))); await assertFails(setDoc(ref(ALICE), row({ completedAt: 0 }))); });
  it('DENY a client-chosen savedAt', async () => { await assertFails(setDoc(ref(ALICE), row({ savedAt: 5 }))); });
  it('DENY today (deployed rules): the path is closed until approved', async () => {
    const today = await environment(BASELINE, 'demo-grateapex-completions-today');
    await assertFails(setDoc(doc(today.authenticatedContext(ALICE).firestore(), 'progress', ALICE, 'completions', L), row()));
    await today.cleanup();
  });
});

describe('proposed rules: users/{uid}/planner/{kind}', () => {
  let env;
  const db = (uid) => (uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore());
  const ref = (uid, owner = ALICE, kind = 'studyPlans') => doc(db(uid), 'users', owner, 'planner', kind);
  const body = (o = {}) => ({ items: [{ id: 'plan_1', title: 'Week' }], updatedAt: serverTimestamp(), ...o });
  before(async () => { env = await environment(PROPOSED, 'demo-grateapex-planner'); });
  beforeEach(async () => { await env.clearFirestore(); });
  after(async () => { await env.cleanup(); });

  it('ALLOW owner writes, reads and deletes each of the three planner documents', async () => {
    for (const kind of ['studyPlans', 'timetableBlocks', 'goals']) {
      await assertSucceeds(setDoc(ref(ALICE, ALICE, kind), body()));
      await assertSucceeds(getDoc(ref(ALICE, ALICE, kind)));
      await assertSucceeds(deleteDoc(ref(ALICE, ALICE, kind)));
    }
  });
  it('DENY another student or signed out', async () => {
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'users', ALICE, 'planner', 'goals'), { items: [], updatedAt: new Date() }));
    await assertFails(getDoc(ref(BOB, ALICE, 'goals')));
    await assertFails(setDoc(ref(BOB, ALICE, 'goals'), body()));
    await assertFails(setDoc(ref(null, ALICE, 'goals'), body()));
  });
  it('DENY other document names, extra fields, client time and more than 200 items', async () => {
    await assertFails(setDoc(ref(ALICE, ALICE, 'notes'), body()));
    await assertFails(setDoc(ref(ALICE), body({ xp: 1 })));
    await assertFails(setDoc(ref(ALICE), body({ updatedAt: 5 })));
    await assertFails(setDoc(ref(ALICE), body({ items: Array.from({ length: 201 }, (_, i) => ({ id: String(i) })) })));
  });
  it('UNCHANGED the users/{uid} profile rules still apply (username, class lock)', async () => {
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'users', ALICE), { username: 'alice_a', hall: 'HB1', semester: 1, classLocked: true }));
    await assertFails(setDoc(doc(db(ALICE), 'users', ALICE), { hall: 'HB2' }, { merge: true }));
    await assertFails(setDoc(doc(db(ALICE), 'users', ALICE), { username: 'Alice A' }, { merge: true }));
    await assertSucceeds(setDoc(doc(db(ALICE), 'users', ALICE), { displayName: 'Alice' }, { merge: true }));
  });
  it('DENY today (deployed rules): the planner path is closed', async () => {
    const today = await environment(BASELINE, 'demo-grateapex-planner-today');
    await assertFails(setDoc(doc(today.authenticatedContext(ALICE).firestore(), 'users', ALICE, 'planner', 'goals'), body()));
    await today.cleanup();
  });
});

describe('proposed rules: coinTransfers (coin gifts between friends; never XP)', () => {
  let env;
  const CAROL = 'carol';
  const db = (uid) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore();
  const gift = (overrides = {}) => ({ from: ALICE, to: BOB, amount: 20, status: 'pending', createdAt: serverTimestamp(), ...overrides });
  async function seed({ friends = true } = {}) {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const f = ctx.firestore();
      await setDoc(doc(f, 'users', ALICE), { username: 'alice_a', coins: 50 });
      await setDoc(doc(f, 'users', BOB), { username: 'bob_b', coins: 5 });
      await setDoc(doc(f, 'users', CAROL), { username: 'carol_c', coins: 5 });
      if (friends) {
        await setDoc(doc(f, 'follows', `${ALICE}_${BOB}`), { follower: ALICE, followee: BOB });
        await setDoc(doc(f, 'follows', `${BOB}_${ALICE}`), { follower: BOB, followee: ALICE });
      }
    });
  }
  function send(uid, { paid = 30, data = gift(), id = 'g1' } = {}) {
    const f = db(uid);
    const batch = writeBatch(f);
    if (paid !== null) batch.update(doc(f, 'users', uid), { coins: paid });
    batch.set(doc(f, 'coinTransfers', id), data);
    return batch.commit();
  }
  async function seedGift(status = 'pending') {
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'coinTransfers', 'g1'), { from: ALICE, to: BOB, amount: 20, status, createdAt: new Date() }));
  }
  function claim(uid, { coins = 25 } = {}) {
    const f = db(uid);
    const batch = writeBatch(f);
    batch.update(doc(f, 'users', uid), { coins });
    batch.update(doc(f, 'coinTransfers', 'g1'), { status: 'claimed', claimedAt: serverTimestamp() });
    return batch.commit();
  }

  before(async () => { env = await environment(PROPOSED, 'demo-grateapex-coins'); });
  beforeEach(async () => { await env.clearFirestore(); });
  after(async () => { await env.cleanup(); });

  it('ALLOW a friend gift when the sender pays exactly the amount in the same batch', async () => { await seed(); await assertSucceeds(send(ALICE)); });
  it('DENY a gift without paying, or paying less than the amount', async () => {
    await seed();
    await assertFails(send(ALICE, { paid: null }));
    await assertFails(send(ALICE, { paid: 40 }));
  });
  it('DENY more than the balance, zero, fractions and over 1,000', async () => {
    await seed();
    await assertFails(send(ALICE, { paid: -10, data: gift({ amount: 60 }) }));
    await assertFails(send(ALICE, { paid: 50, data: gift({ amount: 0 }) }));
    await assertFails(send(ALICE, { paid: 49.5, data: gift({ amount: 0.5 }) }));
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'users', ALICE), { username: 'alice_a', coins: 5000 }));
    await assertFails(send(ALICE, { paid: 3999, data: gift({ amount: 1001 }) }));
  });
  it('DENY gifts to non-friends, to yourself, or in someone else’s name', async () => {
    await seed();
    await assertFails(send(ALICE, { data: gift({ to: CAROL }) }));
    await assertFails(send(ALICE, { data: gift({ to: ALICE }) }));
    await assertFails(send(BOB, { paid: 0, data: gift({ from: ALICE, amount: 5 }) }));
  });
  it('DENY any XP or other extra field, and a gift that starts claimed', async () => {
    await seed();
    await assertFails(send(ALICE, { data: gift({ xp: 20 }) }));
    await assertFails(send(ALICE, { data: gift({ status: 'claimed' }) }));
  });
  it('DENY one-sided follows (not friends)', async () => {
    await seed({ friends: false });
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'follows', `${ALICE}_${BOB}`), { follower: ALICE, followee: BOB }));
    await assertFails(send(ALICE));
  });
  it('ALLOW the friend to claim exactly the amount; DENY claiming more, twice, or by anyone else', async () => {
    await seed();
    await seedGift();
    await assertFails(claim(BOB, { coins: 100 }));
    await assertFails(claim(ALICE, { coins: 70 }));
    await assertFails(claim(CAROL, { coins: 25 }));
    await assertSucceeds(claim(BOB));
    await assertFails(claim(BOB, { coins: 45 }));
  });
  it('ALLOW the two people to read a gift; DENY others; never deleted', async () => {
    await seed();
    await seedGift();
    await assertSucceeds(getDoc(doc(db(ALICE), 'coinTransfers', 'g1')));
    await assertSucceeds(getDocs(query(collection(db(BOB), 'coinTransfers'), where('to', '==', BOB), where('status', '==', 'pending'))));
    await assertFails(getDoc(doc(db(CAROL), 'coinTransfers', 'g1')));
    await assertFails(deleteDoc(doc(db(ALICE), 'coinTransfers', 'g1')));
  });
  it('DENY today (deployed rules): the whole gift is refused, so no coins are taken', async () => {
    const today = await environment(BASELINE, 'demo-grateapex-coins-today');
    await today.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'users', ALICE), { username: 'alice_a', coins: 50 }));
    const f = today.authenticatedContext(ALICE).firestore();
    const batch = writeBatch(f);
    batch.update(doc(f, 'users', ALICE), { coins: 30 });
    batch.set(doc(f, 'coinTransfers', 'g1'), gift());
    await assertFails(batch.commit());
    let coins;
    await today.withSecurityRulesDisabled(async (ctx) => { coins = (await getDoc(doc(ctx.firestore(), 'users', ALICE))).data().coins; });
    if (coins !== 50) throw new Error(`coins changed to ${coins}`);
    await today.cleanup();
  });
});
