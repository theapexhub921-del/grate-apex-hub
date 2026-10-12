# GrAte Apex — handoff and implementation report

Updated 5 October 2026.

## Work carried forward

Several chats had left changes in the `local/old-site-features` checkout when their usage ended. I reviewed that working tree and continued the requested app refresh in place. Existing local edits were preserved. No commits, pushes, or merges were made. The current production build was deployed to Vercel on 5 October 2026; Vercel deployment protection remains enabled.

## Implemented in this pass

- Changed the default Apex page field to a brighter blue (`#2563EB`) and adjusted its atmosphere colors.
- Increased the visibility of the small floating study illustrations on Home. The effect respects reduced-motion settings.
- Standardized visible product branding as **GrAte Apex**, including the login screen, desktop rail, page metadata, profile and legal copy.
- Replaced the Home welcome card with an animated greeting at the upper left. It animates in on app open and stays in the page layout.
- Made **Home** the social front door with 24-hour Stories and a friend-visible feed for photo/video posts, reactions, comments and reshares.
- Reworked Explore into a GrAte Apex guide: introduction, available features, the full XP/rank journey, replayable app introduction, and an email contact link. Medical concept discovery cards were removed from this page.
- Added an “In development” section for live group calls, push delivery, native widgets, streak restoration, and the past question bank. It labels upcoming work separately from available features.
- Published topic cards now display their assigned emoji instead of a two-letter glyph. Pending topics retain the illustrated glyph treatment.
- Removed the learning dashboard from Home; it now focuses on Stories and a link into Learn. Learn now owns rank progress, the review calendar, due review and curriculum progress. Its nested subject/topic/lesson/review/quiz routes remain within the five main destinations.
- Added a profile picture chooser with illustrated avatar options, photo upload and initials.
- Added `src/data/community.ts` client functions for stories, study groups, discussions, friend challenge invitations, direct messages and reading freeze inventory.
- Added a local Supabase migration for friend-visible 24-hour story records, group membership and discussions, friend-only direct message conversations, challenge invitations, and a server-controlled streak-freeze balance. It uses RLS and identity-bound RPC functions.
- Applied the community migration in the Supabase Dashboard; the SQL Editor reported success with no result rows.
- Added an authenticated `ai-tutor-session` Supabase Edge Function scaffold. It requests a short-lived OpenAI Realtime credential, derives a privacy-preserving safety identifier from the signed-in user, and keeps the permanent API key server-side. Added a client helper to invoke it.
- Added the Learn → AI voice tutor screen and Explore link. In the web app it asks for microphone permission only when the learner starts a call, connects to OpenAI Realtime with the short-lived session key, displays available speech transcripts, and can end the call and release microphone tracks. It clearly labels that lecture-file grounding is not connected and that native iOS/Android audio needs a later integration.

The earlier interrupted changes are also still present: class/semester selection, curriculum routing, the Supabase-backed social feed, and the local quiz builder/timed drills.

## Checks and preview

- `npm run typecheck` passed after the Home/Learn move, avatar UI changes and community data layer.
- `npm test` passed: 97 tests.
- `git diff --check` passed; Git only printed line-ending notices.
- Targeted ESLint checks passed with `--no-cache`. The full `npm run lint` command could not write its cache under `.expo/cache/eslint` (Windows EPERM).
- The owner ran `supabase/migrations/20261005020000_community_backend.sql` successfully in the configured Supabase SQL Editor on 5 October 2026. The editor reported success with no rows returned, which is expected for this schema migration. During final review I fixed a group-invite authorization edge case and made existing direct messages inaccessible after either person is no longer an accepted friend.
- The local preview at `http://localhost:8081/login` responded with HTTP 200. The login page visually shows the updated GrAte Apex branding and bright blue theme. Home, Explore and topic cards require an authenticated session, which was not available for visual review.

## External services needed for the next build

- **AI tutor and spoken GrAte Apex voice:** the owner added an `OPENAI_API_KEY` secret after the initial HTTP 503 caused by the previous secret-name mismatch. The latest app response is HTTP 502 with the generic message `The AI tutor could not start a voice session.` This function currently hides OpenAI's upstream error. I updated the local Edge Function to log and return OpenAI's HTTP status, error type/code and a bounded error message without exposing the API key. Redeploy that function, retry once, then use the specific provider message to resolve the remaining issue. The microphone dialog may not reappear because browser permission can persist; the request reached the Edge Function. The local function still needs incoming speech transcription configuration. A successful signed-in voice session has not yet been verified; native iOS/Android audio and lecture-file grounding remain to build.
- **Peer messaging and group discussions:** user-facing screens and membership-based RLS migrations are live. Text messaging and group discussions are available. Moderation/reporting and push delivery still need implementation.
- **Photos and videos:** image/video posts use the private `community-media` bucket with friend-scoped read policies and upload limits. Moderation and retention rules still need implementation.
- **Student-to-student voice calls:** LiveKit voice rooms are listed in Explore as a future plan. The owner has created a LiveKit Cloud account but has not created the GrAte Apex project or saved server credentials. A Supabase Edge Function must verify the signed-in user and mint short-lived room tokens. Call invitations and native audio permissions remain to build. This is a separate integration from AI tutor calls.
- **Streak freezes, battles and challenges:** the local migration adds challenge invitations and a read-only freeze balance. Server-validated battle scoring and safe freeze earn/redeem rules still need implementation; no scores or freezes can currently be earned or spent.
- **Cloudflare:** no Cloudflare account or CLI setup is needed for this local UI work. It would only be needed if you choose Cloudflare for production hosting, edge services, or media delivery.

