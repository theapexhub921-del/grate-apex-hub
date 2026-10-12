import { collection, doc, getDoc, getDocs, limit, query, runTransaction, serverTimestamp, updateDoc, where } from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';
import { dayKey } from '@/data/learning/time';

export type ApexCoinReward = 'apex_challenge' | 'topic_completion';
export type StreakRecoveryOffer = { id: string; lost_streak: number; lost_on: string };

export async function readApexCoinBalance(): Promise<number> {
  const user = auth.currentUser;
  if (!user) return 0;
  try {
    const snap = await getDoc(doc(db, 'users', user.uid));
    return Number(snap.data()?.coins ?? snap.data()?.apexCoins ?? 0);
  } catch {
    return 0;
  }
}

/** Largest single gift (the rules allow up to 1,000). */
export const MAX_COIN_GIFT = 1000;

/**
 * Gives Apex Coins to a friend (coins only — XP is never transferable).
 * One transaction takes the coins from the sender and records the gift in
 * coinTransfers; the friend's app adds them to their balance when it next
 * runs (claimIncomingCoins). If the gift can't be recorded, nothing is taken.
 */
export async function sendApexCoins(recipientId: string, amount: number): Promise<number> {
  if (!recipientId) throw new Error('Choose a friend first.');
  if (!Number.isSafeInteger(amount) || amount < 1) throw new Error('Enter a whole number greater than zero.');
  if (amount > MAX_COIN_GIFT) throw new Error(`You can send up to ${MAX_COIN_GIFT.toLocaleString()} coins at a time.`);
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in to send coins.');
  if (recipientId === user.uid) throw new Error('Choose a friend, not yourself.');

  const userRef = doc(db, 'users', user.uid);
  const giftRef = doc(collection(db, 'coinTransfers'));
  try {
    return await runTransaction(db, async (tx) => {
      const snap = await tx.get(userRef);
      const current = Number(snap.data()?.coins ?? 0);
      if (current < amount) throw new Error('Insufficient coins.');
      tx.update(userRef, { coins: current - amount });
      tx.set(giftRef, { from: user.uid, to: recipientId, amount, status: 'pending', createdAt: serverTimestamp() });
      return current - amount;
    });
  } catch (error) {
    if ((error as { code?: string })?.code === 'permission-denied') {
      throw new Error('Coin gifts are not switched on yet. Your coins were not taken.');
    }
    throw error;
  }
}

/**
 * Adds every waiting gift for the signed-in learner to their balance, each in
 * one transaction (the gift is marked claimed in the same step, so it can
 * never be counted twice). Returns the coins received.
 */
export async function claimIncomingCoins(): Promise<number> {
  const user = auth.currentUser;
  if (!user) return 0;
  let received = 0;
  try {
    const waiting = await getDocs(query(collection(db, 'coinTransfers'), where('to', '==', user.uid), where('status', '==', 'pending'), limit(25)));
    const userRef = doc(db, 'users', user.uid);
    for (const gift of waiting.docs) {
      received += await runTransaction(db, async (tx) => {
        const giftSnap = await tx.get(gift.ref);
        const userSnap = await tx.get(userRef);
        const data = giftSnap.data();
        if (!data || data.status !== 'pending' || data.to !== user.uid) return 0;
        const amount = Number(data.amount);
        tx.update(userRef, { coins: Number(userSnap.data()?.coins ?? 0) + amount });
        tx.update(gift.ref, { status: 'claimed', claimedAt: serverTimestamp() });
        return amount;
      });
    }
  } catch {
    // Not switched on yet, or offline: gifts stay waiting and are claimed later.
  }
  return received;
}

export async function awardApexCoins(reward: ApexCoinReward, sourceId: string): Promise<number> {
  const user = auth.currentUser;
  if (!user) return 0;
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
  const current = Number(snap.data()?.coins ?? 0);
  const added = reward === 'apex_challenge' ? 10 : 5;
  await updateDoc(userRef, { coins: current + added });
  return current + added;
}

export async function buyStreakRecoveryWithCoins(at = Date.now()) {
  const user = auth.currentUser;
  if (!user) return { balance: 0, streak: 0 };
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
  const current = Number(snap.data()?.coins ?? 0);
  const price = 20;
  if (current < price) throw new Error('You need 20 coins to recover your streak.');

  await updateDoc(userRef, { coins: current - price });
  return { balance: current - price, streak: 1 };
}

export async function readStreakRecoveryOffer(): Promise<StreakRecoveryOffer | null> {
  return null;
}
