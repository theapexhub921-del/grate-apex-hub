export type RealtimeTutorSession = {
  client_secret: {
    value: string;
    expires_at: number;
  };
  model: string;
};

/** Requests a short-lived voice-session credential. */
export async function createRealtimeTutorSession(): Promise<RealtimeTutorSession> {
  throw new Error('AI Tutor voice session is being migrated to Firebase Cloud Functions.');
}
