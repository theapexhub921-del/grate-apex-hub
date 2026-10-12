# GRATEAPEX — session report (3 October 2026)

This report covers everything done in this session. It has two parts:

- **Task 1:** your 61-section learning-engine specification.
- **Task 2:** Cline's unfinished 15-phase desktop/UX polish task, which I completed after Cline stopped.

Nothing has been committed to git, and no database migration has been applied to your live Supabase project. All changes are in your working folder for you to review.

---

## 0. Coordination with Cline

- Cline was editing the same files at the same time as me. I paused and asked you what to do. Following your answer, I pulled Cline's progress report from its session logs, Cline stopped, and I took over its prompt.
- Before touching anything I saved snapshots of `src/`, `supabase/` and the config files: one from before my edits, and one after Cline's edits. The repo has no commits yet, so these snapshots are the only "undo" point. They live in my scratchpad, not in your project.
- Cline had finished phases 1–5:
  - inspection;
  - a desktop sidebar (`src/components/desktop-sidebar.tsx`);
  - auto-hide for that sidebar;
  - browser tab titles (`src/components/page-title.tsx`);
  - showing your saved display name.

  I completed phases 6–15 (section 10 below).

---

## 1. Final state at a glance

| Check | Result |
| --- | --- |
| TypeScript (`npm run typecheck`) | 0 errors |
| Unit and content tests (`npm test`) | 75 / 75 pass |
| Full browser learning-flow test | 40 / 40 checks pass |
| Every-route smoke test (static web build) | 54 / 54 routes load with no errors, correct titles and working redirects |
| Lint (`npx eslint src`) | 72 problems at the start → 17. All 17 are in `src/app/login.tsx`, deliberately untouched so sign-in isn't put at risk |
| Web export (`npx expo export --platform web`) | Builds; every page has its proper `<title>` |
| Published topics | 6 (Biochemistry), with 31 lessons |
| Question bank | 984 questions: 816 quiz + 168 learn-by-answering checkpoints, plus 31 recall prompts |

---

## 2. Content: what was built from your lecture files

### 2.1 How the material was read

- Every ZIP in `content/BIOCHEMISTRY` and `content/PHYSIOLOGY` was opened, and every lecture file was turned into text.
- I wrote my own readers for each format:
  - old `.ppt` files, including slide order, speaker notes and embedded pictures;
  - `.pptx`, `.ppsx` and `.pptm`;
  - PDFs and `.docx`.
- Slides whose information is only in a picture were extracted as images and **read one by one**. This includes pasted textbook pages and vector "metafile" diagrams, which the extractor converts to PNG.
- What each diagram shows is written out in each topic's `diagrams` list, so every lesson statement can be traced to a slide.
- Disagreements between sources are **kept, not silently fixed**:
  - Each one goes in the topic's `discrepancies` list.
  - If a textbook settles it, the lesson shows a **"Clarified"** note quoting the slide.
  - If nothing settles it, the lesson shows a **"Check with your lecturer"** note, and the point is **never quizzed**.
- Speaker notes and comments added to a deck later are shown as **annotations** and are not quizzed.

### 2.2 The catalog (`src/data/content-catalog.ts`)

The catalog lists 99 files across 22 topics. For each file it records the format, lecturer, slide count, whether text could be extracted, exact duplicates, earlier versions, annotations and notes.

| Status | Topics |
| --- | --- |
| **Published (6)** | Fatty Acid Biosynthesis · Cholesterol and Bile Biosynthesis · Haem and Haem Metabolism · Oxygen Carriers · Blood Coagulation and Fibrinolysis · Endocrine System: Hormones |
| Lectures catalogued, lessons not built yet (14) | Amino Acid Metabolism · Collagen · Free Radicals · Immunology · Inborn Errors · Nucleic Acids · Respiratory Physiology (in the Biochemistry folder) · Cardiovascular, CNS, Endocrinology, GI, Renal, Reproductive and Special Senses physiology |
| Empty (1) | "CNS 2022" ZIP (contains only a resource-fork file) |
| Needs your classification (1) | `Cardiovascular system Gross 2.ppt` (sits in the BIOCHEMISTRY folder but looks like anatomy) |

