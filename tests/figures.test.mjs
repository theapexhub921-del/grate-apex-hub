// Lecture diagrams (data/figures/). Run with: npm test
// - every figure's picture exists in public/ and its pins and label boxes
//   sit inside the picture
// - every reading section and question that names a figure (and spot)
//   points at a real one
// - diagram questions never go to the 10-second Apex Challenge
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { describe, it } from 'node:test';

const { allFigures, getFigure, getSpot } = await import('@/data/figures');
const { builtTopics } = await import('@/data/topics');
const { isApexEligible } = await import('@/data/questions');

const inside = (n) => n >= 0 && n <= 1;

describe('lecture figures', () => {
  it('have unique ids, a picture, and pins and boxes inside it', () => {
    const ids = new Set();
    for (const figure of allFigures) {
      assert.ok(!ids.has(figure.id), `duplicate figure ${figure.id}`);
      ids.add(figure.id);
      assert.ok(existsSync(new URL(`../public${figure.src}`, import.meta.url)), `${figure.id}: missing public${figure.src}`);
      assert.ok(figure.width > 0 && figure.height > 0, `${figure.id}: size`);
      assert.ok(figure.sourceRefs.length > 0, `${figure.id}: no source slide`);
      const spots = new Set();
      for (const spot of figure.spots) {
        assert.ok(!spots.has(spot.id), `${figure.id}: duplicate spot ${spot.id}`);
        spots.add(spot.id);
        assert.ok(spot.label.trim(), `${figure.id}/${spot.id}: no label`);
        assert.ok(inside(spot.x) && inside(spot.y), `${figure.id}/${spot.id}: pin outside the picture`);
        for (const [x, y, w, h] of spot.boxes ?? []) {
          assert.ok(inside(x) && inside(y) && w > 0 && h > 0 && x + w <= 1.01 && y + h <= 1.01, `${figure.id}/${spot.id}: box outside the picture`);
        }
      }
    }
  });

  it('are referenced correctly by lessons and questions', () => {
    let sections = 0;
    let questions = 0;
    for (const { topic, questions: bank } of builtTopics) {
      for (const lesson of topic.lessons) {
        for (const chunk of lesson.chunks) {
          if (!chunk.figure) continue;
          sections++;
          assert.ok(getFigure(chunk.figure), `${lesson.id} "${chunk.title}": unknown figure ${chunk.figure}`);
        }
      }
      for (const question of bank) {
        if (!question.figure) continue;
        questions++;
        const figure = getFigure(question.figure.id);
        assert.ok(figure, `${question.id}: unknown figure ${question.figure.id}`);
        if (question.figure.spot) assert.ok(getSpot(figure, question.figure.spot), `${question.id}: unknown spot ${question.figure.spot}`);
        assert.equal(isApexEligible(question), false, `${question.id}: diagram questions are not for Apex`);
      }
    }
    assert.ok(sections >= allFigures.length, 'every figure is shown in a lesson');
    assert.ok(questions > 0, 'some questions use figures');
  });
});
