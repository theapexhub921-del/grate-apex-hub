# Porting the older "Grate Apex Hub" features into GRATEAPEX — analysis + prompt

**Local only.** This work lives on the git branch `local/old-site-features`, which must NOT be pushed or deployed until the owner says so. New screens are also gated by `isLocalPreview()` (`src/lib/local-preview.ts`): they render only on `localhost` / development builds, never on grateapex.vercel.app.

## 1. What the older site is (analysed 5 Oct 2026)

- URL: https://grate-apex-hub.vercel.app ("Grate Apex Hub"). Built with Expo web, but a **different codebase**: its title never appears in this repo's history, and its source repo is not public (`nathanielcb14/GRATEAPEX-1` is private or deleted). It is not in the `grateapex` Vercel account.
- Backend: **Firebase** (auth/database), **Cloudinary** (uploads), manual **MoMo** mobile-money payments (transaction ID entry). GRATEAPEX uses **Supabase** — everything must be rebuilt on Supabase, never by adding Firebase.
- Feature inventory (from its UI text):

| Area | Features in the old site | GRATEAPEX today |
|---|---|---|
| Onboarding | username at sign-up ("This can't be changed later"), class/level, semester count, hall of residence, replay tutorial | intro tour; username chosen on Friends page (changeable) |
| Profile | bio ("Add a bio"), trophy case / achievements, "Your story", followers | name + avatar; no bio/achievements |
| Social | follow model (mutual follow = friends), "Suggested for you", find students by username, study groups (create/leave/delete), community feed with discussion posts, replies, "My posts", "Ask a Senior", General channel | friends (requests), search, weekly leaderboard, friend activity |
| Messaging | direct messages (only between mutual follows), typing indicator, reply / forward / delete, images & attachments, voice notes, **audio calls**, "New message" | none |
| Competition | **XP Battles** (challenge someone, stake XP, battle room, call off → XP returned), leaderboards with multiple boards, weekly challenge | Apex Challenge, friends weekly board, leagues "opening soon" |
| Study tools | **Question of the Day**, **Flashcards** (Grate Apex + AI-generated), Mnemonics, Key facts, Glossary, Worked examples, "What you missed", Weak spots, Smart study / Study plan, Quick recall check, Mixed round | lessons (learn/read/quiz), review, weak concepts in engine |
| Practice | Practice Center, **Past questions** (by paper, "Mixed from all papers"), **Predicted Tests**, **Custom Quiz Builder** (topics, number of questions, feedback after each question vs exam style), **Timed Drill** (time per question), **Pre-test / Post-test** | lesson quiz, topic quiz, practice wrong answers, Apex |
| AI | "Ask the AI tutor" on a lesson, AI flashcards | none |
| Content | video lessons, "Read offline" downloads | text lessons |
| Platform | push notifications, daily streak reminder, themes, Premium (MoMo payment + transaction ID), Help & support chat ("Support replied"), WhatsApp share | in-app notifications, themes |

## 2. Already ported in this branch (local preview only)

1. **Question of the Day** — `src/components/learning/question-of-the-day.tsx`, shown on Home only in local preview. One single-answer question per day from the published banks (same for everyone that day), answered inline; practice only (stored on the device for the day; never touches XP/memory/reviews). Links to the lesson and its flashcards.
2. **Flashcards** — `src/app/learn/flashcards.tsx` (`/learn/flashcards?lesson=<id>`), built only from each lesson's own lecture material (key terms + recall prompts); flip, "Got it" / "Again", score at the end. Hidden route; local preview only.

## 3. Prompt for the next agent (copy from here)

You are porting features from the older Grate Apex Hub site into GRATEAPEX. Read `AGENTS.md` and `docs/next-agent-prompt.md` first. Work ONLY on branch `local/old-site-features`; do not push or deploy it; gate every new screen/card with `isLocalPreview()`. Keep GRATEAPEX's design system (Card, Button, Pill, Screen, Icon — no emoji in UI), its learning engine, and its rule that lecture files are the only source of course content (no invented content; AI output must be labelled and never quizzed as fact). All backend work uses the existing Supabase project via migrations (see the recipes in `docs/next-agent-prompt.md`): RLS on every table, SECURITY DEFINER functions with `auth.uid()`, never trust client-sent user IDs/scores, self-rolling-back security tests. Live database changes need the owner's explicit approval (they also affect production — prefer additive, unused-by-production tables/columns).

Port in this order (each = audit what GRATEAPEX already has → smallest design that fits → implement → typecheck/lint/test → commit locally):

1. **Custom Quiz Builder + Timed Drill** (no backend): pick topics/lessons, number of questions, feedback mode (after each question / exam style), optional seconds per question; reuse `src/data/learning/selection.ts` and the quiz runner; record attempts through the existing quiz-history path (new attempt kind may need the `quiz_attempts.attempt_type` check extended — migration).
2. **Pre-test / post-test** for a topic: same selection engine; show improvement.
3. **Study aids from lecture material**: Key facts (lesson high-yield), Glossary (all `terms` across a topic), "What you missed" (wrong answers with explanations — exists in Results). Mnemonics/worked examples only if present in lecture files.
4. **Profile bio + trophy case**: `profiles.bio` (length-checked, column grant), server-awarded achievements (`user_achievements`, awarded only by functions deriving from trusted tables).
5. **Study groups + community posts**: tables `groups`, `group_members`, `posts`, `post_replies` with RLS (members-only reads, author-only edits, moderation fields), notifications for replies; reuse `src/data/social.ts` patterns and Realtime.
6. **Direct messages** (mutual friends only): `conversations`, `messages` (RLS: participants only), Realtime for new messages + typing (Realtime presence/broadcast, not tables); attachments via Supabase Storage with per-user paths. Audio calls are out of scope unless the owner asks (needs a WebRTC/LiveKit service).
7. **XP Battles**: server-authoritative — battle row, both players' answers verified server-side against the question bank, XP stakes moved by a SECURITY DEFINER function, refunds on call-off; never let clients report scores.
8. **Leagues & multiple leaderboards**, **weekly challenge**, **push notifications** (Expo push tokens table + Edge Function), **daily streak reminder**.
9. **AI tutor / AI flashcards**: Supabase Edge Function calling the Claude API (latest model) with the lesson's own text as context; label all output "AI-generated — check with your notes"; never store AI text as course content; rate-limit per user.
10. **Premium / payments**: do NOT copy manual MoMo transaction-ID entry. Discuss with the owner first (a real payment provider, e.g. Paystack, with server-side verification via Edge Function + webhook).
11. **Past questions / Predicted tests / videos / offline reading**: need source material from the owner — ask before building.

When a feature is ready, show it on localhost (`npx expo start --web`, then open http://localhost:8081) and wait for the owner to approve before anything is merged to `master` or deployed.