Anatomy has no materials yet, so the app shows it as "Awaiting materials".

### 2.3 The six published topics

Every lesson has all three layers:

- **Learn interactively:** you answer before you are told.
- **Read and revise:** a structured summary with high-yield points and common confusions.
- **Quiz:** at least 25 questions in its own bank.

| Topic (lecturer) | Lessons | Concepts | Quiz questions | Checkpoints | Recall prompts | Discrepancies kept | Diagrams written out |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Fatty Acid Biosynthesis (R A Ngala) | 8 | 38 | 203 | 46 | 8 | 10 | 3 |
| Cholesterol and Bile Biosynthesis (R A Ngala) | 5 | 23 | 135 | 31 | 5 | 4 | 11 |
| Haem and Haem Metabolism (E. F. Laing) | 7 | 32 | 189 | 37 | 7 | 7 | 12 |
| Oxygen Carriers: Mb and Hb (E. F. Laing) | 4 | 19 | 108 | 20 | 4 | 3 | 9 |
| Blood Coagulation and Fibrinolysis (E. F. Laing) | 4 | 18 | 104 | 19 | 4 | 1 | 7 |
| Endocrine System: Hormones (Prof. FAY) | 3 | 12 | 77 | 15 | 3 | 3 | 5 |
| **Total** | **31** | **142** | **816** | **168** | **31** | **28** | **47** |

Lesson titles:

- **Cholesterol:**
  1. Structure, Sites and Raw Materials
  2. Acetyl-CoA to Mevalonate
  3. Mevalonate to Cholesterol
  4. Regulating Cholesterol Synthesis
  5. Bile Acids
- **Haem:**
  1. Porphyrins and Haem
  2. Synthesis I (ALA → uroporphyrinogen III)
  3. Synthesis II (→ haem; compartments)
  4. Regulation
  5. Porphyrias and Lead Poisoning
  6. Haem → Bilirubin
  7. Conjugation, Excretion and Jaundice
- **Oxygen Carriers:**
  1. Myoglobin: Roles, Iron and Structure
  2. Active Site: Histidines, Oxidation, CO
  3. Haemoglobin: Structure, Allostery, Cooperativity
  4. Bohr Effect, 2,3-BPG and Fetal Hb
- **Coagulation:**
  1. The Clotting Cascade
  2. Platelets, Fibrinogen and Fibrin
  3. Prothrombin, Vitamin K and Bleeding Disorders
  4. Controlling Clotting and Fibrinolysis
- **Hormones:**
  1. The Endocrine System and Hormones
  2. Hormone Classes and Second Messengers
  3. Steroid Hormones

### 2.4 Points in your slides worth knowing (kept as discrepancies)

These are shown in the lessons and are **not quizzed** unless a textbook settles them.

- **Fatty acids (settled by Lehninger):**
  - slide 2's "hydratase removes water" (that describes a dehydratase);
  - deck B's malonyl-CoA formula;
  - "cis" vs trans enoyl;
  - "dehydrogenated" oxaloacetate (it is reduced);
  - synthase vs synthetase, "palmitidic", 6 vs 7 cycles, and ACP₁/ACP₂ names.
