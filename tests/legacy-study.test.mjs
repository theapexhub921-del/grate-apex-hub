// The original app's courses studied here: its questions become this app's
// question types without changing their meaning.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const { buildPractice, parseRich, plainText, toQuestion } = await import('@/data/legacy-questions');
const { isAnswerCorrect } = await import('@/data/questions');

const bank = JSON.parse(readFileSync('public/curriculum/biochemistry.json', 'utf8'));
const all = bank.sets.flatMap((set) => set.questions.map((q) => ({ ...q, set: set.id, setName: set.name })));

describe('original questions in this app', () => {
  it('rich text: bold, italics, sub/superscript and tappable terms', () => {
    const runs = parseRich('<b>ATP</b> has <term d="adenosine triphosphate">3 phosphates</term> and H<sub>2</sub>O');
    assert.equal(runs[0].b, true);
    assert.equal(runs.find((run) => run.term)?.term, 'adenosine triphosphate');
    assert.equal(runs.find((run) => run.sub)?.t, '2');
    assert.equal(plainText('<b>A &amp; B</b>'), 'A & B');
  });
  it('a multiple-choice question keeps its options and answer', () => {
    const q = all.find((item) => item.o.length === 4 && item.a >= 0);
    const converted = toQuestion(q, { course: 'biochemistry', concept: 'x' });
    assert.equal(converted.type, 'choice');
    assert.equal(isAnswerCorrect(converted, q.a), true);
    assert.equal(isAnswerCorrect(converted, (q.a + 1) % 4), false);
  });
  it('typed questions stay typed (the original kind "input")', () => {
    const stats = JSON.parse(readFileSync('public/curriculum/stats.json', 'utf8'));
    const typed = stats.sets.flatMap((set) => set.questions).find((q) => q.kind === 'input');
    const converted = toQuestion(typed, { course: 'stats', concept: 'x' });
    assert.equal(converted.type, 'type');
    assert.equal(isAnswerCorrect(converted, String(typed.ans)), true);
  });
  it('a practice set mixes types, is the same for the same seed, and every answer key is right', () => {
    const one = buildPractice(all, { course: 'biochemistry' }, 40, 'seed-1');
    const two = buildPractice(all, { course: 'biochemistry' }, 40, 'seed-1');
    assert.deepEqual(one.map((q) => q.id), two.map((q) => q.id));
    const types = new Set(one.map((q) => q.type));
    assert.ok(types.has('choice'));
    assert.ok(types.size >= 2, `types: ${[...types]}`);
    for (const q of one) {
      if (q.type === 'choice') assert.ok(q.answer >= 0 && q.answer < q.options.length, q.id);
      if (q.type === 'match') assert.equal(new Set(q.pairs.map((pair) => pair.right)).size, q.pairs.length, q.id);
      if (q.type === 'type') assert.ok(q.accept[0].length > 0, q.id);
    }
    // True/false statements say exactly what is being judged.
    const tf = one.find((q) => q.id.endsWith(':tf'));
    if (tf) assert.deepEqual(tf.options, ['True', 'False']);
  });
});
