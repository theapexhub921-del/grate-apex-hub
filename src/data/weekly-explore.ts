import { useEffect, useState } from 'react';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';

import type { ExploreItem } from '@/data/explore';
import { db } from '@/lib/firebase';

export type WeeklyExploreSession = {
  week_start: string;
  title: string;
  summary: string;
  items: ExploreItem[];
};

function mondayKey(date: Date) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}

export async function loadWeeklyExploreSession(now = new Date()): Promise<WeeklyExploreSession | null> {
  try {
    const weekStart = mondayKey(now);
    const q = query(
      collection(db, 'explore_weekly_sessions'),
      where('status', '==', 'published'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const docData = snap.docs[0].data();
    return docData as unknown as WeeklyExploreSession;
  } catch {
    return null;
  }
}

export function useWeeklyExploreSession() {
  const [session, setSession] = useState<WeeklyExploreSession | null>(null);
  useEffect(() => {
    let active = true;
    void loadWeeklyExploreSession().then((result) => {
      if (active) setSession(result);
    });
    return () => {
      active = false;
    };
  }, []);
  return session;
}
