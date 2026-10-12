# GRATEAPEX — Master hand-off prompt for the next agent

Copy everything below into a new Claude Code / Codex session opened in `C:\Users\User\GRATEAPEX`.

---

You are continuing work on **GRATEAPEX**, a web-first Expo (React Native + Expo Router + TypeScript) learning app for medical students, built by a beginner owner ("OrigiNate"). Read `AGENTS.md` first — it is the project's rulebook and describes the architecture. This prompt tells you what is already done (as of **5 October 2026**), how the environment works, and what to do next. **Release deadline: Tuesday 6 October 2026.**

## 1. How to work with this owner

- They are a beginner: explain in plain, short language, one clear step at a time; give exact clicks when they must act.
- They are time- and usage-limited: be efficient, checkpoint often (commit + deploy working states), avoid long detours.
- Never fake data or success. Report exactly what was verified and what wasn't.
- Ask before anything destructive or outward-facing (live database writes, production deploys, deleting files) unless they've just asked for it.
- Web is the priority; don't spend time on Android-only issues.
- Never commit or print secrets (`.env`, `.env.local`, keys). The publishable Supabase key is public; service-role keys must never touch the client.
- Lecture files in `content/` are the source of truth for course content. **The Anatomy ZIP in `content/` must not be touched until the owner gives instructions.**

## 2. Environment facts (verified)

