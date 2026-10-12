// The legacy-progress repair tooling end to end, on FIXTURE data in the
// emulator only (project demo-repair): export → dry run → apply → rollback.
// Needs firebase-admin in the folder named by DEPS.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { check, finish } from './connect.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SCRIPTS = path.join(ROOT, 'scripts', 'legacy-progress');
const NODE_PATH = path.join(process.env.DEPS, 'node_modules');
const requireDep = createRequire(path.join(process.env.DEPS, 'package.json'));
const { initializeApp } = requireDep('firebase-admin/app');
const { FieldPath, getFirestore } = requireDep('firebase-admin/firestore');
const PROJECT = 'demo-repair';
const EMULATOR = { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8085' };
const work = mkdtempSync(path.join(os.tmpdir(), 'repair-'));
const file = (name) => path.join(work, name);
const T = 1791591792619;
const APP_LESSON = 'blood-coagulation-and-fibrinolysis-1';

process.env.FIRESTORE_EMULATOR_HOST = EMULATOR.FIRESTORE_EMULATOR_HOST;
initializeApp({ projectId: PROJECT });
const db = getFirestore();

const run = (script, args, env = EMULATOR) =>
  spawnSync(process.execPath, [...(script.endsWith('.mjs') ? ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', '--import', './tests/register.mjs'] : []), path.join(SCRIPTS, script), ...args], {
    cwd: ROOT, encoding: 'utf8', env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, NODE_PATH, ...env },
  });

// Fixtures shaped like the damage reproduced on 2026-10-10.
await db.doc('progress/u1').set({
  xp: 500, cards: { q1: { box: 2 } },
  lessons: { 'biolchem-1': { completedAt: 3, xp: 0 }, 'medgen-2': { completedAt: T, xp: 0 }, 'bmc-4': 7, [APP_LESSON]: { completedAt: T, xp: 20 } },
});
await db.doc('progress/u2').set({ xp: 10, lessons: { 'biolchem-1': Number.NaN, 'stats-1': { completedAt: 5, xp: 10 }, 'algebra-2': 2 } });
await db.doc('progress/u3').set({ xp: 1 });

let r = run('export-progress.cjs', [file('backup.json'), '--project', PROJECT]);
const backup = JSON.parse(readFileSync(file('backup.json'), 'utf8'));
check('export: read-only backup of all 3 documents, NaN kept visible', r.status === 0 && backup.documents.length === 3 && backup.documents.find((d) => d.id === 'u2').data.lessons['biolchem-1'] === 'NaN', r.stderr || backup);

r = run('dry-run.mjs', [file('backup.json'), file('plan.json')]);
const plan = JSON.parse(readFileSync(file('plan.json'), 'utf8'));
check('dry run: 2 entries to restore in 1 document, NaN and odd shapes for review', r.status === 0 && plan.changes.length === 2 && plan.documentsToChange === 1 && plan.review.length === 2, r.stderr || plan);
check('dry run changed nothing', JSON.stringify((await db.doc('progress/u1').get()).get('lessons')['biolchem-1']) === JSON.stringify({ completedAt: 3, xp: 0 }));

r = run('apply-repair.cjs', [file('plan.json'), file('log.jsonl')]);
check('apply refuses without --confirm', r.status === 2 && /--confirm/.test(r.stderr), r.stderr);
r = run('apply-repair.cjs', [file('plan.json'), file('log.jsonl'), '--confirm'], {});
check('apply refuses a live project without --live', r.status === 2 && /--live/.test(r.stderr), r.stderr);

// The original app changes one entry after the dry run.
await db.doc('progress/u1').update(new FieldPath('lessons', 'medgen-2'), 1);

r = run('apply-repair.cjs', [file('plan.json'), file('log.jsonl'), '--confirm', '--project', PROJECT]);
let u1 = (await db.doc('progress/u1').get()).data();
check('apply restores the rewritten count', r.status === 0 && u1.lessons['biolchem-1'] === 3, r.stderr || u1.lessons);
check('apply skips an entry changed since the dry run', u1.lessons['medgen-2'] === 1 && /skipped 1/.test(r.stdout), r.stdout);
check('apply leaves healthy numbers, new-app lessons and other fields alone', u1.lessons['bmc-4'] === 7 && u1.lessons[APP_LESSON].xp === 20 && u1.cards.q1.box === 2 && u1.xp === 500, u1);
const u2 = (await db.doc('progress/u2').get()).data();
check('apply does not touch documents needing review', Number.isNaN(u2.lessons['biolchem-1']) && u2.lessons['stats-1'].xp === 10, u2.lessons);

r = run('apply-repair.cjs', ['--rollback', file('log.jsonl'), '--confirm', '--project', PROJECT]);
u1 = (await db.doc('progress/u1').get()).data();
check('rollback puts the logged value back', r.status === 0 && JSON.stringify(u1.lessons['biolchem-1']) === JSON.stringify({ completedAt: 3, xp: 0 }) && u1.lessons['medgen-2'] === 1, r.stderr || u1.lessons);

finish();
