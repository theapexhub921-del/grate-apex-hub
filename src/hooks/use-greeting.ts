import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { AppState } from 'react-native';

// Uses the device's local time.
export function getGreeting(date: Date) {
  const hour = date.getHours();

  if (hour >= 5 && hour < 12) {
    return 'Good Morning';
  }

  if (hour >= 12 && hour < 17) {
    return 'Good Afternoon';
  }

  return 'Good Evening';
}

// Milliseconds until the next greeting change (05:00, 12:00 or 17:00).
function msUntilNextPeriod(now: Date) {
  const boundaries = [5, 12, 17];
  const next = new Date(now);

  const nextHour = boundaries.find((hour) => hour > now.getHours());

  if (nextHour === undefined) {
    next.setDate(next.getDate() + 1);
    next.setHours(boundaries[0], 0, 0, 0);
  } else {
    next.setHours(nextHour, 0, 0, 0);
  }

  return next.getTime() - now.getTime();
}

// Greeting that stays correct while the screen is open:
// - recalculated when the screen gains focus
// - recalculated when the app returns from the background
// - one timer that fires only at the next period change (no polling)
// Also returns the time it was calculated, for other time-based text.
export function useGreeting() {
  const [now, setNow] = useState(() => new Date());

  useFocusEffect(
    useCallback(() => {
      let timer: ReturnType<typeof setTimeout> | undefined;

      function refresh() {
        const current = new Date();
        setNow(current);

        if (timer) {
          clearTimeout(timer);
        }
        timer = setTimeout(refresh, msUntilNextPeriod(current) + 1000);
      }

      refresh();

      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') {
          refresh();
        }
      });

      return () => {
        if (timer) {
          clearTimeout(timer);
        }
        subscription.remove();
      };
    }, [])
  );

  return { greeting: getGreeting(now), now };
}
