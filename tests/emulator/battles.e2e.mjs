// Battles: the app's real code under the rules (deployed and proposed). Each
// player writes only their own users/{uid} document; no XP moves.
import { check, finish, freshUser, loadRules, peek, rulesUnderTest, seed, signInAs } from './connect.mjs';

const battles = await import('@/data/battles');
await loadRules(rulesUnderTest());

const bob = await freshUser('battle-bob');
const alice = await freshUser('battle-alice');
await seed(`users/${alice.uid}`, { username: 'alice_b' });
await seed(`users/${bob.uid}`, { username: 'bob_b' });
await seed(`progress/${alice.uid}`, { xp: 300 });
await seed(`progress/${bob.uid}`, { xp: 120 });

await signInAs(alice);
const created = await battles.createBattle({ userId: bob.uid, username: 'bob_b' }, { kind: 'hb', id: 'biochemistry', name: 'Biochemistry' });
check('a challenge is saved on the challenger’s own document', Boolean((await peek(`users/${alice.uid}`))?.battlesOut?.[created.id]));
await battles.submitBattleResult(created, { score: 7, total: 10, seconds: 80 });

await signInAs(bob);
const incoming = await battles.listBattles();
const mine = incoming.find((battle) => battle.id === created.id);
check('the opponent finds it (and it is their turn)', mine && battles.battleStatus(mine, bob.uid) === 'waiting-for-you', incoming);
await battles.submitBattleResult(mine, { score: 8, total: 10, seconds: 95 });
const after = (await battles.listBattles()).find((battle) => battle.id === created.id);
check('higher score wins', after && battles.battleStatus(after, bob.uid) === 'won', after);

await signInAs(alice);
const aliceView = (await battles.listBattles()).find((battle) => battle.id === created.id);
check('the challenger sees the loss and the record', aliceView && battles.battleStatus(aliceView, alice.uid) === 'lost' && battles.battleRecord([aliceView], alice.uid).losses === 1, aliceView);
check('no XP moved between players', (await peek(`progress/${alice.uid}`))?.xp === 300 && (await peek(`progress/${bob.uid}`))?.xp === 120);
finish();
