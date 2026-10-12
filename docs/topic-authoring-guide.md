# How GRATEAPEX topics and lessons are built — and how to add HB2 Anatomy

This is a hand-off guide for an AI coding agent picking up content work on
GRATEAPEX. It explains how every published topic is structured and gives a
step-by-step plan for building the **HB2 Anatomy** course the same way.

Read `AGENTS.md` (project rules) first. This guide adds the content details.

---

## 1. The big picture

```
Subject → Course → Topic → Lesson → Concept
```

| Level   | What it is | Where it lives |
| ------- | ---------- | -------------- |
| Subject | `anatomy` / `biochemistry` / `physiology` | `SubjectId` in `src/data/lesson-types.ts` |
| Course  | One lecture course per subject (`anatomy-lectures`, …) | `courseCatalog` in `src/data/curriculum.ts` |
| Topic   | One lecture topic (usually one lecture ZIP / one deck series) | `src/data/topics/<topic-id>/` |
| Lesson  | An academically meaningful part of a topic (3–9 per topic) | `lessons.ts` inside the topic folder |
| Concept | The unit the learning engine tracks, schedules and reviews | `concepts` in the topic's `sources.ts` |

The full type system is in `src/data/lesson-types.ts` (read it once; it is
well commented). Question types are in `src/data/questions.ts`.

### Every lesson has three layers

1. **Interactive ("Learn by answering")**: short teaching cards (`learn`),
   retrieval checkpoints answered *before* the explanation (`ask`), and
   open-recall prompts (`recall`).
2. **Reading**: the structured revision notes (sections called `chunks`,
   plus objectives, summary, high-yield points and common confusions).
3. **Quiz**: drawn at quiz time from the topic's question bank by
   `src/data/learning/selection.ts`. Never a fixed list.

### How HB2 Anatomy appears in the app (nothing extra to build)

`src/data/hb2-study.ts` defines the HB2 courses. The course
`hb2-anatomy` simply shows **every published topic whose `subject` is
`'anatomy'`**, in the order they appear in `builtTopics`
(`src/data/topics/index.ts`). Each topic becomes a heading ("TOPIC 1 OF n")
on the course page (`src/app/learn/hb-course.tsx`), its lessons are listed
under it, and its quiz questions become the course's question sets.

So **publishing an anatomy topic in `src/data/topics/` is all that is
needed** for it to appear in HB2 Anatomy. That covers the reading view, Learn
by answering, Practice, the Apex Challenge and spaced review. Today there are
zero anatomy topics, so the course shows "Lessons are on the way".

URLs to check your work in the browser (`npx expo start --web`):

- `/learn/hb-course?course=hb2-anatomy`: the HB2 course page
- `/learn/topic?topic=<topic-id>`: the topic page
- `/learn/lesson?lesson=<lesson-id>&layer=learn`: Learn by answering

---

## 2. Content rules (non-negotiable)

These come from `AGENTS.md` and how the existing topics were built.

- **The lecture files in `content/` are the source of truth.** Never invent
  course content. Every statement must be traceable to a slide/page through
  `sourceRefs`, and reading text cites slides inline, e.g. "(slide 12)".
