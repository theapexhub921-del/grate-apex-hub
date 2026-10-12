// New-app lesson completions (progress/{uid}/completions) and the legacy repair
// dry run. Run with: npm test
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const { completionWrites, readCompletions, streakFromDays, appLessonIdsInSharedMap } = await import('@/data/lesson-completions');
const { planLessonRepair } = await import('@/data/legacy-repair');
const { findLesson } = await import('@/data/curriculum');

const L1 = 'blood-coagulation-and-fibrinolysis-1';
const L2 = 'blood-coagulation-and-fibrinolysis-2';
const T = 1_791_000_000_000;

describe('reading completions (backward compatible)', () => {
  it('reads the subcollection and earlier objects in the shared map, never legacy numbers', () => {
    const rows = readCompletions([{ id: L1, data: { completedAt: T, xp: 20 } }], { 'biolchem-1': 3, [L2]: { completedAt: T + 5, xp: 20 } });
    assert.deepEqual(rows.sort((a, b) => a.lessonId.localeCompare(b.lessonId)), [{ lessonId: L1, completedAt: T }, { lessonId: L2, completedAt: T + 5 }]);
  });
  it('keeps the earliest time when a lesson is in both places', () => {
    assert.deepEqual(readCompletions([{ id: L1, data: { completedAt: T + 9 } }], { [L1]: { completedAt: T, xp: 20 } }), [{ lessonId: L1, completedAt: T }]);
  });
  it('ignores NaN (an entry the original app merged) and missing data', () => {
    assert.deepEqual(readCompletions([], { [L1]: Number.NaN }), []);
    assert.deepEqual(readCompletions([], undefined), []);
  });
  it('still reads the old array form', () => {
    assert.deepEqual(readCompletions([], [L1, { lessonId: L2, completedAt: T }]), [{ lessonId: L1, completedAt: null }, { lessonId: L2, completedAt: T }]);
  });
});

describe('writing completions', () => {
  it('writes only missing or changed lessons', () => {
    const stored = new Map([[L1, { completedAt: T, xp: 20 }]]);
    assert.deepEqual(completionWrites([{ lessonId: L1, xp: 20, completedAt: T }, { lessonId: L2, xp: 30, completedAt: T + 1 }], stored, T + 2), [{ lessonId: L2, completedAt: T + 1, xp: 30 }]);
  });
  it('keeps the stored time when the device has none (no endless rewrites)', () => {
    assert.deepEqual(completionWrites([{ lessonId: L1, xp: 20 }], new Map([[L1, { completedAt: T, xp: 20 }]]), T + 99), []);
    assert.deepEqual(completionWrites([{ lessonId: L1, xp: 20 }], new Map(), T + 99), [{ lessonId: L1, completedAt: T + 99, xp: 20 }]);
  });
  it('rounds and caps XP to what the rule allows', () => {
    assert.deepEqual(completionWrites([{ lessonId: L1, xp: 25.6, completedAt: T }, { lessonId: L2, xp: 5000, completedAt: T }], new Map(), T), [
      { lessonId: L1, completedAt: T, xp: 26 },
      { lessonId: L2, completedAt: T, xp: 1000 },
    ]);
  });
  it('lists only this app’s ids in the shared map (for reset)', () => {
    assert.deepEqual(appLessonIdsInSharedMap({ 'biolchem-1': 3, [L1]: { completedAt: T, xp: 20 } }), [L1]);
  });
  it('every lesson id fits the completions rule (^[a-z0-9-]{1,120}$)', async () => {
    const { allLessonIds } = await import('@/data/curriculum');
    for (const id of allLessonIds()) assert.match(id, /^[a-z0-9-]{1,120}$/);
  });
});

describe('legacy streak', () => {
  const now = Date.parse('2026-10-10T09:00:00Z');
  it('counts consecutive active days ending today', () => {
    assert.equal(streakFromDays({ '2026-10-10': 4, '2026-10-09': 2, '2026-10-08': 1, '2026-10-05': 9 }, now), 3);
  });
  it('a streak that ended yesterday still counts; older ones do not', () => {
    assert.equal(streakFromDays({ '2026-10-09': 2, '2026-10-08': 1 }, now), 2);
    assert.equal(streakFromDays({ '2026-10-07': 2 }, now), 0);
  });
  it('ignores zero days and malformed data', () => {
    assert.equal(streakFromDays({ '2026-10-10': 0 }, now), 0);
    assert.equal(streakFromDays(null, now), 0);
  });
});

