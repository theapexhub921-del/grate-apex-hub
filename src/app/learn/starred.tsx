import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BackLink, Breadcrumbs } from '@/components/learning/nav-bits';
import { type FeedbackMode, QuestionSession } from '@/components/learning/question-session';
import { Button } from '@/components/ui/button';
import { Card, Interactive } from '@/components/ui/interactive';
import { Icon } from '@/components/ui/icon';
import { PageHeader, Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { type ThemeColors, Type } from '@/constants/theme';
import { getQuestionsByIds } from '@/data/curriculum';
import { routes } from '@/lib/routes';
import { toggleStar, useStarredIds } from '@/data/starred-questions';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

// Questions the learner starred while practising, to go over again.
export default function StarredScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const starred = useStarredIds();
  const questions = useMemo(() => getQuestionsByIds([...starred]), [starred]);
  const [mode, setMode] = useState<FeedbackMode>('instant');
  const [practising, setPractising] = useState(false);
  const [seed] = useState(() => `starred-${Date.now()}`);

  if (practising && questions.length) {
    return (
      <QuestionSession
        items={questions.map((question) => ({ question }))}
        mode={mode}
        onModeChange={setMode}
        attemptMode="practice"
        sessionId={seed}
        seed={seed}
        onSubmit={async () => setPractising(false)}
        submitLabel="Finish"
        header={
          <View style={styles.sessionHeader}>
            <Breadcrumbs items={[{ label: 'Study', href: routes.learn() }, { label: 'Starred' }]} />
          </View>
        }
      />
    );
  }

  return (
    <Screen width="learning">
      <BackLink fallback={'/learn' as never} />
      <PageHeader eyebrow="Learn" title="Starred questions" subtitle="Questions you starred while practising. Practise them again whenever you like." />

      {questions.length === 0 ? (
        <Card style={styles.empty}>
          <Icon name="star" size={22} color={colors.accent} />
          <Text style={styles.emptyTitle}>No starred questions yet</Text>
          <Text style={styles.emptyText}>Tap the star in the corner of any practice question to save it here.</Text>
        </Card>
      ) : (
        <>
          <Button label="Practise starred questions" onPress={() => setPractising(true)} />
          <View style={styles.list}>
            {questions.map((question) => (
              <Card key={question.id} style={styles.item}>
                <Text style={styles.concept}>{question.concept}</Text>
                <Text style={styles.prompt}>{question.prompt}</Text>
                <Interactive onPress={() => void toggleStar(question.id).catch(() => undefined)} accessibilityRole="button" accessibilityLabel="Remove star" style={styles.remove}>
                  <Icon name="star" size={15} color={colors.accent} filled />
                  <Text style={styles.removeText}>Remove star</Text>
                </Interactive>
              </Card>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    sessionHeader: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
    empty: { gap: 8, padding: 20, alignItems: 'flex-start' },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
    emptyText: { fontSize: 14, lineHeight: 21, color: colors.textSecondary },
    list: { gap: 10, marginTop: 14 },
    item: { gap: 6, padding: 16 },
    concept: { ...Type.overline, color: colors.primaryText },
    prompt: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: colors.text },
    remove: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 4 },
    removeText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  });
}