- **Lecture files define WHAT is taught.** Reference textbooks (Gray's,
  Netter, Last's, BRS…) may only *clarify or correct* within the lecture's
  scope, and must be labelled (`origin: 'textbook'` on a chunk, or a note of
  kind `'textbook'` / `'clarified'`). Never add syllabus topics from a
  textbook.
- **Study aids are never a source of facts.** Student compilations,
  "steeplechase likely" PDFs, personal study guides and AI summaries get
  `role: 'study-aid'` in the catalog and are not used for lessons or
  questions.
- **Merge, don't rank.** All lecture files for a topic are merged. Where
  two sources disagree, keep both statements as a `SourceDiscrepancy` in
  `sources.ts`. Teach the textbook-resolved version with a `'clarified'`
  note. If the textbook can't settle it, mark it `'unresolved'`, add a
  `'check'` note, and **do not quiz it**.
- **Annotations** (speaker notes, comments or images added to a deck after
  the lecture) are labelled `'annotation'` and are **not quizzed** until
  confirmed.
- **IDs are permanent.** Lesson, concept, question and recall IDs key the
  learners' history (XP, completions, spaced repetition). Once published,
  never rename or reuse them. Bump the topic's `contentVersion` when
  meaning changes.
- **No emoji in the interface.** The `emoji` field on a topic/catalog entry
  is data that existing topics also carry; screens use `TopicGlyph` /
  `SubjectGlyph` icons.
- Write in plain, exam-focused British English (the existing content uses
  "haemoglobin", "oesophagus", etc.).

---

## 3. Files of one topic

Every published topic has the same folder layout. Use
`src/data/topics/cardiovascular-physiology/` as the model: it is the most
recent topic and the only one with tappable diagrams, which anatomy will
need most.

```
src/data/topics/<topic-id>/
  sources.ts          slide-reference helpers, concepts, discrepancies, diagrams
  lessons.ts          the lessons' reading layer (+ merges interactive & extras)
  interactive.ts      each lesson's Learn-by-answering steps + reading extras
  questions.ts        the quiz question bank
  assertion-reason.ts 5 Assertion–Reason questions per lesson
  index.ts            buildTopic(...) — assembles everything
```

Plus, outside the folder:

- `src/data/content-catalog.ts`: the inventory of source files and topics
- `src/data/topics/index.ts`: the registry (`builtTopics`)
- `src/data/figures/<topic-id>.ts` + `public/figures/<topic-id>/*.jpg`:
  tappable diagrams (optional, but strongly recommended for anatomy)

Long topics may split the question bank (Fatty Acid Biosynthesis has
`more-questions.ts`). That's fine; concatenate them in `index.ts`.

### 3.1 `sources.ts`

```ts
import type { SourceDiagram, SourceDiscrepancy, SourceReference } from '@/data/lesson-types';
import { slides, type ConceptDraft } from '@/data/topics/build';

export const TOPIC_ID = 'upper-limb';

const UL = 'anat-upper-limbs-updated';          // a sourceFiles id from content-catalog.ts
const VISUAL_UL = [4, 7, 9];                       // slides whose information is in an image

const deck = (id: string, visual: number[]) => (numbers: number[]): SourceReference[] =>
  slides(id, numbers, numbers.filter((n) => visual.includes(n)));
export const ul = deck(UL, VISUAL_UL);             // ul([12, 13]) → slides 12–13 of that deck

export const GRAYS: SourceReference[] = [{ sourceId: 'grays-anatomy-students-4e' }]; // reference textbook

const L = (n: number) => `${TOPIC_ID}-${n}`;       // lesson ids: upper-limb-1, upper-limb-2, …

export const concepts = {
  // Lesson 1 — …
  'brachial-plexus-roots': { lessonId: L(1), name: 'Roots and trunks of the brachial plexus', category: 'core', relevance: 'core', sourceRefs: ul([20, 21]) },
  // …
} satisfies Record<string, ConceptDraft>;

export type ConceptId = keyof typeof concepts;    // every question's conceptId is type-checked against this

export const discrepancies: SourceDiscrepancy[] = [ /* see cardiovascular-physiology/sources.ts */ ];
export const diagrams: SourceDiagram[] = [ /* diagram knowledge written out as text */ ];
```

Concept rules:
- `id`: kebab-case, unique in the topic, stable forever.
- `name`: unique in the topic. Learners see it in Review and Results.
- `category`: `core | important-detail | supporting | clinical | terminology | visual-process | potentially-incidental`.
- `relevance`: `core | supporting | needs-review`. Use `needs-review` for
  unconfirmed material; it is shown but never quizzed or scheduled.
- Aim for 4–9 concepts per lesson.

### 3.2 `lessons.ts` (the reading layer)

```ts
import type { LessonDraft } from '@/data/topics/build';
import { interactive, readingExtras } from '@/data/topics/upper-limb/interactive';
import { ul, GRAYS, type ConceptId } from '@/data/topics/upper-limb/sources';

type Draft = LessonDraft<ConceptId>;

const lesson1: Draft = {
  id: 'upper-limb-1',
  title: 'The Brachial Plexus',
  description: 'One sentence shown on the lesson card.',
  xp: 25,                                   // standard completion XP
  sourceRefs: ul([18, 19, 20, 21, 22]),
  objectives: ['Short "What you’ll learn" lines', '…'],
  chunks: [
    {
      title: 'Roots, trunks, divisions, cords, branches',
      kind: 'structure',                    // overview | definitions | pathway | mechanism | structure | regulation | comparison | clinical | classification
      figure: 'upper-limb:brachial-plexus', // optional tappable diagram (section 3.6)
      paragraphs: ['Text that cites its slide (slide 20).'],
      steps: [{ label: 'Roots', detail: 'C5–T1 ventral rami (slide 20).' }],
      terms: [{ term: 'Erb’s point', meaning: '…' }],   // become tappable words in the HB2 reader
      table: { columns: ['Cord', 'Branches'], rows: [['Lateral', '…']] },
      keyPoints: ['…'],
      notes: [{ kind: 'clarified', text: 'Slide 21 says X; Gray’s settles it as Y.' }],
      sourceRefs: ul([20, 21]),
    },
  ],
  summary: ['"Key points to remember", one line each'],
};

export const lessons: Draft[] = [lesson1 /*, lesson2, … */].map((lesson) => ({
  ...lesson,
  ...readingExtras[lesson.id],
  interactive: interactive[lesson.id],
}));
```

Note kinds: `check` (unsettled, ask the lecturer), `clarified` (textbook
settles a slide problem), `textbook` (short textbook explanation filling a
gap), `annotation` (added to the deck later), `supplementary` (not in the
material), `lecturer` (a point the lecturer stresses).

Each chunk becomes one "section" in the HB2 reader, so keep chunks short
(roughly 1–2 screens). 4–8 chunks per lesson works well.

### 3.3 `interactive.ts` (Learn by answering + reading extras)

```ts
import type { LessonConfusion } from '@/data/lesson-types';
import { ask, fill, learn, match, mcq, multi, order, recall, type InteractiveDraft } from '@/data/topics/build';
import { ul, type ConceptId } from '@/data/topics/upper-limb/sources';

type Steps = InteractiveDraft<ConceptId>[];

export const interactive: Record<string, Steps> = {
  'upper-limb-1': [
    ask(mcq('c1-01', 'brachial-plexus-roots', 'Prediction question asked BEFORE teaching…', 'Correct answer', ['Wrong 1', 'Wrong 2', 'Wrong 3'], { explanation: 'Slide 20: …', skill: 'prediction' })),
    learn('Short card title', ['One or two short paragraphs.'], { sourceRefs: ul([20]) }),
    ask(order('c1-02', 'brachial-plexus-roots', 'Put … in order.', ['First', 'Second', 'Third'], { explanation: 'Slide 20.' })),
    // … alternate learn / ask, about 6–10 steps …
    recall('r1-01', 'brachial-plexus-roots', 'Explain … in your own words.', ['Model answer point 1', 'Point 2', 'Point 3']),
  ],
};

type ReadingExtras = { estimatedMinutes: number; xp: number; highYield: string[]; confusions: LessonConfusion[] };

export const readingExtras: Record<string, ReadingExtras> = {
  'upper-limb-1': {
    estimatedMinutes: 12,
    xp: 25,
    highYield: ['Revision one-liners'],
    confusions: [{ confusion: 'Students often think X.', clarification: 'Actually Y (slide 21).' }],
  },
};
```

ID conventions: interactive checkpoints `cN-xx`, recall prompts `rN-xx`
(N = lesson number). These are separate from quiz IDs.

### 3.4 `questions.ts` (the quiz bank)

```ts
import { fill, match, mcq, multi, order, spotQuestion, tf, type QuestionDraft } from '@/data/topics/build';
import type { ConceptId } from '@/data/topics/upper-limb/sources';

type Q = QuestionDraft<ConceptId>;

const lesson1: Q[] = [
  mcq('q1-01', 'brachial-plexus-roots', 'Which ventral rami form the brachial plexus?', 'C5–T1', ['C1–C4', 'T1–T6', 'L2–L4'], { explanation: 'Slide 20.' }),
  multi('q1-02', '…', 'Select all that apply.', ['Correct A', 'Correct B'], ['Wrong C', 'Wrong D'], { explanation: '…' }),
  fill('q1-03', '…', 'The ____ nerve …', ['accepted answer', 'alternative spelling'], { explanation: '…', skill: 'terminology' }),
  order('q1-04', '…', 'Order …', ['first', 'second', 'third']),
  match('q1-05', '…', 'Match each … to …', [['Left 1', 'Right 1'], ['Left 2', 'Right 2']]),
  tf({ id: 'q1-06', conceptId: '…', statement: 'A full statement.', answer: false, explanation: '…', skill: 'misconception' }),
  spotQuestion('q1-07', '…', brachialPlexusFigure, 'musculocutaneous', ['median', 'ulnar', 'radial']), // "what is the marked part?"
];

export const questions: Q[] = [...lesson1 /*, ...lesson2 */];
```

Helper rules (all in `src/data/topics/build.ts`):
- `mcq`: write the **correct option first**; options are shuffled at quiz time.
- `multi`: correct options first, then wrong ones.
- `fill`: the first accepted answer is the one shown as correct; add spelling variants.
- `order`: items in the correct order (shown shuffled).
- `match`: correct pairs (right-hand side shown shuffled).
- `tf`: True/False kept in that order.
- Optional extras: `explanation` (always give one, citing the slide),
  `skill` (`recall | terminology | sequence | match | prediction |
  cause-effect | comparison | pathway-reasoning | application |
  misconception`), `difficulty` (`introductory | intermediate | advanced`),
  `clinical: true` (only when the lecture itself makes the clinical link),
  `figure`.

Quiz IDs are `qN-xx` (N = lesson number). The question's `conceptId`
decides which lesson it belongs to.

**Quantity:** aim for **about 30 quiz questions per lesson** (the build
prints a note below 30). The tests require that every lesson quiz (after
the first lesson) can reach **25 questions** from its own bank plus earlier
lessons. In practice, give every lesson at least 25 of its own.

Writing rules (from the existing banks):
- Only what the lessons actually teach. Nothing from study aids, unresolved
  discrepancies or unconfirmed annotations.
- No trivial rewordings of an existing question.
- Plausible distractors from the same lesson's vocabulary (e.g. other
  nerves, other branches), never joke options.
