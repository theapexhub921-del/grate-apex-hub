// Exports the original app's question banks (old-reference/src/data/courses/*.json)
// to public/curriculum/<course>.json, which the app loads on demand
// (src/data/legacy-study.ts). Lessons themselves are NOT exported: the app reads
// them from the shared database (lessons, lessonContent, lessonImages), as the
// original app does, so access stays limited to each class.
//
// Each question keeps the original app's stable id — hash(course|question|options),
// as in old-reference/src/learning.ts — so a lesson's `qids` still point at it.
//
//   node scripts/legacy-curriculum/export-banks.mjs [path-to-old-app]
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const OLD = path.resolve(process.argv[2] ?? 'old-reference');
const OUT = path.resolve('public/curriculum');
mkdirSync(OUT, { recursive: true });

// The original app's fingerprint (FNV-1a, base 36).
function hash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

const summary = [];
for (const file of readdirSync(path.join(OLD, 'src/data/courses')).filter((name) => name.endsWith('.json')).sort()) {
  const course = JSON.parse(readFileSync(path.join(OLD, 'src/data/courses', file), 'utf8'));
  let count = 0;
  const sets = course.sets.map((set) => ({
    id: set.id,
    name: set.name,
    questions: set.questions.map((q) => {
      count++;
      const out = { id: hash(course.id + '|' + q.q + '|' + q.o.join('|')), q: q.q, o: q.o, a: q.a, e: q.e, t: q.t };
      if (q.p?.length) out.p = q.p;
      if (q.kind) out.kind = q.kind;
      if (q.ans !== undefined) out.ans = q.ans;
      return out;
    }),
  }));
  writeFileSync(path.join(OUT, `${course.id}.json`), JSON.stringify({ id: course.id, name: course.name, sets }));
  summary.push(`${course.id}: ${count} questions in ${sets.length} sets`);
}
console.log(summary.join('\n'));
