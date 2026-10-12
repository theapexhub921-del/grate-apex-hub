// Achievement levels and boosts: the app's real claim / reward code against the
// emulator with the rules DEPLOYED TODAY (it only writes users/{uid}).
import { check, finish, freshUser, loadRules, peek, rulesUnderTest, seed } from './connect.mjs';

const store = await import('@/data/achievements-store');
const { computeMetrics, evaluateAchievements, NO_LEGACY } = await import('@/data/achievements');
const powerups = await import('@/data/learning/powerups');
await loadRules(rulesUnderTest());

const app = (xp) => ({ answers: [], quizzes: [], xp, lessonsCompleted: 0, lessonCompletedAt: [], topicsCompleted: 0, conceptsMastered: 0 });
const statesAt = (xp) => evaluateAchievements(computeMetrics(app(xp), NO_LEGACY));
const timedBoosts = () => powerups.powerupInventory().filter((item) => item.kind === 'timed');

const { uid } = await freshUser('achieve');
await seed(`users/${uid}`, { username: `ach_${Date.now().toString(36).slice(-6)}`, hall: 'HB1', semester: 1, classLocked: true });
await seed(`progress/${uid}`, { xp: 450, subjects: { biolchem: { answered: 120, correct: 100, quizzes: 4, best: 80 } }, days: { '2026-10-01': 30 } });

// The original app's records are read for the learner.
await store.loadLegacyAchievementStats(uid);
const legacy = store.achievementStoreState().legacy;
check('earlier progress from the original app is read (answers, quizzes, days, XP)', legacy?.answered === 120 && legacy.quizzes === 4 && legacy.days['2026-10-01'] === 30 && legacy.xp === 450, legacy);

// 1. First check on the account: recognition only, no rewards.
let result = await store.claimNewLevels(uid, statesAt(450));
let profile = await peek(`users/${uid}`);
check('first check records levels already reached, without rewards', result.baseline === true && result.claimed.length === 0 && profile.achievementsBaseline === true && profile.achievements.l5 === 5 && profile.achievements.xp1k === 2 && timedBoosts().length === 0, { result, achievements: profile.achievements });

// 2. New levels after that are claimed and rewarded once each.
result = await store.claimNewLevels(uid, statesAt(650));
const claimedKeys = result.claimed.map((c) => `${c.id}:${c.level}`).sort();
check('new levels are claimed', JSON.stringify(claimedKeys) === JSON.stringify(['l10:1', 'l10:2', 'xp1k:3']), claimedKeys);
const announced = await store.rewardLevels(result.claimed, () => 0.4);
check('each claimed level gives exactly one boost, at most an hour long', announced.length === 3 && timedBoosts().length === 3 && timedBoosts().every((b) => b.durationSeconds > 0 && b.durationSeconds <= 3600) && announced.every((a) => /^×(1\.5|2|2\.5|3) XP for (15|30|45|60) minutes$/.test(a.reward ?? '')), { announced, inventory: timedBoosts() });
check('the level-complete notices are queued', store.achievementStoreState().announcements.length === 3);

// 3. Repeats can't claim or reward again (reload, retry, another device).
result = await store.claimNewLevels(uid, statesAt(650));
check('claiming the same levels again finds nothing new', result.claimed.length === 0, result);
const replay = await store.rewardLevels([{ id: 'xp1k', level: 3 }], () => 0.9);
check('replaying a reward grants no second boost', replay.length === 1 && replay[0].reward === null && timedBoosts().length === 3, { replay, count: timedBoosts().length });
check('a lower level later (e.g. after a reset) is not re-recorded', (await store.claimNewLevels(uid, statesAt(0))).claimed.length === 0 && (await peek(`users/${uid}`)).achievements.xp1k === 3);

// 4. Boosts: activated one at a time; while active, every lesson/quiz uses it.
check('timed boosts are never used up automatically', (await powerups.consumePowerup()) === null && timedBoosts().length === 3);
const first = timedBoosts()[0];
const running = await powerups.activatePowerup(first.id);
check('a boost activates for at most 3,600 seconds', running.durationSeconds === first.durationSeconds && running.durationSeconds <= 3600 && timedBoosts().length === 2, running);
let refused = null;
try { await powerups.activatePowerup(timedBoosts()[0].id); } catch (error) { refused = error.message; }
check('a second boost waits while one runs (no extension)', /already running/.test(refused ?? '') && timedBoosts().length === 2, refused);
const used = await powerups.consumePowerup();
check('the running boost multiplies a lesson or quiz without being used up', used?.multiplier === running.multiplier && used.id.endsWith(':active'), used);
check('…and the next one too', (await powerups.consumePowerup())?.multiplier === running.multiplier);
await powerups.returnPowerup(used);
check('returning the running boost (a failed save) adds nothing to the inventory', timedBoosts().length === 2);

// 5. No profile yet (no username): nothing is claimed.
const { uid: noProfile } = await freshUser('noprofile');
result = await store.claimNewLevels(noProfile, statesAt(650));
check('an account without a profile claims nothing', result.claimed.length === 0 && !(await peek(`users/${noProfile}`)), result);

finish();
