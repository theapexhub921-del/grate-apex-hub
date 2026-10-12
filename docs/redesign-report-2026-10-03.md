# GRATEAPEX redesign — session report (2026-10-03)

This report covers the product-wide UI/UX redesign: what changed, why, which files, how it was tested, and what still needs a decision.

- The design reasoning (audit, principles, system) is in `docs/redesign-notes.md`.
- The rules for future work are in `AGENTS.md` → "Design system".

---

## 1. Summary

The app was rebuilt on one design system:

- tokens for colour, type, radius, elevation and motion;
- a layered page "atmosphere" instead of the flat blue canvas;
- a drawn SVG icon set instead of emoji;
- shared primitives (cards, tactile buttons, rings, sheets, avatars, skeletons, empty and error states).

Every main screen was then redesigned on top of it. Desktop and phones are now deliberately different products with the same brand.

Unchanged:

- the learning logic, the auth logic and the Supabase calls;
- the logo and its shine;
- the intro animation.

The intro only gained the "developed by OrigiNate" credit you asked for, and a deeper background around it.

**Validation:**

| Check | Result |
| --- | --- |
| Typecheck | clean |
| Lint | 1 warning, which already existed |
| Unit tests | 79/79 pass |
| Web build | builds |
| End-to-end flow | 40/40 checks pass |
| Route smoke test | 54/54 routes load |
| Interaction checks | 16/16 desktop, 16/16 phone |
| Keyboard and reduced motion | 7/7 pass |

---

## 2. Your specific requests

| Request | What was done |
| --- | --- |
| **OrigiNate a bit larger** | Now 14 px (was 11 px), on a small frosted chip in the bottom-right corner, with a gold "N". The chip keeps it readable when content scrolls under it. It never takes clicks (`pointer-events: none`, verified). On phones it sits just above the tab bar and drops to the corner when the bar slides away. It is present on every screen, including Login. File: `src/components/signature.tsx`. |
| **"developed by OrigiNate" in the intro** | A small two-line credit ("DEVELOPED BY" / "Origi**N**ate") near the bottom of the intro. It fades in just after the logo appears and leaves with the intro. It is positioned independently, so the logo and its animation do not move. It was added to both the web and phone intros. File: `src/components/intro-credit.tsx` (plus one line in each `animated-icon*.tsx`). |
| **New calendar, modelled on the Watermelon designs** | See section 5.1. Wide layouts get a month grid with a gliding selection outline; phones get a day strip with a spring selection pill. Both are driven by the real review schedule. |
| **Male and female avatars + upload your own picture** | See section 5.2. There are six illustrated avatars: three male; three female, one of them wearing a hijab. All wear white coats. You can also upload your own photo or go back to initials. The choice is saved to your Supabase profile. |
| **OrigiNate recreated (earlier choice)** | Done (above). |

---

## 3. Design system

### 3.1 Tokens — `src/constants/theme.ts`

Every existing token name was kept, so nothing broke. New tokens were added for:

- surfaces: `surfaceElevated`, `surfaceSunken`;
- lines and light: `borderStrong`, `hairline`, `highlight`;
- status: `info*`, `warning`;
- brand: `secondary`;
- depth: `shadow`, `shadowStrong`, `overlay`;
- navigation: `navSurface`, `navBorder`, `navActive`, `navActiveSubtle`, `navInactive`;
- Apex: `apexGlow`.

**Palettes:**

- **Apex** — a deep royal field (`#0A2572`) lit by the atmosphere layers; cards `#0F3190`; heroes and sheets `#143A9F`; gold `#FDC00A` as the primary colour.
- **Light** — off-white `#F3F5FA` with soft blue fields, white cards with soft shadows, and restrained gold.
- **Dark** — layered neutrals (`#0B0D12` → `#13161D` → `#1A1E27`) with blue and gold accents.
- The logo's letter colour token is **unchanged** in all themes, so the logo looks identical.

**Scales:**

- **Type:** display, title1–3, headline, body, callout, caption, overline, numeral.
- **Radius:** 8 / 12 / 16 / 20 / 26 / pill.
- **Elevation:** 4 levels, each with an inner top highlight (the "double bezel" look).
- **Breakpoints:** compact (380) and tablet (640) were added next to the existing desktop and wide breakpoints.

**Display font:** Manrope, used for headings and numbers on the web. It loads *after* the app starts (`src/lib/web-fonts.ts`), so it can never block the first paint. Body text uses the system font.

### 3.2 Motion — `src/constants/motion.ts`

