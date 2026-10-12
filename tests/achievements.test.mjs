// Achievements: every original-app milestone plus this app's six, five levels each.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const { ACHIEVEMENTS, computeMetrics, evaluateAchievements, legacyStats, newLevels, NO_LEGACY } = await import('@/data/achievements');

const app = (over = {}) => ({ answers: [], quizzes: [], xp: 0, lessonsCompleted: 0, lessonCompletedAt: [], topicsCompleted: 0, conceptsMastered: 0, ...over });

describe('achievement definitions', () => {
  it('imports all 66 original milestones plus 6 of this app’s, with unique ids', () => {
    assert.equal(ACHIEVEMENTS.length, 72);
    assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, 72);
  });
  it('every achievement has five strictly increasing, measurable levels', () => {
    for (const a of ACHIEVEMENTS) {
      assert.equal(a.levels.length, 5, a.id);
      a.levels.forEach((n, i) => { assert.ok(Number.isInteger(n) && n > 0, a.id); if (i) assert.ok(n > a.levels[i - 1], a.id); });
      assert.ok(a.goal(a.levels[0]).length > 0);
    }
  });
});

describe('measuring progress', () => {
  it('adds the original app’s counts to this app’s', () => {
    const legacy = legacyStats({ subjects: { biolchem: { answered: 90, correct: 80, quizzes: 3, best: 100 } }, days: { '2026-10-01': 5 }, lessons: { 'biolchem-1': 2 } });
    const m = computeMetrics(app({ answers: Array.from({ length: 10 }, (_, i) => ({ questionId: `q${i}`, correct: true, attemptedAt: Date.parse('2026-10-02T10:00:00') })) }), legacy);
    assert.equal(m.answered, 100);
    assert.equal(m.longestStreak, 2);
    assert.equal(m.perfectRounds, 1);
    assert.equal(m.lessonsStarted, 1);
  });
  it('counts a fixed mistake only when a wrong answer is later answered right', () => {
    const at = (h) => Date.parse(`2026-10-02T0${h}:00:00`);
    const m = computeMetrics(app({ answers: [{ questionId: 'a', correct: false, attemptedAt: at(1) }, { questionId: 'a', correct: true, attemptedAt: at(2) }, { questionId: 'b', correct: true, attemptedAt: at(3) }] }), NO_LEGACY);
    assert.equal(m.fixed, 1);
  });
});

describe('levels and rewards', () => {
  it('a ladder never completes two milestones’ levels with one step', () => {
    const states = evaluateAchievements(computeMetrics(app({ answers: Array.from({ length: 100 }, (_, i) => ({ questionId: `q${i}`, correct: true, attemptedAt: 1_791_000_000_000 })) })));
    const level = (id) => states.find((s) => s.def.id === id).level;
    assert.equal(level('q1'), 5);
    assert.equal(level('q100'), 5);
    assert.equal(level('q250'), 0);
  });
  it('new levels are reported once, in order, above what was recorded', () => {
    const states = evaluateAchievements(computeMetrics(app({ xp: 450 })));
    assert.deepEqual(newLevels({ l5: 3, xp1k: 2 }, states).filter((x) => ['l5', 'xp1k'].includes(x.id)), [{ id: 'l5', level: 4 }, { id: 'l5', level: 5 }]);
    assert.deepEqual(newLevels({ l5: 5, xp1k: 2 }, states).filter((x) => ['l5', 'xp1k'].includes(x.id)), []);
  });
});

const { boostRemainingMs, clampSeconds, describeBoost, MAX_POWERUP_SECONDS, pickReward, REWARD_POOL } = await import('@/data/learning/boosts');

describe('timed boosts (never more than one hour)', () => {
  const T = 1_791_000_000_000;
  const boost = (over = {}) => ({ id: 'b', multiplier: 2, activatedAt: T, durationSeconds: 2700, seenAt: T, ...over });

  it('every reward is a valid multiplier lasting at most 3,600 seconds', () => {
    assert.equal(MAX_POWERUP_SECONDS, 3600);
    for (const item of REWARD_POOL) {
      assert.ok([1.5, 2, 2.5, 3].includes(item.multiplier));
      assert.ok(item.durationSeconds > 0 && item.durationSeconds <= 3600);
    }
  });
  it('counts down from activation and stops at the end', () => {
    assert.equal(boostRemainingMs(boost(), T), 2_700_000);
    assert.equal(boostRemainingMs(boost(), T + 2_699_000), 1000);
    assert.equal(boostRemainingMs(boost(), T + 2_700_000), 0);
  });
  it('a saved boost longer than an hour is capped at an hour', () => {
    assert.equal(clampSeconds(86_400), 3600);
    assert.equal(boostRemainingMs(boost({ durationSeconds: 86_400 }), T + 3_600_000), 0);
    assert.equal(boostRemainingMs(boost({ durationSeconds: 86_400 }), T), 3_600_000);
  });
  it('setting the clock back ends the boost instead of extending it', () => {
    assert.equal(boostRemainingMs(boost(), T - 1), 0);
    assert.equal(boostRemainingMs(boost({ seenAt: T + 60_000 }), T + 30_000), 0);
  });
  it('the random pick always comes from the pool', () => {
    assert.deepEqual(pickReward(() => 0), REWARD_POOL[0]);
    assert.deepEqual(pickReward(() => 0.999999), REWARD_POOL[REWARD_POOL.length - 1]);
    assert.ok(REWARD_POOL.includes(pickReward()));
  });
  it('describes a boost plainly', () => {
    assert.equal(describeBoost({ multiplier: 2, durationSeconds: 2700 }), '×2 XP for 45 minutes');
  });
});

const { isExperience, needsExperience, EXPERIENCES, EXPERIENCES_ENABLED } = await import('@/data/experience');
describe('app experience (no default)', () => {
  it('has exactly three experiences', () => assert.deepEqual([...EXPERIENCES], ['originals', 'originate', 'hybrid']));
  it('asks only when the switch is on, the profile was read and no valid choice is saved', () => {
    assert.equal(needsExperience({}, true, true), true);
    assert.equal(needsExperience({ experience: 'nonsense' }, true, true), true);
    assert.equal(needsExperience({ experience: 'hybrid' }, true, true), false);
    assert.equal(needsExperience({}, false, true), false, 'profile not read: never guess');
    assert.equal(needsExperience({}, true, false), false, 'switch off: nobody is asked');
    assert.equal(isExperience('originate'), true);
  });
  it('the switch is on now that The Originals and Hybrid are built (owner request, 2026-10-10)', () => assert.equal(EXPERIENCES_ENABLED, true));
});