describe('legacy repair dry run', () => {
  const isAppLesson = (id) => Boolean(findLesson(id));
  const backup = [
    { id: 'u1', updateTime: 't1', data: { lessons: { 'biolchem-1': { completedAt: 3, xp: 0 }, 'medgen-2': { completedAt: T, xp: 0 }, 'bmc-4': 7, [L1]: { completedAt: T, xp: 20 } } } },
    { id: 'u2', updateTime: 't2', data: { lessons: { 'biolchem-1': 'NaN', 'stats-1': { completedAt: 5, xp: 10 }, 'algebra-2': 2 } } },
    { id: 'u3', data: { xp: 10 } },
  ];
  const plan = planLessonRepair(backup, isAppLesson);

  it('restores rewritten section counts and zero counts', () => {
    assert.deepEqual(plan.changes.map(({ uid, lessonId, proposed, reason }) => ({ uid, lessonId, proposed, reason })), [
      { uid: 'u1', lessonId: 'biolchem-1', proposed: 3, reason: 'rewritten section count' },
      { uid: 'u1', lessonId: 'medgen-2', proposed: 0, reason: 'rewritten zero count' },
    ]);
    assert.equal(plan.changes[0].updateTime, 't1');
  });
  it('never touches healthy numbers or this app’s own lessons', () => {
    assert.deepEqual(plan.leftAsIs, { healthy: 2, appLessons: 1, lostNaN: 1 });
  });
  it('lists NaN and unexpected shapes for review instead of guessing', () => {
    assert.deepEqual(plan.review.map(({ uid, lessonId }) => `${uid}/${lessonId}`), ['u2/biolchem-1', 'u2/stats-1']);
  });
  it('counts documents', () => {
    assert.equal(plan.scanned, 3);
    assert.equal(plan.documentsToChange, 1);
  });
});

const { rankSuggestions, relationshipOf } = await import('@/data/friend-suggestions');

describe('friends and suggestions (original app logic)', () => {
  it('mutual follows are friends; one direction is a request', () => {
    assert.equal(relationshipOf(true, true), 'friends');
    assert.equal(relationshipOf(true, false), 'outgoing');
    assert.equal(relationshipOf(false, true), 'incoming');
    assert.equal(relationshipOf(false, false), 'none');
  });
  it('ranks followers first, then friends-of-friends, classmates and top students; never me or people I follow', () => {
    const ranked = rankSuggestions({
      me: { uid: 'me', hall: 'HB1', semester: 1 },
      following: [{ uid: 'c', username: 'c_friend' }],
      followers: [{ uid: 'b', username: 'b_fan' }, { uid: 'c', username: 'c_friend' }],
      secondDegree: [{ via: { uid: 'c', username: 'c_friend' }, follows: [{ uid: 'd', username: 'd_fof' }, { uid: 'me', username: 'me_' }] }],
      top: [{ uid: 'e', username: 'e_top', hall: 'HB1', semester: 1 }, { uid: 'f', username: 'f_top', hall: 'HB3', semester: 2 }, { uid: 'c', username: 'c_friend' }],
    });
    assert.deepEqual(ranked.map((s) => [s.uid, s.reason]), [['b', 'Follows you'], ['e', 'Same class: HB1'], ['d', 'Followed by @c_friend'], ['f', 'Top student']]);
    assert.equal(ranked.find((s) => s.uid === 'd').sharedConnections, 1);
    assert.equal(ranked.find((s) => s.uid === 'e').sameClass, true);
  });
  it('skips accounts without a username, and caps the list', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ uid: `u${i}`, username: `user_${i}` }));
    assert.equal(rankSuggestions({ me: { uid: 'me' }, following: [], followers: [{ uid: 'x', username: null }], secondDegree: [], top: many }).length, 8);
  });
});

const { weekStart } = await import('@/data/learning/time');
describe('weekly challenge week', () => {
  it('weeks start on Monday at midnight (device time)', () => {
    const wednesday = new Date(2026, 9, 7, 15, 30).getTime(); // Wed 7 Oct 2026
    const monday = new Date(weekStart(wednesday));
    assert.equal(monday.getDay(), 1);
    assert.equal(monday.getDate(), 5);
    assert.equal(monday.getHours(), 0);
    assert.equal(new Date(weekStart(new Date(2026, 9, 11, 23, 0).getTime())).getDate(), 5); // Sunday → same week
  });
});

describe('original-app lessons (HB1 courses studied here)', async () => {
  const { readCompletions } = await import('@/data/lesson-completions');
  const { isLegacyLessonId } = await import('@/data/legacy-ids');
  it('recognises original lesson ids only', () => {
    assert.equal(isLegacyLessonId('biochemistry-03'), true);
    assert.equal(isLegacyLessonId('anatomy-10'), true);
    assert.equal(isLegacyLessonId('fatty-acid-biosynthesis-1'), false);
    assert.equal(isLegacyLessonId('biochemistry'), false);
  });
  it('never reads the shared map’s original-lesson entries as completions (section counts or damaged objects)', () => {
    const rows = readCompletions([], { 'biochemistry-03': 5, 'anatomy-02': { completedAt: 7, xp: 0 } });
    assert.deepEqual(rows.map((row) => row.lessonId), []);
  });
  it('reads an original lesson finished here from the completions record', () => {
    const rows = readCompletions([{ id: 'anatomy-02', data: { completedAt: 1791591792619, xp: 25 } }], { 'anatomy-02': 4 });
    assert.deepEqual(rows.map((row) => row.lessonId), ['anatomy-02']);
  });
});
