# GRATEAPEX — product-wide redesign notes (2026-10-03)

Working notes for the full UI/UX redesign. They record what was found, the decisions made, and what each screen should become. The code is the final source of truth.

## 1. Current UI (audit)

| Area | What exists | Problems |
| --- | --- | --- |
| Theme | `constants/theme.ts`: one token set, three palettes (Apex / Light / Dark) | The Apex page is a flat `#1245C4`. There are no surface tiers (elevated, sunken), no shadow, radius or type scale, and screens hard-code font sizes and weights. |
| Background | Flat `colors.background` everywhere. Login has its own aurora with teal and violet clouds that are off-brand. | No atmosphere or depth, and the login effect matches nothing else in the app. |
| Navigation | Desktop rail (auto-hides from the left edge and pushes the content when revealed); stock `BottomTabBar` on phones; PNG icons for Home/Explore, system symbols for the rest | Revealing the rail shifts the layout. The bottom bar is a generic flat strip. The icon set is mixed. Mobile auto-hide was switched off: `tab-bar-visibility` is inert. |
| Cards and buttons | `Card` / `PressableCard` / `Button` primitives exist, but Profile, Social, Friends, Explore, Discovery and Settings style their own rows, cards and back buttons | Five slightly different card styles; flat buttons with no tactile depth. |
| Iconography | Emoji everywhere: subjects 🧪🫁🦴, topics, profile menu, social placeholders, activity feed, XP toast ⭐, empty states 📭🧭 | Reads as a prototype, renders differently on each OS, and contradicts "medical-academic seriousness". |
| Calendar | 14-day bar strip | The owner dislikes it. It shows no month context, no importance, no history. |
| Avatar | Initial letter, or the `avatar_url` image | No presets and no way to upload. |
| XP toast | Centred card with a ⭐ emoji | Small, and the halo looks cheap. |
| Apex | Dark arena | Plain; no pulse or momentum. |
| Results | Big percentage text | No arc, no animated number. |
| OrigiNate | Missing | Must be recreated (owner's choice). |
| Leftovers | `.l.json` (empty), `.tmp-grateapex-web-ui-check/` (old export), `dist/` (old export), `.kilo/worktrees` (empty) | Agent and test artifacts. Verified before removal; see the report. |

## 2. Design principles

1. **Learning first.** Every screen answers "what should I do next?" before it decorates.
2. **One system.** All colour, radius, type, elevation and motion values come from tokens, and screens compose primitives.
3. **Depth through light, not gimmicks.** Layered tonal fields, a faint grid, grain and vignette, with glows placed only where attention belongs. No glass on everything; gradients only in the atmosphere and hero surfaces.
4. **Calm where it counts.** Atmosphere intensity per screen: Home is lively, Explore expressive, Learn calm, Quiz minimal (most readable), Apex immersive, Profile and Settings quiet.
5. **Honest data.** Every number comes from the learning engine. Sample data is labelled. Features that are not built show "coming soon" and are never faked.
6. **Two deliberate products.** Desktop is multi-column, hover and keyboard driven. Mobile is a single column, thumb-zone, uses sheets and touch feedback, and runs no heavy effects.
7. **Motion has meaning.** micro (120 ms) → standard (220 ms) → significant (420 ms) → special (900 ms+). All of it is off under reduced motion.

## 3. Proposed system

- **Tokens:** the existing names are kept, so nothing breaks. New names:
  - `surfaceElevated`, `surfaceSunken`, `borderStrong`, `hairline`, `highlight`
  - `info*`, `warning`, `secondary*`, `overlay`, `shadow`
  - `navSurface`, `navBorder`, the `ambient*` set, and `apexGlow`
- **Theme palettes:**
  - **Apex:** deep royal field `#0A2672` → `#1245C4` glows, cards `#0F3394`, gold primary.
  - **Light:** off-white `#F3F5FA`, soft blue fields, white cards with soft shadows, restrained gold.
  - **Dark:** layered neutrals `#0B0D12` / `#13161D` / `#1A1E27`, with blue and gold accents.
- **Scales:**
  - `Radius`: xs 8, sm 12, md 16, lg 20, xl 26, pill.
  - `Type`: display, title1–3, headline, body, callout, caption, overline, numeral. A display face (Manrope) is loaded on the web only.
  - `Elevation` presets per theme.
- **Motion:** `constants/motion.ts` holds durations, springs, easings and staggers, plus a `useMotion()` hook that respects reduced motion.
- **Atmosphere:** a web component built from CSS layers:
  - base tonal field
  - two drifting aurora fields
  - faint masked grid
  - light rays
  - SVG grain
  - vignette
  - localized gold glow

  Intensity is chosen per route. Native gets a lightweight static SVG version with no animation.

## 4. Components

**Shared** (`components/ui/`)
- `Icon`: a custom SVG set (nav, rank, XP, mastery, streak, reinforcement, achievement, challenge, course, lesson, social, plus utility icons).
- Cards: `Card`, `PressableCard` with the tones surface / elevated / muted / primary / outline / insight / reward.
- Controls: `Button` (tactile), `IconButton`, `Pill`, `SegmentedControl`.
- Progress and numbers: `ProgressBar`, `ProgressRing`, `AnimatedNumber`, `StatCard`.
- States: `Skeleton`, `EmptyState`, `ErrorScreen`, `InlineNotice`.
- Overlays and identity: `Sheet` (a bottom sheet on phones, a dialog on desktop), `Avatar`, `AvatarStack`, `AvatarPicker`.
- Notifications: `NotificationCenter` and `NotificationItem`.
- Brand marks: `Signature` (OrigiNate), `Atmosphere`.

**Desktop web**
- Docked rail when "Always visible" is on. With auto-hide, a floating overlay rail that reveals from the left edge and no longer shifts the layout.
- Month-grid calendar with a gliding selection outline.
- Hover lift on cards; keyboard focus rings.
- Bento grids on Home and Explore.

**Mobile**
- Floating bottom tab bar with a spring active pill. It auto-hides on scroll down and reappears on scroll up when "Auto-hide" is selected.
- Day-strip calendar with a spring selection pill and an event panel.
- Bottom sheets (avatar picker, notifications); press-scale feedback.

## 5. Screen-by-screen

| Screen | Change |
| --- | --- |
| Intro | Locked. Only the background behind it changes: a layered radial field on web, same base colour. |
| Login / forgot / reset | All auth logic stays. Desktop is an immersive split: a brand panel on the shared atmosphere beside a form card. Mobile is minimal: identity, form, recovery. |
| Home | Command centre in this order: greeting → current position → next action → today → reinforcement calendar → course mastery → rank/XP → social → discovery. Desktop is a 2-column bento. A bell opens notifications. |
| Explore | Editorial bento: featured story, What's New (real published topics and features), connections, research (honest empty state), and the full rank system (ladder, leagues, power-ups). |
| Discovery | Article layout with a provenance badge. |
| Learn / subject / topic | Calm academic layout. Subject and topic glyph tiles replace emoji. Progress rings. |
| Lesson / reading | Typography polish only; the flow is unchanged. |
| Quiz | Readable, minimal atmosphere. The correct answer pops; the wrong answer is calm. Both feedback modes are kept. |
| Results | Animated score arc and number, then review list and next action. |
| Apex | Immersive arena: rays and pulse, ring countdown, glowing timer, momentum streak. |
| Progress | Primitives, rings, and glyphs instead of emoji. |
| Social / Friends | Academic community: your real week, league rules, sample friends labelled with avatar stacks, coming-soon features with icons. |
| Profile | Academic identity: avatar with edit (male and female presets plus photo upload), rank and XP ring, stats, menu with icons. |
| Settings | Grouped sections, appearance as theme swatches, navigation behaviour, profile (avatar and name), account. |
| Everywhere | The OrigiNate signature sits bottom-right and never covers controls; on phones it sits above the tab bar. |

## 6. Status (end of 2026-10-03)

Implemented: everything in sections 3–5, plus the owner's additions —
- the reinforcement calendar, modelled on the Watermelon calendar designs (month grid on wide layouts, day strip on phones);
- male/female illustrated avatars and own-photo upload;
- the OrigiNate signature, now a slightly larger frosted chip;
- the "developed by OrigiNate" credit in the intro.

Validation:
- `npm run typecheck` is clean.
- `npm run lint` shows 1 warning, which was already there before the redesign.
- `npm test`: 79/79 tests pass.
- The web export builds.
- End-to-end flow: 40/40 checks pass. Route smoke test: 54/54 routes load.
- Interaction checks (notifications, avatar picker, themes, signature): 16/16 pass on desktop and 16/16 on phone.
- Keyboard and reduced-motion checks: 7/7 pass.

Not covered by this pass (needs a decision or a device):
- Android/iOS were not run on a device: typecheck only.
- Supplementary-material upload (optional student uploads) is not built. The avatar photo upload is the only upload flow.
- The sign-in screen still shows Supabase's raw error text: this is a TEMPORARY debugging message left in the auth logic, which was not changed.
