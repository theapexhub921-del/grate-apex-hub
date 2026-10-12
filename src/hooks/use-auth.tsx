import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';

export interface AuthUser {
  id: string; // for compatibility with code referencing user.id
  uid: string; // Firebase uid
  email: string | null;
  displayName: string | null;
  created_at?: string;
  user_metadata?: Record<string, any>;
  profile?: Record<string, any>;
  /** True once users/{uid} was read (it may not exist yet); false when it could not be read. */
  profileLoaded: boolean;
}

export interface AuthSession {
  user: AuthUser;
}

export interface AuthState {
  session: AuthSession | null;
  user: AuthUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubSnapshot: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (unsubSnapshot) {
        unsubSnapshot();
        unsubSnapshot = null;
      }

      if (!firebaseUser) {
        setSession(null);
        setLoading(false);
        return;
      }

      // Read live Firestore profile
      const userRef = doc(db, 'users', firebaseUser.uid);
      unsubSnapshot = onSnapshot(
        userRef,
        (snap) => {
          const profile = snap.data() || {};
          const authUser: AuthUser = {
            id: firebaseUser.uid,
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: profile.displayName || profile.username || firebaseUser.displayName || null,
            created_at: firebaseUser.metadata.creationTime,
            user_metadata: {
              ...profile,
              onboarding_completed: profile.onboardingDone === true,
              full_name: profile.displayName || profile.username || firebaseUser.displayName || '',
            },
            profile,
            profileLoaded: true,
          };
          setSession({ user: authUser });
          setLoading(false);
        },
        () => {
          // If Firestore is offline or document not yet created, still create basic auth state
          const authUser: AuthUser = {
            id: firebaseUser.uid,
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            created_at: firebaseUser.metadata.creationTime,
            user_metadata: {},
            profile: {},
            profileLoaded: false,
          };
          setSession({ user: authUser });
          setLoading(false);
        }
      );
    });

    return () => {
      if (unsubSnapshot) unsubSnapshot();
      unsubAuth();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
    }),
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
