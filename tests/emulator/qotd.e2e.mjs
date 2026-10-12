// Question of the Day: the app's real code against the emulator with the rules
// DEPLOYED TODAY — one answer per learner per day (shared with the original
// app) and a tally that can only go up by one with a new answer.
import { auth, check, db, fbAuth, finish, freshUser, fs, loadRules, peek, rulesUnderTest, seed } from './connect.mjs';

const qotd = await import('@/data/qotd');
await loadRules(rulesUnderTest());
const day = qotd.qotdDay();
const question = qotd.pickQuestion(day);
check('today has a question and a UTC day key the rules accept', Boolean(question) && /^\d{4}-\d{2}-\d{2}$/.test(day), { day, question: question?.id });

const a = await freshUser('qotd-a');
check('first answer is saved', (await qotd.saveAnswer(day, question.id, question.answer, true)) === 'saved');
check('answer document { ok, pick, at } for the day', (await peek(`users/${a.uid}/qotd/${day}`))?.pick === question.answer);
check('tally counts it once', JSON.stringify(await qotd.readTally(day)) === JSON.stringify({ total: 1, correct: 1 }));
check('answering again the same day is refused and not counted twice', (await qotd.saveAnswer(day, question.id, 0, false)) === 'already-answered' && (await qotd.readTally(day)).total === 1);

const b = await freshUser('qotd-b');
await seed(`users/${b.uid}/qotd/${day}`, { ok: true, pick: 1, at: 1 }); // answered in the original app
check('an answer from the original app counts for the day here too', (await qotd.saveAnswer(day, question.id, question.answer, true)) === 'already-answered' && (await qotd.readTally(day)).total === 1);

await freshUser('qotd-c');
const wrong = (question.answer + 1) % question.options.length;
check('a wrong answer is saved', (await qotd.saveAnswer(day, question.id, wrong, false)) === 'saved');
check('tally: 2 answers, 1 correct', JSON.stringify(await qotd.readTally(day)) === JSON.stringify({ total: 2, correct: 1 }));

let denied = false;
try { await fs.setDoc(fs.doc(db, 'qotd', `${day}_grateapex`), { total: 99, correct: 99 }); } catch (error) { denied = error.code === 'permission-denied'; }
check('the tally cannot be changed without a new answer', denied && (await qotd.readTally(day)).total === 2);

await fbAuth.signOut(auth);
check('signed out: saved on the device only', (await qotd.saveAnswer(day, question.id, question.answer, true)) === 'signed-out' && (await qotd.readLocalAnswer(day))?.synced === false);
finish();
