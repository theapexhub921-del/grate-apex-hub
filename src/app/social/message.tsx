import { useLocalSearchParams } from 'expo-router';

import { ChatShell } from '@/components/chat/chat-shell';

// /social/message?friend=<uid>&name=… — a chat with a friend.
export default function DirectMessageScreen() {
  const params = useLocalSearchParams<{ friend?: string | string[]; name?: string | string[] }>();
  const friendId = Array.isArray(params.friend) ? params.friend[0] : params.friend;
  const name = Array.isArray(params.name) ? params.name[0] : params.name;
  return <ChatShell friendId={friendId ?? null} name={name ?? null} />;
}
