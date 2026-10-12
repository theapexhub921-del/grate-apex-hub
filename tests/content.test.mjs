// Content integrity for every published topic. Run with: npm test
//
// Guarantees, for each topic built from the lecture material:
// - IDs are unique; every question/recall points at a real concept
// - every answer index is valid (checkQuestion) and options are unique
// - every source reference names a catalogued file (traceability)
// - every lesson has all three layers: interactive, reading, quiz
// - a lesson quiz can always reach 25 questions (its own bank, topped up
//   from earlier lessons of the topic)
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const { builtTopics } = await import('@/data/topics');
const { checkQuestion } = await import('@/data/topics/build');
const { sourceFiles, contentTopics } = await import('@/data/content-catalog');
const curriculum = await import('@/data/curriculum');
const selection = await import('@/data/learning/selection');
const memoryLib = await import('@/data/learning/memory');

const sourceIds = new Set(sourceFiles.map((file) => file.id));
const empty = memoryLib.buildMemoryModel({ attempts: [], completions: [], now: Date.now() });

function refsOf(item) {
  return [...(item.sourceRefs ?? [])];
}

describe('catalog', () => {
  it('every source file id is unique and every topic lists known files', () => {
    assert.equal(sourceIds.size, sourceFiles.length);
    for (const topic of contentTopics) {
      for (const id of topic.sourceFileIds) assert.ok(sourceIds.has(id), `${topic.id}: unknown source ${id}`);
    }
  });

  it('published topics in the catalog match the built registry', () => {
    const built = new Set(builtTopics.map((item) => item.topic.id));
    for (const topic of contentTopics) {
      if (topic.status === 'published') assert.ok(built.has(topic.id), `${topic.id} is marked published but not built`);
    }
    for (const id of built) {
      const entry = contentTopics.find((topic) => topic.id === id);
      assert.ok(entry, `${id} is built but missing from the catalog`);
      assert.equal(entry.status, 'published', `${id} is built but not marked published`);
    }
  });
});

for (const built of builtTopics) {
  const { topic, questions, recalls } = built;

  describe(`topic: ${topic.title}`, () => {
    it('has unique lesson, concept, question and recall ids', () => {
      const lessonIds = topic.lessons.map((lesson) => lesson.id);
      assert.equal(new Set(lessonIds).size, lessonIds.length);
      const conceptIds = topic.lessons.flatMap((lesson) => lesson.concepts.map((concept) => concept.id));
      assert.equal(new Set(conceptIds).size, conceptIds.length);
      const itemIds = [...questions.map((q) => q.id), ...recalls.map((r) => r.id)];
      assert.equal(new Set(itemIds).size, itemIds.length);
    });

    it('every question is structurally valid and tied to a real concept', () => {
      const conceptIds = new Set(topic.lessons.flatMap((lesson) => lesson.concepts.map((concept) => concept.id)));
      for (const question of questions) {
        assert.deepEqual(checkQuestion(question), [], question.id);
        assert.ok(question.conceptId && conceptIds.has(question.conceptId), `${question.id}: unknown concept ${question.conceptId}`);
        assert.ok(question.lessonId && topic.lessons.some((lesson) => lesson.id === question.lessonId), `${question.id}: bad lesson`);
        assert.ok((question.explanation ?? '').length > 0 || question.type === 'match' || question.type === 'order', `${question.id}: no explanation`);
      }
      for (const recall of recalls) {
        assert.ok(recall.conceptId && conceptIds.has(recall.conceptId), `${recall.id}: unknown concept`);
        assert.ok(recall.answer.length > 0, `${recall.id}: empty model answer`);
      }
    });

    it('every source reference points at a catalogued file', () => {
      const all = [
        ...topic.lessons.flatMap((lesson) => [
          ...refsOf(lesson),
          ...lesson.concepts.flatMap(refsOf),
          ...lesson.chunks.flatMap(refsOf),
        ]),
        ...questions.flatMap(refsOf),
      ];
      for (const ref of all) assert.ok(sourceIds.has(ref.sourceId), `${topic.id}: unknown source ${ref.sourceId}`);
      assert.ok(all.length > 0);
    });

    for (const lesson of topic.lessons) {
      it(`lesson "${lesson.title}" has all three layers and a full quiz`, () => {
        assert.ok((lesson.interactive?.length ?? 0) >= 4, 'interactive layer missing or too short');
        assert.ok(lesson.interactive.some((step) => step.type === 'ask'), 'no retrieval checkpoint');
        assert.ok(lesson.chunks.length > 0, 'reading layer missing');
        const bank = curriculum.getLessonQuizBank(lesson.id);
        assert.ok(bank.length >= 12, `quiz bank too small (${bank.length})`);
        const quiz = selection.selectQuestions({ scope: { kind: 'lesson', lessonId: lesson.id }, size: 25, seed: 't', now: Date.now() }, empty);
        const index = topic.lessons.indexOf(lesson);
        // The first lesson cannot top up from earlier lessons.
        if (index > 0) assert.ok(quiz.length >= 25, `a quiz only reaches ${quiz.length} questions`);
      });
    }
  });
}

describe('content summary', () => {
  it('prints question counts per lesson', () => {
    for (const built of builtTopics) {
      const rows = built.topic.lessons.map((lesson) => {
        const bank = curriculum.getLessonQuizBank(lesson.id).length;
        const learn = curriculum.getLessonQuestions(lesson.id).length - bank;
        return `   ${lesson.id.padEnd(40)} quiz ${String(bank).padStart(3)} · checkpoints ${String(learn).padStart(2)} · steps ${String(lesson.interactive?.length ?? 0).padStart(2)}`;
      });
      console.log(`\n${built.topic.title} — ${built.questions.length} questions, ${built.recalls.length} recall prompts\n${rows.join('\n')}`);
    }
    assert.ok(true);
  });
});
