import { useEffect, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';

import { useLearning } from '@/data/learning/use-learning';
import { syncLearningEvents } from '@/data/learning/events';
import { syncLearningProgress } from '@/data/progress';
import { syncQuestionHistory } from '@/data/question-history';
import { projectScheduleToCloud, syncLegacyReviewSchedule } from '@/data/review';
import { syncQuizHistory } from '@/data/quiz-history';
import { useAuth } from '@/hooks/use-auth';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { Radius, Type, type ThemeColors } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Mounted once in the root layout. It retries local-first learning writes
// when connectivity returns, and shows a small notice while offline.
// - Subscribing through useLearning() loads every learning store early,
//   so the first screen the learner opens already has their history.
// - Whenever the memory model changes, the concept schedule is projected
//   to Supabase `review_schedule` (debounced; only changed rows).
export function LearningSync() {
  const { session } = useAuth();
  const { memory, historyReady } = useLearning();
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const styles = useThemedStyles(createStyles);
  const latestLearning = useRef({ memory, historyReady });
  latestLearning.current = { memory, historyReady };
  const [online, setOnline] = useState(() => Platform.OS !== 'web' || typeof navigator === 'undefined' || navigator.onLine);

  useEffect(() => {
    if (!session || !historyReady) return;
    projectScheduleToCloud(memory);
  }, [session, historyReady, memory]);

  useEffect(() => {
    if (!session?.user.id) return;
    let active = true;
    let syncing = false;

    const syncLocalLearning = async () => {
      if (syncing || (Platform.OS === 'web' && typeof navigator !== 'undefined' && !navigator.onLine)) return;
      syncing = true;
      try {
        await Promise.allSettled([
          syncLearningProgress(),
          syncQuestionHistory(),
          syncQuizHistory(),
          syncLearningEvents(),
          syncLegacyReviewSchedule(),
        ]);
        if (active && latestLearning.current.historyReady) projectScheduleToCloud(latestLearning.current.memory, true);
      } finally {
        syncing = false;
      }
    };

    const onOnline = () => {
      setOnline(true);
      void syncLocalLearning();
    };
    const onOffline = () => setOnline(false);
    const onFocus = () => {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined') setOnline(navigator.onLine);
      void syncLocalLearning();
    };
    const onAppState = (state: string) => {
      if (state === 'active') {
        if (Platform.OS === 'web' && typeof navigator !== 'undefined') setOnline(navigator.onLine);
        void syncLocalLearning();
      }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);
      window.addEventListener('focus', onFocus);
    }
    const appStateSubscription = AppState.addEventListener('change', onAppState);
    void syncLocalLearning();

    return () => {
      active = false;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
        window.removeEventListener('focus', onFocus);
      }
      appStateSubscription.remove();
    };
  }, [session?.user.id]);

  if (online || !session) return null;
  return (
    <View pointerEvents="none" style={[styles.offlineNotice, { top: insets.top + 8 }]} accessibilityRole="alert">
      <Text style={[styles.offlineText, { color: colors.warningText }]}>Offline mode · learning progress is saved on this device and will sync when you’re back online.</Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    offlineNotice: {
      position: 'absolute',
      top: 8,
      alignSelf: 'center',
      zIndex: 1000,
      maxWidth: '94%',
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.warningBorder,
      backgroundColor: colors.warningSubtle,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    offlineText: { ...Type.caption, textAlign: 'center' },
  });
}
