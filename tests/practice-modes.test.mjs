import assert from 'node:assert/strict';
import { test } from 'node:test';

import { modeSettings, parsePracticeMode, setKind } from '../src/data/practice-modes.ts';
import { shuffleSeeded } from '../src/data/legacy-questions.ts';

const from = (query) => { const p = new URLSearchParams(query); return (key) => p.get(key) ?? undefined; };

test('practice links pick the right mode', () => {
  assert.deepEqual(parsePracticeMode(from('mock=3')), { kind: 'mock', n: 3 });
  assert.equal(parsePracticeMode(from('mock=9')).kind, 'practice');
  assert.equal(parsePracticeMode(from('drill=1')).kind, 'drill');
  assert.deepEqual(parsePracticeMode(from('prepost=post')), { kind: 'prepost', phase: 'post' });
  assert.deepEqual(parsePracticeMode(from('set=q1&exam=1')), { kind: 'set', setId: 'q1', exam: true });
  const custom = parsePracticeMode(from('custom=1&lessons=a,b&sets=s1&count=30&seconds=20&feedback=submit'));
  assert.deepEqual(custom, { kind: 'custom', custom: { lessons: ['a', 'b'], sets: ['s1'], count: 30, seconds: 20, feedback: 'submit' } });
  assert.equal(parsePracticeMode(from('custom=1&count=999&seconds=7')).custom.count, 20);
});

test('exams show answers at the end and keep questions as written; drills are timed', () => {
  const mock = modeSettings({ kind: 'mock', n: 1 });
  assert.equal(mock.count, 70);
  assert.equal(mock.feedback, 'submit');
  assert.equal(mock.variants, false);
  assert.equal(mock.fixed, true);
  assert.equal(modeSettings({ kind: 'set', setId: 'p', exam: true }).count, Infinity);
  assert.equal(modeSettings({ kind: 'drill' }).seconds, 15);
  assert.equal(modeSettings({ kind: 'prepost', phase: 'pre' }).count, 10);
  assert.equal(setKind('Predicted Paper 2'), 'predicted');
  assert.equal(setKind('Past Questions 1'), 'past');
  assert.equal(setKind('Quiz 4 · Enzymes'), 'quiz');
});

test('a seeded shuffle gives the same paper every time', () => {
  const items = Array.from({ length: 50 }, (_, i) => i);
  assert.deepEqual(shuffleSeeded(items, 'mock:anatomy:1'), shuffleSeeded(items, 'mock:anatomy:1'));
  assert.notDeepEqual(shuffleSeeded(items, 'mock:anatomy:1'), shuffleSeeded(items, 'mock:anatomy:2'));
  assert.deepEqual([...shuffleSeeded(items, 'x')].sort((a, b) => a - b), items);
});
