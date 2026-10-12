// Inventory of the original app's lessons and question banks, compared with
// this app's curriculum (Phase 6). Reads files only; publishes nothing.
//
//   node --import ./tests/register.mjs scripts/legacy-curriculum/inventory.mjs [old-app folder]
//
// Writes docs/legacy-curriculum-manifest.md and docs/legacy-curriculum-manifest.json.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const OLD = path.resolve(process.argv[2] || 'old-reference');
const { publishedTopics } = await import('@/data/curriculum');
const read = (file) => JSON.parse(readFileSync(path.join(OLD, file), 'utf8'));

const access = read('src/data/access.json');
const index = read('content/index.json');
const lessons = Array.isArray(index) ? index : index.lessons ?? Object.values(index);
const catalog = readFileSync(path.join(OLD, 'src/data/catalog.ts'), 'utf8');
const courseName = (id) => catalog.match(new RegExp(`id: "${id}", name: "([^"]+)"`))?.[1] ?? id;

// Words that say nothing about the topic.
const STOP = new Set('a an and the of in on to for with from by is are as at its into how what why introduction overview basic basics part guide explained scratch i ii iii iv v 1 2 3 4 5 6 7 8 9 10 lesson module'.split(' '));
// Too general to suggest the same topic on their own.
const GENERIC = new Set('functions function errors error acids acid proteins protein enzymes enzyme metabolic metabolism blood cell cells cycle synthesis system systems structure structures body human'.split(' '));
// Only courses about the subjects this app teaches can overlap with it.
const MEDICAL = new Set(['biochemistry', 'biolchem', 'physiology', 'anatomy', 'medgen', 'cellstruct']);
const words = (text) => new Set(String(text).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)));
const overlap = (a, b) => {
  const shared = [...a].filter((w) => b.has(w));
  const specific = shared.filter((w) => !GENERIC.has(w));
  return specific.length ? { score: shared.length / Math.min(a.size, b.size), shared } : { score: 0, shared };
};

const newTargets = publishedTopics.flatMap((topic) => [
  { kind: 'topic', id: topic.id, title: topic.title, subject: topic.subject, words: words(`${topic.title} ${topic.description ?? ''}`) },
  ...topic.lessons.map((lesson) => ({ kind: 'lesson', id: lesson.id, title: `${topic.title} — ${lesson.title}`, subject: topic.subject, words: words(lesson.title) })),
]);

// Question banks: validity checks only (medical accuracy needs a person).
const banks = {};
for (const file of readdirSync(path.join(OLD, 'src/data/courses'))) {
  const data = read(`src/data/courses/${file}`);
  const questions = (data.sets ?? []).flatMap((set) => set.questions ?? []);
  const seen = new Set();
  let invalid = 0;
  let duplicates = 0;
  let noExplanation = 0;
  let figure = 0;
  for (const q of questions) {
    const key = String(q.q).trim().toLowerCase();
    if (seen.has(key)) duplicates += 1;
    seen.add(key);
    if (!Array.isArray(q.o) || q.o.length < 2 || !Number.isInteger(q.a) || q.a < 0 || q.a >= q.o.length || new Set(q.o).size !== q.o.length) invalid += 1;
    if (!String(q.e ?? '').trim()) noExplanation += 1;
    if (/\b(figure|image|diagram|picture|shown|above|below|labell?ed)\b/i.test(q.q)) figure += 1;
  }
  banks[data.id] = { sets: (data.sets ?? []).length, questions: questions.length, invalid, duplicates, noExplanation, needsFigure: figure };
}

const rows = lessons
  .sort((a, b) => a.course.localeCompare(b.course) || a.order - b.order)
  .map((lesson) => {
    const file = `content/lessons/${lesson.id}.json`;
    const body = existsSync(path.join(OLD, file)) ? read(file) : null;
    const blocks = body ? body.sections.flatMap((section) => section.blocks ?? []) : [];
    const figures = blocks.filter((block) => block.k === 'fig' || block.type === 'fig').length;
    const scope = access[lesson.course] ?? { halls: [], semesters: [] };
    const own = words(`${lesson.title} ${lesson.sub ?? ''}`);
    const best = !MEDICAL.has(lesson.course) ? null : newTargets.map((target) => ({ target, ...overlap(own, target.words) })).filter((m) => m.score >= 0.5 && m.shared.length >= 1).sort((a, b) => b.score - a.score)[0];
    let disposition;
    if (!body) disposition = 'incomplete — lesson file missing';
    else if (best) disposition = `possible overlap with ${best.target.kind} "${best.target.title}" (shared: ${best.shared.join(', ')}) — compare before adapting`;
    else if (lesson.course === 'biochemistry' || lesson.course === 'physiology' || lesson.course === 'anatomy') disposition = 'new for a subject this app has — suitable for adaptation after academic review';
    else disposition = 'new subject for this app (needs a subject/course before adaptation)';
    return {
      id: lesson.id,
      course: lesson.course,
      courseName: courseName(lesson.course),
      classification: scope.halls.map((hall) => scope.semesters.map((sem) => `${hall} S${sem}`)).flat().join(', ') || 'unknown',
      title: lesson.title,
      sections: (lesson.sections ?? []).length,
      linkedQuestions: lesson.qcount ?? (lesson.qids ?? []).length,
      figures,
      source: file,
      disposition,
    };
  });

