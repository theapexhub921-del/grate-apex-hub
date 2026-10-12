import { useLocalSearchParams } from 'expo-router';

import { OnboardingTour } from '@/components/onboarding/onboarding-tour';
import { param } from '@/lib/routes';

// /onboarding[?replay=1] — the first-run introduction.
// New accounts are sent here once after signing in (app/_layout.tsx).
// Settings → "Replay the introduction" opens it with replay=1.
export default function OnboardingScreen() {
  const { replay } = useLocalSearchParams<{ replay?: string | string[] }>();
  return <OnboardingTour replay={param(replay) === '1'} />;
}
