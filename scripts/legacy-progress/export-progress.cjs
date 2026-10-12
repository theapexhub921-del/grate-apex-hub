// READ-ONLY backup of every progress/{uid} document (step 1 of
// docs/legacy-progress-repair-plan.md). Writes nothing to Firestore.
//
//   node scripts/legacy-progress/export-progress.cjs <out.json> [--project grate-apex]
//
// Credentials: the emulator (FIRESTORE_EMULATOR_HOST) or, for the live project
// and only with the owner's approval, GOOGLE_APPLICATION_CREDENTIALS pointing to
// a read-only service-account key kept OUTSIDE this repository.
// Needs firebase-admin (not a project dependency): install it in another folder
// and run with NODE_PATH=<that folder>/node_modules.
const crypto = require('node:crypto');
const fs = require('node:fs');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

const out = process.argv[2];
const projectFlag = process.argv.indexOf('--project');
const projectId = projectFlag > 0 ? process.argv[projectFlag + 1] : 'grate-apex';
if (!out) {
  console.error('usage: export-progress.cjs <out.json> [--project <id>]');
  process.exit(2);
}

// JSON can't hold NaN (the original app's merge produces it); keep it visible.
const encode = (value) => {
  if (typeof value === 'number' && Number.isNaN(value)) return 'NaN';
  if (value instanceof Timestamp) return { __timestamp: value.toMillis() };
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encode(v)]));
  return value;
};

(async () => {
  initializeApp({ projectId });
  const snap = await getFirestore().collection('progress').get();
  const documents = snap.docs.map((doc) => ({ id: doc.id, updateTime: doc.updateTime.toDate().toISOString(), data: encode(doc.data()) }));
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), projectId, emulator: Boolean(process.env.FIRESTORE_EMULATOR_HOST), documents }, null, 1);
  fs.writeFileSync(out, body);
  console.log(`exported ${documents.length} progress document(s) to ${out}`);
  console.log(`sha256 ${crypto.createHash('sha256').update(body).digest('hex')}`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
