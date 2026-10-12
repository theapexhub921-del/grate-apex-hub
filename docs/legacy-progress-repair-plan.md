# Legacy progress: remaining risk and repair plan

Status 2026-10-10: **plan only. Nothing has been repaired, exported or written.**
Every step below that touches live data waits for the owner's explicit approval.

## Background

The original app (still live at `grate-apex-hub.vercel.app`) and the new app
(`grateapex.vercel.app`) use the same Firebase project, `grate-apex`, and write
the same `progress/{uid}` document.

- The original app stores `lessons` as *lesson id → sections finished* (a
  number). It saves the **whole** document (`setDoc` without merge, only the
  fields it knows) and merges two copies with
  `Math.max(a.lessons[k] || 0, b.lessons[k] || 0)` — an object there becomes `NaN`.
- The new app (production build `40f759d`) read those numbers as completion
  times and rewrote each as `{ completedAt: <number>, xp: 0 }` on the next sync.
  Reproduced against the live rules with a test account on 2026-10-10.

The hotfix (`hotfix/legacy-progress`, preview only, not yet in production) stops
new damage from the new app. It does not undo damage already done.

## Remaining risks

| # | Risk | Who is affected | Stopped by the hotfix? |
|---|---|---|---|
| 1 | Entries already rewritten to `{ completedAt, xp: 0 }` | Legacy students who signed in to the new app since 2026-10-09 15:36 UTC (Google accounts, or anyone who typed the hidden `name@grateapex.app` email) | No — needs the repair below |
| 2 | Those entries become `NaN` (count lost) the next time the student opens the original app | Same students, if they return to the original app before the repair | No — the repair must run before they return |
| 3 | New damage while production still runs `40f759d` | Every legacy student who signs in to the new app | Yes, once promoted |
| 4 | The original app turns the **new app's** lesson completions into `NaN` and drops the new app's extra fields | Students who use both apps | No. With the hotfix the new app no longer re-saves an entry that became `NaN` (it treats any number as legacy). Fix: keep new-app data out of the shared `lessons` map (see "Follow-up") |
| 5 | Devices that already synced keep phantom completed lessons (old lesson ids) in local storage, so "lessons completed" can be too high there | Same as #1, on those devices only | Not synced to the cloud any more; local count needs a small client clean-up |
| 6 | New app's Settings → "Reset learning progress" rewrites the whole shared document, including the original app's `cards`, `seen`, `terms`, `stars` | Anyone who uses it | No — limit reset to the new app's own data |

## Repair plan

### 0. Prerequisites (owner)

- Decide whether the original app stays online. While it is, risk #2 continues
  for affected students until the repair runs. (The repair itself is safe with
  the original app running: it writes plain numbers, which the original app
  keeps.)
- Promote the hotfix first, so no new damage appears during the repair.
- Provide **read-only** admin access for the export (a service-account key
  downloaded by the owner and kept outside the repository, or `gcloud` signed in
  as the owner). Write access is only needed for step 4.

### 1. Backup (read only)

Export every `progress/{uid}` document to a local JSON file with an admin
script: document id, full data, and `updateTime`. Record the document count and
a SHA-256 checksum. Firestore's managed export (`gcloud firestore export`) is an
alternative but needs billing and a storage bucket. Reads are one per student.

### 2. Dry run (no writes)

For every exported document, inspect each `lessons` entry whose id is **not a
lesson of the new app's curriculum** (`findLesson(id) === null`):

| Entry | Meaning | Proposed value |
|---|---|---|
| a finite number | healthy legacy entry | leave |
| `{ completedAt: n, xp: 0 }` (exactly these two keys), `n` an integer from 0 to 999 | rewritten section count | `n` |
| `{ completedAt: n, xp: 0 }`, `n` ≥ 10¹² | a count of 0, saved as the sync time (`0 \|\| Date.now()`) | `0` |
| `NaN` | the original app merged a rewritten entry; the count is lost | leave (the original app reads it as 0); owner decides |
| anything else | unexpected | leave and list for review |

Entries whose id **is** in the new curriculum are the new app's own completions
and are never changed. No other field is touched.

Output: number of documents scanned, documents needing changes, and for each
change `uid`, lesson id, current value, proposed value — as a file for the owner
to review. No student names are needed.

### 3. Review

The owner reviews the dry-run file and approves the exact list (or a subset).

### 4. Apply (only after approval)

- One transaction per document. Re-read the entry; if it no longer equals the
  dry-run value (changed since the export), skip it and report it.
- Update only the listed field paths (`FieldPath('lessons', id)`), never the
  whole document.
- Log every write (`uid`, id, before, after). Re-running finds nothing to do.
- Small batches, stop on the first unexpected error.

### 5. Verify and roll back

Re-export and compare: only the listed field paths changed, nothing else.
Rollback = write the logged "before" values back to the same field paths.

## Follow-up (separate approvals)

- Risk #4: store the new app's lesson completions where the original app never
  rewrites them (for example a `progress/{uid}/...` subcollection — the original
  app's `setDoc` on the parent document does not touch subcollections), or have
  the hotfix re-save `NaN` under the new app's own lesson ids. Needs a rule
  change or a new hotfix build.
- Risk #5: on load, drop completed-lesson ids that are not in the curriculum.
- Risk #6: reset only the new app's own fields.
- Long term: retire the original app or make it read-only once students have
  moved, so only one app writes these documents.

## Tooling (built and tested on emulator fixtures only — never run on live data)

| Step | Command | Writes? |
|---|---|---|
| 1 backup | `NODE_PATH=<folder with firebase-admin>/node_modules node scripts/legacy-progress/export-progress.cjs backup.json` | no (read only) |
| 2 dry run | `node --import ./tests/register.mjs scripts/legacy-progress/dry-run.mjs backup.json plan.json` | no (no database at all) |
| 4 apply | `… node scripts/legacy-progress/apply-repair.cjs plan.json log.jsonl --confirm --live` | yes — only listed field paths, after approval |
| 5 rollback | `… node scripts/legacy-progress/apply-repair.cjs --rollback log.jsonl --confirm --live` | yes — restores logged values |

The planner is `src/data/legacy-repair.ts` (unit tests in
`tests/lesson-completions.test.mjs`). `tests/emulator/repair.e2e.mjs` runs the
whole chain on fixtures in the emulator: export, dry run, refusal without
`--confirm` / `--live`, apply (with an entry changed after the dry run being
skipped), and rollback. `apply-repair.cjs` refuses any non-emulator target
unless `--live` is given. Live use needs the owner's approval and a
service-account key kept outside the repository.