There are four tiers: micro 120 ms, standard 220 ms, significant 420 ms and special 900 ms. Springs (snappy, gentle, pop) and CSS curves are defined here too. Every animated component respects reduced motion.

### 3.3 Atmosphere — `src/components/atmosphere/`

**Web layers:**

- base tonal field
- 3 slowly drifting aurora fields
- light rays
- a faint academic grid
- a gold glow behind the hero
- film grain
- vignette

All of this is pure CSS: no WebGL and no canvas. Movement stops under reduced motion and is lighter on phone-sized windows.

**Mood per screen:**

| Mood | Screens |
| --- | --- |
| lively | Home, Social |
| expressive | Explore |
| calm | Learn |
| focus | lesson, quiz, review (most readable) |
| quiet | Profile, Settings, Progress |
| auth | Login |

**Phones (native):** the same tonal fields as static SVG gradients — no blur and no animation.

### 3.4 Icons — `src/components/ui/icon.tsx`

There are about 60 icons drawn for GRATEAPEX on a 24 px grid. They cover:

- navigation;
- rank, XP, mastery, streak, reinforcement, achievement, challenge, course, lesson and social;
- subjects (biochemistry, physiology, anatomy);
- discovery;
- utility icons.

**All interface emoji were replaced.** That includes the subjects, the topics, the Profile menu, the Social placeholders, the activity feed, the XP toast, the empty and error states, the quiz mode picker and the lesson section kinds. Topic data still holds its emoji, but it is no longer shown.

### 3.5 Primitives — `src/components/ui/`

| Primitive | What changed |
| --- | --- |
| `Card` / `PressableCard` | Tones: surface, elevated, muted, primary, insight, reward, outline. Hover lift on desktop; press settle on touch. |
| `Button` | Tactile: top sheen, inner highlight, lift on hover. Disabled buttons now use a calm neutral look instead of a muddy faded gold. |
| `IconButton` (new) | Round icon button with an optional badge. |
| `ProgressRing` (new) | SVG ring that animates to its value; optional gradient. |
| `AnimatedNumber` (new) | Number that counts up to its value. |
| `SegmentedControl` (new) | Thumb springs to the selected segment. |
| `Sheet` (new) | Bottom sheet on phones, centred dialog on desktop. Closes with Escape, the back button or the scrim. |
| `Avatar` / `AvatarStack` (new) | See section 5.2. |
| State views | `EmptyState`, `ErrorScreen`, `InlineNotice` now use drawn icons. `LoadingState` is now a skeleton of the page instead of a lone spinner. `Skeleton` was added. |
| `Screen` | Now transparent over the atmosphere. Added `PageHeader`. |

---

## 4. Navigation

**Desktop rail** (`desktop-sidebar.tsx`):

- **Always visible:** the rail is docked.
- **Auto-hide:** the rail floats in over the page from the left edge, so the page no longer jumps sideways. A gold edge handle hints that it is there and is clickable on touch-screen laptops.
- **Keyboard:** Tab reaches "Show navigation"; Enter reveals the rail; tabbing into the rail also reveals it.
- **Bug fixed:** the rail used to schedule itself to hide while you were pointing at it.
- **Also new:** a "today" strip (streak, XP today) and an identity row (avatar, name, rank).

**Phones / narrow web** (`floating-tab-bar.tsx`):

- A floating bar in the thumb zone; the selection pill springs between tabs.
- **Auto-hide works again.** It had been switched off. The bar slides away when you scroll down and returns when you scroll up, reach the end of a page, or change screen. Each screen tracks its own scroll position.

**Screen transitions:** switching screens now cross-fades (instant under reduced motion). This was also needed as a fix — see 6.6.

The five-tab identity, the order, and the hidden routes are unchanged.

---

## 5. Screens

### 5.1 Reinforcement calendar (Home) — `components/learning/review-calendar.tsx`

**New data** (`data/learning/calendar.ts`):

- `reviewMonth()`: a Monday-first grid of 6 weeks.
- `reviewStrip()`: today minus 3 days through today plus 27.
- For each day: the concepts due, how many are overdue, how many "need work", and the review answers given that day.

**Month view:**

- Weekday pill headers, rounded day tiles, and an outline that glides to the selected day.
- Dots per day: overdue, needs work, due, reviewed.
- A legend, and a totals footer (due this month · answers reviewed · active days · overdue).
- Previous and next month, plus "Today".
- The selected day's panel lists each concept with its memory state and a mastery bar, and says how reviewing affects mastery. "Start review" appears on today.

**Phone view:**

