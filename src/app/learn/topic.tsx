import { useLocalSearchParams } from 'expo-router';

import { TopicScreen } from '@/components/learning/topic-screen';
import { param } from '@/lib/routes';

// One topic: /learn/topic?topic=<topic id>
export default function TopicRoute() {
  const { topic } = useLocalSearchParams<{ topic?: string | string[] }>();
  return <TopicScreen topicId={param(topic)} />;
}
