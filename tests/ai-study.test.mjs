// Ask AI and AI Flashcards: every lesson must produce study text for the AI,
// and the saved/generated cards must be handled safely. (The Gemini call
// itself is made by api/ai.mjs and needs the private key, so it is not run here.)
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const { aiCards, legacyToText, lessonToText, MAX_LESSON_CHARS, mergeCards, parseSavedCards } = await import('@/data/ai-study');
const { builtTopics } = await import('@/data/topics/index');
const { HB2_COURSES, hb2LessonById, hb2Lessons, lessonBody } = await import('@/data/hb2-study');

describe('AI study text', () => {
  it('every published lesson gives the AI real text to work from', () => {
    let count = 0;
    for (const built of builtTopics) {
      for (const lesson of built.topic.lessons) {
        const text = lessonToText(lesson);
        assert.ok(text.length > 300, `${lesson.id} has too little text`);
        assert.ok(text.length <= MAX_LESSON_CHARS + 40, `${lesson.id} is too long`);
        assert.ok(text.includes(lesson.title));
        count += 1;
      }
    }
    assert.ok(count > 0);
  });

  it('every study-here (HB2) lesson gives the AI real text to work from', () => {
    const metas = HB2_COURSES.flatMap((course) => hb2Lessons(course.id));
    assert.ok(metas.length > 10);
    for (const meta of metas) {
      const { lesson } = hb2LessonById(meta.id);
      const body = lessonBody(lesson);
      const text = legacyToText(lesson.title, body.sections, body.extras);
      assert.ok(text.length > 200, `${lesson.id} has too little text`);
      assert.ok(!/<\/?(b|i|term|sub|sup)\b/.test(text), `${lesson.id} still has markup`);
      assert.ok(!/\[object Object\]/.test(text), `${lesson.id} has an unreadable block`);
    }
  });
});

describe('AI flashcards', () => {
  it('gives the same card the same id, and drops blanks and repeats', () => {
    const cards = aiCards('l1', [
      { front: 'What does ACC do?', back: 'Makes malonyl-CoA.' },
      { front: 'what does acc do?', back: 'Duplicate.' },
      { front: '', back: 'No front' },
      { front: 'No back', back: '  ' },
    ]);
    assert.equal(cards.length, 1);
    assert.equal(cards[0].id, aiCards('l1', [{ front: 'WHAT DOES ACC DO?', back: 'x' }])[0].id);
    assert.notEqual(cards[0].id, aiCards('l2', [{ front: 'What does ACC do?', back: 'x' }])[0].id);
  });

  it('adding more cards never repeats one', () => {
    const first = aiCards('l1', [{ front: 'A', back: 'a' }, { front: 'B', back: 'b' }]);
    const more = aiCards('l1', [{ front: 'B', back: 'again' }, { front: 'C', back: 'c' }]);
    assert.deepEqual(mergeCards(first, more).map((card) => card.front), ['A', 'B', 'C']);
  });

  it('ignores damaged saved cards', () => {
    assert.deepEqual(parseSavedCards(null), []);
    assert.deepEqual(parseSavedCards('not json'), []);
    assert.deepEqual(parseSavedCards('{"a":1}'), []);
    assert.equal(parseSavedCards(JSON.stringify([{ id: 'x', front: 'f', back: 'b' }, { id: 1 }, null])).length, 1);
  });
});