const byCourse = Object.entries(Object.groupBy(rows, (row) => row.course)).map(([course, items]) => ({
  course,
  name: courseName(course),
  classification: items[0].classification,
  lessons: items.length,
  overlaps: items.filter((row) => row.disposition.startsWith('possible overlap')).length,
  bank: banks[course] ?? null,
}));

writeFileSync('docs/legacy-curriculum-manifest.json', JSON.stringify({ generatedAt: new Date().toISOString(), oldApp: path.relative(process.cwd(), OLD), courses: byCourse, lessons: rows, newCurriculum: publishedTopics.map((t) => ({ id: t.id, subject: t.subject, title: t.title, lessons: t.lessons.length })) }, null, 1));

const md = [
  '# Original-app curriculum — inventory and mapping',
  '',
  `Generated by \`scripts/legacy-curriculum/inventory.mjs\` on ${new Date().toISOString().slice(0, 10)} from the original app's files (\`content/index.json\`, \`content/lessons/*.json\`, \`src/data/courses/*.json\`, \`src/data/access.json\`). Nothing has been adapted or published. Full rows: \`docs/legacy-curriculum-manifest.json\`.`,
  '',
  '**Classification** comes from the original app\'s own access list (`access.json`), not from assumptions. This app\'s published curriculum is **HB2 · Semester 1** (Biochemistry, ' + publishedTopics.length + ' topics); the original app\'s courses are HB1.',
  '',
  '**Medical accuracy is not checked by this script.** Every lesson and question needs academic review before it is adapted; "possible overlap" means similar titles, to be compared by a person.',
  '',
  '## Courses',
  '',
  '| Course | Original class | Lessons | Possible overlaps | Questions (sets) | Invalid | Duplicate | No explanation | Needs a figure |',
  '|---|---|---|---|---|---|---|---|---|',
  ...byCourse.map((c) => `| ${c.name} (\`${c.course}\`) | ${c.classification} | ${c.lessons} | ${c.overlaps} | ${c.bank ? `${c.bank.questions} (${c.bank.sets})` : '—'} | ${c.bank?.invalid ?? '—'} | ${c.bank?.duplicates ?? '—'} | ${c.bank?.noExplanation ?? '—'} | ${c.bank?.needsFigure ?? '—'} |`),
  '',
  `Totals: ${rows.length} lessons, ${Object.values(banks).reduce((n, b) => n + b.questions, 0)} questions in ${Object.keys(banks).length} banks.`,
  '',
  '## Lessons',
  '',
  '| Lesson | Course | Class | Sections | Figures | Linked questions | Disposition |',
  '|---|---|---|---|---|---|---|',
  ...rows.map((r) => `| ${r.title} (\`${r.id}\`) | ${r.courseName} | ${r.classification} | ${r.sections} | ${r.figures} | ${r.linkedQuestions} | ${r.disposition} |`),
  '',
  '## How a lesson would be adapted (after review and approval)',
  '',
  '1. A reviewer confirms the content and the class/semester it belongs to.',
  '2. It becomes a topic in `src/data/topics/<topic>/` with the three layers this app requires (interactive lesson, reading, quiz), keeping `sourceRefs` to the original file.',
  '3. Questions are converted only where the answer key and explanation are confirmed; invalid, duplicate or figure-dependent ones are fixed or left out.',
  '4. `npm test` (content checks) must pass, and the topic is published in `src/data/content-catalog.ts` only after that.',
  '',
].join('\n');
writeFileSync('docs/legacy-curriculum-manifest.md', md);
console.log(`${rows.length} lessons, ${byCourse.length} courses → docs/legacy-curriculum-manifest.md`);
