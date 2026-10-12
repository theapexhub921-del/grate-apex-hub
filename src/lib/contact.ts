import { Linking, Platform } from 'react-native';

import { EXPLORE_CONTACT } from '@/data/explore';

// "Contact us": opens the learner's email app with the team's address.
//
// On the web, react-native-web opens links with window.open(url, '_blank'),
// which for a mailto: link often shows a blank tab or nothing at all
// (installed web app, or no default mail app). Navigating the page itself is
// the reliable way to hand a mailto: link to the browser. Nothing is sent by
// the app — the address is also shown on screen so it can always be copied.

export const CONTACT_EMAIL = EXPLORE_CONTACT.email;

export const CONTACT_MAILTO = `mailto:${EXPLORE_CONTACT.email}?subject=${encodeURIComponent(EXPLORE_CONTACT.subject)}`;

/** Opens the email app. Resolves false when no email app could be opened. */
export async function openContactEmail(): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return false;
    window.location.href = CONTACT_MAILTO;
    return true;
  }
  try {
    await Linking.openURL(CONTACT_MAILTO);
    return true;
  } catch {
    return false;
  }
}
