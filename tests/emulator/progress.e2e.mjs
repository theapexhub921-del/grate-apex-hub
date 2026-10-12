// Progress, lesson completions and quiz attempts: the app's real sync code
// against the emulator, with the proposed rules (firestore.rules) and with the
// rules deployed today. Also checks the contract with the ORIGINAL app, which
// saves the whole progress document (setDoc, no merge) with numeric lessons.
import { fileURLToPath } from 'node:url';

import { auth, check, db, finish, freshUser, fs, loadRules, peek, peekAll, seed } from './connect.mjs';

const sync = await import('@/data/learning-sync');
const DEPLOYED = fileURLToPath(new URL('./deployed-2026-10-09.rules', import.meta.url));
const L1 = 'blood-coagulation-and-fibrinolysis-1';
const L2 = 'blood-coagulation-and-fibrinolysis-2';
const T = 1791591792619;
const stats = (xp) => ({ total_xp: xp, current_streak: 1, last_activity_date: '2026-10-10' });
const legacyDoc = (lessons, xp = 500) => ({
  xp, days: { '2026-10-01': 12, '2026-10-02': 7 }, cards: { q1: { due: 1, box: 2 } }, seen: { biolchem: ['a', 'b'] },
  lessons, updatedAt: T - 86_400_000,
});

// ── Proposed rules ────────────────────────────────────────────────────────
await loadRules();
console.log('rules: firestore.rules (proposed)');
{
  const { uid } = await freshUser('progress');
  await seed(`progress/${uid}`, legacyDoc({ 'biolchem-1': 3, 'medgen-2': 0 }));

  await sync.saveCloudProgress([{ lessonId: L1, xp: 20, completedAt: T }], stats(520));
  let root = await peek(`progress/${uid}`);
  const completions = await peekAll(`progress/${uid}/completions`);
  check('completion stored in progress/{uid}/completions', completions.length === 1 && completions[0].id === L1 && completions[0].completedAt === T && completions[0].xp === 20, completions);
  check('the shared lessons map is not written (legacy numbers exactly as before)', JSON.stringify(root.lessons) === JSON.stringify({ 'biolchem-1': 3, 'medgen-2': 0 }), root.lessons);
  check('the original app’s other fields are untouched', root.cards?.q1?.box === 2 && root.days['2026-10-01'] === 12 && root.seen.biolchem.length === 2, root);
  check('XP saved', root.xp === 520, root.xp);

  // The original app saves the whole document again (no merge), as it does.
  await fs.setDoc(fs.doc(db, 'progress', uid), { ...legacyDoc({ 'biolchem-1': 4, 'medgen-2': 0 }, 530), savedAt: fs.serverTimestamp() });
  let loaded = await sync.loadCloudProgress();
  check('after an original-app save, the new-app completion survives', loaded.completedLessons.map((r) => r.lessonId).join() === L1, loaded.completedLessons);
  check('the original app’s new count is kept and never read as a completion', (await peek(`progress/${uid}`)).lessons['biolchem-1'] === 4);
  check('XP from the original app is read', loaded.stats.total_xp === 530, loaded.stats);

  // Backward compatibility: a completion this app stored in the shared map earlier.
  await seed(`progress/${uid}`, { ...legacyDoc({ 'biolchem-1': 4, [L2]: { completedAt: T + 5, xp: 20 } }, 530) });
  loaded = await sync.loadCloudProgress();
  check('earlier completions in the shared map are still read', loaded.completedLessons.map((r) => r.lessonId).sort().join() === [L1, L2].join(), loaded.completedLessons);

  // A second sync with nothing new writes no completion documents.
  const before = (await peekAll(`progress/${uid}/completions`)).map((c) => c.savedAt).join();
  await sync.saveCloudProgress([{ lessonId: L1, xp: 20, completedAt: T }], stats(530));
  check('re-syncing an unchanged completion does not rewrite it', (await peekAll(`progress/${uid}/completions`)).map((c) => c.savedAt).join() === before);

  // Quiz attempts.
  const attempt = { id: crypto.randomUUID(), attemptType: 'lesson', courseId: 'biochemistry', lessonId: L1, score: 18, total: 25, percentage: 72, timeSeconds: 410, wrongConcepts: [], wrongQuestionIds: ['q1-3'], practice: false, completedAt: T };
  check('quiz attempt saved', (await sync.saveCloudQuizAttempt(attempt)) === true);
  check('sending it again changes nothing', (await sync.saveCloudQuizAttempt({ ...attempt, score: 25 })) === true && (await peek(`progress/${uid}/attempts/${attempt.id}`)).score === 18);
  check('attempts load back', (await sync.loadCloudQuizAttempts()).map((a) => a.id).join() === attempt.id);

  // Reset: only this app's data (and the shared XP).
  await sync.resetCloudLearningProgress();
  root = await peek(`progress/${uid}`);
  check('reset removes completions and attempts', (await peekAll(`progress/${uid}/completions`)).length === 0 && (await peekAll(`progress/${uid}/attempts`)).length === 0);
  check('reset removes this app’s objects from the shared map but keeps legacy numbers', JSON.stringify(root.lessons) === JSON.stringify({ 'biolchem-1': 4 }), root.lessons);
  check('reset keeps the original app’s cards, days and seen; XP is 0', root.cards?.q1?.box === 2 && root.days['2026-10-02'] === 7 && root.seen.biolchem.length === 2 && root.xp === 0, root);

  // Another student can't read or write my completions.
  const me = auth.currentUser.uid;
  await freshUser('intruder');
  let denied = false;
  try { await fs.getDocs(fs.collection(db, 'progress', me, 'completions')); } catch (e) { denied = e.code === 'permission-denied'; }
  check('another student cannot list my completions', denied);
  denied = false;
  try { await fs.setDoc(fs.doc(db, 'progress', me, 'completions', L1), { lessonId: L1, completedAt: T, xp: 20, savedAt: fs.serverTimestamp() }); } catch (e) { denied = e.code === 'permission-denied'; }
  check('another student cannot write my completions', denied);
}