- A day strip with weekday letters, a sliding gold selection pill and event dots.
- An inset panel below with the day's concepts. There is no scroll area inside the page's scroll, so no scroll trap.

**Tests:** 4 new unit tests in `tests/engine.test.mjs`:

- the grid shape;
- overdue concepts show only on today;
- review answers are logged on the right day;
- the calendar agrees with the existing agenda.

### 5.2 Avatars — `components/avatar/*`, `components/ui/avatar.tsx`, `lib/avatar-upload.ts`

**Illustrated presets:** 3 male, 3 female (one with a hijab). They are original SVG artwork, not photos: students in white coats with scrubs, a stethoscope and a gold GRATEAPEX pin.

**Upload your own photo:**

- The picker opens your photo library.
- The photo is cropped to a centred square, shrunk to 256 px JPEG (about 20–40 KB) and saved as a small data URI in `profiles.avatar_url`.
- No new storage bucket was needed.

**Use my initials** removes the picture; initials appear on a brand gradient.

**Where it opens:**

- Profile: tap the avatar or "Change avatar".
- Settings → Profile.

**Where it shows:** Profile, Settings, the desktop rail, and Friends (sample friends show initials only, never fake photos).

**Verified in the browser:** choosing a female preset, then a male preset, then initials each saved correctly.

### 5.3 Other screens

| Screen | Change |
| --- | --- |
| **Intro** | Animation unchanged. Behind it, the centre stays exactly logo blue — the logo image has its own blue background, so that is necessary. The edges deepen and there is soft light in the corner. The "developed by OrigiNate" credit was added. |
| **Login / forgot / reset** | Auth logic untouched; only the layout and styles changed. **Desktop** is an immersive split: on the left, the logo, the motto, the three subjects and three value points; on the right, an elevated form card. **Phones** are minimal: logo, form, recovery link. Fields have icons and the show/hide password buttons have eye icons. Error and success messages are styled. The off-brand teal and violet aurora was replaced by the shared atmosphere. |
| **Home** | A command centre. The greeting is exactly "Good Morning/Afternoon/Evening, Doc." / "Doc. Name". Order: current position (current topic with a progress ring) → next action (premium hero) → Today panel (XP today, reviews today vs due, streak) → reinforcement calendar → course mastery (subject glyphs, bars, mastery rings) → rank → study week → discovery → Apex → activity. Desktop uses two columns. The header has a notification bell and settings. |
| **Notifications** (new) | Derived from real state: reviews due or overdue, streak at risk, close to the next rank, milestones (topic complete, concept mastered, quiz ≥90%, Apex), and new features. Grouped into Today / Earlier, with filters (All, Learning, Updates). Unread dots and badge; "Mark all as read" is stored on the device. |
| **Explore** | Editorial bento: a featured story with abstract art (no stock photos) → What's new (6 live topics, 14 in preparation, the two newest features) → Concepts & Connections → Research (honest "coming soon") → Inside GRATEAPEX → **The GRATEAPEX Journey**. The Journey shows the full rank ladder with "You are here", and explains XP, power-ups and leagues. It is the only place the next ranks' names appear. Draft content is marked "Draft". |
| **Discovery** | Article layout with a provenance badge (Draft / Reviewed / Feature). |
| **Learn, subject, topic** | Calm layout; subject and topic glyphs replace emoji; consistent page headers. |
| **Lesson / reading** | Section kinds and "High-yield" now use icons. The reading layout itself is unchanged. |
| **Quiz** | A correct answer gets a springing check and a small pop. A wrong answer is clear but calm: amber instead of red, no shaking, a "reinforce" mark and the review note. Both feedback modes and the timer are untouched. The emoji were removed from the mode picker. |
| **Results** | Animated score ring and counting percentage; the rest of the layout is unchanged. |
| **Apex Challenge** | An immersive arena: gold light rays, a slow pulsing ring and vignette. The countdown sits in a draining ring that pops each second. The timer bar glows. There is a momentum chip: correct count plus streak, and at a streak of 3+ it reads "Momentum ×N" in gold. All scoring and logic is untouched. |
| **Social** | Your real week (stats plus a 7-day XP chart), the weekly league rules as a zone bar, the Study circle (sample, labelled, avatar stack), and Coming next. |
| **Friends** | Avatar rows; sample data clearly labelled. |
| **Profile** | Academic identity card (avatar with edit badge, rank badge, level badge), stat grid, and the rank card. **Milestones** are earned from your real record: first lesson, quiz ace, topic complete, first mastery, consistent reviewer, Apex contender. Menu items have icons. |
| **Settings** | Grouped sections. Profile has the avatar and display name. Appearance shows four live theme swatches (System is shown half light, half dark). Navigation has updated descriptions. Account has sign out. |
| **XP toast** | Larger and centred. A gold star medallion with an expanding halo ring; the number counts up; there is a breakdown of lines; losing XP gets a calm neutral version. |

