import { doc, getDoc } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';

import { useAchievementStore, useAchievements } from '@/data/achievements-store';
import { ACHIEVEMENTS } from '@/data/achievements';
import { DEFAULT_LEGACY_THEME, legacyThemeById } from '@/data/legacy-theme-colors';
import { useProgress, waitForProgressSync } from '@/data/progress';
import { chooseLegacyTheme, setLegacyThemePreference, useAppearancePreference, useLegacyThemePreference } from '@/data/settings';
import { THEME_CATALOG, themeLock, type ThemeEntry, type ThemeLock } from '@/data/theme-catalog';
import { useAuth } from '@/hooks/use-auth';
import { setActiveExperience } from '@/hooks/use-experience';
import { useThemeFamily } from '@/hooks/use-theme';
import { db } from '@/lib/firebase';

// Copies the account's experience choice to the interface, and keeps the
// original theme within the original app's rules.

/** Is the signed-in learner an admin? Same check as the original app: admins/{uid} exists (readable only by its owner). */
export function useIsAdmin() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [state, setState] = useState<{ uid: string | null; admin: boolean; checked: boolean }>({ uid: null, admin: false, checked: false });

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    getDoc(doc(db, 'admins', uid))
      .then((snap) => {
        if (!cancelled) setState({ uid, admin: snap.exists(), checked: true });
      })
      .catch(() => {
        if (!cancelled) setState({ uid, admin: false, checked: true });
      });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const current = state.uid === uid;
  return { isAdmin: current && state.admin, checked: current && state.checked };
}

export function ExperienceSync() {
  const { user, loading } = useAuth();
  const profileLoaded = user?.profileLoaded ?? false;
  const saved = user?.profile?.experience;
  const legacyTheme = useLegacyThemePreference();
  const { isAdmin, checked } = useIsAdmin();

  useEffect(() => {
    if (loading) return;
    if (!user) setActiveExperience(null); // signed out: the shared sign-in look
    else if (profileLoaded) setActiveExperience(saved);
  }, [loading, user, profileLoaded, saved]);

  // As in the original app: an admin-only theme is reset to Dark for anyone who isn't an admin.
  useEffect(() => {
    if (checked && !isAdmin && legacyThemeById(legacyTheme).adminOnly) void setLegacyThemePreference('dark');
  }, [checked, isAdmin, legacyTheme]);

  // Locked themes (owner rule): only Apex Legacy, System, Dark and Light are free.
  // Once this learner's XP has loaded from the account, a theme their level has
  // not unlocked falls back to Apex Legacy. Learners with enough XP keep theirs.
  const uid = user?.uid ?? null;
  const [xpReadyFor, setXpReadyFor] = useState<string | null>(null);
  useEffect(() => {
    if (!uid) return;
    let live = true;
    void waitForProgressSync().then(() => {
      if (live) setXpReadyFor(uid);
    });
    return () => {
      live = false;
    };
  }, [uid]);
  const family = useThemeFamily();
  const appearance = useAppearancePreference();
  const lockOf = useThemeLocks();
  const { ready: achievementsReady } = useAchievements();
  useEffect(() => {
    if (!uid || xpReadyFor !== uid) return;
    const entry = THEME_CATALOG.find((item) => item.family === family && item.id === (family === 'newer' ? appearance : legacyTheme));
    if (!entry) return;
    const lock = lockOf(entry);
    if (lock.unlocked) return;
    if (lock.kind === 'achievement' && !achievementsReady) return; // not known yet
    if (lock.kind === 'admin' && !checked) return;
    void chooseLegacyTheme(DEFAULT_LEGACY_THEME);
  }, [uid, xpReadyFor, family, appearance, legacyTheme, lockOf, achievementsReady, checked]);

  return null;
}

/** Which Appearance themes are open to the signed-in learner (data/theme-catalog.ts). */
export function useThemeLocks() {
  const progress = useProgress();
  const { states } = useAchievements();
  const { recorded } = useAchievementStore();
  const { isAdmin } = useIsAdmin();
  return useCallback(
    (entry: ThemeEntry): ThemeLock => {
      const levels: Record<string, number> = { ...recorded };
      for (const state of states) levels[state.def.id] = Math.max(levels[state.def.id] ?? 0, state.level);
      return themeLock(entry, {
        xp: progress.xp,
        achievementLevels: levels,
        isAdmin,
        achievement: (id) => {
          const found = ACHIEVEMENTS.find((item) => item.id === id);
          return found ? { name: found.name, desc: found.goal(found.levels[0]) } : undefined;
        },
      });
    },
    [progress.xp, states, recorded, isAdmin]
  );
}
