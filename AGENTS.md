# GRATEAPEX — Codex Project Instructions

## Project overview

GRATEAPEX is a medical-student learning app being built as a beginner-friendly study ecosystem.

The current project is an early prototype. The initial intended subjects are:

* Anatomy
* Biochemistry
* Physiology

Lecture material lives in `content/<SUBJECT>/` and is the source of truth. Do not invent or permanently add course content that has not been provided.

The first real topic is Biochemistry → Fatty Acid Biosynthesis. The earlier Glycolysis test content has been removed.

## Developer experience

The project owner is a beginner with no formal coding experience.

When making changes:

* Prefer simple, maintainable solutions.
* Avoid unnecessary architectural complexity.
* Explain important changes in beginner-friendly language.
* Do not make large unrelated changes while fixing a specific problem.
* Preserve working functionality.
* Before changing an existing system, inspect how it currently works.
* Prefer the smallest reliable change that solves the problem.

## Current technology

The project uses:

* Expo
* React Native
* Expo Router
* TypeScript
* AsyncStorage
* VS Code
* Expo Go for Android testing
* Web testing through Expo

Project path:

`C:\Users\User\GRATEAPEX`

The app uses `src/app` as the Expo Router root.

## Important project structure

Current routes include:

* `src/app/index.tsx`
* `src/app/explore.tsx`
* `src/app/profile.tsx`
* `src/app/progress.tsx`
* `src/app/learn/index.tsx`
* `src/app/learn/anatomy.tsx`
* `src/app/learn/biochemistry.tsx`
* `src/app/learn/physiology.tsx`
* `src/app/learn/topic.tsx` (any topic: `/learn/topic?topic=<topic id>`)
* `src/app/learn/course.tsx` (kept for old links: redirects a topic id to the topic page)
* `src/app/learn/fatty-acid-biosynthesis.tsx` (kept for old links: redirects to the topic page)
* `src/app/learn/lesson.tsx` (`/learn/lesson?lesson=<lesson id>[&layer=learn|read]`)
* `src/app/learn/quiz.tsx` (lesson quiz, topic quiz, practice wrong answers, mastery check)
* `src/app/learn/results.tsx` (`/learn/results?attempt=<attempt id>`)
* `src/app/learn/review.tsx` (spaced-repetition review sessions)
* `src/app/learn/apex.tsx` (Apex Challenge: `/learn/apex?course=<course id>`; 10 seconds per question, set in `src/data/learning/apex.ts`)
* `src/app/login.tsx` (sign in, create account, Continue with Google, forgot / reset password)
* `src/app/onboarding.tsx` (first-run interactive introduction: `/onboarding[?replay=1]`)
* `src/app/settings.tsx`, `src/app/social/index.tsx`, `src/app/social/friends.tsx`, `src/app/explore/discovery.tsx`

Build every learn-flow link with `src/lib/routes.ts` (it never produces `undefined` in a URL).

## Authentication and onboarding

Everything uses the existing Supabase auth (`src/lib/supabase.ts`, `src/hooks/use-auth.tsx`). Do not add a second auth system.

* **Create account:** `supabase.auth.signUp`, with the learner's name in the user metadata.
  * If email confirmation is on in Supabase, the learner sees "Check your email" (with a resend option).
  * If it is off, they are signed in straight away.
* **Continue with Google:** `src/lib/google-auth.ts`.
  * On the web it first checks that the Google provider is switched on, then leaves for Google and returns to `/login`.
  * On phones it uses `expo-web-browser`.
  * A cancelled or failed Google sign-in is explained on the sign-in page, never as an expired reset link.
* **Route guard:** `AppGuard` in `src/app/_layout.tsx`.
  * Signed-out users go to `/login`.
  * Password-recovery links stay on `/login`.
  * A signed-in learner who needs onboarding goes to `/onboarding`.
  * Signed-in learners on `/login` go to Home.
* **Who needs onboarding:** `src/data/onboarding.ts`. Accounts created on or after the release date (`ONBOARDING_RELEASE`) see the introduction once.
  * Finishing or skipping is stored on the device and in the account metadata (`onboarding_completed`), so it follows the learner to other devices.
  * Settings → Help → "Replay the introduction" shows it again.