- Mix formats and skills; include some `advanced` application/clinical
  questions where the lecture supports them.

### 3.5 `assertion-reason.ts` (5 per lesson)

Assertion–Reason questions are **authored, never generated**. Each
statement must be a real claim about anatomy. Never write "the lesson
says…" or "the slide identifies…".

```ts
import { assertionReason as ar, type QuestionDraft } from '@/data/topics/build';
import type { ConceptId } from '@/data/topics/upper-limb/sources';

type Q = QuestionDraft<ConceptId>;

export const assertionReasonQuestions: Q[] = [
  // ─── Lesson 1 — The brachial plexus
  ar('ar1-01', 'brachial-plexus-roots',
    'Assertion: a complete factual statement.',
    'Reason: a second complete factual statement.',
    'explains',                 // see the five answers below
    'Why: which statements are true or false, and whether R explains A.'),
  // … 5 per lesson
];
```

The five answers, shown to learners as options A–E:

| `answer`         | Meaning |
| ---------------- | ------- |
| `explains`       | A. Both true, and R explains A |
| `true-unrelated` | B. Both true, but R does not explain A |
| `a-true-r-false` | C. A true, R false |
| `a-false-r-true` | D. A false, R true |
| `both-false`     | E. Both false |

Spread the answers across all five types in each lesson (the existing
topics use roughly 2 × A plus one each of the others). See
`src/data/topics/fatty-acid-biosynthesis/assertion-reason.ts` for 40
finished examples.

