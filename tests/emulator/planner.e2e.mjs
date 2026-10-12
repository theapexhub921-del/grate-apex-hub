// Study planner: the app's real code. Under the proposed rules it syncs to
// users/{uid}/planner/{kind}; under the rules deployed today it keeps working
// on the device. Run with RULES=proposed and without.
import { check, finish, freshUser, loadRules, peek, rulesUnderTest } from './connect.mjs';

const planning = await import('@/data/planning');
const storage = (await import('@react-native-async-storage/async-storage')).default;
await loadRules(rulesUnderTest());
const proposed = process.env.RULES === 'proposed';
const { uid } = await freshUser('planner');

const plan = await planning.saveStudyPlan({ title: 'Metabolism week', topic_ids: ['blood-coagulation-and-fibrinolysis'], duration_days: 7, goal: 'revision', status: 'active' });
const block = await planning.createTimetableBlock({ weekday: 2, start_time: '16:00', end_time: '17:00', subject: 'biochemistry', title: 'Revision', notes: undefined });
const goal = await planning.createPersonalGoal({ title: 'Five lessons', goal_type: 'lessons', target: 5, deadline: null });
check('plans, timetable and goals are saved and listed', (await planning.listStudyPlans()).some((p) => p.id === plan.id) && (await planning.listTimetableBlocks()).some((b) => b.id === block.id) && (await planning.listPersonalGoals()).some((g) => g.id === goal.id));

await planning.updateTimetableBlock(block.id, { title: 'Revision (library)' });
await planning.refreshProgressGoals({ lessonsCompleted: 5, xp: 0, streak: 0 });
check('edits and automatic goal progress are kept', (await planning.listTimetableBlocks())[0].title === 'Revision (library)' && (await planning.listPersonalGoals())[0].completed_at !== null);

const cloud = await peek(`users/${uid}/planner/studyPlans`);
if (proposed) {
  check('proposed rules: synced to the account (owner-only document)', cloud?.items?.length === 1 && cloud.items[0].id === plan.id, cloud);
  await storage.clear(); // a second device: nothing on it yet
  check('proposed rules: a second device gets the plan from the account', (await planning.listStudyPlans()).some((p) => p.id === plan.id));
} else {
  check('deployed rules: kept on the device, nothing written to the account', cloud === null);
}

await planning.deleteTimetableBlock(block.id);
check('deleting removes the entry', !(await planning.listTimetableBlocks()).some((b) => b.id === block.id));
finish();
