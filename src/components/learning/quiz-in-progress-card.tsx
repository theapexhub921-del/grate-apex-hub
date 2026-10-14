import type { Href } from 'expo-router';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Card } from '@/components/ui/interactive';
import { Text } from '@/components/ui/text';
import { type ThemeColors } from '@/constants/theme';
import { deleteQuizDraft, type QuizDraft, watchQuizDraftsForLesson, watchQuizDraftsForTopic } from '@/data/quiz-drafts';
import { useThemedStyles } from '@/hooks/use-theme';
import { resumeHref, resumeLabel, useQuizDrafts } from '@/hooks/use-quiz-drafts';
import { InlineNotice } from '@/components/ui/state-views';

// Quizzes on this lesson the learner has started but not finished: resume them here, or clear them.
export function QuizInProgressCard({ lessonId, topicId }: { lessonId?: string; topicId?: string }) {
  const styles = useThemedStyles(createStyles);
  const [drafts, setDrafts] = useState<QuizDraft[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Listens live, so a quiz saved or cleared anywhere shows up here straight away.
  useEffect(() => {
    const onChange = (list: QuizDraft[]) => { setDrafts(list); setLoadError(null); };
    const onError = (message: string) => { setDrafts([]); setLoadError(message); };
    if (lessonId) return watchQuizDraftsForLesson(lessonId, onChange, onError);
    if (topicId) return watchQuizDraftsForTopic(topicId, onChange, onError);
  }, [lessonId, topicId]);

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
            <Button label="Resume" onPress={() => router.push(`${draft.path ?? '/learn/quiz'}?${draft.query}&continue=1` as Href)} />
            <Button label="Clear" variant="ghost" onPress={() => void clear(draft)} />
          </View>
        </Card>
      ))}
    </View>
  );
}

// Unfinished quizzes picked by `match` (custom quizzes, for example): resume them here, or clear them.
export function SavedQuizList({ match }: { match: (draft: QuizDraft) => boolean }) {
  const styles = useThemedStyles(createStyles);
  const drafts = useQuizDrafts().filter(match);
  if (!drafts.length) return null;
  return (
    <View style={styles.stack}>
      {drafts.map((draft) => (
        <Card key={draft.key} style={styles.card}>
          <Text style={styles.kicker}>QUIZ IN PROGRESS</Text>
          <Text style={styles.title}>{draft.title || 'Your quiz'}</Text>
          <Text style={styles.text}>{resumeLabel(draft)}.</Text>
          <View style={styles.actions}>
            <Button label="Resume" onPress={() => router.push(resumeHref(draft))} />
            <Button label="Clear" variant="ghost" onPress={() => void deleteQuizDraft(draft.key).catch(() => undefined)} />
          </View>
        </Card>
      ))}
    </View>
  );
}

// Home: the most recently saved unfinished quiz, one tap to carry on. Nothing is shown when there is none.
export function ContinueWhereYouLeftOff() {
  const styles = useThemedStyles(createStyles);
  const drafts = useQuizDrafts();
  const latest = drafts[0];
  if (!latest) return null;
  const total = latest.itemIds.length;
  return (
    <Card style={styles.homeCard}>
      <Text style={styles.kicker}>CONTINUE WHERE YOU LEFT OFF</Text>
      <Text style={styles.title} numberOfLines={2}>{latest.title || 'Your quiz'}</Text>
      <ProgressBar value={total ? Math.min(latest.index, total) / total : 0} label="Quiz progress" />
      <Text style={styles.text}>
        {resumeLabel(latest)}{drafts.length > 1 ? ` · ${drafts.length - 1} more unfinished` : ''}
      </Text>
      <View style={styles.actions}>
        <Button label="Resume" trailing="→" onPress={() => router.push(resumeHref(latest))} />
        <Button label="Clear" variant="ghost" onPress={() => void deleteQuizDraft(latest.key).catch(() => undefined)} />
      </View>
    </Card>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    homeCard: { gap: 8, padding: 16, marginBottom: 18 },
    stack: { gap: 10, marginBottom: 14 },
    card: { gap: 6, padding: 16 },
    kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: colors.textTertiary },
    title: { fontSize: 16, fontWeight: '800', color: colors.text },
    text: { fontSize: 14, lineHeight: 21, color: colors.textSecondary },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  });
}
