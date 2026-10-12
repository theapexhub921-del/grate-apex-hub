import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { type ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { LegacyBlocks, Rich, TermContext } from '@/components/learning/legacy-blocks';
import { BackLink } from '@/components/learning/nav-bits';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Card, Interactive, PressableCard } from '@/components/ui/interactive';
import { Pill } from '@/components/ui/pill';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { Sheet } from '@/components/ui/sheet';
import { ErrorScreen, LoadingState } from '@/components/ui/state-views';
import { Text } from '@/components/ui/text';
import { setPendingXpReward } from '@/components/xp-toast';
import { Type, type ThemeColors } from '@/constants/theme';
import { lessonCompletionXp } from '@/data/learning/xp-rules';
import {
  legacyCourse,
  type LegacyLessonBody,
  type LegacyLessonMeta,
  loadLegacyLessonBody,
  loadLegacyLessonMeta,
  loadLegacySectionProgress,
  plainText,
  saveLegacySectionProgress,
} from '@/data/legacy-study';
import { completeLesson, useProgress } from '@/data/progress';
import { finishLesson } from '@/data/learning/actions';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { param, routes } from '@/lib/routes';

// /learn/hb-lesson?lesson=<id>[&section=n] — an original-app lesson, read the
// way the original app taught it: one section at a time (its kicker, title
// and blocks), key words that explain themselves when tapped, and the
// lesson's study aids (mnemonics, facts, steps) at the end. Finishing every
// section completes the lesson here (XP once), then its practice questions.
export default function LegacyLessonScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const params = useLocalSearchParams<{ lesson?: string | string[]; section?: string | string[] }>();
  const lessonId = param(params.lesson);
  const { width } = useWindowDimensions();
  const wide = width >= 1000;
  const progress = useProgress();
  const scroll = useRef<ScrollView>(null);
  const [meta, setMeta] = useState<LegacyLessonMeta | null>(null);
  const [body, setBody] = useState<LegacyLessonBody | null>(null);
  const [index, setIndex] = useState(0);
  const [readCount, setReadCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [term, setTerm] = useState<{ word: string; meaning: string } | null>(null);
  const [finished, setFinished] = useState<{ xp: number } | null>(null);

  useEffect(() => {
    if (!lessonId) return;
    let live = true;
    Promise.all([loadLegacyLessonMeta(lessonId), loadLegacyLessonBody(lessonId), loadLegacySectionProgress()])
      .then(([found, lessonBody, read]) => {
        if (!live) return;
        setMeta(found);
        setBody(lessonBody);
        const already = read[lessonId] ?? 0;
        setReadCount(already);
        const requested = Number(param(params.section));
        const total = lessonBody.sections.length;
        setIndex(Number.isInteger(requested) && requested >= 1 && requested <= total ? requested - 1 : Math.min(already, Math.max(0, total - 1)));
      })
      .catch((problem) => { if (live) setError(problem instanceof Error ? problem.message : 'This lesson could not be loaded.'); });
    return () => { live = false; };
    // The section param only picks the starting section.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  if (!lessonId) return <ErrorScreen title="No lesson chosen" message="Open a lesson from Study." primary={{ label: 'Back to Study', onPress: () => router.replace(routes.learn()) }} />;
  if (error) return <ErrorScreen title="Lesson unavailable" message={error} primary={{ label: 'Back to Study', onPress: () => router.replace(routes.learn()) }} />;
  if (!body || !meta) return <LoadingState label="Loading the lesson…" />;

  const course = legacyCourse(meta.course);
  const total = body.sections.length;
  const section = body.sections[index];
  const isLast = index === total - 1;
  const done = progress.completedLessons.includes(meta.id);
  const questions = meta.qids?.length ?? meta.qcount ?? 0;

  const go = (next: number) => {
    setIndex(next);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };

  async function markRead(upTo: number) {
    if (upTo <= readCount) return;
    setReadCount(upTo);
    await saveLegacySectionProgress(meta!.id, upTo);
  }

  async function next() {
    await markRead(index + 1);
    if (!isLast) {
      go(index + 1);
      return;
    }
    if (meta!.subject) {
      // HB2: this app's lesson, finished the same way as on its lesson page (XP, power-ups, topic milestones).
      const result = await finishLesson(meta!.id);
      if (result.awarded) setPendingXpReward({ amount: result.xp, message: `Lesson completed · ${meta!.title}` });
      setFinished({ xp: result.xp });
    } else {
      const xp = lessonCompletionXp(undefined);
      const awarded = await completeLesson(meta!.id, 'biochemistry', xp, undefined, meta!.title);
      if (awarded) setPendingXpReward({ amount: xp, message: `Lesson completed · ${meta!.title}` });
      setFinished({ xp: awarded ? xp : 0 });
    }
    scroll.current?.scrollTo({ y: 0, animated: true });
  }

  const outline = (
    <Card style={styles.outline}>
      <Text style={styles.outlineTitle}>Sections</Text>
      <ProgressBar value={total ? Math.min(readCount, total) / total : 0} height={5} label="Sections read" />
      {body.sections.map((item, i) => {
        const read = i < readCount;
        return (
          <Interactive key={item.id} onPress={() => { setFinished(null); go(i); }} accessibilityRole="button" style={({ hovered }) => [styles.outlineItem, i === index && !finished && styles.outlineActive, hovered && styles.outlineHover]}>
            <View style={[styles.outlineMark, read && styles.outlineMarkDone]}>{read ? <Icon name="check" size={10} color="#FFFFFF" strokeWidth={3} /> : <Text style={styles.outlineNum}>{i + 1}</Text>}</View>
            <Text style={styles.outlineText} numberOfLines={2}>{plainText(item.title)}</Text>
          </Interactive>
        );
      })}
    </Card>
  );

  const reader = finished ? (
    <Card style={styles.finished}>
      <Text style={styles.finishedEmoji}>🎉</Text>
      <Text style={styles.finishedTitle}>Lesson completed</Text>
      <Text style={styles.finishedText}>{finished.xp > 0 ? `+${finished.xp} XP · ${meta.title}` : `${meta.title} — already completed earlier.`}</Text>
      <View style={styles.finishedActions}>
        {questions > 0 && course ? <Button label={`Practice · ${questions} questions`} onPress={() => router.push(routes.legacyPractice({ course: course.id, lesson: meta.id }))} /> : null}
        {meta.subject ? <Button label="Learn by answering" variant="secondary" onPress={() => router.push(routes.lesson(meta.id, { layer: 'learn' }))} /> : null}
        <Button label="Back to the course" variant="secondary" onPress={() => router.push(course ? routes.legacyCourse(course.id) : routes.learn())} />
      </View>
      <StudyAids body={body} />
    </Card>
  ) : (
    <View style={styles.reader}>
      <Text style={styles.crumb}>Section {index + 1} of {total}{section?.kicker ? ` · ${plainText(section.kicker)}` : ''}</Text>
      <Rich x={section?.title ?? ''} style={styles.sectionTitle} />
      <TermContext.Provider value={(word, meaning) => setTerm({ word, meaning })}>
        <LegacyBlocks blocks={section?.blocks ?? []} />
      </TermContext.Provider>
      {isLast ? <StudyAids body={body} /> : null}
      <View style={styles.nav}>
        <Button label="Previous" variant="secondary" disabled={index === 0} onPress={() => go(index - 1)} />
        <Button label={isLast ? (done ? 'Finish' : 'Finish the lesson') : 'Next section'} trailing="→" onPress={() => void next()} />
      </View>
    </View>
  );

  return (
    <Screen ref={scroll} width="wide">
      <BackLink fallback={course ? routes.legacyCourse(course.id) : routes.learn()} />
      <View style={styles.head}>
        <Text style={styles.icon}>{meta.icon}</Text>
        <View style={styles.flex}>
          <Text style={styles.title}>{meta.title}</Text>
          {meta.sub ? <Text style={styles.sub}>{meta.sub}</Text> : null}
        </View>
        {done ? <Pill label="Completed" tone="success" /> : <Pill label={`${Math.min(readCount, total)}/${total} sections`} tone="primary" />}
      </View>
      {meta.subject && !finished ? (
        // HB2 lessons also have an interactive version (this app's lesson page): offer it clearly.
        <PressableCard onPress={() => router.push(routes.lesson(meta.id, { layer: 'learn' }))} accessibilityLabel="Learn by answering: the interactive version of this lesson" style={styles.modeCard}>
          <View style={styles.modeIcon}><Icon name="challenge" size={20} color={colors.onPrimary} /></View>
          <View style={styles.flex}>
            <Text style={styles.modeTitle}>Learn by answering</Text>
            <Text style={styles.modeText}>Prefer learning by doing? Study this lesson step by step, answering short questions as you go.</Text>
          </View>
          <View style={styles.modeGo}>
            <Text style={styles.modeGoText}>Start</Text>
            <Icon name="chevronRight" size={16} color={colors.onPrimary} />
          </View>
        </PressableCard>
      ) : null}
      {wide ? (
        <View style={styles.columns}>
          <View style={styles.main}>{reader}</View>
          <View style={styles.side}>{outline}</View>
        </View>
      ) : (
        <View style={styles.stack}>
          {reader}
          {outline}
        </View>
      )}
      <Sheet visible={Boolean(term)} onClose={() => setTerm(null)} title={term?.word ?? ''}>
        <Text style={styles.termMeaning}>{term ? plainText(term.meaning) : ''}</Text>
      </Sheet>
    </Screen>
  );
}

function StudyAids({ body }: { body: LegacyLessonBody }) {
  const styles = useThemedStyles(createStyles);
  const groups = [
    ...(body.extras?.mnemonics ?? []).map((group) => ({ kind: 'Mnemonic', ...group })),
    ...(body.extras?.facts ?? []).map((group) => ({ kind: 'Quick facts', ...group })),
  ];
  const steps = body.extras?.steps;
  if (!groups.length && !steps) return null;
  return (
    <View style={styles.aids}>
      <Text style={styles.aidsTitle}>Study aids</Text>
      {groups.map((group, i) => (
        <View key={i} style={styles.aid}>
          <Text style={styles.aidKind}>{group.kind.toUpperCase()}</Text>
          <Rich x={group.h} style={styles.aidHead} />
          {group.lines.map((line, j) => <Rich key={j} x={line} style={styles.aidLine} />)}
        </View>
      ))}
      {steps ? (
        <View style={styles.aid}>
          <Text style={styles.aidKind}>STEPS</Text>
          <Text style={styles.aidHead}>{steps.title}</Text>
          {steps.items.map((item, j) => (
            <Text key={j} style={styles.aidLine}>
              <Rich x={`<b>${item.t}</b> — ${item.d}`} />
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    head: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8, marginBottom: 16, flexWrap: 'wrap' },
    icon: { fontSize: 38 },
    title: { ...Type.title1, color: colors.text },
    sub: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
    columns: { flexDirection: 'row', gap: 24, alignItems: 'flex-start' },
    modeCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, marginBottom: 18, borderWidth: 1.5, borderColor: colors.primaryBorder },
    modeIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
    modeTitle: { ...Type.headline, color: colors.text },
    modeText: { fontSize: 13.5, lineHeight: 19, color: colors.textSecondary, marginTop: 2 },
    modeGo: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.primary },
    modeGoText: { fontSize: 13.5, fontWeight: '800', color: colors.onPrimary },
    main: { flex: 1, minWidth: 0, maxWidth: 780 },
    side: { width: 300 },
    stack: { gap: 18 },
    reader: { gap: 4 },
    crumb: { ...Type.overline, color: colors.primaryText, marginBottom: 6 },
    sectionTitle: { ...Type.title2, color: colors.text, marginBottom: 14 },
    nav: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 18 },
    outline: { gap: 6, padding: 16 },
    outlineTitle: { ...Type.headline, color: colors.text, marginBottom: 4 },
    outlineItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, paddingHorizontal: 8, borderRadius: 10 },
    outlineActive: { backgroundColor: colors.primarySubtle },
    outlineHover: { backgroundColor: colors.surfaceMuted },
    outlineMark: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
    outlineMarkDone: { backgroundColor: colors.success, borderColor: colors.success },
    outlineNum: { fontSize: 10.5, fontWeight: '800', color: colors.textSecondary },
    outlineText: { flex: 1, fontSize: 13, lineHeight: 18, color: colors.text },
    finished: { alignItems: 'center', gap: 10, padding: 26 },
    finishedEmoji: { fontSize: 44 },
    finishedTitle: { ...Type.title2, color: colors.text },
    finishedText: { fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
    finishedActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 6 },
    aids: { gap: 10, marginTop: 18, alignSelf: 'stretch' },
    aidsTitle: { ...Type.title3, color: colors.text },
    aid: { gap: 4, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted },
    aidKind: { ...Type.overline, color: colors.accentText },
    aidHead: { fontSize: 15, fontWeight: '700', color: colors.text },
    aidLine: { fontSize: 14, lineHeight: 21, color: colors.text },
    termMeaning: { fontSize: 15, lineHeight: 23, color: colors.text },
  });
}
