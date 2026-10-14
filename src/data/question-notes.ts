import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { useEffect, useSyncExternalStore } from 'react';

import { auth, db } from '@/lib/firebase';

// Personal notes on questions (a mnemonic, why you got it wrong). One document each,
// progress/{uid}/notes/{questionId}, owner only (firestore.rules).

export const MAX_NOTE_LENGTH = 1000;

const EMPTY: ReadonlyMap<string, string> = new Map();
let current: Map<string, string> = new Map();
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
function noteRef(uid: string, questionId: string) {
  return doc(db, 'progress', uid, 'notes', encodeURIComponent(questionId));
}

async function load() {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    current = new Map();
    loadedFor = null;
    emit();
    return;
  }
  if (loadedFor === uid) return;
  const snap = await getDocs(collection(db, 'progress', uid, 'notes'));
  current = new Map(
    snap.docs.map((item) => [String(item.data().questionId ?? decodeURIComponent(item.id)), String(item.data().text ?? '')])
  );
  loadedFor = uid;
  emit();
}

export function ensureNotesLoaded(): Promise<void> {
  if (!loading) loading = load().catch(() => undefined).finally(() => { loading = null; });
  return loading;
}

/** Every note this learner has written, by question id. Re-renders when one changes. */
export function useQuestionNotes(): ReadonlyMap<string, string> {
  const notes = useSyncExternalStore(subscribe, () => current, () => EMPTY);
  useEffect(() => { void ensureNotesLoaded(); }, []);
  return notes;
}

/** Saves a note (an empty note removes it). Shows the change at once; undoes it if the cloud refuses. */
export async function saveQuestionNote(questionId: string, text: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sign in to save notes.');
  const clean = text.trim().slice(0, MAX_NOTE_LENGTH);
  const before = current.get(questionId);
  const next = new Map(current);
  if (clean) next.set(questionId, clean);
  else next.delete(questionId);
  current = next;
  emit();
  try {
    if (clean) await setDoc(noteRef(uid, questionId), { questionId: questionId.slice(0, 200), text: clean, updatedAt: serverTimestamp() });
    else await deleteDoc(noteRef(uid, questionId));
  } catch (problem) {
    const reverted = new Map(current);
    if (before) reverted.set(questionId, before);
    else reverted.delete(questionId);
    current = reverted;
    emit();
    throw problem;
  }
}