---

## 6. Bugs found and fixed during the redesign

1. **Home greeting covered by cards.** On the web, Reanimated's custom entrance animation sets `position: absolute` when it finishes, so the greeting left the page flow. `AnimatedContent` now animates its style directly.
2. **Icons hidden behind their tiles on the web.** An absolutely positioned SVG paints over an in-flow icon. The icon is now layered above its tile.
3. **Explore column stretched to a huge height.** Cards were set to `height: 100%`; now they fill only inside grid rows.
4. **Intro logo square showing.** The new background exposed the logo image's own blue square. The area within 300 px of the centre is now exactly logo blue.
5. **Signature text colliding with content on phones.** Fixed by the frosted chip.
6. **Inactive screens showing through (serious).** Transparent screens let previously visited screens show underneath — on the web the navigator only hid them through an opaque background. Inactive screens now fade out, which also gives the cross-fade. Verified on the quiz → results and lesson screens.
7. **Font could block page load.** The Google Fonts stylesheet sat in the HTML head; it now loads after start-up.
8. **Auto-hide missed the first scroll.** Fixed with per-screen scroll tracking.
9. **Lint.** Two lint errors in new code (an impure `Date.now()` during render, and a `setState` inside an effect) were fixed.

---

## 7. Files

### New

**Atmosphere**
- `src/components/atmosphere/config.ts`
- `src/components/atmosphere/atmosphere.tsx` (native)
- `src/components/atmosphere/atmosphere.web.tsx`
- `src/components/atmosphere/atmosphere.module.css`

**Avatars**
- `src/components/avatar/presets.tsx`
- `src/components/avatar/avatar-picker.tsx`
- `src/components/ui/avatar.tsx`
- `src/lib/avatar-upload.ts`

**UI primitives**
- `src/components/ui/icon.tsx`
- `src/components/ui/icon-button.tsx`
- `src/components/ui/progress-ring.tsx`
- `src/components/ui/animated-number.tsx`
- `src/components/ui/segmented-control.tsx`
- `src/components/ui/sheet.tsx`

**Navigation, signature and intro**
- `src/components/floating-tab-bar.tsx`
- `src/components/signature.tsx`
- `src/components/intro-credit.tsx`

**Notifications**
- `src/components/notifications.tsx`
- `src/data/notifications.ts`

**Learning**
- `src/components/learning/glyphs.tsx`

**Hooks and web font**
- `src/hooks/use-tween.ts`
- `src/lib/web-fonts.ts`

**Docs**
- `docs/redesign-notes.md`
- `docs/redesign-report-2026-10-03.md` (this file)

### Substantially rewritten

**Constants, global CSS and HTML shell**
- `src/constants/theme.ts`
- `src/constants/motion.ts`
- `src/global.css`
- `src/app/+html.tsx`

**Shell and navigation**
- `src/app/_layout.tsx` (font loading only)
- `src/components/app-tabs.tsx`
- `src/components/app-tabs.web.tsx`
- `src/components/desktop-sidebar.tsx`
- `src/components/tab-bar-visibility.tsx`
- `src/components/nav-items.tsx`

**UI primitives**
- `src/components/ui/interactive.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/state-views.tsx`
- `src/components/ui/screen.tsx`

**Shared components**
- `src/components/rank-progress.tsx`
- `src/components/xp-toast.tsx`
- `src/components/motion/animated-content.tsx`

**Learning components**
- `src/components/learning/next-action-card.tsx`
- `src/components/learning/nav-bits.tsx`
- `src/components/learning/review-calendar.tsx`

**Screens**
- `src/app/index.tsx`
- `src/app/explore.tsx`
- `src/app/explore/discovery.tsx`
- `src/app/profile.tsx`
- `src/app/settings.tsx`
- `src/app/social/index.tsx`
- `src/app/social/friends.tsx`
- `src/app/login.tsx` (view and styles only)

### Edited (targeted)

**Screens**
- `src/app/learn/index.tsx`
- `src/app/learn/quiz.tsx` (mode picker icons)
- `src/app/learn/results.tsx` (score ring)
- `src/app/learn/apex.tsx` (arena, countdown, momentum)
- `src/app/learn/review.tsx` / `src/app/progress.tsx` (icons, glyphs)

