// progress/{uid}.lessons is shared with the original app (see
// src/data/legacy-lessons.ts). Run with: npm test
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const { appLessonEntries, mergeAppLessons } = await import('@/data/legacy-lessons');
const { findLesson } = await import('@/data/curriculum');

const NEW_LESSON = 'blood-coagulation-and-fibrinolysis-1';
const NOW = 1_791_000_000_000;

describe('legacy lesson progress', () => {
  it('never reads the original app’s section counts as completions', () => {
    assert.deepEqual(appLessonEntries({ 'biolchem-1': 3, 'medgen-2': 0, 'bmc-4': 7 }), []);
  });

  it('reads this app’s completions next to legacy entries', () => {
    const lessons = { 'biolchem-1': 3, [NEW_LESSON]: { completedAt: NOW, xp: 20 } };
    assert.deepEqual(appLessonEntries(lessons), [[NEW_LESSON, { completedAt: NOW, xp: 20 }]]);
  });

  it('handles missing or malformed lessons fields', () => {
    for (const value of [undefined, null, 5, 'x', []]) assert.deepEqual(appLessonEntries(value), []);
  });

  it('keeps every legacy number when saving and adds new completions', () => {
    const legacy = { 'biolchem-1': 3, 'medgen-2': 0 };
    const saved = mergeAppLessons(legacy, [{ lessonId: NEW_LESSON, xp: 20, completedAt: NOW }], NOW);
    assert.deepEqual(saved, { 'biolchem-1': 3, 'medgen-2': 0, [NEW_LESSON]: { completedAt: NOW, xp: 20 } });
    assert.deepEqual(legacy, { 'biolchem-1': 3, 'medgen-2': 0 }, 'input is not mutated');
  });

  it('never overwrites a legacy number, even if a completion uses the same id', () => {
    const saved = mergeAppLessons({ 'biolchem-1': 3 }, [{ lessonId: 'biolchem-1', xp: 0, completedAt: 3 }], NOW);
    assert.deepEqual(saved, { 'biolchem-1': 3 });
  });

  it('still updates this app’s own entries (normal sync)', () => {
    const saved = mergeAppLessons({ [NEW_LESSON]: { completedAt: 1, xp: 5 } }, [{ lessonId: NEW_LESSON, xp: 20, completedAt: NOW }], NOW);
    assert.deepEqual(saved, { [NEW_LESSON]: { completedAt: NOW, xp: 20 } });
  });

  it('fills in a missing completion time and works without an existing map', () => {
    assert.deepEqual(mergeAppLessons(undefined, [{ lessonId: NEW_LESSON, xp: 20 }], NOW), { [NEW_LESSON]: { completedAt: NOW, xp: 20 } });
  });

  it('only this app’s curriculum lessons pass the sync filter', () => {
    assert.ok(findLesson(NEW_LESSON), 'a real lesson of this app');
    for (const legacyId of ['biolchem-1', 'medgen-2', 's1']) assert.equal(findLesson(legacyId), null);
  });
});
