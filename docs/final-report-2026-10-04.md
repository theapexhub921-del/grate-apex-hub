# GRATEAPEX — final report (2026-10-04)

This report covers everything done after the redesign report (`docs/redesign-report-2026-10-03.md`):

- the errors you sent;
- your design changes;
- the new sign-up, Google sign-in and first-run introduction;
- the fixes found during testing;
- the full test results.

It ends with what you need to set up in Supabase, and what is still open.

---

## 1. Summary

- **Your errors:** both are fixed and verified. While checking development mode I also found and cleared three related warnings.
- **Your design changes:** all are in:
  - more realistic cartoon avatars;
  - sidebar order Home → Learn → Social → Explore → Profile;
  - a human-body anatomy icon;
  - Apex at 10 seconds per question;
  - topics as a vertical, ordered path;
  - a larger OrigiNate;
  - "developed by OrigiNate" in the intro.
- **Authentication entry:** the sign-in page now offers **Create account** and **Continue with Google** next to email sign-in and Forgot password. New accounts are taken through a **13-step interactive introduction** after signing in. It can be skipped, is remembered, and can be replayed from Settings.
- **Tests:** everything passes on the final build — details in section 7. Auth was tested against a **simulated Supabase**, so no real accounts were created and no emails were sent. A real Google sign-in needs one setup step in your Supabase dashboard (section 5).

---

## 2. The errors you reported

### 2.1 `Cannot read properties of undefined (reading 'startsWith')` — fixed

- **Where:** the keyboard-focus helper (`src/components/ui/web.ts`). It assumed every key event carries a `key` value.
- **Why it crashed:** some browser events don't carry one. Password-manager **autofill** on the login form is the usual cause.
- **Same bug in a second place:** the keyboard shortcuts used in lessons and quizzes (`src/hooks/use-keyboard-shortcuts.ts`) had the same weakness and would have crashed the same way. Both now ignore such events safely.
- **Verified:** I fired key events with no `key` on Home, the lesson page (shortcuts active), Settings and Login. There were no errors on any of them.

### 2.2 `Received false for a non-boolean attribute accessible` (+ `importantForAccessibility`, `accessibilityElementsHidden`) — fixed

- **Where:** the new SVG icons and avatars passed React Native accessibility props straight onto the web `<svg>` element, which React rejects. These warnings only appear in development mode, which is why my production builds didn't show them.
- **Fix:** switched to the standard ARIA props (`role`, `aria-label`, `aria-hidden`). They work on both web and native, and screen readers still get the same information.
- **Also found and fixed in the same sweep:**
  - "props.pointerEvents is deprecated": moved to styles in 9 places.
  - A Reanimated warning on the subject page: the memory-state bar read `.value` inside an inline style.
- **Verified:** a fresh development server was swept over 12 screens, including the introduction. No React, SVG, pointer-events or Reanimated warnings remain. The only messages left are "Could not sync … with Supabase": my test session has no real backend, and two of them are the known reminder that the learning-engine migration isn't applied.

---

## 3. Your design changes

| Change | Details |
| --- | --- |
| **Avatars: realistic cartoon** | Redrawn as shaded portraits (see below). Still original artwork, not photos; same six choices; same IDs, so saved choices still work. |
| **Sidebar order** | Home, Learn, Social, Explore, Profile. The phone tab bar uses the same list, so both match. If you want the phone bar kept in the old order, tell me — it's a one-line split. |
| **Anatomy icon** | The skeleton is replaced by a **human body** outline (head, shoulders, arms, legs). Physiology keeps the heart with a pulse line, so the two subjects stay distinct. |
| **Apex: 10 seconds per question** | Set in `src/data/learning/apex.ts`. The timer, the rules, the Home card and the intro text all read the setting, so they can never disagree. The rule for which questions qualify is unchanged. |
| **Topics in vertical order** | On a subject page the topics now form a **numbered path**, top to bottom in course order. A line connects them, finished topics get a ✓, and the next one is marked **"Up next"** (or "In progress"). On desktop, the next action and the Course review / Apex buttons sit beside the path. |
| **OrigiNate larger** | 14 px (was 11), on a small frosted chip so text scrolling underneath never collides with it. It never takes taps. On phones it sits above the tab bar, and above the introduction's Back/Next buttons. |
| **Intro credit** | "DEVELOPED BY / Origi**N**ate" appears near the bottom of the intro just after the logo. The logo and its animation are untouched. |

**The redrawn avatars in detail:**

