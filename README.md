# GRATEAPEX

A study app for medical students, built with Expo, React Native, Expo Router and TypeScript.

The first subjects are **Anatomy**, **Biochemistry** and **Physiology**. The app is an early prototype. Course content comes from lecture material supplied by the project owner (the files in `content/`).

## Current content

| Subject | Status |
| --- | --- |
| Biochemistry | **Fatty Acid Biosynthesis** (8 lessons), **Cholesterol and Bile Biosynthesis** (5 lessons), **Haem and Haem Metabolism** (7 lessons), **Oxygen Carriers: Myoglobin and Haemoglobin** (4 lessons), **Blood Coagulation and Fibrinolysis** (4 lessons) and **Endocrine System: Hormones** (3 lessons). Every lesson has an interactive layer, a reading summary and a quiz bank of 25+ questions. The other Biochemistry ZIPs are catalogued and listed as "lessons in preparation". |
| Physiology | Lecture ZIPs catalogued and listed as "lessons in preparation". |
| Anatomy | Awaiting materials. |

`src/data/content-catalog.ts` lists every file in `content/`, which topic it belongs to, and whether that topic is published yet.

## Running the app

You need [Node.js](https://nodejs.org) installed.

1. Install dependencies (first time, or after `package.json` changes):

   ```bash
   npm install
   ```

2. Start the app:

   ```bash
   npx expo start
   ```

3. Press **w** to open the web version (the current testing priority), or scan the QR code with **Expo Go** on Android.

## Checking your work

| Command | What it checks |
| --- | --- |
| `npm run typecheck` | TypeScript errors (same as `npx tsc --noEmit`) |
| `npm test` | The learning engine (scheduler, memory, question selection, XP rules) and every published topic's content: valid answers, real source references, all three lesson layers, quizzes that reach 25 questions |
| `npx eslint src` | Code style problems |

## Environment variables

Supabase settings are read from a `.env` file in the project root. It needs:

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

`.env` holds private project details. Do not commit it or share it.

## Database (Supabase)

Migrations live in `supabase/migrations/`. The newest one, `20261003000000_learning_engine.sql`, adds what the learning engine needs online: the new answer modes (topic quiz, recall, Apex, mastery check), review and topic quiz attempts, XP penalties, and a `learning_events` table.

**It has not been applied yet.** Until it is, the app keeps working: everything is saved on the device first, and the parts the old database cannot store yet are skipped when syncing (they stay on the device). Apply it from the Supabase dashboard (SQL editor) or with the Supabase CLI when you are ready.

## Where things live

| Path | What it holds |
| --- | --- |
| `src/app/` | Screens (Expo Router: each file is a route) |
| `src/app/learn/` | Learn flow: subjects, topic, lesson, quiz, results, review, Apex Challenge |
| `src/components/` | Shared UI (navigation, question cards, XP toast…) |
| `src/components/learning/` | Learn-flow building blocks (lesson layers, quiz runner, review calendar…) |
| `src/components/ui/` | Basic UI kit: buttons, cards, progress bars, screen layout |
| `src/data/content-catalog.ts` | Every file in `content/`: topic, role, slides, notes, status |
| `src/data/topics/<topic>/` | A published topic: sources, lessons, interactive steps, question bank |
| `src/data/curriculum.ts` | Subject → course → topic → lesson lookups |
| `src/data/learning/` | The learning engine: scheduler, memory model, question selection, XP rules, next best action |
| `src/data/progress.ts` | XP, level, streak, completed lessons, XP history |
| `src/data/question-history.ts` | Every answer given (feeds the memory model) |
| `src/data/quiz-history.ts` | Saved quiz / review / Apex attempts shown on My Progress |
| `src/lib/routes.ts` | Builds every learn-flow link (never puts `undefined` in a URL) |
| `tests/` | `npm test` checks |
| `content/` | Source lecture files the lessons are built from |

Progress and history are saved on the device with AsyncStorage and synced to Supabase when signed in.

## Adding a topic

1. Put the lecture ZIP in `content/<SUBJECT>/` and add it to the catalog (`src/data/content-catalog.ts`).
2. Copy the layout of `src/data/topics/cholesterol-and-bile-biosynthesis/`: `sources.ts` (concepts and slide references), `lessons.ts` (reading layer), `interactive.ts` (learn-by-answering steps), `questions.ts` (quiz bank), `index.ts`.
3. Register it in `src/data/topics/index.ts` and set its status to `"published"` in the catalog.
4. Run `npm test`: it reports missing references, invalid answers and lessons whose quiz cannot reach 25 questions.

Content rules: lecture files define what is taught. Where sources disagree, keep both versions (a topic `discrepancy` plus a "check" note) and do not quiz the disputed point. Textbook explanations are labelled.

## ⚠️ Do not run `npm run reset-project`

This command comes from the Expo starter template. It **moves or deletes the entire `src` folder**, which holds all of GRATEAPEX's screens, lessons and data, and replaces it with a blank app. It is not a setup step, so do not run it.

## Project notes for AI assistants

See `AGENTS.md` (also loaded via `CLAUDE.md`) for the working rules on this project.
