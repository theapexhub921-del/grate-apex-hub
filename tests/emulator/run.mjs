// Runs every *.e2e.mjs check in its own Node process (a fresh copy of the app's
// Firebase objects each time). Start it inside the emulators, from this folder:
//   firebase emulators:exec --only firestore,auth --project demo-grateapex "node run.mjs"
// Needs Java 21+ and firebase-tools (not project dependencies). Never touches
// the live project: connect.mjs refuses to continue unless both emulators are used.
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const only = process.argv[2];
const files = readdirSync(here).filter((name) => name.endsWith('.e2e.mjs') && (!only || name.includes(only))).sort();
let failed = 0;
for (const file of files) {
  console.log(`\n=== ${file}`);
  const result = spawnSync(process.execPath, ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', '--import', './register.mjs', file], { cwd: here, stdio: 'inherit', env: process.env });
  if (result.status !== 0) failed += 1;
}
console.log(failed === 0 ? `\n${files.length} emulator check file(s) passed.` : `\n${failed} of ${files.length} emulator check file(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
