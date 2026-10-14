// One-time script: import past questions from the HTML files in
// content/GrAte Apex Past Questions/ into the existing course banks
// in public/curriculum/.
//
// Usage:  node scripts/import-past-questions.mjs

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { createHash } from 'crypto';

// ── Config: which HTML file maps to which course bank ────────────
const MAPPING = [
  { file: 'GrAte Apex · Biochemistry & Immunology Practice (30 questions).html',          bank: 'biochemistry', label: 'Biochemistry & Immunology' },
  { file: 'GrAte Apex · Biochemistry_ DNA, Genes & Vitamin A (34 questions).html',        bank: 'biochemistry', label: 'DNA, Genes & Vitamin A' },
  { file: 'GrAte Apex · Collagen & Phototransduction (265 statements).html',               bank: 'biochemistry', label: 'Collagen & Phototransduction' },
  { file: 'GrAte Apex · Haem, Haemoglobin & Haemostasis (178 statements).html',           bank: 'biochemistry', label: 'Haem, Haemoglobin & Haemostasis' },
  { file: 'GrAte Apex · Hormones & Endocrine System (104 statements).html',                bank: 'biochemistry', label: 'Hormones & Endocrine System' },
  { file: 'GrAte Apex · Immunology Practice (75 questions).html',                          bank: 'biochemistry', label: 'Immunology' },
  { file: 'GrAte Apex · CVS & Respiratory MCQ Practice (67 questions).html',               bank: 'physiology',   label: 'CVS & Respiratory' },
  { file: 'GrAte Apex · Physiology MCQ Practice.html',                                     bank: 'physiology',   label: 'Physiology MCQ' },
];

const SRC_DIR  = 'content/GrAte Apex Past Questions';
const BANK_DIR = 'public/curriculum';

// ── Helpers ──────────────────────────────────────────────────────

/** Short unique-ish ID (6 chars) from question text. */
function qid(text) {
  return createHash('sha256').update(text).digest('hex').slice(0, 6);
}

/** Parse the JSON blob from an HTML file. */
function parseHtml(filename) {
  const html = readFileSync(`${SRC_DIR}/${filename}`, 'utf8');
  const match = html.match(/<script type="application\/json" id="d">([\s\S]*?)<\/script>/);
  if (!match) throw new Error(`No data found in ${filename}`);
  return JSON.parse(match[1]);
}

/** Convert an HTML-format question to bank format. */
function toBankQuestion(q) {
  // HTML format:  { s, q, o, a, alt, n }
  // Bank format:  { id, q, o, a, e, t }
  //   id  — short unique ID
  //   q   — question text
  //   o   — options array
  //   a   — correct answer index (number)
  //   e   — explanation (from 'n')
  //   t   — tag (empty string)
  const result = {
    id: qid(q.q),
    q: q.q,
    o: q.o,
    a: q.a,
    e: q.n || '',
    t: '',
  };
  // If there are alternative correct answers, note them in the explanation
  if (q.alt && q.alt.length > 0) {
    const altLabels = q.alt.map(i => q.o[i]).join(', ');
    result.e = result.e
      ? `${result.e} (Also accepted: ${altLabels})`
      : `Also accepted: ${altLabels}`;
  }
  return result;
}

// ── Count existing "Past Questions" sets per bank ────────────────

function countPastSets(bank) {
  let n = 0;
  for (const set of bank.sets) {
    if (/^Past Questions/i.test(set.name)) n++;
  }
  return n;
}

// ── Main ─────────────────────────────────────────────────────────

// Group entries by bank
const byBank = {};
for (const entry of MAPPING) {
  if (!byBank[entry.bank]) byBank[entry.bank] = [];
  byBank[entry.bank].push(entry);
}

let totalAdded = 0;

for (const [bankId, entries] of Object.entries(byBank)) {
  const bankPath = `${BANK_DIR}/${bankId}.json`;
  const bank = JSON.parse(readFileSync(bankPath, 'utf8'));

  const existingSetCount = bank.sets.length;
  let pastCount = countPastSets(bank);
  let setIndex = existingSetCount;

  console.log(`\n── ${bank.name} (${bankId}) ──`);
  console.log(`   Existing sets: ${existingSetCount}, existing past-question sets: ${pastCount}`);

  for (const entry of entries) {
    const data = parseHtml(entry.file);
    const questions = data.q.map(toBankQuestion);

    // Check for duplicate IDs within this set
    const ids = new Set();
    for (const q of questions) {
      while (ids.has(q.id)) {
        q.id = q.id.slice(0, 5) + String.fromCharCode(97 + Math.floor(Math.random() * 26));
      }
      ids.add(q.id);
    }

    setIndex++;
    pastCount++;
    const setId = `s${setIndex}`;
    const setName = `Past Questions ${pastCount} — ${entry.label}`;

    bank.sets.push({
      id: setId,
      name: setName,
      questions,
    });

    console.log(`   + ${setId}: ${setName} (${questions.length} questions)`);
    totalAdded += questions.length;
  }

  writeFileSync(bankPath, JSON.stringify(bank));
  console.log(`   Saved ${bankPath} (${bank.sets.length} sets total)`);
}

console.log(`\nDone! Added ${totalAdded} questions across ${MAPPING.length} new sets.`);
