import type { Href } from 'expo-router';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/interactive';
import { Text } from '@/components/ui/text';
import { type ThemeColors } from '@/constants/theme';
import { deleteQuizDraft, type QuizDraft, watchQuizDraftsForLesson } from '@/data/quiz-drafts';
import { useThemedStyles } from '@/hooks/use-theme';
import { InlineNotice } from '@/components/ui/state-views';

// Quizzes on this lesson the learner has started but not finished: resume them here, or clear them.
export function QuizInProgressCard({ lessonId }: { lessonId: string | undefined }) {
  const styles = useThemedStyles(createStyles);
  const [drafts, setDrafts] = useState<QuizDraft[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Listens live, so a quiz saved or cleared anywhere shows up here straight away.
  useEffect(() => {
    if (!lessonId) return;
    return watchQuizDraftsForLesson(
      lessonId,
      (list) => { setDrafts(list); setLoadError(null); },
      (message) => { setDrafts([]); setLoadError(message); }
    );
  }, [lessonId]);

  async function clear(draft: QuizDraft) {
    setDrafts((current) => current.filter((item) => item.key !== draft.key));
    await deleteQuizDraft(draft.key).catch(() => undefined);
  }

  if (!drafts.length && !loadError) return null;

  if (!drafts.length) {
    return <InlineNotice tone="error" message={`Quizzes in progress could not be loaded (${loadError}). If it mentions permissions, the quiz-progress rule still needs publishing.`} />;
  }

  return (
    <View style={styles.stack}>
      {drafts.map((draft) => (
        <Card key={draft.key} style={styles.card}>
          <Text style={styles.kicker}>QUIZ IN PROGRESS</Text>
          <Text style={styles.title}>{draft.title}</Text>
          <Text style={styles.text}>
            Question {Math.min(draft.index + 1, draft.itemIds.length)} of {draft.itemIds.length}.
          </Text>
          <View style={styles.actions}>
            <Button label="Resume" onPress={() => router.push(`/learn/quiz?${draft.query}&continue=1` as Href)} />
            <Button label="Clear" variant="ghost" onPress={() => void clear(draft)} />
          </View>
        </Card>
      ))}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    stack: { gap: 10, marginBottom: 14 },
    card: { gap: 6, padding: 16 },
    kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: colors.textTertiary },
    title: { fontSize: 16, fontWeight: '800', color: colors.text },
    text: { fontSize: 14, lineHeight: 21, color: colors.textSecondary },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  });
}