- **Faces:** a shaped jaw and cheekbones, and ears.
- **Eyes:** whites, a coloured iris with a catch-light, and eyelids.
- **Brows, nose and lips:** tapered brows, soft nose shading, and two-tone lips with a smile.
- **Hair:** layered, with strand highlights. The curls are a natural curly outline instead of circles.
- **Clothing:** a white coat with lapels, coloured scrubs, a stethoscope with a metal chest piece, and the gold GRATEAPEX pin.
- **The six:**
  - **Male:** short textured hair; side part with glasses; short fade with a beard.
  - **Female:** long hair; natural curls with gold hoops; hijab.

---

## 4. Sign-up, Google sign-in and the introduction

All of this uses your **existing Supabase auth**; there is no second auth system.

### 4.1 Sign-in page (`src/app/login.tsx`)

The page now has:

- email/password sign-in (unchanged);
- Forgot password (unchanged);
- an **"or"** divider;
- a standard white **Continue with Google** button;
- **"New to GRATEAPEX? Create an account"**.

The desktop split layout and the minimal phone layout are kept.

**Errors are now plain language.** The temporary debugging message (for example "Invalid login credentials (code: …, status: 400)") is replaced by:

- "Incorrect email or password."
- "Please confirm your email address first — check your inbox for the link."
- "Too many attempts — please wait a few minutes and try again."

The technical detail still goes to the developer console. This also cleared the last lint warning.

### 4.2 Create account

- **Fields:** name (optional), email, password (at least 8 characters, show/hide), and confirm password.
- **Clear messages for:**
  - a password that is too short;
  - passwords that don't match;
  - an invalid email;
  - an existing account;
  - sign-ups switched off;
  - too many attempts.
- **What happens next depends on your email setting:**
  - **Email confirmation ON:** a **"Check your email"** screen shows the address, with **"Resend the link"** and "Back to Sign In". If the email already has an account, it gently suggests signing in instead.
  - **Email confirmation OFF:** the learner is signed in at once and goes straight to the introduction.
- **The name** is saved in the account and shown on Home as "Doc. <name>".

### 4.3 Continue with Google (`src/lib/google-auth.ts`)

**On the web:**

1. The button first checks whether Google is switched on in your Supabase project.
2. If it is, the learner goes to Google and comes back to GRATEAPEX already signed in.
3. If it isn't, they see: "Google sign-in isn't switched on for GRATEAPEX yet. Please use your email and password for now." They never land on a raw error page.

**When something goes wrong:**

- **Cancelled on Google's page:** "Google sign-in was cancelled." It is never mistaken for an expired reset link.
- **The address bar** is cleaned so a refresh shows a normal sign-in page.
- **Back button from Google:** the button doesn't stay stuck on "Opening Google…".

**On phones:** the system sign-in sheet opens and returns to the app. Cancelling is explained the same way.

### 4.4 Who sees the introduction (`src/data/onboarding.ts`, `src/app/_layout.tsx`)

- **Who:** accounts created **on or after 3 October 2026**, the first time they sign in. This covers email sign-ups, Google sign-ups and email-confirmation links.
- **Older accounts** go straight to Home. They already know the app, and they can replay the introduction from Settings.
- **Finishing or skipping** is remembered in two places:
  - **On the device:** this is instant, and works offline.
  - **On the Supabase account** (user metadata, `onboarding_completed`): this follows the learner to other devices, with no database change needed.
- **Replay:** Settings → **Help** → **Replay the introduction**.
- **Unchanged routing:**
  - Signed-out users go to Login.
  - Password-reset links stay on Login.
  - Signed-in users on Login go to Home.

### 4.5 The introduction (`src/app/onboarding.tsx`, `src/components/onboarding/`)

It is a miniature, working GRATEAPEX. It has a progress bar, a step counter and a **Skip** button on every step except the last.

| # | Step | What the learner does |
| --- | --- | --- |
| 1 | Welcome | Sees the three ideas: learn from lectures, spaced review, ranks. |
| 2 | Home — next best action | Taps "Begin" on a mini Home hero, which shows their real next lesson. |
| 3 | Learn | Drills down from Biochemistry to the course, the topic (in order) and the lessons, using your real course data. |
| 4 | Learn actively | Answers a real checkpoint question from Fatty Acid Biosynthesis and gets the real feedback. |
| 5 | Read & revise | Opens the high-yield points of lesson 1. |
| 6 | Lesson quizzes | Switches between Instant feedback and Submit at the end. Sees that a quiz has up to 25 questions and the XP for finishing and per miss. |
| 7 | Review | Taps days on an example spaced-repetition week to see which concepts come back. |
| 8 | XP & ranks | "Finishes" an example lesson: the XP counts up and the rank ring fills. The next rank's name stays hidden, as everywhere else. |
| 9 | Apex Challenge | Starts a real 10-second question clock in a mini arena. |
| 10 | Explore | Opens the featured story; the GRATEAPEX Journey is mentioned. |
| 11 | Social | Sees an example study week and how weekly leagues work. |
| 12 | Make it yours | Sets their name, avatar (male/female presets) and theme. |
| 13 | You're ready | Sees their real first lesson and how to start it from Home, then "Go to Home". |

