# Owner requests still to do (saved 2026-10-12)

Continue these in order; deploy (Vercel production + GitHub master, merge/legacy-integration, share branch) after each one.

1. **Profile "About"** — learners write a short about line (e.g. "just a chill guy") on their profile; others see it on the profile card and profile page. `users/{uid}.bio` (≤160 chars, already allowed by the rules) is read by `getPublicProfile`; add the editor (You page / Settings).
2. **Follow requests like Instagram/Snapchat** — a notification for every new follower / follow request with a **Follow back / Accept** button in the bell and on Connect.
3. **Past question bank from content/HB1 first semester** — the bank page `/learn/past-questions` lists the original past papers; add new papers transcribed from `content/HB1 first semester/*/Questions` (only questions whose answers are given in the source).
4. **Lessons from content/** — the rest of HB2 Biochemistry (amino acid metabolism, fatty acid metabolism, free radicals, immunology, nucleic acids, endocrine), HB2 Physiology (cardiovascular, CNS, endocrinology, GI, renal, reproductive, respiratory, special senses), then HB1 Semester 1 courses. One topic at a time, deploy each.
5. **Images in lessons** — add images from the lecture slides (or freely licensed ones from the web, with credit) that match the concepts.
6. Check the Study page sections on phones and the "Your progress" row heights.

Owner-dependent (unchanged): paste `docs/firestore-rules-to-paste.txt` in the Firebase console; read-only admin key for the legacy progress repair (`docs/legacy-progress-repair-plan.md`); account deletion and voice calls on hold.
