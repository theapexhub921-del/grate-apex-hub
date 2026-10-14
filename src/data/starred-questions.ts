import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { useEffect, useSyncExternalStore } from 'react';

import { auth, db } from '@/lib/firebase';

// Starred questions: questions a learner saved to practise again. One document each,
// progress/{uid}/starred/{questionId}, owner only (firestore.rules).

const EMPTY: ReadonlySet<string> = new Set();
let current: Set<string> = new Set();
let loadedFor: string | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

// Firestore ids cannot contain "/", so the question id is encoded.
function starRef(uid: string, questionId: string) {
  return doc(db, 'progress', uid, 'starred', encodeURIComponent(questionId));
}

async function load() {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    current = new Set();
    loadedFor = null;
    emit();
    return;
  }
  if (loadedFor === uid) return;
  const snap = await getDocs(collection(db, 'progress', uid, 'starred'));
  current = new Set(snap.docs.map((item) => String(item.data().questionId ?? decodeURIComponent(item.id))));
  loadedFor = uid;
  emit();
}

export function ensureStarredLoaded(): Promise<void> {
  if (!loading) loading = load().catch(() => undefined).finally(() => { loading = null; });
  return loading;
}

/** The ids of the questions this learner has starred. Re-renders when a star changes. */
export function useStarredIds(): ReadonlySet<string> {
  const ids = useSyncExternalStore(subscribe, () => current, () => EMPTY);
  useEffect(() => { void ensureStarredLoaded(); }, []);
  return ids;
}

/** Stars or un-stars a question. Shows the change at once; undoes it if the cloud refuses. */
export async function toggleStar(questionId: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sign in to star questions.');
  const was = current.has(questionId);
  const next = new Set(current);
  if (was) next.delete(questionId);
  else next.add(questionId);
  current = next;
  emit();
  try {
    if (was) await deleteDoc(starRef(uid, questionId));
    else await setDoc(starRef(uid, questionId), { questionId: questionId.slice(0, 200), starredAt: serverTimestamp() });
  } catch (problem) {
    const reverted = new Set(current);
    if (was) reverted.add(questionId);
    else reverted.delete(questionId);
    current = reverted;
    emit();
    throw problem;
  }
}
