// Apex Coin gifts between friends: the app's real code (data/apex-coins.ts).
// Proposed rules: the sender pays once, the friend receives exactly that once.
// Deployed rules today: the gift is refused and NO coins are taken (the old
// code took them and gave them to nobody). XP never moves. Run with RULES=proposed and without.
import { check, finish, freshUser, loadRules, peek, rulesUnderTest, seed, signInAs } from './connect.mjs';

const coins = await import('@/data/apex-coins');
await loadRules(rulesUnderTest());
const proposed = process.env.RULES === 'proposed';

const bob = await freshUser('coins-bob');
const alice = await freshUser('coins-alice');
await seed(`users/${alice.uid}`, { username: 'alice_c', coins: 50 });
await seed(`users/${bob.uid}`, { username: 'bob_c', coins: 5 });
await seed(`progress/${alice.uid}`, { xp: 300 });
await seed(`progress/${bob.uid}`, { xp: 40 });
await seed(`follows/${alice.uid}_${bob.uid}`, { follower: alice.uid, followee: bob.uid });
await seed(`follows/${bob.uid}_${alice.uid}`, { follower: bob.uid, followee: alice.uid });

await signInAs(alice);
let error = null;
try { await coins.sendApexCoins(bob.uid, 20); } catch (e) { error = e; }

if (proposed) {
  check('proposed rules: the gift is sent', error === null, error);
  check('the sender paid exactly 20', (await peek(`users/${alice.uid}`))?.coins === 30);
  await signInAs(bob);
  const received = await coins.claimIncomingCoins();
  check('the friend receives exactly 20, once', received === 20 && (await peek(`users/${bob.uid}`))?.coins === 25);
  check('claiming again adds nothing', (await coins.claimIncomingCoins()) === 0 && (await peek(`users/${bob.uid}`))?.coins === 25);
} else {
  check('deployed rules: the gift is refused with a clear message', /not switched on yet/i.test(String(error?.message)), error);
  check('deployed rules: NO coins were taken', (await peek(`users/${alice.uid}`))?.coins === 50);
}
check('XP never moves', (await peek(`progress/${alice.uid}`))?.xp === 300 && (await peek(`progress/${bob.uid}`))?.xp === 40);

await signInAs(alice);
let tooMuch = null;
try { await coins.sendApexCoins(bob.uid, 5000); } catch (e) { tooMuch = e; }
check('more than the limit is refused before anything is written', /up to 1,000/.test(String(tooMuch?.message)));
finish();