### 3.6 Tappable diagrams (very useful for anatomy)

A figure is a crop of a lecture slide image with labelled "spots". Learners
can tap the spots in the reading view, and `spotQuestion` asks "what is the
marked part?" with the slide's printed labels covered.

1. Save the cropped slide picture as `public/figures/<topic-id>/<name>.jpg`.
2. Describe it in `src/data/figures/<topic-id>.ts`. Copy the shape of
   `src/data/figures/cardiovascular-physiology.ts`:
   ```ts
   export const brachialPlexus: LessonFigure = {
     id: 'upper-limb:brachial-plexus',
     title: 'The brachial plexus',
     src: '/figures/upper-limb/brachial-plexus.jpg',
     width: 1200, height: 800,              // the image's pixel size
     caption: 'Lecture slide 20 (Upper limbs).',
     sourceRefs: ul([20]),
     spots: [
       // x, y = pin position as fractions (0–1) of width/height
       // boxes = where the slide prints the label: [x, y, w, h] fractions (covered in quizzes)
       { id: 'musculocutaneous', label: 'Musculocutaneous nerve', x: 0.62, y: 0.41, boxes: [[0.70, 0.38, 0.2, 0.05]] },
     ],
   };
   export const figures = [brachialPlexus];
   ```
3. Add the topic's `figures` to `allFigures` in `src/data/figures/index.ts`.
4. Use it: set `figure: 'upper-limb:brachial-plexus'` on a reading chunk,
   and/or `spotQuestion(...)` in `questions.ts`.

