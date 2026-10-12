# Firestore compatibility with the deployed rules

Checked 2026-10-09 against the security rules the owner supplied (deployed on the
`grate-apex` Firebase project). Branch: `merge/legacy-integration`.

**Key fact:** the original app and this app use the same Firebase project.
Accounts, UIDs and documents are shared. A legacy student's `users`, `progress`,
`scores` and `follows` documents are already in the database; nothing needs an
ID mapping. Anything this app writes lands in the same documents the old app uses.

Firestore refuses anything a rule does not allow, including every collection
the rules do not mention.

## Status on `merge/legacy-integration` (2026-10-10)

The table further down describes the **live production build** (`grateapex.vercel.app`).
On the merger branch every row is fixed, except where noted:

| Area | Now |
|---|---|
| users/{uid}, usernames | Sign-up reserves a username and creates the profile in one batch; display name is its own field; renames follow the 30-day rule; class saved as hall + semester + lock (lib/accounts.ts) |
| progress/{uid} | Shared lessons map never written; completions in progress/{uid}/completions (**new rule**), with the protected map as fallback |
| Quiz attempts | progress/{uid}/attempts (**new rule**); never scores/{attemptId} |
| scores/{uid}, league | Summary written with the real username; league reads scores |
| follows | follower/followee format; existing relationships restored without migration |
| posts / likes / replies | Board format, counters in the same batch; photos and videos via the original app's Cloudinary |
| groups, chats | Rule shapes; private groups, owner adds mutual friends; DMs between mutual friends |
| stories, qotd | users/{uid}/stories (24 h) and users/{uid}/qotd + this app's tally |
| Planner | users/{uid}/planner/{kind} (**new rule**), device copy as fallback |
| Reports | supportTickets (admins read them) |
| Account deletion | Full deletion needs server/account-deletion.mjs (not deployed); until then the app deletes the login and progress and says so |
| **Still refused / not built** | Table Conferences (`calls` belongs to the original app's voice calls), friend battles (`battles` is server-only), weekly freeze reward, explore_weekly_sessions — shown as "coming soon" |
| **Trust gaps (no rule change made)** | users/{uid}.coins and progress/{uid}.xp are client-writable, as in the original app — server-side XP/coins would be needed to make them tamper-proof |

**Rules to paste:** the whole of `firestore.rules`. Compared with the deployed rules it only **adds** three owner-only blocks (attempts, completions, planner) — 0 existing lines changed (`git diff 1d7b6f2 -- firestore.rules`). Verified: 53 emulator rules tests, and every app emulator check passes under both the deployed and the proposed rules. Safe to paste before any new release: neither the live new app nor the original app uses these paths yet. Rollback: paste the previous rules back (Firebase console keeps the history; a copy is in `tests/emulator/deployed-2026-10-09.rules`).

## Where the live production build disagrees with the rules

| Path | What this app does | What the rules require | Result |
|---|---|---|---|
| `users/{uid}` create (sign-up, Google) | `username` = typed full name or Google display name | `username` string, 3–20 chars | Names over 20 chars (field allows 30) are refused; account exists but has no profile. Names with spaces/capitals break the legacy `^[a-z0-9_]{3,20}$` convention and are not reserved in `usernames`. |
| `users/{uid}` update — display name | `profiles.updateProfile` writes `username: display_name` | Changing `username` needs `usernameChangedAt == request.time`, the 30-day limit, and a `usernames` claim **in the same batch** | Every display-name change is refused (only logged). |
| `users/{uid}` update — class | writes `classId`, `semester`, `classLocked: true` | When `classLocked` is true, `hall` must be one of HB1–MB3 and `semester` 1 or 2 | New accounts have `hall: ''` → refused. Legacy students' class lives in `hall`/`semester`, which the app does not read. |
| `users/{uid}` delete | account deletion tried it | `allow delete: if false` | Always refused. |
| `users/{uid}.coins` | Apex Coins balance written by the client | no restriction | Allowed, but any student can set any balance. |
| `users/{uid}/studyPlans`, `/timetableBlocks`, `/goals` | planner data | no rule | Refused. |
| `usernames/{name}` | `setUsername` writes `{ userId }` | `{ uid, login }` only, name `^[a-z0-9_]{3,20}$` | Refused. (Sign-in now only *reads* it — allowed: `get: if true`.) |
| `progress/{uid}` | XP, streak, lessons | owner may read/write anything | Allowed — but the document is shared with the old app (see below). |
| `scores/{attemptId}` | each quiz attempt | `scores/{uid}`, owner only, fixed field list | Refused (attempt id ≠ uid). No attempt has ever reached the cloud. The app never writes the leaderboard summary `scores/{uid}`. |
| `leaderboard` | weekly league reads it | no rule | Refused; league is always empty. Old leaderboard is `scores`. |
| `follows/{a_b}` | writes `followerId`/`followingId`; "accept"/"remove" are updates | `follower`/`followee`; no updates; unfollow = delete | Follow, accept and remove are refused. Reads query `followerId`, so existing friendships are invisible. |
| `posts/{id}` | `author_id`, `author_name`, `body`, no `title` | `authorUid`, `authorName` == username, `title` 3–120, `body` 3–2000, `replyCount == 0` | Refused, **but the screen shows the post as published** (`catch {}`). Feed is ordered by `created_at`, which legacy posts don't have. |
| `posts/{id}` likes | `reactions` array update | `likeCount` ±1 plus a `likes/{uid}` document | Refused silently. |
| `posts/{id}/comments` | comments | no rule (old app: `replies`) | Refused silently. |
| `groups` | lists all groups; creates with `owner_id`, `title` | list must filter `memberUids`; create needs `ownerUid`, `memberUids`, `name`, `description` | List and create refused. `members` and `discussions` subcollections have no rule. |
| `chats/{a_b}/messages` | `sender_id`, `body`, never creates the chat document | chat document with `members`; message `from`, `text`, fixed keys; mutual follow | Refused. |
| `battles` | client creates/updates challenges | `write: if false` (server only) | Refused. |
| `calls` | Table Conferences stored here with their own fields | this collection holds WebRTC voice calls (`host`, `members`, `state`); no list rule; only `peers`/`signals` subcollections | Refused, and would collide with voice calls. |
| `explore_weekly_sessions` | weekly Explore content | no rule | Refused; never shows. |
| `users/{uid}/stories`, `qotd`, `users/{uid}/qotd` | stories and QOTD cloud parts are stubs / unused | rules exist | Not yet built. |

## Legacy progress (already fixed on this branch, not deployed)

The old app stores `progress.lessons` as *lesson id → number of sections
finished*. The live app read those numbers as completion times, counted every
old lesson as completed, and on the next sync replaced each number with
`{ completedAt: <that number>, xp: 0 }`. This happens when a legacy student
signs in (today: Google accounts, or anyone who types the hidden
`name@grateapex.app` email).

Fix on the branch: numbers are ignored when reading, never overwritten when
writing, and only lessons of this app's curriculum are synced
(`learning-sync.ts`, `progress.ts`).

Repair of documents already changed (needs approval; nothing has been run):
an overwritten entry is `{ completedAt: n, xp: 0 }` under a lesson id that is
not in this app's curriculum (reproduced against the live rules with a test
account on 2026-10-10). A small `n` is the original section count. A count of
0 was saved as the sync time (`0 || Date.now()`), so `n` above 10¹² under a
non-curriculum id means 0. The id, not the value alone, identifies a damaged
entry. This needs an admin export first and the owner's approval.

