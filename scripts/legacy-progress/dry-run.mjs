// DRY RUN (step 2 of docs/legacy-progress-repair-plan.md): reads an exported
// backup file and writes the proposed changes. Touches no database at all.
//
//   node --import ./tests/register.mjs scripts/legacy-progress/dry-run.mjs <backup.json> <plan.json>
import { readFileSync, writeFileSync } from 'node:fs';

const { planLessonRepair } = await import('@/data/legacy-repair');
const { findLesson } = await import('@/data/curriculum');

const [backupFile, planFile] = process.argv.slice(2);
if (!backupFile || !planFile) {
  console.error('usage: dry-run.mjs <backup.json> <plan.json>');
  process.exit(2);
}
const backup = JSON.parse(readFileSync(backupFile, 'utf8'));
const plan = planLessonRepair(backup.documents, (lessonId) => Boolean(findLesson(lessonId)));
writeFileSync(planFile, JSON.stringify({ createdAt: new Date().toISOString(), backup: backupFile, projectId: backup.projectId, ...plan }, null, 1));

console.log(`scanned ${plan.scanned} document(s); ${plan.documentsToChange} need changes; ${plan.changes.length} entr${plan.changes.length === 1 ? 'y' : 'ies'} to restore`);
console.log(`left as is: ${plan.leftAsIs.healthy} healthy legacy, ${plan.leftAsIs.appLessons} new-app, ${plan.leftAsIs.lostNaN} NaN (for review)`);
console.log(`for owner review: ${plan.review.length}`);
console.log(`plan written to ${planFile} — nothing was changed`);
