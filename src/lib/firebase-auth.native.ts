import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FirebaseApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';

// Phones (iOS / Android): without this, Firebase keeps the sign-in only in
// memory, so every time the app is reopened the learner lands on the sign-in
// screen. The sign-in is saved with AsyncStorage instead.
type Persistence = Parameters<typeof FirebaseAuth.initializeAuth>[1] extends { persistence?: infer P } | undefined ? P : never;
const getReactNativePersistence = (FirebaseAuth as unknown as { getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence }).getReactNativePersistence;

export function createAuth(app: FirebaseApp) {
  try {
    return FirebaseAuth.initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    // Already set up (fast refresh): use the existing instance.
    return FirebaseAuth.getAuth(app);
  }
}