The original app merges copies with `Math.max(old, new)`; for an object that
gives `NaN`, so a student who still uses the old app after the new one rewrote
an entry ends up with `NaN` there (a number, which this app now leaves alone).

Other `progress` notes: `days` (old: date → questions answered) is read as the
streak (it is really the number of days ever studied). "Reset learning
progress" rewrites the whole document, including the old app's fields.

## Proposed fixes (none applied — waiting for approval)

1. **Quiz attempts.** Stop writing to `scores`. Preferred: a new owner-only
   subcollection `progress/{uid}/attempts/{attemptId}` (needs this rule added —
   it adds a path, it does not loosen any existing one):

   ```
   match /progress/{uid}/attempts/{attemptId} {
     allow read, write: if request.auth.uid == uid;
   }
   ```

   No-rule-change alternative: a capped map field `quizAttempts` inside
   `progress/{uid}`. Works today but shares the 1 MiB document with the old
   app's large `cards`/`seen`/`terms` maps, so it is the weaker option.
2. **Leaderboard.** Read the weekly league from `scores` (as the old app does).
   Write `scores/{uid}` only with the whitelisted fields, after usernames are fixed.
3. **Usernames.** Reserve with `{ uid }` (Google accounts) or `{ uid, login }`
   (renamed password accounts), name `^[a-z0-9_]{3,20}$`; change a username only
   in one batch with `usernameChangedAt: serverTimestamp()`. Keep the display
   name in its own field (e.g. `displayName`) and never write it to `username`.
4. **Registration.** Ask for a username at sign-up and reserve it; keep the
   optional full name as the display name. Google first sign-in: choose a
   username before continuing (as the old app did).
5. **Class.** Write `hall` (= class) with `semester` and `classLocked`; read
   legacy `hall`/`semester` as the learner's class.
6. **Friends.** Use `follows` exactly as the rules and old app do: `follower`,
   `followee` (+ names), id `<follower>_<followee>`; unfollow deletes;
   friends = both directions exist. No data migration needed. Suggestions:
   restore the old `suggestFollows` (people who follow you, people your follows
   follow, classmates in your hall, top scorers).
7. **Posts, groups, chats, conferences, battles, planner** — rewrite each to the
   rule shapes, one feature at a time; stop showing success when a write fails.
8. **Account deletion.** The app can only remove `progress/{uid}` and the login.
   `users`, `scores` and `usernames` need a trusted server (admin key). Until
   then, the public profile and leaderboard entry remain after deletion.

## How this was checked

Every `collection(db, …)` / `doc(db, …)` call in `src/` was listed (all use
literal collection names; there are no batches or transactions) and each write
compared with the matching rule. Static analysis only: no live reads or writes
were made, and the number of existing documents (e.g. follows) is unknown
without admin access.
