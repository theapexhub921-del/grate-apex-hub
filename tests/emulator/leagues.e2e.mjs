// Weekly leagues: the app's real code under the deployed rules. Each learner
// writes only their own users/{uid}.league.
import { check, finish, freshUser, loadRules, peek, rulesUnderTest, seed, signInAs } from './connect.mjs';

const leagues = await import('@/data/leagues');
await loadRules(rulesUnderTest());

const lastWeek = leagues.weekKey(Date.now() - 7 * 86_400_000);
const people = [];
for (const [name, start, now] of [['top', 100, 900], ['mid1', 100, 400], ['mid2', 100, 300], ['mid3', 100, 250], ['low', 100, 100]]) {
  const user = await freshUser(`league-${name}`);
  await seed(`users/${user.uid}`, { username: `l_${name}`, league: { week: lastWeek, tier: 2, startXp: start } });
  await seed(`scores/${user.uid}`, { username: `l_${name}`, xp: now });
  people.push({ name, user });
}

// The top learner opens Connect this week: last week is settled.
await signInAs(people[0].user);
const view = await leagues.loadLeague();
check('the week that ended is settled: top of 5 is promoted one tier', view.prev?.outcome === 'promoted' && view.prev.position === 1 && view.tier === 3, view.prev);
check('saved on their own document for this week', (await peek(`users/${people[0].user.uid}`))?.league?.week === leagues.weekKey());

await signInAs(people[4].user);
const lowView = await leagues.loadLeague();
check('the bottom of 5 (no XP that week) is relegated one tier', lowView.prev?.outcome === 'relegated' && lowView.tier === 1, lowView.prev);
check('final weekly XP of those who already moved on is used', lowView.prev?.size === 5);

await signInAs(people[2].user);
const midView = await leagues.loadLeague();
check('the middle stays in its tier', midView.prev?.outcome === 'stays' && midView.tier === 2, midView.prev);

const fresh = await freshUser('league-new');
await seed(`users/${fresh.uid}`, { username: 'l_new' });
await seed(`scores/${fresh.uid}`, { username: 'l_new', xp: 50 });
await signInAs(fresh);
const newView = await leagues.loadLeague();
check('a new learner joins Bronze with 0 XP this week', newView.tier === 0 && newView.rows.find((row) => row.isMe)?.weeklyXp === 0, newView);
finish();
