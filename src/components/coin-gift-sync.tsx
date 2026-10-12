import { useEffect } from 'react';

import { claimIncomingCoins } from '@/data/apex-coins';
import { useAuth } from '@/hooks/use-auth';

// Collects Apex Coin gifts from friends into the signed-in learner's balance:
// on sign-in and then every few minutes (data/apex-coins.ts → claimIncomingCoins).
const EVERY_MS = 5 * 60_000;

export function CoinGiftSync() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  useEffect(() => {
    if (!uid) return;
    void claimIncomingCoins();
    const timer = setInterval(() => void claimIncomingCoins(), EVERY_MS);
    return () => clearInterval(timer);
  }, [uid]);
  return null;
}