## Beginner setup steps for voice providers

The two voice features need separate services: OpenAI powers a one-to-one AI tutor conversation; LiveKit connects two or more people in a room. The app should never contain the permanent provider secrets.

### AI tutor: OpenAI Realtime

1. Sign in to the OpenAI developer platform and create an API project for GrAte Apex.
2. Create a project API key. Keep it private; do not paste it into the app, a GitHub issue, or this chat.
3. In Supabase, open **Edge Functions → Secrets** for the GrAte Apex project and save the key as `OPENAI_API_KEY`.
4. Tell me when the secret is saved. I can then add the Edge Function that checks the learner's Supabase session and returns a short-lived Realtime credential. The permanent key stays in Supabase.
5. I will connect the tutor UI to that function, add mic permission and the audio session flow, and tune the tutor's teaching instructions. Then we can verify a real voice session together.

OpenAI documents Realtime audio calls and short-lived client credentials in its [Realtime API reference](https://platform.openai.com/docs/api-reference/realtime).

### Peer calls: LiveKit Cloud

1. Create a LiveKit Cloud account and a project for GrAte Apex.
2. Copy the project's server URL, API key and API secret from its project settings.
3. In the same Supabase **Edge Functions → Secrets** page, save them as `LIVEKIT_URL`, `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET`. Do not send the secret to me.
4. Tell me when those secrets are saved. I can add a function that checks the signed-in user and creates a short-lived token scoped to an approved call room.
5. I will add the React Native LiveKit SDK, microphone/camera permissions as needed, invitation/accept/end-call UI, and test with two accounts. Camera can stay off if you only want voice calls.

LiveKit's [React Native quickstart](https://docs.livekit.io/transport/sdk-platforms/react-native/) and [server token guide](https://docs.livekit.io/frontends/build/authentication/endpoint/) explain the app SDK and why room tokens should be created by a server.

Supabase's [Edge Function secrets guide](https://supabase.com/docs/guides/functions/secrets) shows how to save the keys in the Dashboard. The database migrations are now applied; remaining provider setup can happen afterward.

The community migration is now applied to the live Supabase project. The owner reports saving the OpenAI key under the expected `OPENAI_API_KEY` name in Supabase Edge Function Secrets; no provider key is stored in this repository. Cloudflare and LiveKit services are not set up yet. The OpenAI function was deployed by the owner through the Dashboard; this checkout is not authenticated to the Supabase CLI.

## Follow-up feature delivery

- Added the Home Instagram-style feed, post reactions, comments, reshares and private image/video storage, plus 24-hour text Stories.
- Added study groups, group assignment discussions and friend-to-friend text messages. Friend streaks are displayed from real account data.
- Applied `20261005030000_community_posts.sql` to the live Supabase project in one transaction and recorded it in `supabase_migrations.schema_migrations`. Verified the three post tables, private bucket, media policies and migration record in the Dashboard.
- Updated Explore to explain the current experience and accurately separate available features from features that still need a provider or native platform support. Added About, Team and Contact cards using Watermelon UI reusable widget/about/team blocks as design reference.
- Updated the first-run tour to explain Home as the social space, point learners to Learn for lessons and plans, and describe table conferences accurately.
- The current Vercel production deployment is `https://grateapex.vercel.app`. Its deployment protection is still enabled, so visitors may be asked to authenticate.
- Added **Live voice calls** to the Explore guide and **Study with people** feature list as a coming-soon LiveKit plan. This is a roadmap label only; no LiveKit project, credentials, room-token function or call client has been configured. Deployed the site to Vercel production on 5 October 2026; the deployment reached READY and includes the canonical `https://grateapex.vercel.app` alias.
- Preferences for notification categories are stored, but push delivery is not connected. Native desktop/phone widgets, streak restoration rules, and live group audio/video conferences still require additional platform or service integration. Past questions remain marked as coming soon until the question bank is supplied.

## Handoff

Continue on `local/old-site-features`. The community migrations and `ai-tutor-session` function are deployed, and the Learn voice-tutor UI is implemented for web. The owner added `OPENAI_API_KEY`; the latest retry returned HTTP 502. Redeploy `supabase/functions/ai-tutor-session/index.ts` with the safe provider-error reporting update, then retry once and use its specific OpenAI error to proceed. Never expose or paste provider secrets in chat or app code. Follow with incoming speech transcription, a successful signed-in microphone session, native iOS/Android voice support and lecture-file grounding, then build the LiveKit peer-call flow after the owner creates its project and saves server credentials. Vercel deployment protection remains enabled.
