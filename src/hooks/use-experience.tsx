import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type ReactNode, useContext, useSyncExternalStore } from 'react';

import { DEFAULT_EXPERIENCE, EXPERIENCES_ENABLED, type ExperienceId, isExperience } from '@/data/experience';

// The experience the interface is drawn in (The Originals, Originate, Hybrid).
//
// The learner's choice lives on the account (users/{uid}.experience);
// <ExperienceSync> in the root layout copies it here once the profile is read.
// A copy is kept on the device so a returning learner sees their experience
// from the first frame instead of a flash of another one.
//
// Until a choice is known (signed out, or not chosen yet) the interface is
// drawn as The Originals, the default experience (owner decision, 2026-10-10).

const DEVICE_KEY = 'grateapex_experience';

let active: ExperienceId | null = null;
let deviceRead = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!deviceRead) {
    deviceRead = true;
    AsyncStorage.getItem(DEVICE_KEY)
      .then((saved) => {
        // The account's value, once read, always wins over the device copy.
        if (active === null && isExperience(saved)) {
          active = saved;
          notify();
        }
      })
      .catch(() => {});
  }
  return () => {
    listeners.delete(listener);
  };
}

/** Called with the account's saved value (or null when signed out / not chosen). */
export function setActiveExperience(value: unknown) {
  const next = isExperience(value) ? value : null;
  deviceRead = true; // a later device read must not override the account
  if (next === active) return;
  active = next;
  notify();
  if (next) AsyncStorage.setItem(DEVICE_KEY, next).catch(() => {});
  else AsyncStorage.removeItem(DEVICE_KEY).catch(() => {});
}

// Previews (the chooser) draw a part of the screen in another experience.
const PreviewContext = createContext<ExperienceId | null>(null);

export function ExperiencePreview({ experience, children }: { experience: ExperienceId; children: ReactNode }) {
  return <PreviewContext.Provider value={experience}>{children}</PreviewContext.Provider>;
}

/** The experience to draw this part of the interface in. */
export function useExperience(): ExperienceId {
  const preview = useContext(PreviewContext);
  const saved = useSyncExternalStore(subscribe, () => active, () => null);
  if (preview) return preview;
  if (!EXPERIENCES_ENABLED) return 'originate';
  return saved ?? DEFAULT_EXPERIENCE;
}

/** True while drawing a preview (previews must not open sheets, navigate, etc.). */
export function useIsExperiencePreview() {
  return useContext(PreviewContext) !== null;
}
