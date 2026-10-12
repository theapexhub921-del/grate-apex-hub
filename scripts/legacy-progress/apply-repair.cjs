// APPLY or ROLL BACK a reviewed repair plan (steps 4–5 of
// docs/legacy-progress-repair-plan.md). Only with the owner's approval.
//
//   node scripts/legacy-progress/apply-repair.cjs <plan.json> <log.jsonl> --confirm [--live] [--project id]
//   node scripts/legacy-progress/apply-repair.cjs --rollback <log.jsonl> --confirm [--live] [--project id]
//
// Safety:
// - refuses to run without --confirm, and against anything but the emulator
//   (FIRESTORE_EMULATOR_HOST) unless --live is given;
// - one transaction per entry: the value must still equal what the dry run saw,
//   otherwise the entry is skipped and reported;
// - writes only the single field path lessons.<lessonId> — never a whole document;
// - every write is appended to the log (before / after) so it can be rolled back.
// Needs firebase-admin (run with NODE_PATH=<folder>/node_modules).
const fs = require('node:fs');
const util = require('node:util');
const { initializeApp } = require('firebase-admin/app');
const { FieldPath, getFirestore } = require('firebase-admin/firestore');

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => (args.indexOf(name) >= 0 ? args[args.indexOf(name) + 1] : undefined);
const rollback = flag('--rollback');
const positional = args.filter((arg, i) => !arg.startsWith('--') && !['--project', '--rollback'].includes(args[i - 1]));
const projectId = value('--project') || 'grate-apex';

if (!flag('--confirm')) {
  console.error('Refusing to write without --confirm.');
  process.exit(2);
}
if (!process.env.FIRESTORE_EMULATOR_HOST && !flag('--live')) {
  console.error('Refusing to write to a live project without --live (and the owner’s approval).');
  process.exit(2);
}

const decode = (v) => (v === 'NaN' ? Number.NaN : v);
const same = (a, b) => (Number.isNaN(a) && Number.isNaN(b)) || util.isDeepStrictEqual(a, b);

(async () => {
  initializeApp({ projectId });
  const db = getFirestore();
  const entries = rollback
    ? fs.readFileSync(value('--rollback'), 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line))
        .filter((entry) => entry.status === 'applied')
        .map((entry) => ({ uid: entry.uid, lessonId: entry.lessonId, expect: entry.after, write: entry.before }))
    : JSON.parse(fs.readFileSync(positional[0], 'utf8')).changes.map((change) => ({ uid: change.uid, lessonId: change.lessonId, expect: change.current, write: change.proposed }));
  const logFile = rollback ? `${value('--rollback')}.rollback.jsonl` : positional[1];
  if (!logFile) {
    console.error('usage: apply-repair.cjs <plan.json> <log.jsonl> --confirm');
    process.exit(2);
  }

  let applied = 0;
  let skipped = 0;
  for (const entry of entries) {
    const ref = db.collection('progress').doc(entry.uid);
    const path = new FieldPath('lessons', entry.lessonId);
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const current = snap.exists ? snap.get(path) : undefined;
      if (!same(current, decode(entry.expect))) return { status: 'skipped: changed since the dry run', before: current ?? null };
      tx.update(ref, path, decode(entry.write));
      return { status: 'applied', before: current };
    });
    fs.appendFileSync(logFile, `${JSON.stringify({ at: new Date().toISOString(), uid: entry.uid, lessonId: entry.lessonId, after: entry.write, ...result })}\n`);
    if (result.status === 'applied') applied += 1;
    else skipped += 1;
  }
  console.log(`${rollback ? 'rolled back' : 'applied'} ${applied}, skipped ${skipped}; log: ${logFile}`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