- **Cholesterol:**
  - Unsettled, not quizzed: the liver making "about 20%" of cholesterol (Lehninger gives no figure), and slide 13 announcing "three mechanisms" then listing five.
  - Clarified: "reductase in cytosol" vs "localised in ER", and the garbled PPI-1 sentence (the lecture's own diagram explains it).
- **Haem:**
  - Unsettled:
    - the lecture says porphyria cutanea tarda is the most common porphyria, but Lehninger says acute intermittent porphyria;
    - slide 35 says lead inhibits ALA synthase, but slide 37 says its gene is de-repressed;
    - whether haem oxygenase releases Fe²⁺ or Fe³⁺;
    - where in the gut glucuronides are removed;
    - whether neonatal jaundice is prehepatic or hepatic.
  - Clarified: "glycine + succinate" (it is succinyl-CoA), and "guanylate synthase" (a haem guanylyl cyclase, Lehninger p. 434).
- **Oxygen carriers:**
  - Unsettled: 2,3-BPG having 5 negative charges (lecture) or 4 (pasted page).
  - Clarified: "serine is more negatively charged" (it lacks histidine's positive charge, Lehninger p. 172), and the "rectangular parabolic" curve (it is hyperbolic).
- **Coagulation:**
  - Unsettled: fibrinogen 460 Å vs 45 nm.
  - Not quizzed: slide 65 says plasminogen is made in the kidneys, and no supplied source confirms the site.
- **Hormones:**
  - Clarified: slide 20 calls cortisol a mineralocorticoid (the lecture's own slides 21 and 25, and Guyton p. 955, show it is a glucocorticoid); slide 25 says CRF acts on the adrenal (slide 26 shows CRF → pituitary → ACTH).
  - Unsettled: angiotensin III (slide) vs angiotensin II (Guyton p. 956).

---

## 3. The learning engine (`src/data/learning/`)

- **One memory model.** Concept and question memory are *derived* by replaying your answer history and lesson completions. The same history always gives the same result, and older saved schedules are used only as a fallback.
- **Memory states:** new, learning, struggling, remembered, mastered and due.
  - *Struggling* means two or more misses in a row, or under 50% recent accuracy.
  - *Mastered* means a review gap of 21 days or more, the last answer correct, and at least 80% accuracy.
- **Spaced-repetition scheduler (`scheduler.ts`, documented at the top of the file).**
  - Intervals: 1 day, then 3 days, then the previous interval × "ease" (ease 1.3–2.8, starting at 2.5, 2.3 or 2.1 by difficulty), up to 180 days.
  - Cramming guard: a review only counts after at least 50% of the gap has passed.
  - Overdue bonus of up to ×1.3; a "partly recalled" self-rating counts as half.
  - A miss resets the interval and lowers ease by 0.2. A miss in Apex is "soft": ease −0.05, and the concept is due within a day.
  - Questions you've just seen rest for 2, 7 or 21 days.
- **Question selection (`selection.ts`), never a fixed list.**
  - Seeded weighted random sampling that covers every concept before doubling up, and caps questions per concept.
  - It favours what you missed or what is due, adjusts difficulty to you, spaces out repeats of the same concept, and makes sure the first question is never a hard one.
  - It works for lesson, topic, course, subject, review and Apex scopes. Each pick carries a reason (missed, due, weak, new…).
- **XP rules (`xp-rules.ts`).**
  - Lesson: 10–50 XP.
  - Lesson quiz: 20, plus 20 at ≥90% or 10 at ≥75%, and −2 per wrong answer. Topic quiz: 30 base.
  - Practice: 10. Review: 15 + 2 per due concept recalled (up to 50). Neither ever deducts.
  - Apex: 20 + 30, 20 or 10 by accuracy.
  - Completing a topic: 50; mastering a concept: 5.
  - Pass mark 70%; mastery check 80%.
  - Power-up multipliers (×1.5–×3) apply to gains only, never to penalties. They are wired in, but no power-up is switched on yet.
  - Rank thresholds are unchanged (Consultant at 1,000,000).
- **Next best action (`next-action.ts`).** It picks what to suggest next: due reviews, unfinished lessons, weak concepts or the next lesson.
- **Review calendar (`calendar.ts`).** Shows what is due over the coming days and how consistently you review.
- **Learning events (`events.ts`).** An activity log that feeds the Home activity feed and is ready to sync.
- **One progression model (`progress-model.ts`).** Lesson, topic, course, subject and curriculum progress all come from the same functions, so every screen shows the same numbers.

---

## 4. The learner experience

- **Home:**
  - "Good Morning/Afternoon/Evening, Doc. [name]" (no invented fallback name);
  - your next best action and the review calendar;
  - curriculum progress, XP earned today and an Apex card;
  - an activity feed and the motto.
- **Learn → Subject → Topic → Lesson.**
  - Topic pages show each lesson's status, time and buttons (Start / Continue / Re-read, Quiz / Test out).
  - They also show a progress side-card with mastery and due counts, and a "Sources" box saying how many slide disagreements were clarified or still need checking.
- **Lesson player:**
  - **Learn:** answer-first checkpoints, retries for misses, and recall prompts you rate yourself on. It saves your place, so leaving mid-lesson and coming back resumes at the same step.
  - **Read:** sections with steps, tables and key terms; "Remember" boxes; labelled Textbook, Clarified, Check-with-lecturer, Annotation and Lecturer notes; high-yield points; common confusions.
  - Completing a lesson awards XP once only: duplicate-completion protection is kept.
- **Quiz:**
  - instant or submit-at-end feedback, a timer and a question navigator;
  - keyboard control (1–9 or A–Z to pick, Enter to check, ←/→ to move);
  - auto-advance after a correct answer, and a warning before finishing with unanswered questions;
  - true/false always in the same order, and question types: single answer, select-all, type-in, put-in-order and match.
- **Results** open by attempt ID and show:
  - score, accuracy and XP earned or lost;
  - missed questions with your answer, the right answer, the explanation and the take-away;
  - strengths, concepts needing review, and a learning remark that avoids repeats;
  - time feedback, plus "Practice wrong answers", "Retake" and "Back to topic".
- **Review mode.** Sessions of due and weak material, drawn only from what you have learned, which update your schedule.
- **Apex Challenge.**
  - A separate whole-course timed event: about 3 s per question, 30 questions, a minimum of 8, a 3-second countdown.
  - It uses only short single-answer questions, never repeats one, and has its own results.
  - The old `lesson=undefined` bug is fixed at its root: every learn-flow link is now built by `src/lib/routes.ts`, which never puts `undefined` into a URL, and old links redirect safely.
- **My Progress.** Quiz, review and Apex history (each opens its results) and an XP ledger showing gains and losses.

---

## 5. Data saving and Supabase

- Everything saves **on the device first**, per account, and syncs to Supabase when you are signed in.
- The sync **detects what your database supports**:
  - Data types the current database rejects fall back to the nearest older form or stay local.
  - Missing tables and functions are skipped, not crashed on.
- **New migration, not applied:** `supabase/migrations/20261003000000_learning_engine.sql`. It:
  - widens the allowed answer modes (topic quiz, recall, Apex, mastery check) and attempt types (topic, review);
  - adds a subject reference to quiz attempts;
  - allows signed XP adjustments, through the `grateapex_record_xp_adjustment` function, which never takes XP below 0;
  - adds a `learning_events` table with row-level security (you only see your own rows).

  Until you apply it, the app still works; those extra records simply stay on the device. Apply it from the Supabase SQL editor or the CLI when you're ready.
- Sign-in (`login.tsx`) was not changed.
- `.env` is now in `.gitignore`, so your private Supabase keys can't be committed by accident.

---

## 6. Bugs found and fixed

1. **React error #418 (hydration mismatch) on every page** of the static web build. Fixed with a client-only gate in `src/app/_layout.tsx` (`src/hooks/use-is-client.ts`).
2. **Empty browser-tab titles** in the exported site, which the old build also had. A duplicate `Head.Provider` was removed; every page now has its title.
3. **`lesson=undefined` in Apex and quiz links.** All links now come from `src/lib/routes.ts`; invalid IDs show a friendly "not found" page.
4. **Invisible click-blocker:** the hidden desktop sidebar's 236 px wrapper silently swallowed clicks along the left edge of every page. Fixed with `pointerEvents: 'box-none'` in `desktop-sidebar.tsx`.
5. **Buttons nested inside a button** in topic lesson rows. These are invalid on the web and made "Start" unreliable; the row was restructured.
6. **Topic side-card numbers overflowing** their tiles.
7. **An unsupported animation easing** in the XP toast, which caused a console warning.
8. **Lint:** 55 problems fixed in the code I touched, e.g. setState inside effects, impure `Date.now()` during render and refs read during render.

---

## 7. Files

- **New:**
  - `src/data/learning/*` (the engine);
  - `src/data/curriculum.ts` and `src/data/content-catalog.ts`;
  - `src/data/topics/<6 topics>/*` (sources, lessons, interactive, questions, index), plus `topics/build.ts` and `topics/index.ts`;
  - `src/lib/routes.ts`;
  - `src/components/ui/*` (buttons, cards, focusable "Interactive", progress bars, pills, screen layouts, state views, touchable);
  - `src/components/learning/*` (lesson layers, quiz runner, review calendar, topic/subject screens, next-action cards, memory badges);
  - `src/app/learn/topic.tsx`, `review.tsx` and `apex.tsx`;
  - `src/hooks/use-is-client.ts`, `use-keyboard-shortcuts.ts` and `use-learning-remark.ts`;
  - the motion components (APEX wordmark, blur text);
  - `tests/*.test.mjs`, the migration, and this report.
- **Rewritten:**
  - `progress.ts`, `question-history.ts`, `quiz-history.ts`, `review.ts`, `subjects.ts`, `lesson-types.ts` and `questions.ts`;
  - the Home, Progress, Profile and Social summary screens, and the lesson, quiz, results and learn index screens;
  - `question-card.tsx` and `xp-toast.tsx`.
- **Removed, because they were replaced:** `data/courses.ts`, `data/question-bank.ts`, `data/quizzes.ts`, `components/interactive-lesson.tsx`, `components/course-screen.tsx`, `components/subject-topics.tsx`.
  - The old URLs `/learn/course?...` and `/learn/fatty-acid-biosynthesis` still work; they redirect.
- **Docs:**
  - `README.md`: content table, test commands, Supabase migration note, file map, "Adding a topic".
  - `AGENTS.md`: current routes and data structure.

---

## 8. Testing in detail

- **`npm test`** (75 tests):
  - the scheduler: intervals, cramming guard, lapses, Apex softness, mastery;
  - the memory model: deterministic, handles older history;
  - selection: no repeats, varies between attempts, covers concepts, prioritises misses, review uses only learned material, Apex filtering;
  - XP rules;
  - every published topic: unique IDs, valid answers, real source references, all three layers, quizzes that reach 25 questions.
- **Browser learning-flow test** (headless Chrome against the real static build, 40 checks):
  - Home greeting;
  - Subject → Topic → Lesson 1 interactive layer: 26 steps, every question type and recall;
  - reading layer, completion and XP;
  - a 25-question quiz with results, and a retake gives a different question set;
  - reload keeps progress, and an unfinished lesson resumes;
  - "next day" (clock shifted 26 h): 6 concepts due, review session completes;
  - Apex runs to results; Progress lists quizzes, review and Apex with XP gains and losses;
  - Dark, Light, System and Apex themes persist after reload;
  - no horizontal scroll at 390, 820 and 1366 px; zero runtime errors.
- **Smoke test** (54 routes): every main page, every lesson of the five newer topics, quiz intros, review, Apex, legacy redirects and bad IDs all load with correct titles and no errors.

---

## 9. What is not done yet (honest list)

1. **14 topics still need lessons.** Their lectures are extracted and catalogued, and the method is documented in the README's "Adding a topic". The large ones are Immunology (15 files), Nucleic Acids (5 large decks), Amino Acid Metabolism (4 decks) and the physiology systems.
2. **Material I could not read:**
   - three image-only PDFs in Amino Acid Metabolism, and the "ai guide" PDF in Renal: they need typing up or OCR;
   - the empty "CNS 2022" ZIP;
   - the 1.5 GB "Respiratory Notes Video 5" deck (its "- Copy" version was used instead).
3. **Anatomy** has no lecture files yet.
4. **Not treated as lecturer material, so not used for lessons:** study guides, answer sheets and student presentations (e.g. the Scurvy presentation, "presentation group 4").
5. **The database migration is not applied** (section 5). Until it is, lesson resume points, learning events and new attempt types stay on the device, so they won't follow you to another phone or browser.
6. **Power-ups** are wired into the XP rules, but no power-up is switched on yet.
7. **Social:** the friends shown are sample data and are labelled as such. "Your learning this week" uses your real numbers.
8. **`login.tsx`** still has 17 lint problems, left alone to protect sign-in.
9. **Android/Expo Go** was not re-tested; web was the priority, as AGENTS.md asks.
10. **Nothing is committed to git.** Please review, then commit when happy (I can do it if you ask).

### Decisions for you

- Is `Cardiovascular system Gross 2.ppt` Anatomy or Physiology?
- Please confirm the "Check with your lecturer" points listed in section 2.4.

---

## 10. Cline's task (phases 1–15)

| Phase | Done by | What was done |
| --- | --- | --- |
| 1. Inspect | Cline | Repo and UI review |
| 2. Desktop sidebar | Cline | Left navigation rail with active marker, name and rank footer |
| 3. Auto-hide | Cline | Rail hides; reveals when the pointer nears the left edge (Settings → Navigation) |
| 4. Browser title | Cline | `page-title.tsx`. I added Topic, Review and Apex titles and fixed the empty title in the exported site |
| 5. Display name | Cline | Uses your saved name |
| 6. Desktop layouts | Me | `Screen` widths (prose / learning / content / wide) and `Columns`. Topic, lesson, quiz and results use two columns with side cards on wide screens and stack on phones |
| 7. Hover, focus, cursor | Me | `Interactive` component: hover tint, pressed state, visible keyboard focus ring (shown only when using the keyboard), pointer cursor. Used by buttons, cards and lesson rows |
| 8. Cohesion | Me | One UI kit (`src/components/ui/`) used across learn, home, progress and profile; `Touchable` replaces the old TouchableOpacity in Explore, Discovery, Social, Friends, Profile and Settings |
| 9. Visual polish | Me | Consistent cards, pills, progress bars, state colours for memory (new / learning / struggling / remembered / mastered), Apex theme tokens |
| 10. React Bits audit | Me | **Used** (rebuilt natively, no new library): AnimatedContent-style entrances, CountUp numbers, a stroke-drawn APEX wordmark, the XP "halo" toast. **Rejected:** particle/canvas text and animated backgrounds (heavy, distracting while studying), and ElectricLogo (it duplicates the existing splash arcs) |
| 11. Opening splash | Me | Existing GrAte Apex splash kept. It respects "reduce motion" (a simple 400 ms fade instead of the arcs and pulse) and no longer re-creates its animation value on every render |
| 12. Responsive checks | Me | 390 px phone, 820 px tablet, 1366 × 768 and 1440 × 900 laptop: no horizontal overflow; nothing hidden behind the navigation |
| 13. Accessibility | Me | Roles and labels on every control; keyboard answering (1–9 / A–Z, Enter, ←/→); visible focus; reduced-motion support; true/false order fixed; no buttons nested in buttons |
| 14. Don't break existing systems | Me | Duplicate-completion protection, quiz features (instant/submit, timer, retake, practise wrong, wrong-ID tracking), remark rotation, sign-in, hidden routes and themes all preserved and tested |
| 15. Verification | Me | Typecheck, lint, export (with titles), smoke and flow tests (section 1) |

**Fixes to Cline's own files:**

- `desktop-sidebar.tsx`: fixed the invisible click-blocker (section 6, item 4).
- `app-tabs.web.tsx`: tidied the imports; the animation value is now kept stable between renders; a state update moved out of an effect; the new Topic, Review and Apex routes are hidden from the tab bar.
