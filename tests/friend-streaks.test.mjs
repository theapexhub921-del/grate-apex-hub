import assert from 'node:assert/strict';
import { test } from 'node:test';

import { friendStreak } from '../src/data/friend-streaks.ts';

const DAY = 86_400_000;
const NOW = new Date(2026, 9, 12, 18).getTime();
const at = (daysAgo, hour = 12) => new Date(NOW - daysAgo * DAY).setHours(hour, 0, 0, 0);
const msg = (from, daysAgo) => ({ sender_id: from, created_at: new Date(at(daysAgo)).toISOString() });

test('a streak counts days on which both friends messaged', () => {
  const messages = [msg('me', 0), msg('f', 0), msg('me', 1), msg('f', 1), msg('me', 2), msg('f', 2), msg('me', 4), msg('f', 4)];
  assert.equal(friendStreak(messages, 'me', 'f', NOW), 3);
});

test('today not done yet keeps yesterday’s streak; one-sided days do not count', () => {
  const messages = [msg('me', 0), msg('me', 1), msg('f', 1), msg('me', 2), msg('f', 2)];
  assert.equal(friendStreak(messages, 'me', 'f', NOW), 2);
  assert.equal(friendStreak([msg('me', 1), msg('me', 2)], 'me', 'f', NOW), 0);
});
