# Explore — inventory for review (2026-10-10)

Goal (owner): Explore shows **new and upcoming** features only. Nothing below
has been removed yet; this lists what is on the page today and the proposal.
Feature statuses that had become untrue were corrected (not removed) — see
"Already corrected".

## What is on the page, top to bottom (`src/app/explore.tsx`)

| # | Section | What it is | Proposal |
|---|---|---|---|
| 1 | Welcome card ("Learn your way. Rise together.") | Explains Feed/Study/Explore; buttons *Replay the introduction* and *Contact us* | **Keep, shortened**: one line about what's coming; keep both buttons |
| 2 | "How GrAteApex Hub is organised" (4 steps: Feed, Study, Connect, Explore) | Explains implemented tabs | **Replaced** 2026-10-10 by a tap-through simulation of the five tabs (owner request; `src/components/explore/organisation-simulator.tsx`) |
| 3 | Weekly session ("This week · …") | Content from `explore_weekly_sessions` — the deployed rules refuse this collection, so it never shows | **Decide**: drop, or keep for later with an admin-written collection + rule |
| 4 | Medical concepts / Connections / Emerging research | Medical discovery content (not feature promotion) | **Decide**: keep (it is Explore's own content) or move to `/explore/discovery` only |
| 5 | Install the app card | Install instructions (implemented) | **Remove from Explore** — Settings already has install steps |
| 6 | "Explore by theme" (5 groups, each with an interactive **simulation**) | Groups of features + walkthrough demos | **Keep the simulations**; inside each group remove the *available* rows, keep *coming soon / limited* rows |
| 7 | "GrAteApex Hub feature guide" (every feature with a status pill) | 25 entries, mostly available | **Replace** with a "Coming soon" list built from the entries that are not available |
| 8 | "What's New" (2 announcements) | Both announce implemented work | **Remove these two**; future announcements only for upcoming features |
| 9 | About / Meet the team / Contact us | Team and contact | **Decide**: keep (not feature promotion) |
| 10 | Journey (rank ladder, XP rules, power-up multipliers, league rules) | Explains implemented systems | **Move** to You → My Progress (where XP and ranks live), not delete |

## Upcoming features that should stay (from the corrected guide)

Coming soon: Weekly challenges reward, Friend battles (needs a server
referee), Table Conferences (being rebuilt), Live voice calls (needs call
infrastructure), Past Question Bank, AI tutor and voice.
Limited: Leagues (weekly standings coming), Friend streaks / freezes / restores,
Widgets (native home-screen widgets not available).
Also not built yet and worth listing: the three app experiences (The Originals,
Originate, Hybrid), legacy themes, photo/voice/document messages, pre/post tests,
exam date, flashcard progress tracking.

## Must not be deleted

- `src/components/explore/feature-groups.tsx` simulations, and
  `src/components/onboarding/tour-demos.tsx`, which both the introduction tour
  and Explore use.
- `/explore/discovery` (its own route).
- Every real feature page — only Explore's descriptions of them would go.

## Already corrected (status/wording only, nothing removed)

Leagues → limited (total XP; weekly coming soon) · Friend battles → coming soon ·
Weekly challenges → coming soon · Table Conferences → coming soon · Friend
streaks/freezes → limited · Messages and Study groups → "friends who follow
each other" · Study plans/Timetable → private (no "saved with your account") ·
Live voice calls → no LiveKit claim · Posts → photos/videos now work
(Cloudinary) · Power-ups → timed achievement boosts · new entry: Achievements.

## Needs the owner's answer

Sections 3, 4 and 9 (keep or drop), and approval of the removals in 2, 5, 6, 7,
8 and the move in 10.