**Demo versus real:**

- Every demo frame is labelled **"TUTORIAL · PRACTICE ONLY — NOT RECORDED"**. Practice answers, XP and schedules are never saved; the tests confirm nothing was written to the learning tables.
- Step 12 is labelled **"REAL SETTINGS · SAVED TO YOUR PROFILE"**, because those choices do save.

**Access:**

- **Keyboard:** → next, ← back, Esc skip.
- **Touch:** large buttons; on phones, Back/Next sit at the bottom in the thumb zone.
- **Reduced motion:** transitions become instant.

**Layout:**

- **Desktop:** explanation on the left, the live mini-app on the right.
- **Phones:** stacked.
- The atmosphere uses the immersive mood, and the app navigation is hidden while the introduction is open.

---

## 5. What you need to set up in Supabase

Your project ref is in `.env`. Do these in the Supabase dashboard.

1. **Turn on Google:** Authentication → Sign In / Providers → **Google** → Enable.
   - You need a Google OAuth client from Google Cloud Console: APIs & Services → Credentials → OAuth client ID → **Web application**.
   - Set its authorized redirect URI to `https://<your-project-ref>.supabase.co/auth/v1/callback`.
   - Paste the Client ID and Secret into Supabase.
   - Until this is done, the button shows the friendly "isn't switched on yet" message.
2. **Allow the return addresses:** Authentication → URL Configuration → Redirect URLs. Add:
   - `http://localhost:8081/login` (local web)
   - your live web address + `/login`
   - `grateapex://login` (the phone app)
   - for Expo Go, the `exp://…` address it prints
3. **Choose email confirmation:** Authentication → Sign In / Providers → Email → "Confirm email". GRATEAPEX handles both settings; ON is recommended.
4. **Check profile rows for new users:** none of the repo's migrations creates a `profiles` row on sign-up, so check that your project does. Many projects have a "handle_new_user" trigger for this.
   - **Without one:** a new user's name and avatar still work, saved on the device and in the account, but `profiles` won't hold them.
   - I can write that trigger as a migration for you to review. I won't apply it.

---

## 6. Other problems found and fixed during testing

1. **Screens showing through each other (serious).** The atmosphere made screens transparent, so previously visited screens showed underneath the current one. Screens now fade between each other instead.
2. **Google-return address cleanup.** On first load the router rewrites the address from its own state, so the cleanup was being undone. It now runs once the router has settled.
3. **Sideways wobble during the intro (phones).** The intro's spinning arcs are square boxes with round corners, and their invisible corners briefly widened the page. The overlay now clips them; nothing visible changes.
4. **Signature over a button.** On the phone introduction, the OrigiNate chip covered "Next"; it now sits above the controls.
5. **Avatar label.** One avatar's accessibility label changed with the redraw ("Male avatar, short fade and beard"), and the tests were updated.

---

## 7. Testing and results (final build)

| Check | Result |
| --- | --- |
| `npm run typecheck` | clean |
| `npm run lint` | **0 problems** (the old `friendlyError` warning is gone) |
| `npm test` (learning engine + content + calendar) | **79 / 79** |
| Web build (`expo export`) | builds |
| All routes load without errors | **54 / 54** |
| End-to-end learning flow (lesson → quiz → results → review → Apex → progress → themes → phone/tablet/laptop overflow) | **40 / 40** |
| Interaction checks (notifications, avatar picker male + female + initials, themes persist, atmosphere mood, OrigiNate) | **16 / 16** desktop, **16 / 16** phone |
| Keyboard + reduced motion | **7 / 7** (three runs in a row) |
| Key events without a `key` (your crash) on 4 screens | all passed |
| **Auth and introduction** — desktop | **42 / 42** |
| **Auth and introduction** — phone | **42 / 42** |
| Development-mode warning sweep (12 screens) | no React / SVG / pointer-events / Reanimated warnings |

**What the 42 auth checks cover:**

- **Sign-up form:** the page shows Create account and Google; a short password and mismatched passwords are refused.
- **New email sign-up:**
  - it goes to the introduction and greets the learner by name;
  - the name is sent to Supabase.
- **The introduction:**
  - Home, Learn and practice-question steps respond;
  - the arrow keys work;
  - practice answers are not recorded;
  - the avatar choice is a real setting;
  - the final step shows the real first lesson.
