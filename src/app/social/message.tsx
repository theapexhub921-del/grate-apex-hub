import { useLocalSearchParams } from 'expo-router';

import { ChatShell } from '@/components/chat/chat-shell';

// /social/message?friend=<uid>&name=… — a chat with a friend.
export default function DirectMessageScreen() {
  const params = useLocalSearchParams<{ friend?: string | string[]; group?: string | string[]; name?: string | string[] }>();
  const friendId = Array.isArray(params.friend) ? params.friend[0] : params.friend;
  const name = Array.isArray(params.name) ? params.name[0] : params.name;
  const groupId = Array.isArray(params.group) ? params.group[0] : params.group;
  return <ChatShell friendId={friendId ?? null} groupId={groupId ?? null} name={name ?? null} />;
}
