// Dry-run planning for repairing progress/{uid}.lessons entries that the new
// app's production build 40f759d rewrote (docs/legacy-progress-repair-plan.md).
// Pure: works on an exported copy of the documents and never touches Firebase.
//
// Backup format (written by scripts/legacy-progress/export-progress.cjs):
//   { exportedAt, documents: [{ id, updateTime, data }] }
// JSON cannot hold NaN, so the exporter writes NaN as the string "NaN".

export type BackupDocument = { id: string; updateTime?: string; data: Record<string, unknown> };

export type RepairChange = {
  uid: string;
  lessonId: string;
  current: unknown;
  proposed: number;
  reason: 'rewritten section count' | 'rewritten zero count';
  updateTime?: string;
};

export type RepairReview = { uid: string; lessonId: string; current: unknown; reason: string };

export type RepairPlan = {
  scanned: number;
  documentsToChange: number;
  changes: RepairChange[];
  leftAsIs: { healthy: number; appLessons: number; lostNaN: number };
  review: RepairReview[];
};

// Real completion times are milliseconds since 1970 (above 10^12); section
// counts are small.
const TIMESTAMP_FLOOR = 1e12;
const MAX_SECTION_COUNT = 999;

const isNaNValue = (value: unknown) => (typeof value === 'number' && Number.isNaN(value)) || value === 'NaN';

function isRewrittenEntry(value: unknown): value is { completedAt: number; xp: 0 } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value).sort();
  const entry = value as { completedAt?: unknown; xp?: unknown };
  return keys.length === 2 && keys[0] === 'completedAt' && keys[1] === 'xp' && entry.xp === 0 && typeof entry.completedAt === 'number';
}

/** Classifies every `lessons` entry of every exported document. Never decides for this app's own lessons. */
export function planLessonRepair(documents: BackupDocument[], isAppLesson: (lessonId: string) => boolean): RepairPlan {
  const plan: RepairPlan = { scanned: documents.length, documentsToChange: 0, changes: [], leftAsIs: { healthy: 0, appLessons: 0, lostNaN: 0 }, review: [] };
  for (const document of documents) {
    const lessons = document.data?.lessons;
    if (!lessons || typeof lessons !== 'object' || Array.isArray(lessons)) continue;
    let changed = false;
    for (const [lessonId, value] of Object.entries(lessons as Record<string, unknown>)) {
      if (isAppLesson(lessonId)) {
        plan.leftAsIs.appLessons += 1;
        continue;
      }
      if (typeof value === 'number' && Number.isFinite(value)) {
        plan.leftAsIs.healthy += 1;
      } else if (isNaNValue(value)) {
        plan.leftAsIs.lostNaN += 1;
        plan.review.push({ uid: document.id, lessonId, current: 'NaN', reason: 'count lost by the original app’s merge; it reads this as 0 — owner decides' });
      } else if (isRewrittenEntry(value) && Number.isInteger(value.completedAt) && value.completedAt >= 0 && value.completedAt <= MAX_SECTION_COUNT) {
        plan.changes.push({ uid: document.id, lessonId, current: value, proposed: value.completedAt, reason: 'rewritten section count', updateTime: document.updateTime });
        changed = true;
      } else if (isRewrittenEntry(value) && value.completedAt >= TIMESTAMP_FLOOR) {
        plan.changes.push({ uid: document.id, lessonId, current: value, proposed: 0, reason: 'rewritten zero count', updateTime: document.updateTime });
        changed = true;
      } else {
        plan.review.push({ uid: document.id, lessonId, current: value, reason: 'unexpected shape — left unchanged' });
      }
    }
    if (changed) plan.documentsToChange += 1;
  }
  return plan;
}
