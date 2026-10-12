import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getLessonQuizBank, getSubjectTopics } from '../src/data/curriculum.ts';
import { buildLocalPractice, HB2_COURSES, hb2LessonById, hb2Lessons, hb2Sets, lessonBody, richWithTerms } from '../src/data/hb2-study.ts';
import { parseRich, plainText } from '../src/data/legacy-questions.ts';

test('HB2 courses list every lesson of their subject, in course order', () => {
  const biochem = hb2Lessons('hb2-biochemistry');
  const expected = getSubjectTopics('biochemistry').flatMap((topic) => topic.lessons.map((lesson) => lesson.id));
  assert.deepEqual(biochem.map((lesson) => lesson.id), expected);
  assert.ok(biochem.length > 10);
  for (const lesson of biochem) {
    assert.equal(lesson.course, 'hb2-biochemistry');
    assert.equal(lesson.subject, 'biochemistry');
    assert.deepEqual(lesson.qids, getLessonQuizBank(lesson.id).map((question) => question.id));
  }
  assert.equal(HB2_COURSES.length, 3);
});

test('a lesson becomes one section per reading chunk, with study aids and tappable key words', () => {
  const { lesson } = hb2LessonById('fatty-acid-biosynthesis-1');
  const body = lessonBody(lesson);
  assert.equal(body.sections.length, lesson.chunks.length);
  assert.ok(body.extras?.facts?.length);
  const text = JSON.stringify(body);
  const terms = lesson.chunks.flatMap((chunk) => chunk.terms ?? []);
  if (terms.length) assert.match(text, /<term d=|"k":"term"/);
  for (const section of body.sections) assert.ok(section.blocks.length > 0, section.id);
});

test('rich text escapes and marks a key word once', () => {
  const used = new Set();
  const out = richWithTerms('Acetyl-CoA carboxylase uses biotin; pH < 7 and biotin again.', [{ term: 'biotin', meaning: 'A "B" vitamin' }], used);
  assert.match(out, /&lt; 7/);
  assert.equal((out.match(/<term/g) ?? []).length, 1);
  const runs = parseRich(out);
  assert.equal(runs.find((run) => run.term)?.term, 'A "B" vitamin');
  assert.equal(plainText(out), 'Acetyl-CoA carboxylase uses biotin; pH < 7 and biotin again.');
});

test('practice mixes types, keeps original ids and is deterministic', () => {
  const source = hb2Sets('hb2-biochemistry').flatMap((set) => set.questions);
  const a = buildLocalPractice(source, 40, 'seed-1');
  const b = buildLocalPractice(source, 40, 'seed-1');
  assert.deepEqual(a.map((q) => q.id), b.map((q) => q.id));
  const ids = new Set(source.map((q) => q.id));
  const original = a.filter((q) => ids.has(q.id));
  assert.ok(original.length > 0);
  const derived = a.filter((q) => !ids.has(q.id));
  for (const q of derived) {
    assert.equal(q.reviewEligible, false);
    assert.ok(q.lessonId, q.id);
  }
});
