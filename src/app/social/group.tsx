import { Redirect, useLocalSearchParams, type Href } from 'expo-router';

// /social/group?group=<id> — kept for old links. A group now opens as its
// group chat in Messages, which shows the members (Group info) and lets the
// owner add more.
export default function StudyGroupScreen() {
  const params = useLocalSearchParams<{ group?: string | string[] }>();
  const groupId = Array.isArray(params.group) ? params.group[0] : params.group;
  if (!groupId) return <Redirect href={'/social/groups' as Href} />;
  return <Redirect href={`/social/message?group=${encodeURIComponent(groupId)}` as Href} />;
}
