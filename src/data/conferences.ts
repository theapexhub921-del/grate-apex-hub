import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';

export type TableConference = {
  id: string;
  host_id: string;
  group_id: string | null;
  name: string;
  topic: string;
  starts_at: string;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  created_at: string;
};

export type ConferenceMessage = {
  id: string;
  conference_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

async function getUserId(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in to use Table Conferences.');
  return user.uid;
}

export async function listConferences(): Promise<TableConference[]> {
  try {
    const q = query(
      collection(db, 'calls'),
      where('status', '!=', 'cancelled'),
      orderBy('starts_at', 'asc'),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TableConference);
  } catch {
    return [];
  }
}

export async function createConference(
  input: Pick<TableConference, 'name' | 'topic' | 'starts_at' | 'group_id'>,
  inviteeIds: string[]
): Promise<TableConference> {
  const hostId = await getUserId();
  const id = `conf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const confData: TableConference = {
    id,
    ...input,
    host_id: hostId,
    status: 'scheduled',
    created_at: new Date().toISOString(),
  };

  await setDoc(doc(db, 'calls', id), {
    ...confData,
    inviteeIds,
    createdAt: serverTimestamp(),
  });

  return confData;
}

export async function joinConference(conferenceId: string) {
  const userId = await getUserId();
  await setDoc(
    doc(db, 'calls', conferenceId, 'participants', userId),
    { status: 'joined', joinedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function leaveConference(conferenceId: string) {
  const userId = await getUserId();
  await setDoc(
    doc(db, 'calls', conferenceId, 'participants', userId),
    { status: 'left' },
    { merge: true }
  );
}

export async function listConferenceMessages(conferenceId: string, before?: string, limitCount = 40): Promise<ConferenceMessage[]> {
  try {
    const q = query(
      collection(db, 'calls', conferenceId, 'messages'),
      orderBy('created_at', 'asc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ConferenceMessage);
  } catch {
    return [];
  }
}

export async function sendConferenceMessage(conferenceId: string, body: string): Promise<ConferenceMessage> {
  const authorId = await getUserId();
  const text = body.trim();
  if (text.length < 1 || text.length > 4000) throw new Error('Messages must be 1–4,000 characters.');

  const id = `msg_${Date.now()}`;
  const msg: ConferenceMessage = {
    id,
    conference_id: conferenceId,
    author_id: authorId,
    body: text,
    created_at: new Date().toISOString(),
  };

  await setDoc(doc(db, 'calls', conferenceId, 'messages', id), {
    ...msg,
    createdAt: serverTimestamp(),
  });

  return msg;
}

export async function conferenceParticipants(conferenceId: string) {
  try {
    const snap = await getDocs(collection(db, 'calls', conferenceId, 'participants'));
    return snap.docs.map((d) => ({ user_id: d.id, status: d.data().status }));
  } catch {
    return [];
  }
}