Labels must be the slide's own labels. The micrographs in
`Anatomy/Micro/Labelled micrographs/` and the table-conference images are
good candidates, but only with labels the lecture material itself gives.

### 3.7 `index.ts`

```ts
// Anatomy → Upper Limb, assembled from its parts:
//   sources.ts         — slide references, concepts, discrepancies, diagrams
//   lessons.ts         — the lessons (reading layer)
//   interactive.ts     — each lesson's interactive layer + reading extras
//   questions.ts       — the topic question bank (quiz layer)
//   assertion-reason.ts — Assertion–Reason questions (5 per lesson)
import { contentTopics } from '@/data/content-catalog';
import { buildTopic } from '@/data/topics/build';
import { assertionReasonQuestions } from '@/data/topics/upper-limb/assertion-reason';
import { lessons } from '@/data/topics/upper-limb/lessons';
import { questions } from '@/data/topics/upper-limb/questions';
import { concepts, diagrams, discrepancies, TOPIC_ID } from '@/data/topics/upper-limb/sources';

export const upperLimb = buildTopic({
  id: TOPIC_ID,
  subject: 'anatomy',
  courseId: 'anatomy-lectures',
  title: 'Upper Limb',
  description: 'One or two sentences listing what the topic covers.',
  emoji: '💪',
  source: 'Lecture: Upper limbs HB (updated)',
  sourceFileIds: contentTopics.find((topic) => topic.id === TOPIC_ID)?.sourceFileIds ?? [],
  contentVersion: 1,
  concepts,
  lessons,
  questions: [...questions, ...assertionReasonQuestions],
  discrepancies,
  diagrams,
});
```

`buildTopic` fills in subject, course, topic, lesson, concept name and
source references on every question, so you never repeat them. It also
runs authoring checks (duplicate IDs, bad answer indexes, unknown concepts,
fewer than 30 quiz questions) and prints them in development.

---

## 4. Registering a topic