- **Project folder:** `C:\Users\User\GRATEAPEX`. Branch `master`.
- **GitHub:** remote `origin` = `https://github.com/theapexhub921-del/the-grate-apex-hub-1.git` (the owner's account). `previous-origin` (nathanielcb14) is an old leftover — don't use it.
- **Vercel:** project `grateapex`, live at **https://grateapex.vercel.app**. Vercel is **not connected to GitHub** — pushing does not deploy. Deploy with `npx --yes vercel --prod --yes` from the project folder (preview: `npx vercel`). Env vars `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are set in Vercel. `.vercelignore` excludes `content/` (~4.9 GB) and `.env*`. Verify a deploy by fetching the page, finding `/_expo/static/js/web/entry-*.js` and grepping it for new strings.
- **Supabase (live, the owner's main account):** project ref **`dkmossrgptfgutkqefws`** (`https://dkmossrgptfgutkqefws.supabase.co`). There is also an empty project `kxhwwmssnsbnqrckrdfw` on another account — not used; ignore it.
- **Supabase MCP connection:** configured at user scope as server **`supabase-main`**:
  `https://mcp.supabase.com/mcp?project_ref=dkmossrgptfgutkqefws&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching&skip_elicitations=apply_migration`
  - The VS Code extension's own OAuth for it is **broken** (bug: "Resource must be a valid MCP endpoint") — never click Authenticate in the chat panel; it can wipe the saved login.
  - Log in with the CLI in a real terminal window: the extension bundles the CLI at
    `C:\Users\User\.vscode\extensions\anthropic.claude-code-<version>-win32-x64\resources\native-binary\claude.exe` (the `claude` command is not on PATH). Open a visible window:
    `Start-Process powershell -ArgumentList '-NoExit','-Command',"& '<claude.exe>' mcp login supabase-main"` and ask the owner to click Authorize. Check with `<claude.exe> mcp list`. Changing the server URL logs it out (re-login needed).
  - The chat session often can't see the MCP tools. Reliable route: run the CLI headless **from PowerShell** (Git Bash mangles quotes):
    `& $exe -p '<instructions>' --allowedTools 'Read,mcp__supabase-main__apply_migration' --output-format text`
    Tool names: `mcp__supabase-main__list_tables | list_migrations | execute_sql | apply_migration | get_advisors | get_publishable_keys`.
  - **Never put double quotes inside SQL you pass through PowerShell** (they get stripped/truncated). Use `jsonb_build_object(...)`/`json_build_object(...)` instead of JSON literals.
  - Live database writes are blocked by Claude Code's auto-mode safety check. Ask the owner to switch the chat mode to "Ask before edits", then they click Allow.
- **Commit attribution:** end commit messages with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Commit/push only when asked (the owner has asked for commit + deploy after each finished feature).
- **Checks:** `npm run typecheck`, `npx eslint <files>`, `npm test` (97 tests: learning engine + every published topic's content). Web build: `CI=1 npx expo export --platform web --output-dir <dir>`.

## 3. What is DONE (all live on grateapex.vercel.app and pushed)

**Product / UI (earlier sessions):** full redesign (design system in `src/constants/theme.ts`, motion, atmosphere, icons, avatars), five-tab navigation (Home, Learn, Social, Explore, Profile), learning engine (`src/data/learning/`: spaced repetition, memory model, question selection, XP rules, next action, calendar, events), lesson player (interactive / reading / quiz layers), quiz + results, review, Apex Challenge (10 s per question), progress, notifications bell, settings, onboarding tour.

**Auth (`src/app/login.tsx`, `src/lib/google-auth.ts`, `src/app/_layout.tsx` AppGuard):** email sign-in, create account (with confirmation handling), forgot/reset password, **Google sign-in (enabled and manually tested working on 5 Oct)**, friendly errors, route guard (signed-out → `/login`; new accounts → `/onboarding` once; `/privacy` and `/terms` are public). Onboarding completion stored in auth user metadata + device.

**Supabase backend (all migrations applied to the live project and tested):**
| Repo migration | Remote name | Contents |
|---|---|---|
| `20260930000000_profiles.sql` | profiles | profiles table (id→auth.users cascade, display_name optional, avatar_url), select-own policy, `handle_new_user` trigger copying sign-up/Google name, sign-up function not callable directly |
| `20261001000000_shared_learning_data.sql` | (applied earlier via dashboard) | user_learning_stats, lesson_progress, xp_events, quiz_attempts, question_attempts, review_schedule + RLS |
| `20261001000001_profile_update_and_atomic_xp.sql` | (applied earlier) | profile update policy, `grateapex_record_xp_event` |
| `20261003000000_learning_engine.sql` | learning_engine | extra answer modes/attempt kinds, XP penalties (`grateapex_record_xp_adjustment`, negative only), `learning_events` |
| `20261005000000_social.sql` | social | usernames (`grateapex_set_username`), `friendships` (one row per pair, pending/accepted), `notifications`, search/send/respond/remove/list functions, Realtime on friendships+notifications, XP award cap 150/event, total_xp only via functions |
| `20261005010000_activity_and_account_deletion.sql` | activity_and_account_deletion | `profiles.share_activity`, `grateapex_friend_activity` (friends' LESSON/TOPIC/APEX completions, 14 days), `grateapex_delete_account` (deletes auth user; everything cascades), tighter grants |

Security model: other learners' rows are never directly readable; public fields come only from SECURITY DEFINER functions that use `auth.uid()`. Self-rolling-back security tests passed (36 checks: cross-user reads, forged XP, forged friendships, duplicates, self-requests, opt-out, deletion cascade).

**App side of Social:** `src/data/social.ts` (store + Realtime + sign-out clearing), `src/app/social/friends.tsx` (username, search, requests, friends with weekly XP, share-activity switch), `src/app/social/index.tsx` (weekly friends leaderboard "Study circle", Friend activity card), friend notifications in the bell (`src/components/notifications.tsx`), **Delete account** in Settings (`src/lib/account.ts`). Sample friends removed.

**Legal pages:** `/privacy` and `/terms` (`src/app/privacy.tsx`, `src/app/terms.tsx`, `src/components/legal-page.tsx`), linked from the sign-in page; Google consent screen is published using them.

**Content:** 8 Biochemistry topics published in `src/data/topics/` (Fatty Acid Biosynthesis, Cholesterol & Bile, Haem, Oxygen Carriers, Coagulation, Hormones, **Inborn Errors of Metabolism**, **Collagen and Elastin**).

## 4. What to do NEXT (in priority order)

1. **Two-account test of Social on the live site** (with the owner): account A sets a username; account B searches, sends a request; A sees it live in the bell/Friends and accepts; both see each other on the leaderboard; A completes a lesson and B sees it in Friend activity; remove friend; delete a test account. Fix anything found.
2. **Release polish for Tuesday:** smoke-test every main route on the live site signed out/in; check phone width (390 px) for the new Social/Friends/Settings/legal pages; make sure nothing shows raw errors.
3. **Weekly leagues (server-backed)** — currently only the rules are shown ("Opening soon"; `LEAGUE_RULES` in `src/data/ranks.ts`: top 20% advance if they also meet the next level's XP requirement, bottom 20% move down). Suggested design: `league_weeks` / `league_memberships (user_id, week_start, league_rank_id, weekly_xp computed from xp_events)`; group learners by current rank; a SECURITY DEFINER `grateapex_my_league()` returning the learner's group standings (public fields only); weekly rollover via `pg_cron` (check the extension is available) or computed lazily on first read of a new week. Never accept scores from the client.
4. **Achievements:** audit what exists (`grep -ri achievement src`). If they're only UI/local, add `user_achievements (user_id, achievement_id, unlocked_at, unique)` awarded only by server-side checks (e.g. inside XP/lesson functions or a `grateapex_check_achievements()` that derives from trusted tables).
5. **Streak hardening:** streak/last_activity_date are still client-written (column grants limit writes to those two fields). Optionally compute the streak server-side from `xp_events` / `lesson_progress` dates.
6. **Avatars to Storage (optional):** avatars are currently presets (`preset:<id>`) or a small data-URI photo in `profiles.avatar_url`. If moving to Storage: bucket `avatars`, path `<user_id>/avatar.jpg`, policies restricting writes to the owner's folder, size/type limits.
7. **Remaining lecture topics** (when the owner asks — they paused this): Amino Acid Metabolism, Free Radicals & Oxygen Toxicity, Immunology, Nucleic Acids (Biochemistry); Respiratory, Cardiovascular, CNS, Endocrinology, GI, Renal, Reproductive, Special Senses (Physiology). Anatomy ZIP: wait for instructions.
8. **Housekeeping:** update `docs/final-report-2026-10-04.md` (it predates the Supabase/Social work); Supabase advisors: enable Leaked Password Protection (dashboard, if plan allows), review unused indexes; optionally connect Vercel to the GitHub repo so pushes deploy; owner should check Ghana's Data Protection Act 2012 (Act 843) obligations (not legal advice).

## 5. How-to recipes

**Apply a database change (live):**
1. Write `supabase/migrations/<YYYYMMDDHHMMSS>_<name>.sql` — idempotent where possible (`if not exists`, `drop policy if exists`, guarded DO blocks), RLS on every user table, `security definer` functions with `set search_path = ''`, input validation, `auth.uid()` identity, `revoke all ... from public, anon` + `grant execute ... to authenticated`.
2. Ask the owner to switch off auto mode, then from PowerShell:
   `& $exe -p 'Read the file supabase/migrations/<file> with the Read tool, then call the supabase-main MCP tool apply_migration with name <name> and the file EXACT full content as the query. If it fails, report the exact error and stop.' --allowedTools 'Read,mcp__supabase-main__apply_migration' --output-format text`
3. Verify with read-only `execute_sql` / `list_tables` / `get_advisors`.

**Test security without leaving data behind:** write one `do $$ ... $$;` block that inserts temporary `auth.users` rows (fixed UUIDs, `instance_id '00000000-0000-0000-0000-000000000000'`, `aud/role 'authenticated'`), switches identity with `perform set_config('request.jwt.claims', json_build_object('sub', <uuid>::text, 'role', 'authenticated')::text, true); set local role authenticated;`, tries allowed and forbidden actions in `begin ... exception when others then ... end;` sub-blocks, appends results to a text variable, and **ends with `raise exception '%', out;`** so everything rolls back. Run it through `execute_sql` (no double quotes in the SQL). Examples of this pattern were used for the social and deletion tests.

**Add a lecture topic:** follow `README.md` → "Adding a topic" and the existing topics (e.g. `src/data/topics/inborn-errors-of-metabolism/`, `collagen-synthesis/`): `sources.ts` (concepts with slide/page refs, discrepancies, diagram write-ups), `lessons.ts` (reading layer), `interactive.ts` (answer-first checkpoints, recall prompts, high-yield, confusions), `questions.ts` (≥25 quiz questions per lesson; split into `more-questions.ts` if large), `index.ts` (`buildTopic`), register in `src/data/topics/index.ts`, set `status: "published"` in `src/data/content-catalog.ts`, run `npm test`. Rules: lecture files define what is taught; read every picture-only slide (render PDFs with `pdfjs-dist` + `@napi-rs/canvas`, extract ppt/pptx images); keep source disagreements as `discrepancies` with a "check" note and don't quiz unresolved ones; textbook points (Lehninger, Guyton) only clarify and are labelled; never invent content.

**Deploy:** `git add <files>` → commit (with attribution) → `git push origin master` → `npx --yes vercel --prod --yes` → verify the live bundle contains the change.

## 6. Known caveats

- The repo's earliest two migrations were applied via the dashboard before migration tracking, so `list_migrations` on the live project shows only the later ones (remote names: profiles, learning_engine, social, activity_and_account_deletion).
- Realtime covers friend requests/notifications; Friend activity refreshes when the Social data reloads (not pushed live).
- Weekly XP for friends is computed from `xp_events` since Monday (`date_trunc('week', now())`, UTC).
- Supabase URL Configuration (Site URL `https://grateapex.vercel.app`, Redirect URLs `https://grateapex.vercel.app/login`, `http://localhost:8081/login`) cannot be read from the API with the tools available — confirm via the dashboard or a real sign-in test (Google sign-in was tested working).
- Email confirmation is ON in the live project (sign-up shows "Check your email").
