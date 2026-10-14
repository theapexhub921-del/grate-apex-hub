// Fix-up script:
// 1. Strip the 8 newly added sets from biochemistry.json and physiology.json
// 2. Create hb2-biochemistry.json and hb2-physiology.json with the correct sets
//
// Usage:  node scripts/fix-past-questions.mjs

import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';

const BANK_DIR = 'public/curriculum';
const SRC_DIR  = 'content/GrAte Apex Past Questions';

// ── Step 1: Revert the wrongly added sets from HB1 banks ──────────

for (const bankId of ['biochemistry', 'physiology']) {
  const path = `${BANK_DIR}/${bankId}.json`;
  const bank = JSON.parse(readFileSync(path, 'utf8'));
  const before = bank.sets.length;
  // Strip any set whose name contains " — " (our import marker)
  bank.sets = bank.sets.filter(s => !s.name.includes(' — '));
  console.log(`${bankId}: removed ${before - bank.sets.length} sets, ${bank.sets.length} remain`);
  writeFileSync(path, JSON.stringify(bank));
}

// ── Step 2: Build HB2 bank files ─────────────────────────────────

function qid(text) {
  return createHash('sha256').update(text).digest('hex').slice(0, 6);
}

function parseHtml(filename) {
  const html = readFileSync(`${SRC_DIR}/${filename}`, 'utf8');
  const match = html.match(/<script type="application\/json" id="d">([\s\S]*?)<\/script>/);
  if (!match) throw new Error(`No data found in ${filename}`);
  return JSON.parse(match[1]);
}

function toBankQuestion(q) {
  const result = { id: qid(q.q), q: q.q, o: q.o, a: q.a, e: q.n || '', t: '' };
  if (q.alt && q.alt.length > 0) {
    const altLabels = q.alt.map(i => q.o[i]).join(', ');
    result.e = result.e
      ? `${result.e} (Also accepted: ${altLabels})`
      : `Also accepted: ${altLabels}`;
  }
  return result;
}

// HB2 Biochemistry — 6 files
const biochemFiles = [
  { file: 'GrAte Apex · Biochemistry & Immunology Practice (30 questions).html',        label: 'Biochemistry & Immunology' },
  { file: 'GrAte Apex · Biochemistry_ DNA, Genes & Vitamin A (34 questions).html',      label: 'DNA, Genes & Vitamin A' },
  { file: 'GrAte Apex · Collagen & Phototransduction (265 statements).html',             label: 'Collagen & Phototransduction' },
  { file: 'GrAte Apex · Haem, Haemoglobin & Haemostasis (178 statements).html',         label: 'Haem, Haemoglobin & Haemostasis' },
  { file: 'GrAte Apex · Hormones & Endocrine System (104 statements).html',              label: 'Hormones & Endocrine System' },
  { file: 'GrAte Apex · Immunology Practice (75 questions).html',                        label: 'Immunology' },
];

// HB2 Physiology — 2 files
const physioFiles = [
  { file: 'GrAte Apex · CVS & Respiratory MCQ Practice (67 questions).html',            label: 'CVS & Respiratory' },
  { file: 'GrAte Apex · Physiology MCQ Practice.html',                                   label: 'Physiology MCQ' },
];

function buildBank(courseId, courseName, entries) {
  const sets = [];
  let pastCount = 0;
  for (const entry of entries) {
    const data = parseHtml(entry.file);
    const questions = data.q.map(toBankQuestion);
    // Deduplicate IDs within the set
    const ids = new Set();
    for (const q of questions) {
      while (ids.has(q.id)) q.id = q.id.slice(0, 5) + Math.random().toString(36)[2];
      ids.add(q.id);
    }
    pastCount++;
    const setId = `s${pastCount}`;
    const setName = `Past Questions ${pastCount} — ${entry.label}`;
    sets.push({ id: setId, name: setName, questions });
    console.log(`  ${courseId} ${setId}: ${setName} (${questions.length} qs)`);
  }
  const bank = { id: courseId, name: courseName, sets };
  const path = `${BANK_DIR}/${courseId}.json`;
  writeFileSync(path, JSON.stringify(bank));
  const total = sets.reduce((n, s) => n + s.questions.length, 0);
  console.log(`  Saved ${path} (${sets.length} sets, ${total} questions)`);
  return bank;
}

console.log('\n── Creating HB2 banks ──');
buildBank('hb2-biochemistry', 'HB2 Biochemistry', biochemFiles);
buildBank('hb2-physiology',   'HB2 Physiology',   physioFiles);

console.log('\nDone.');