- **Finishing it:**
  - goes to Home;
  - is saved on the account and the device;
  - a returning learner isn't sent back.
- **Replay** opens from Settings and is labelled, and Esc skips.
- **Signing in:**
  - signing out returns to Login;
  - a wrong password gives a plain-language error;
  - an existing account goes straight to Home.
- **New account that never finished:** it is sent to the introduction, Skip works and is remembered, and the learner isn't sent back.
- **Google:**
  - switched off: a friendly message, and the learner stays on Login;
  - cancelled: explained, never mistaken for a reset link, the address is cleaned, and a refresh is clean;
  - success with a new Google account: it reaches the introduction.
- **Email confirmation ON:**
  - shows "Check your email" and resend works;
  - an existing email gets a hint to sign in;
  - an unconfirmed sign-in is asked to confirm first.
- **No runtime errors.**

**About the auth tests:**

- **Simulated Supabase:** the test answers the app's Supabase requests itself (sign-up, sign-in, Google redirect, user metadata), so it tests the app's behaviour without creating real accounts or sending real emails. Real sign-ups would add users to your live project and could trip Supabase's email-sending limits.
- **Please try once for real** after section 5: create an account, sign in with Google, and replay the introduction from Settings.

---

## 8. Files in this round

### New

- `src/app/onboarding.tsx`
- `src/components/onboarding/onboarding-tour.tsx`
- `src/components/onboarding/tour-demos.tsx`
- `src/data/onboarding.ts`
- `src/lib/google-auth.ts`
- `src/lib/web-fonts.ts`
- `src/components/intro-credit.tsx`
- `docs/final-report-2026-10-04.md`

### Changed

**Sign-in and onboarding**
- `src/app/login.tsx`: create account, check email, Google, plain-language errors, Google-return handling.
- `src/app/_layout.tsx`: introduction routing; font loading.
- `src/app/settings.tsx`: Help → Replay the introduction.
- `src/components/app-tabs.tsx`, `app-tabs.web.tsx`: introduction route without navigation; fade transitions.
- `src/components/atmosphere/config.ts`: introduction mood.
- `src/lib/routes.ts`: `routes.onboarding()`.

**Your design changes**
- `src/components/avatar/presets.tsx`: redrawn avatars.
- `src/components/nav-items.tsx`: order.
- `src/components/ui/icon.tsx`: anatomy icon; ARIA props.
- Apex 10 s: `src/data/learning/apex.ts`, `src/app/index.tsx`, `src/app/learn/apex.tsx`, plus comments in `src/data/learning/scheduler.ts` and `src/data/questions.ts`.
- `src/components/learning/subject-screen.tsx`: vertical topic path.
- `src/components/signature.tsx`: larger chip, placement, ARIA.

**Error and warning fixes**
- `src/components/ui/web.ts`, `src/hooks/use-keyboard-shortcuts.ts`: key-event crash.
- `src/components/learning/glyphs.tsx`: ARIA.
- `src/components/ui/progress-bar.tsx`: Reanimated warning.
- `pointerEvents` moved to styles in:
  - `apex.tsx`, `animated-icon.web.tsx`, `desktop-sidebar.tsx`, `floating-tab-bar.tsx`, `intro-credit.tsx`;
  - `review-calendar.tsx`, `signature.tsx`, `icon.tsx`, `xp-toast.tsx`.
- `src/components/animated-icon.web.tsx`: clip the intro's spinning arcs (no visual change).

**Docs**
- `AGENTS.md`: routes; navigation order; new "Authentication and onboarding" section; design-system notes.

### Not changed

- The learning engine and XP rules (other than the Apex time).
- Lesson content.
- The logo and its shine.
- The intro animation.
- The password-reset and recovery flow.

---

## 9. Still open

1. **The Supabase setup in section 5**, especially Google.
2. **Phones:** Android and iOS weren't run on a device here; everything typechecks. Please open the app in Expo Go once.
3. **Carried over:**
   - the learning-engine migration (`supabase/migrations/20261003000000_learning_engine.sql`) is **not applied**;
   - nothing is committed to git yet;
   - the CVS deck classification and the "check with your lecturer" points from the content report.
4. **Optional:** bundle the heading font with the app instead of loading it from Google Fonts on the web.

## 10. Next

As you asked, I'm continuing with the remaining lecture topics in `content/` under the same rules as before:

- built only from the slides;
- every supplied file merged;
- disagreements kept and flagged;
- at least 25 quiz questions per lesson.

**The new Anatomy zip is left untouched until you give instructions.**
