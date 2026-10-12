import { Platform } from 'react-native';

// Features being ported from the older "Grate Apex Hub" site are shown ONLY
// when the app runs locally (localhost on the web, or a development build on
// a phone). On grateapex.vercel.app they stay hidden even if deployed.
export function isLocalPreview() {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return false;
    return ['localhost', '127.0.0.1'].includes(window.location.hostname);
  }
  return typeof __DEV__ !== 'undefined' && __DEV__;
}
