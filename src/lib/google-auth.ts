import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

import { auth } from '@/lib/firebase';

export type GoogleResult =
  | { status: 'redirecting' }
  | { status: 'signed-in' }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

const PENDING_KEY = 'grateapex_oauth_pending';

export function markOAuthPending() {
  try {
    if (typeof window !== 'undefined') window.sessionStorage.setItem(PENDING_KEY, String(Date.now()));
  } catch {}
}

export function takeOAuthPending(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const value = window.sessionStorage.getItem(PENDING_KEY);
    window.sessionStorage.removeItem(PENDING_KEY);
    return Boolean(value) && Date.now() - Number(value) < 30 * 60 * 1000;
  } catch {
    return false;
  }
}

export function friendlyGoogleError(message: string | null | undefined) {
  const text = (message ?? '').toLowerCase();
  if (text.includes('popup-closed') || text.includes('cancelled') || text.includes('user cancelled')) {
    return 'Google sign-in was cancelled.';
  }
  if (text.includes('unauthorized') || text.includes('not enabled')) {
    return 'Google sign-in isn’t enabled in Firebase yet. Please use your email and password for now.';
  }
  return message || 'Google sign-in didn’t complete. Please try again, or use your email and password.';
}

export async function signInWithGoogle(): Promise<GoogleResult> {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    // No profile is created here: a first Google sign-in has no username yet,
    // so the route guard sends the learner to /choose-username, which reserves
    // one and creates the profile (lib/accounts.ts).
    await signInWithPopup(auth, provider);

    return { status: 'signed-in' };
  } catch (error: any) {
    if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
      return { status: 'cancelled' };
    }
    return { status: 'error', message: friendlyGoogleError(error?.message) };
  }
}
