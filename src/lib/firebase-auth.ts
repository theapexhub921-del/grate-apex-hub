import type { FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Web: Firebase keeps the sign-in in the browser's storage (IndexedDB, then
// localStorage), so an installed app stays signed in between launches.
export const createAuth = (app: FirebaseApp) => getAuth(app);
