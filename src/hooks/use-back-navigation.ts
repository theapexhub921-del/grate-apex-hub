import { Href, router, useNavigation } from 'expo-router';
import { CommonActions } from 'expo-router/react-navigation';

import { findLesson } from '@/data/curriculum';
import { routes } from '@/lib/routes';

type TabRoute = {
  key: string;
  name: string;
  params?: Record<string, unknown>;
};

type TabState = {
  key: string;
  index: number;
  routes: TabRoute[];
  history?: { type: string; key: string }[];
};

// Topic page for a topic id (kept under the old name for callers).
export function courseHref(topicId: string): Href {
  return routes.topic(topicId);
}

// Topic page for a lesson; falls back to Learn when the lesson is unknown.
export function courseHrefForLesson(lessonId: string | undefined): Href {
  const found = findLesson(lessonId);
  return found ? routes.topic(found.topic.id) : routes.learn();
}

// Splits "/learn/lesson?lesson=x" into its route name and params.
function parseHref(href: string) {
  const [path, query = ''] = href.split('?');
  const params: Record<string, string> = {};

  for (const pair of query.split('&')) {
    if (!pair) continue;
    const [key, value = ''] = pair.split('=');
    params[decodeURIComponent(key)] = decodeURIComponent(value);
  }

  return { name: path.split('/').pop() ?? '', params };
}

// Route names differ slightly between web ("lesson") and
// Android ("learn/lesson"), so compare only the last part.
function routeMatches(route: TabRoute, target: { name: string; params: Record<string, string> }) {
  if (route.name.split('/').pop() !== target.name) {
    return false;
  }

  return Object.entries(target.params).every(([key, value]) => String(route.params?.[key] ?? '') === value);
}

export function useBackNavigation() {
  const navigation = useNavigation();

  // Generic "← Back": the page the learner came from.
  // If the page was opened directly (no history), go to a sensible parent.
  function goBack(fallback: Href) {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallback);
    }
  }

  // Named "Back to …" buttons: if that exact page is earlier in the
  // history, return to it and drop the pages after it (like a stack).
  // Otherwise simply open it.
  function returnTo(href: string) {
    const state = navigation.getState() as TabState | undefined;
    const target = parseHref(href);

    const targetIndex = state ? state.routes.findIndex((route) => routeMatches(route, target)) : -1;
    const targetKey = state && targetIndex >= 0 ? state.routes[targetIndex].key : undefined;
    const history = state?.history ?? [];
    const historyIndex = history.findIndex((item) => item.key === targetKey);

    if (!state || targetKey === undefined || historyIndex === -1) {
      router.navigate(href as Href);
      return;
    }

    navigation.dispatch({
      ...CommonActions.reset({
        ...state,
        index: targetIndex,
        history: history.slice(0, historyIndex + 1),
      } as Parameters<typeof CommonActions.reset>[0]),
      target: state.key,
    });
  }

  return { goBack, returnTo };
}
