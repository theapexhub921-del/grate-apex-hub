import assert from 'node:assert/strict';
import { test } from 'node:test';

import { weeklyCoursePicks, mondayKey } from '../src/data/weekly-explore-picks.ts';
import { designOf, researchQuery, themesForWeek } from '../src/data/weekly-research.ts';

const MON = new Date(2026, 9, 12, 9).getTime(); // Monday 12 Oct 2026
const SUN = new Date(2026, 9, 18, 22).getTime();
const NEXT = new Date(2026, 9, 19, 0, 5).getTime();

test('Explore picks stay the same all week and change on Monday', () => {
  assert.equal(mondayKey(SUN), '2026-10-12');
  assert.equal(mondayKey(NEXT), '2026-10-19');
  const a = weeklyCoursePicks(MON);
  const b = weeklyCoursePicks(SUN);
  const c = weeklyCoursePicks(NEXT);
  assert.deepEqual(a.concepts.map((item) => item.id), b.concepts.map((item) => item.id));
  assert.equal(a.concepts.length, 3);
  assert.equal(a.connections.length, 3);
  assert.notDeepEqual([...a.concepts, ...a.connections].map((item) => item.id), [...c.concepts, ...c.connections].map((item) => item.id));
  for (const item of [...a.concepts, ...a.connections]) {
    assert.ok(item.summary.length > 0 && item.summary.length <= 221, item.id);
    assert.match(item.action.href, /^\/learn\/lesson\?lesson=/);
  }
});

test('Research themes rotate weekly and the query ends at this Monday', () => {
  assert.notDeepEqual(themesForWeek(MON).map((t) => t.theme), themesForWeek(NEXT).map((t) => t.theme));
  assert.deepEqual(themesForWeek(MON), themesForWeek(SUN));
  assert.match(researchQuery(['heme biosynthesis'], SUN), /FIRST_PDATE:\[2026-08-13 TO 2026-10-12\]/);
  assert.equal(designOf('review-article; review; journal article'), 'Review');
  assert.equal(designOf('Randomized Controlled Trial; Journal Article'), 'Randomised controlled trial');
  assert.equal(designOf('Meta-Analysis; Review'), 'Meta-analysis');
});
