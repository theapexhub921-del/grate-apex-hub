import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getCurrentProfile, updateCurrentProfile } from '@/lib/profiles';

// The student's display name and avatar.
//
// Supabase is the persistent source of truth for authenticated users.
// AsyncStorage ('grateapex_user') is used as a fast local cache for startup
// and offline fallback.

const USER_KEY = 'grateapex_user';

type StoredUser = {
  displayName?: string | null;
  avatarUrl?: string | null;
};

let cachedName: string | null = null;
let cachedAvatar: string | null = null;
let loadPromise: Promise<void> | null = null;
let syncPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

async function getStoredUser(): Promise<StoredUser> {
  try {
    const saved = await AsyncStorage.getItem(USER_KEY);
    return saved ? (JSON.parse(saved) as StoredUser) : {};
  } catch {
    return {};
  }
}

export async function getDisplayName(): Promise<string | null> {
  await ensureLoaded();
  return cachedName;
}

export async function getAvatarUrl(): Promise<string | null> {
  await ensureLoaded();
  return cachedAvatar;
}

/**
 * Synchronizes the local user cache with the authenticated Supabase profile.
 * - If Supabase has a profile with display_name, uses it.
 * - If Supabase has a profile with no display_name yet, but a local display_name
 *   exists, migrates that local display_name to Supabase.
 * - Preserves local cache if unauthenticated, offline, or on request failure.
 */
export async function syncProfileWithSupabase(): Promise<void> {
  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    try {
      const { data: profile, error } = await getCurrentProfile();
      if (error || !profile) {
        // Unauthenticated or profile row doesn't exist yet; retain local cache.
        return;
      }

      let resolvedName = profile.display_name?.trim() || null;
      const resolvedAvatar = profile.avatar_url?.trim() || null;

      // Safe migration: user has a local name, but Supabase profile has no name yet.
      if (!resolvedName && cachedName) {
        resolvedName = cachedName;
        void updateCurrentProfile({ display_name: resolvedName });
      }

      cachedName = resolvedName;
      cachedAvatar = resolvedAvatar;
      notify();

      await AsyncStorage.setItem(
        USER_KEY,
        JSON.stringify({
          displayName: cachedName,
          avatarUrl: cachedAvatar,
        })
      );
    } catch (err) {
      // Keep local state on network/backend failure
      console.warn('Failed to sync user profile with Supabase:', err);
    } finally {
      syncPromise = null;
    }
  })();

  return syncPromise;
}

function ensureLoaded() {
  if (!loadPromise) {
    loadPromise = (async () => {
      // 1. Fast initial load from local storage
      const stored = await getStoredUser();
      cachedName = stored.displayName?.trim() || null;
      cachedAvatar = stored.avatarUrl?.trim() || null;
      notify();

      // 2. Synchronize with Supabase as persistent source of truth
      await syncProfileWithSupabase();
    })();
  }
  return loadPromise;
}

// React to authentication changes (login, logout) in browser environments.
if (typeof window !== 'undefined') {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      void syncProfileWithSupabase();
    } else {
      cachedName = null;
      cachedAvatar = null;
      notify();
      void AsyncStorage.removeItem(USER_KEY);
    }
  });
}

export async function setDisplayName(name: string) {
  const trimmed = name.trim();
  cachedName = trimmed ? trimmed : null;
  notify();

  // 1. Update local cache immediately
  await AsyncStorage.setItem(
    USER_KEY,
    JSON.stringify({
      displayName: cachedName,
      avatarUrl: cachedAvatar,
    })
  );

  // 2. Persist to Supabase if authenticated
  try {
    const { error } = await updateCurrentProfile({
      display_name: cachedName,
    });
    if (error) {
      console.warn('Could not persist display name to Supabase:', error.message);
    }
  } catch (err) {
    console.warn('Network error saving display name to Supabase:', err);
  }
}

export async function setAvatarUrl(url: string | null) {
  const trimmed = url?.trim();
  cachedAvatar = trimmed ? trimmed : null;
  notify();

  // 1. Update local cache immediately
  await AsyncStorage.setItem(
    USER_KEY,
    JSON.stringify({
      displayName: cachedName,
      avatarUrl: cachedAvatar,
    })
  );

  // 2. Persist to Supabase if authenticated
  try {
    const { error } = await updateCurrentProfile({
      avatar_url: cachedAvatar,
    });
    if (error) {
      console.warn('Could not persist avatar URL to Supabase:', error.message);
    }
  } catch (err) {
    console.warn('Network error saving avatar URL to Supabase:', err);
  }
}

// Returns the display name, reactive across every screen using it.
export function useDisplayName() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      void ensureLoaded();
      return () => listeners.delete(listener);
    },
    () => cachedName,
    () => null
  );
}

// Returns the avatar URL, reactive across every screen using it.
export function useAvatarUrl() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      void ensureLoaded();
      return () => listeners.delete(listener);
    },
    () => cachedAvatar,
    () => null
  );
}