1. **Catalog the source files** in `src/data/content-catalog.ts`, in
   `sourceFiles`. Files inside a ZIP use the ZIP as `path` and the inner
   path as `member`:
   ```ts
   {
     id: "anat-upper-limbs-updated",
     path: "content/Anatomy-20261003T001157Z-1-002.zip",
     member: "Anatomy/Gross/Limbs/upper limbs HB- updated.pptx",
     format: "pptx",
     topicId: "upper-limb",
     subjectFolder: "ANATOMY",
     role: "lecture",                 // lecture | export | supplementary | study-aid | reference
     title: "Upper Limbs (HB, updated)",
     slideCount: 0,                   // fill in from the deck
     textStatus: "partial",           // text | partial | image-only | empty | unextracted
   },
   ```
   Use `versionOf` for an older/newer version of the same lecture and
   `duplicateOf` for an exact copy. Reference textbooks get `topicId: ""`,
   `role: "reference"` and a `shortName` (e.g. "Gray's").
2. **Add the topic entry** to `contentTopics` in the same file:
   ```ts
   {
     id: "upper-limb",
     title: "Upper Limb",
     subject: "anatomy",
     courseId: "anatomy-lectures",
     folderSubject: "ANATOMY",
     zip: "Anatomy",
     sourceFileIds: ["anat-upper-limbs-updated", "anat-upper-limbs-2024"],
     status: "published",            // must be 'published' once it is in builtTopics (a test checks this)
     emoji: "💪",
   },
   ```
   Topics with material but no lessons yet can be listed as
   `status: "source-only"`.
3. **Build the topic folder** (section 3).
4. **Register it** in `src/data/topics/index.ts`: import it and add it to
   `builtTopics`. Anatomy topics appear in HB2 Anatomy in the order they are
   listed in this array, so list them in the order the course teaches them.
5. **Figures** (if any): `src/data/figures/index.ts` (section 3.6).
6. In `src/data/curriculum.ts`, update the `anatomy-lectures` course
   description (it currently says the material has not been supplied).

---

## 5. Validation (run after every topic)

```
npm run typecheck     # TypeScript: must be clean
npm test              # content + learning-engine tests: must all pass
```

`tests/content.test.mjs` checks every published topic:
- unique lesson, concept, question and recall IDs
- every question is structurally valid and points at a real concept
- every source reference names a catalogued file
- the catalog's published topics match `builtTopics`
- every lesson has all three layers: at least 4 interactive steps including
  at least one `ask`, at least one reading chunk, and at least 12 quiz
  questions of its own
- every lesson quiz (after the first) reaches 25 questions

Then open `/learn/hb-course?course=hb2-anatomy` in the browser (web is the
priority platform) and read one lesson, try Learn by answering, and run
Practice.

---

## 6. The Anatomy material (what is in the ZIP)

All Anatomy material is in one ZIP:
`content/Anatomy-20261003T001157Z-1-002.zip` (326 files, top folder
`Anatomy/`). **Decks never published anywhere must be extracted to read
them.** `.pptx`/`.pptm` are ZIPs of XML (`ppt/slides/slideN.xml`, notes in
`ppt/notesSlides/`), `.ppt` needs converting (e.g. LibreOffice
`soffice --headless --convert-to pptx`), and PDFs need a text extractor.
Many anatomy slides are image-only: their content must come from the
diagram labels, which is why figures matter.

### Lecture decks (role `lecture`): one topic each, suggested order

| Suggested topic id | File(s) in `Anatomy/` | Notes |
| ------------------ | --------------------- | ----- |
| `upper-limb` | `Gross/Limbs/upper limbs HB- updated.pptx`, `Gross/Limbs/upper limbs HB- edited 2024 (2).pptx` | Two versions of one lecture. Merge them and mark one `versionOf` the other. Large (49 MB): many images. |
| `cardiovascular-gross` | `Gross/Cardiovascular/Cardiovascular System Gross 1.pptx`, `Gross/Cardiovascular/Cardiovascular system Gross 2.ppt` | `Gross 2.ppt` is also in `content/BIOCHEMISTRY/` and is already catalogued as topic `cardiovascular-system-gross` with `needs-classification`. Reclassify that entry as anatomy (or merge it into this topic) rather than duplicating it. |
| `respiratory-gross` | `Gross/Respiratory/Respiratory system 2026 v2.pptx` | |
| `gi-tract-gross` | `Gross/GIT/GI tract & accessory organs-2026.ppt`, `Gross/GIT/Neurovasculature of GI tract-2026.ppt` | |
| `abdominal-walls` | `Gross/GIT/Anterior and Posterior abdominal Walls 2026.pptx` | Could join the GIT topic; ask the owner. |
| `urinary-gross` | `Gross/Urinary/Urinary system-Gross - 2026.pptx` | |
| `head-and-neck` | `Gross/Head and neck/Head and Neck HB2 June July 2026.pptx` | |
| `neuroanatomy` | `Gross/Neuroanatomy/Central Nervous System (2).pptx`, `Gross/Neuroanatomy/Meninges of the CNS.pptm` | `Neuroscience Slides for Steeplechase.pptx` in the same folder: check whether it is lecturer material or a study aid before using it. |
| `gi-histology` | `Micro/GIT/Microscopic Anatomy GIT.pptx edited. 2024pptx.pptx` | Microscopic anatomy. |

