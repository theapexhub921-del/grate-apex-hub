import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import { getCompliment } from '@/data/compliments';
import { getLearningRemark } from '@/data/remarks';

// Learning remarks and pace compliments rotate with persistent usage
// tracking, so the same remark does not repeat when alternatives exist.
// Each is chosen once per results view (keyed by `viewKey`).

const REMARK_USAGE_KEY = '@grateapex_remark_usage';
const COMPLIMENT_USAGE_KEY = '@grateapex_compliment_usage';

async function readUsage(key: string): Promise<Record<string, number>> {
  try {
    const stored = await AsyncStorage.getItem(key);
    const parsed = stored ? JSON.parse(stored) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function useRotatingRemark(viewKey: string, percentage: number, weakConceptCount: number) {
  const [remark, setRemark] = useState('');
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const usage = await readUsage(REMARK_USAGE_KEY);
      const selected = getLearningRemark(percentage, weakConceptCount, usage);
      try {
        await AsyncStorage.setItem(
          REMARK_USAGE_KEY,
          JSON.stringify({ ...usage, [selected.id]: (usage[selected.id] || 0) + 1 })
        );
      } catch (error) {
        console.log('Remark rotation error:', error);
      }
      if (!cancelled) setRemark(selected.message);
    })();
    return () => {
      cancelled = true;
    };
    // Chosen once per results view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewKey]);
  return remark;
}

export function useRotatingCompliment(viewKey: string, topic: string, percentage: number, seconds: number | null) {
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (seconds === null) return;
    let cancelled = false;
    void (async () => {
      const usage = await readUsage(COMPLIMENT_USAGE_KEY);
      const selected = getCompliment(topic, percentage, seconds, usage);
      try {
        await AsyncStorage.setItem(
          COMPLIMENT_USAGE_KEY,
          JSON.stringify({ ...usage, [selected.id]: (usage[selected.id] || 0) + 1 })
        );
      } catch (error) {
        console.log('Compliment rotation error:', error);
      }
      if (!cancelled) setMessage(selected.message);
    })();
    return () => {
      cancelled = true;
    };
    // Chosen once per results view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewKey]);
  // No trustworthy time: don't claim a speed.
  if (seconds === null) return `You completed this on ${topic}. Keep practising to build on what you know.`;
  return message;
}
