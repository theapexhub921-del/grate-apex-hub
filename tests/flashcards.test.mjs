import assert from 'node:assert/strict';
import { test } from 'node:test';

import { cardCounts, cardsFor, glossaryOf, nextLabel, rateCard, studyQueue } from '../src/data/flashcards.ts';

const NOW = Date.UTC(2026, 9, 12, 9);
const DAY = 86_400_000;

test('new cards: Again in a minute, Good in ten minutes then a day, Easy in four days', () => {
  assert.equal(nextLabel(undefined, 'again', NOW), '1m');
  assert.equal(nextLabel(undefined, 'good', NOW), '10m');
  assert.equal(nextLabel(undefined, 'easy', NOW), '4d');
  const once = rateCard(undefined, 'good', NOW);
  assert.equal(once.learning, true);
  const twice = rateCard(once, 'good', NOW + 600_000);
  assert.equal(twice.learning, false);
  assert.equal(twice.interval, 1);
});

test('easier answers wait longer; Again sends a learned card back to learning', () => {
  const learned = { due: NOW, interval: 10, ease: 2.5, reps: 3, lapses: 0, learning: false, last: 'good' };
  const hard = rateCard(learned, 'hard', NOW);
  const good = rateCard(learned, 'good', NOW);
  const easy = rateCard(learned, 'easy', NOW);
  assert.ok(hard.due < good.due && good.due < easy.due);
  const lapse = rateCard(learned, 'again', NOW);
  assert.equal(lapse.learning, true);
  assert.equal(lapse.lapses, 1);
  assert.ok(lapse.ease < learned.ease);
});

test('glossary comes from term blocks and tappable words, once each', () => {
  const sections = [{ title: 'Enzymes', blocks: [
    { k: 'p', x: 'An <term d="A protein catalyst">enzyme</term> speeds reactions.' },
    { k: 'term', name: 'Substrate', def: 'What an enzyme acts on' },
    { k: 'box', title: 'More', blocks: [{ k: 'ul', items: ['The <term d="Where the substrate binds">active site</term>', 'An <term d="dup">Enzyme</term> again'] }] },
  ] }];
  const glossary = glossaryOf(sections);
  assert.deepEqual(glossary.map((entry) => entry.term), ['active site', 'enzyme', 'Substrate']);
  const cards = cardsFor('biolchem-05', glossary);
  assert.equal(new Set(cards.map((card) => card.id)).size, 3);
  const states = { [cards[0].id]: { ...rateCard(undefined, 'easy', NOW - 5 * DAY) } };
  assert.deepEqual(cardCounts(cards, states, NOW), { fresh: 2, learning: 0, due: 1 });
  assert.equal(studyQueue(cards, states, NOW)[0].id, cards[0].id);
});