The order above is only a suggestion. **Ask the owner for the order the
course is taught in**, and confirm any topic grouping before publishing.

### Other material

| Folder | Suggested role | How to use it |
| ------ | -------------- | ------------- |
| `Gross/Textbooks/` (Gray's for Students, Gray's Basic, Netter Atlas, Last's, BRS, McMinn, Loukas review, Netter flash cards) | `reference` | Clarify or settle slide problems only, always labelled. Never a source of new syllabus. Pick one main reference (e.g. Gray's Anatomy for Students, 4th ed.) and catalog it once with `topicId: ""`. |
| `Micro/Labelled micrographs/` (CVS etc., images) | `supplementary` | Good figure sources for histology lessons, using the labels printed on them. |
| `TABLE CONFERENCE/2026 hb2 …` (numbered images + one practical-session PDF) | `supplementary` (confirm with the owner) | Practical/spotter images. Possible figures and spot questions when the material labels them. |
| `Micro/Steeplechase/` (student compilations, "likely" questions, definitions) | `study-aid` | **Never** a source of facts or questions. |
| `Embryology/Personal Study Guides/` | `study-aid` | Personal study guides. Not lecturer material. There is no embryology lecture deck, so there is no embryology topic yet. |

---

## 7. Step-by-step plan for one Anatomy topic

1. Extract the deck(s); list every slide with its text, and note which
   slides are image-only.
2. Catalog the files and add the topic entry (section 4, steps 1–2).
3. Divide the material into 3–9 lessons that each make sense on their own
   (e.g. for upper limb: bones and joints → brachial plexus → axilla →
   arm → forearm → hand → vessels and lymphatics). Follow the lecture's
   own order.
4. Write `sources.ts`: deck helpers, concepts per lesson, discrepancies,
   diagram knowledge.
5. Write `lessons.ts`: chunks citing slides, objectives, summary.
6. Write `interactive.ts`: Learn-by-answering steps and reading extras
   (high-yield, confusions, estimated minutes, xp 25).
7. Write `questions.ts`: about 30 quiz questions per lesson, mixed formats.
8. Write `assertion-reason.ts`: 5 per lesson, all five answer types.
9. Add figures where the lecture's own diagrams carry the information.
10. Write `index.ts`, register in `src/data/topics/index.ts`.
11. Run `npm run typecheck` and `npm test`; fix everything.
12. Check `/learn/hb-course?course=hb2-anatomy` in the browser.
13. Tell the owner (a beginner) in plain language what was added, and list
    anything to confirm with the lecturer (all `check` notes and
    unresolved discrepancies).

Do one topic completely before starting the next.

---

## 8. Don'ts

- Don't create anatomy content from textbooks, study aids or general
  knowledge that isn't in the lecture files.
- Don't edit the learning engine, screens or HB2 code to add a topic. The
  data files above are enough.
- Don't rename or delete published IDs.
- Don't add a `src/app/learn/_layout.tsx`.
- Don't run destructive git commands. Work on a branch, and commit only when
  the owner asks.
- Don't change Supabase/Firebase data or apply database migrations.
