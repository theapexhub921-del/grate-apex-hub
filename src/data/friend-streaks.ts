// Friend streaks (like Snapchat): the number of days in a row on which you and
// a friend BOTH sent each other at least one message. It counts back from today
// (or yesterday, so a streak isn't lost before today's messages). Pure, for tests.

const dayKey = (time: number) => {
  const d = new Date(time);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

export function friendStreak(messages: readonly { sender_id: string; created_at: string }[], me: string, friend: string, now = Date.now()) {
  const mine = new Set<string>();
  const theirs = new Set<string>();
  for (const message of messages) {
    const at = Date.parse(message.created_at);
    if (!Number.isFinite(at)) continue;
    if (message.sender_id === me) mine.add(dayKey(at));
    else if (message.sender_id === friend) theirs.add(dayKey(at));
  }
  const both = (time: number) => mine.has(dayKey(time)) && theirs.has(dayKey(time));
  const DAY = 86_400_000;
  let day = now;
  if (!both(day)) day -= DAY; // today isn't over yet
  let streak = 0;
  while (both(day) && streak < 3650) {
    streak += 1;
    day -= DAY;
  }
  return streak;
}