* **The introduction:** `src/components/onboarding/`.
  * It is practice only: demo answers, XP and schedules are never recorded.
  * The one exception is "Make it yours" (name, avatar, theme), which saves real settings and is labelled as such.

There is intentionally no `src/app/learn/_layout.tsx` unless the project owner specifically asks for one.

## Current data structure

Inventory of every file in `content/` (topics, sources, annotations, outlines):

`src/data/content-catalog.ts`

Content types (Subject → Topic → Lesson → Concept, sources, discrepancies):

`src/data/lesson-types.ts`

Each topic with lessons lives in `src/data/topics/<topic>/` (`sources.ts`, `lessons.ts`, `interactive.ts`, `questions.ts`, `index.ts`), built by `src/data/topics/build.ts` and registered in:

`src/data/topics/index.ts` (also set the topic's status to `published` in `src/data/content-catalog.ts`)

Subject → course → topic → lesson lookups (the one curriculum model):

`src/data/curriculum.ts`

The learning engine is in `src/data/learning/`:

* `scheduler.ts` — spaced-repetition scheduler (documented at the top of the file)
* `memory.ts` — concept and question memory, derived from answer history
* `selection.ts` — quiz / review / Apex question selection (never a fixed list)
* `xp-rules.ts` — every XP amount and penalty
* `progress-model.ts`, `next-action.ts`, `calendar.ts`, `events.ts`, `lesson-sessions.ts`, `apex.ts`

Question history and quiz attempts are in `src/data/question-history.ts` and `src/data/quiz-history.ts`.

Social (real friends) is in `src/data/social.ts`, backed by `supabase/migrations/20261005000000_social.sql`:

* Usernames, learner search, friend requests (one row per pair in `friendships`) and social notifications (`notifications`, shown in the bell).
* Every action goes through a `SECURITY DEFINER` function that uses `auth.uid()`; clients cannot read other learners' rows or write friendships, notifications or XP directly.
* XP awards are capped at 150 per event on the server, and `user_learning_stats.total_xp` can only change through the XP functions.
* The store refreshes over Supabase Realtime and clears on sign-out.

"Stump a friend" (`src/data/stumps.ts`, `src/components/social/stump-card.tsx`): from quiz results, a multiple-choice question is shared to the feed as a post with `stump: { qid, note }`; friends answer on the card (answers are hidden `replies` with `stump: { pick, ok }`, saved to question history as practice, no XP). Only the sharer sees who got it right or wrong; others see only their own result. Works with the deployed Firestore rules unchanged.

Database changes go in `supabase/migrations/` (the live project is `dkmossrgptfgutkqefws`); apply them only with the owner's approval.

Lecture diagrams (tappable images) are in `src/data/figures/` (one file per topic, registered in `index.ts`); the pictures are slide crops in `public/figures/<topic>/`. A reading section shows one with `figure: '<id>'` ("Explore" / "Test yourself", `src/components/learning/figure-view.tsx`); `spotQuestion()` in `src/data/topics/build.ts` makes "what is the marked part?" quiz questions (labels covered, never in Apex). `tests/figures.test.mjs` checks every image and reference.

Progress functionality is currently in:

`src/data/progress.ts`

Compliments are currently in:

`src/data/compliments.ts`

Learning remarks are currently in:

`src/data/remarks.ts`

## Ask AI and AI Flashcards (every lesson)

Every lesson has an "Ask AI" tab (questions answered from the lesson's own text) and an "AI Flashcards" tab (question-and-answer cards the AI writes from the lesson, studied with the same spaced repetition as the normal flashcards). Both are on `src/app/learn/lesson.tsx` and `src/app/learn/hb-lesson.tsx`.

* Model: Gemini 3.1 Flash-Lite (`gemini-3.1-flash-lite`). Change it with the `GEMINI_MODEL` setting if Google renames it.
* The Gemini key never goes in the app. `api/ai.mjs` (a Vercel function, like `api/push.mjs`) checks the learner's sign-in token, limits requests per learner, and calls Gemini. Set `GEMINI_API_KEY` in Vercel → Settings → Environment Variables, then redeploy.
* `src/lib/ai-study-api.ts` calls it; `src/data/ai-study.ts` turns a lesson into plain text and handles saved cards (kept on the device, key `grateapex_ai_cards:<lesson id>`); `src/components/learning/ai-study.tsx` holds the two panels.
* `expo start` does not run `api/`, so the AI shows a friendly "runs on the live app" message in a local preview. To try it locally use `vercel dev`, or set `EXPO_PUBLIC_API_BASE` to the live site.
* `tests/ai-study.test.mjs` checks every lesson produces text for the AI.

## Study chat (general AI chat, outside lessons)

`/learn/chat` (`src/app/learn/chat.tsx`) is a general AI chat, linked from the Learn home. It calls `/api/chat` (`api/chat.mjs`) through `src/lib/ai-chat-api.ts`, with its own per-learner allowance (120 requests / 10 min) separate from the lesson AI.

* Providers, tried in order: any OpenAI-compatible service (`CHAT_API_KEY`, optional `CHAT_API_BASE` default Groq, optional `CHAT_MODEL`), then Gemini (`GEMINI_API_KEY`, optional `GEMINI_CHAT_MODEL`). If the first is rate-limited or down, the next answers. Set at least one key in Vercel, then redeploy.

## Progress system

GRATEAPEX has persistent progress using AsyncStorage.

Progress includes:

* XP
* level
* streak
* lessons completed
* completed lesson IDs
* subject progress
* last activity date

Lesson completion should:

1. Prevent duplicate XP for an already completed lesson.
2. Add the lesson ID to completed lessons.
3. Increment lessons completed.
4. Increase the relevant subject progress.
5. Update the streak.
6. Add XP.
7. Persist the updated progress.
8. Notify the UI so the current screen immediately reflects the new state.

Do not break duplicate-completion protection.

## Lesson system

The lesson screen should show a completion state after the learner completes a lesson.

After completion, the learner should be able to:

* See "Lesson Completed"
* See the XP earned
* Take the lesson quiz when a quiz exists
* Return to the course

Lesson pages should be scrollable.

Important content should not be hidden behind bottom navigation.

## Quiz system

The quiz system currently supports:

* Multiple-choice questions
* Answer selection
* Instant feedback
* Submit-at-end mode
* Score calculation
* Timer
* Retaking quizzes
* Practicing wrong answers
* Tracking wrong question IDs
* Tracking incorrect concepts
* Results screen

Do not remove these features when modifying the quiz system.

## Quiz results

The results screen is intended to show:

* Score
* Strengths
* Areas needing improvement
* Learning remark
* Time-related feedback
* Practice wrong answers
* Retake quiz
* Return to course

Learning remarks use persistent usage tracking so the same remark should not unnecessarily repeat when alternatives are available.

## Course content rules

All supplied files for a topic are merged; none is treated as the single authoritative file. Where sources disagree, keep both versions (topic `discrepancies` and a "check" note) instead of correcting them. Material added to a deck after the lecture (speaker notes, comments, pasted images) is labelled as an annotation and is not used in quizzes until confirmed.

## Navigation

Web navigation is controlled by:

`src/components/app-tabs.web.tsx` (phones/tablets: `src/components/app-tabs.tsx`)

The five destinations live in `src/components/nav-items.tsx`, and both shells read them from there. The order is Home, Learn, Social, Explore, Profile (the owner's choice).

* **Desktop:** the left rail is `src/components/desktop-sidebar.tsx`. With "Always visible" it is docked; with auto-hide it floats in from the left edge.
* **Phones and narrow web:** the floating bottom bar is `src/components/floating-tab-bar.tsx`. It auto-hides on scroll down; see `src/components/tab-bar-visibility.tsx`.

Some learning and results routes are intentionally hidden from the main navigation and are reached through the learning flow.

Do not expose hidden routes in the main navigation unless specifically requested.

## Design system

The full redesign rationale is in `docs/redesign-notes.md`.

### Tokens and motion

* All colours, type, radius and elevation come from `src/constants/theme.ts`:
  * `useTheme()` / `useThemedStyles()`
  * `Type.*`, `Radius.*`, `elevation(colors, level)`
* All durations, springs and curves come from `src/constants/motion.ts`.
* Respect reduced motion: use `useReducedMotion()`.
* Never hard-code new colours in screens.

### Atmosphere

* The page background is the shell's atmosphere layer (`src/components/atmosphere/`). It has a mood per route: Home is lively, Learn is calm, quiz and lesson are focus, Profile and Settings are quiet.
* Screens are transparent, so build pages with `Screen` from `src/components/ui/screen.tsx`. Do not give screens an opaque page background.

### Primitives (`src/components/ui/`)

* `Card` / `PressableCard` (with tones), `Button`, `IconButton`
* `ProgressBar`, `ProgressRing`, `AnimatedNumber`
* `Pill`, `SegmentedControl`, `Sheet` (a bottom sheet on phones, a dialog on desktop)
* `Avatar` / `AvatarStack`
* `EmptyState`, `ErrorScreen`, `LoadingState` (skeletons), `InlineNotice`
* Reuse these instead of styling one-off rows, cards or buttons.

### Icons and glyphs

* No emoji in the interface. Use `Icon` (`src/components/ui/icon.tsx`), the GRATEAPEX SVG icon set.
* Subjects and topics use `SubjectGlyph` / `TopicGlyph` (`src/components/learning/glyphs.tsx`). The anatomy glyph is a human body.
* A subject's topics are shown as a vertical path, in course order (finish one, then the next).

### Avatars

* `src/components/avatar/` holds the illustrated male and female presets plus the picker.
* A learner's choice is saved through `setAvatarUrl` in `profiles.avatar_url` as one of:
  * `preset:<id>`
  * a small resized photo data URI (`src/lib/avatar-upload.ts`)
  * nothing, which shows initials

### Notifications

* `src/data/notifications.ts` derives notifications from real learning state. Only read marks are stored, on the device.
* The bell and centre UI are in `src/components/notifications.tsx`.

### Locked elements

* The logo and its hover shine (`src/components/logo-mark.tsx`) are locked, and so is the ~3-second intro (`src/components/animated-icon*.tsx`).
* The only intro additions are the background behind it and the "developed by OrigiNate" credit (`src/components/intro-credit.tsx`).
* The OrigiNate signature (`src/components/signature.tsx`) stays bottom-right on every screen.

### Data honesty

* Every number shown comes from real learning data.
* Sample data (Friends) is labelled as sample.
* Features that are not built say "coming soon".

## UI requirements

Pages should generally be scrollable.

Leave sufficient bottom spacing so content and buttons are not hidden behind navigation.

Keep the interface clean, readable, and suitable for medical students.

Do not introduce unnecessary visual complexity.

## File modification rules

Before modifying code:

1. Inspect the relevant files.
2. Understand the existing implementation.
3. Identify the smallest appropriate change.
4. Avoid changing unrelated files.
5. Preserve existing working behavior.

After modifying code:

1. Check for TypeScript errors (`npm run typecheck`).
2. Run an appropriate validation command when practical (`npm test` checks the learning engine and every published topic's content).
3. Explain what changed.
4. Mention any remaining issue or uncertainty.

For larger changes, first provide a short implementation plan before editing.

Do not rewrite an entire project when a focused change is sufficient.

## Testing priority

The current priority is the web version of GRATEAPEX.

Do not spend time fixing Android-specific behavior unless the project owner explicitly asks for it.

## Git safety

Do not delete working features or files without explaining why.

Do not reset, revert, or overwrite unrelated user changes.

Do not make destructive Git operations unless explicitly requested.

## Working style

The project owner prefers working one clear step at a time.

When a task has multiple possible approaches, recommend the simplest reliable approach.

If something is broken, diagnose the existing implementation before proposing a rewrite.

The goal is to build GRATEAPEX incrementally into a polished medical-student learning ecosystem.