// ── Leaderboard (scores/{uid}) and the league ───────────────────────────
{
  const { uid } = await freshUser('board');
  const name = `board_` + Date.now().toString(36).slice(-6);
  await seed(`users/` + uid, { username: name, hall: 'HB1', semester: 1, classLocked: true });
  await seed(`scores/` + uid, { username: name, xp: 40, answered: 120, accuracy: 0.8, courseXp: { biolchem: 40 } });
  await sync.saveCloudProgress([], stats(640));
  await new Promise((r) => setTimeout(r, 500));
  const entry = await peek(`scores/` + uid);
  check('leaderboard entry updated with the real username and XP', entry?.username === name && entry?.xp === 640 && entry?.hall === 'HB1', entry);
  check('the original app’s answered/accuracy/courseXp are kept', entry?.answered === 120 && entry?.accuracy === 0.8 && entry?.courseXp?.biolchem === 40, entry);
  const { loadWeeklyLeague } = await import('@/data/connect-features');
  const league = await loadWeeklyLeague();
  const me = league.find((row) => row.is_viewer);
  check('the league reads the shared leaderboard and finds me in my rank', Boolean(me) && me.lifetime_xp === 640 && league.every((row) => row.rank_id === me.rank_id), league.slice(0, 3));
}

// ── Rules deployed today (before approval) ───────────────────────────────
await loadRules(DEPLOYED);
console.log('rules: deployed-2026-10-09.rules');
{
  const { uid } = await freshUser('fallback');
  await seed(`progress/${uid}`, legacyDoc({ 'biolchem-1': 3, 'medgen-2': 0 }));
  await sync.saveCloudProgress([{ lessonId: L1, xp: 20, completedAt: T }], stats(520));
  const root = await peek(`progress/${uid}`);
  check('fallback: completion kept in the shared map (protected), numbers untouched', root.lessons['biolchem-1'] === 3 && root.lessons['medgen-2'] === 0 && root.lessons[L1]?.completedAt === T, root.lessons);
  check('fallback: nothing written to the closed subcollection', (await peekAll(`progress/${uid}/completions`)).length === 0);
  const loaded = await sync.loadCloudProgress();
  check('fallback: loading still works and reads the completion', loaded.completedLessons.map((r) => r.lessonId).join() === L1, loaded);
  check('fallback: quiz attempt refused, nothing written', (await sync.saveCloudQuizAttempt({ id: crypto.randomUUID(), attemptType: 'lesson', courseId: null, lessonId: null, score: 1, total: 2, percentage: 50, timeSeconds: 3, wrongConcepts: [], wrongQuestionIds: [], practice: false, completedAt: T })) === false);
  await sync.resetCloudLearningProgress();
  const reset = await peek(`progress/${uid}`);
  check('fallback: reset still works and keeps legacy numbers', reset.xp === 0 && JSON.stringify(reset.lessons) === JSON.stringify({ 'biolchem-1': 3, 'medgen-2': 0 }), reset.lessons);
}

finish();