**Components**
- `src/components/learning/subject-screen.tsx`, `topic-screen.tsx`, `topic-card.tsx`, `reading-layer.tsx`
- `src/components/question-card.tsx` (feedback)
- `src/components/animated-icon.tsx` / `.web.tsx` (credit line; web background only)

**Data**
- `src/data/learning/calendar.ts` (month and strip)
- `src/data/explore.ts` (2 feature items describing the real calendar and avatar features; `getExploreItems()`)

**Tests and docs**
- `tests/engine.test.mjs` (4 calendar tests)
- `AGENTS.md` (Navigation + new Design system section)

### Removed (verified unused or obsolete; backed up first)

- `.l.json` — an empty file referenced nowhere.
- `.tmp-grateapex-web-ui-check/` — a 5.4 MB stale web export from an earlier UI check.
- `src/components/motion/blur-text.tsx`, `split-text.tsx`, `count-up.tsx` — unused. The first two used the entrance animation that caused bug 6.1, and `count-up` was replaced by `AnimatedNumber`.

Backups are in this session's scratch folder for as long as it exists. `dist/` (git-ignored build output) and `.kilo/` (Kilo's tool folder) were left in place.

### Not changed

- The learning engine, XP rules and scheduler.
- Supabase calls and auth logic.
- Lesson content.
- `logo-mark.tsx`.
- The intro animation.

---

## 8. Validation detail

| Check | Result |
| --- | --- |
| Typecheck (`npm run typecheck`) | Clean. |
| Lint (`npm run lint`) | 1 warning — `friendlyError` unused in `login.tsx`. It already existed; see section 9. |
| Unit tests (`npm test`) | **79/79** (75 existing + 4 new calendar tests). |
| Web build (`expo export --platform web`) | Builds. |
| Route smoke test | **54/54** routes load with no runtime errors. |
| End-to-end flow | **40/40**: lesson → completion XP → quiz (25 distinct questions) → results → second attempt varies → progress persists → resume → next-day reviews due → review session → Apex run → My Progress → XP history → all 4 themes persist → no horizontal overflow at 390 / 820 / 1366 px → no runtime errors. Two checks were updated for intentional changes: the theme colour is now read from the atmosphere layer, and the "Continue where you left off" label. |
| Interaction, desktop and phone | **16/16 each**: notification centre opens and "Mark all as read" works; avatar picker saves female → male → initials to the profile; Light theme persists after reload; Apex theme restored; Learn uses the calm atmosphere; OrigiNate bottom-right and non-blocking; no console errors. |
| Keyboard and reduced motion | **7/7**: Tab reaches "Show navigation"; Enter reveals the rail; Tab enters the rail; content focus ring is visible; under reduced motion the content is fully visible and the atmosphere is still. |
| Visual review | Screenshots of every main screen at 1440×900 and 390×844, in Apex, Light and Dark, plus the intro at 0.9 / 1.7 / 2.5 s. |

---

## 9. Needs your decision or a device

1. **Android/iOS were not run on a phone.** Everything typechecks, and the native atmosphere, tab bar, sheets and avatars use only installed libraries, but I could not run Expo Go here. Please open the app on your phone once.
2. **Sign-in shows Supabase's raw error text.** This is marked `TEMPORARY (debugging)` in the auth logic. I did not touch auth logic. If the sign-in issue it was added for is solved, switch it back to the friendly message; that also clears the lint warning.
3. **Google Fonts.** The display font is fetched from Google on the web. If you prefer no third-party request, the font can be bundled with the app instead.
4. **Photos in the profile.** Uploaded photos are stored as small data URIs in `profiles.avatar_url`, about 20–40 KB each. That is fine at this scale; Supabase Storage would be the step up later.
5. **Optional student uploads** (textbooks, notes) are not built. The avatar photo is the only upload flow so far.
6. **Earlier open items are unchanged:**
   - the learning-engine migration is not applied;
   - nothing has been committed to git;
   - the CVS deck classification;
   - the "check with your lecturer" points.

---

## 10. How to look at it

1. Run `npm run web`.
2. Try:
   - the intro (watch for "developed by OrigiNate");
   - **Settings → Appearance** (switch Apex / Light / Dark / System);
   - **Profile → tap your avatar** (choose male or female, or upload a photo);
   - the **bell** on Home;
   - the **calendar** on Home (click days; use the month arrows on desktop);
   - narrow the browser window to see the phone layout and auto-hide.
