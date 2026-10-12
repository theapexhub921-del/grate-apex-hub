/**
 * Web page titles, driven by the current route.
 *
 * GrAte Apex Hub stays the product identity: the tab always starts with
 * "GrAte Apex Hub", with the section appended ("GrAte Apex Hub — Learn").
 *
 * Two mechanisms are used together on purpose:
 *  - `Head` (expo-router/head, react-helmet-async) is the official Expo Web
 *    mechanism. It renders the title into the static HTML at export time so
 *    the very first paint is already correct.
 *  - A `document.title` assignment keeps the title correct on client-side
 *    navigation, because Expo Router emits its own empty <title> element
 *    first and browsers only ever read the first one.
 */
import { useEffect } from 'react';
import Head from 'expo-router/head';
import { usePathname } from 'expo-router';

export const APP_NAME = 'GrAte Apex Hub';

// Route segment → human section name. Order matters: the first match wins.
const SECTION_LABELS: [string, string][] = [
  ['/learn/results', 'Results'],
  ['/learn/review', 'Review'],
  ['/learn/apex', 'Apex Challenge'],
  ['/learn/flashcards', 'Flashcards'],
  ['/learn/topic', 'Topic'],
  ['/learn/quiz', 'Quiz'],
  ['/learn/lesson', 'Lesson'],
  ['/learn/course', 'Course'],
  ['/learn/fatty-acid-biosynthesis', 'Topic'],
  ['/learn', 'Study'],
  ['/explore/discovery', 'Discovery'],
  ['/explore', 'Explore'],
  ['/social/friends', 'Friends'],
  ['/social', 'Connect'],
  ['/progress', 'Progress'],
  ['/settings', 'Settings'],
  ['/profile', 'You'],
  ['/login', 'Sign in'],
];

/** "GrAte Apex Hub — Study" for a pathname, or just "GrAte Apex Hub" for Feed. */
export function titleForPath(pathname: string | null): string {
  if (!pathname || pathname === '/') {
    return APP_NAME;
  }

  for (const [prefix, label] of SECTION_LABELS) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      // /login stays a bare product title — a marketing page, not a section.
      return label === 'Sign in' ? APP_NAME : `${APP_NAME} — ${label}`;
    }
  }

  return APP_NAME;
}

/**
 * Mounted once inside the navigator. Keeps document.title correct across
 * navigation, refresh and direct URL entry.
 */
export function PageTitle() {
  const pathname = usePathname();
  const title = titleForPath(pathname ?? null);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = title;
  }, [title]);

  return (
    <Head>
      <title>{title}</title>
    </Head>
  );
}
