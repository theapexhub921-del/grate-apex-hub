import { type Href, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';

import { MemoryDistribution } from '@/components/learning/memory-ui';
import { applyStreakRecovery } from '@/data/progress';
import { buyStreakRecoveryWithCoins, readApexCoinBalance, readStreakRecoveryOffer, type StreakRecoveryOffer } from '@/data/apex-coins';
import { getStreakFreezeBalance } from '@/data/community';
import { StatTile } from '@/components/learning/nav-bits';
import { LevelProgressCard } from '@/components/level-progress';
import { SubjectGlyph, TopicGlyph } from '@/components/learning/glyphs';
import { RankProgressCard } from '@/components/rank-progress';
import { Button } from '@/components/ui/button';
import { Card, Interactive } from '@/components/ui/interactive';
import { Pill } from '@/components/ui/pill';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Columns, Screen, SectionHeader } from '@/components/ui/screen';
import { EmptyState } from '@/components/ui/state-views';
import type { ThemeColors } from '@/constants/theme';
import { findLesson, getTopic } from '@/data/curriculum';
import { reviewConsistency } from '@/data/learning/calendar';
import { curriculumProgress, subjectProgress, TOPIC_STATUS_LABEL } from '@/data/learning/progress-model';
import { describeAgo } from '@/data/learning/time';
import { getStreakStatus } from '@/data/progression';
import { useLearning } from '@/data/learning/use-learning';
import { formatXp } from '@/data/learning/xp-rules';
import { usePowerups } from '@/data/learning/powerups';
import type { QuizAttempt } from '@/data/quiz-history';
import { getSubjectStatus, getSubjectStatusLabel, subjects } from '@/data/subjects';
import { useThemedStyles } from '@/hooks/use-theme';
import { routes } from '@/lib/routes';

const RECENT_LIMIT = 6;

const KIND_TITLE: Record<QuizAttempt['kind'], string> = {
  lesson: 'Lesson quiz',
  topic: 'Topic quiz',
  practice: 'Practice',
  review: 'Review session',
  apex: 'Apex Challenge',
  'mastery-check': 'Mastery check',
};

function attemptTitle(attempt: QuizAttempt) {
  const lesson = findLesson(attempt.lessonId)?.lesson.title;
  const topic = getTopic(attempt.topicId)?.title ?? getTopic(attempt.courseId)?.title;
  if (attempt.kind === 'lesson' || attempt.kind === 'mastery-check' || attempt.kind === 'practice') return lesson ?? topic ?? KIND_TITLE[attempt.kind];
  return topic ? `${KIND_TITLE[attempt.kind]} · ${topic}` : KIND_TITLE[attempt.kind];
}

// My Progress — the same canonical progression model as Home and Learn.
export default function ProgressScreen() {
  const styles = useThemedStyles(createStyles);
  const { progress, inputs, quizzes, attempts, now } = useLearning();
  const powerups = usePowerups();
  // Single-use power-ups apply automatically; timed boosts (achievement rewards) wait for activation.
  const singleUse = powerups.filter((powerup) => powerup.kind !== 'timed');
  const timedBoosts = powerups.filter((powerup) => powerup.kind === 'timed');
  const [showAll, setShowAll] = useState(false);
  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  const [freezeBalance, setFreezeBalance] = useState<number | null>(null);
  const [recoveryOffer, setRecoveryOffer] = useState<StreakRecoveryOffer | null>(null);
  const [recoveringStreak, setRecoveringStreak] = useState(false);
  const [coinError, setCoinError] = useState<string | null>(null);
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);
  const overall = useMemo(() => curriculumProgress(inputs), [inputs]);
  const consistency = useMemo(() => reviewConsistency(attempts, now), [attempts, now]);
  const visible = showAll ? quizzes : quizzes.slice(0, RECENT_LIMIT);
  const streakLapsed = getStreakStatus(progress.streak, progress.lastActivityDate, new Date(now)) === 'lapsed';
  const canRecoverStreak = streakLapsed || Boolean(recoveryOffer);

  useEffect(() => {
    let active = true;
    Promise.all([readApexCoinBalance(), readStreakRecoveryOffer(), getStreakFreezeBalance()]).then(([balance, offer, freezes]) => {
      if (active) { setCoinBalance(balance); setRecoveryOffer(offer); setFreezeBalance(freezes.available); }
    }).catch(() => { if (active) { setCoinBalance(null); setRecoveryOffer(null); } });
    return () => { active = false; };
  }, []);

  async function recoverStreak() {
    if (recoveringStreak || !canRecoverStreak || (coinBalance ?? 0) < 100) return;
    const recoveryAt = Date.now();
    setRecoveringStreak(true);
    setCoinError(null);
    setRecoveryNotice(null);
    try {
      const recovery = await buyStreakRecoveryWithCoins(recoveryAt);
      await applyStreakRecovery(recoveryAt, recovery.streak);
      setCoinBalance(recovery.balance);
      setRecoveryOffer(null);
      setRecoveryNotice('Your streak is restored. Complete a study activity today to keep it going.');
    } catch (caught) {
      setCoinError(caught instanceof Error ? caught.message : 'Could not recover this streak.');
    } finally {
      setRecoveringStreak(false);
    }
  }

  const main = (
    <View style={styles.column}>
      <View style={styles.statRow}>
        <StatTile value={progress.xp.toLocaleString()} label="lifetime XP" />
        <StatTile value={progress.lessonsCompleted} label="lessons completed" />
        <StatTile value={overall.topicsCompleted} label="topics completed" />
      </View>
      <View style={styles.statRow}>
        <StatTile value={overall.counts.mastered} label="concepts mastered" />
        <StatTile value={progress.streak} label="day streak" />
        <StatTile value={`${consistency.activeDays}/${consistency.days}`} label="review days" hint="last two weeks" />
      </View>

      <Card style={styles.card}>
        <SectionHeader title="Mastery" subtitle="Every concept you have met, by memory state (estimates from your answers)." style={styles.noMargin} />
        {overall.counts.tracked > 0 ? (
          <MemoryDistribution counts={overall.counts} />
        ) : (
          <Text style={styles.empty}>Complete a lesson to start tracking concepts.</Text>
        )}
      </Card>

      <Card style={styles.card}>
        <SectionHeader title="Subjects" style={styles.noMargin} />
        {subjects.map((subject) => {
          const status = getSubjectStatus(subject);
          const item = subjectProgress(subject.id, inputs);
          return (
            <View key={subject.id} style={styles.subjectRow}>
              <SubjectGlyph subject={subject.id} size={38} />
              <View style={styles.flex}>
                <View style={styles.rowTop}>
                  <Text style={styles.subjectName}>{subject.name}</Text>
                  <Text style={styles.meta}>{getSubjectStatusLabel(status, item.percent)}</Text>
                </View>
                {status === 'available' ? <ProgressBar value={item.percent / 100} height={6} label={`${subject.name} progress`} /> : null}
              </View>
            </View>
          );
        })}
      </Card>

      <Card style={styles.card}>
        <SectionHeader title="Topics" style={styles.noMargin} />
        {overall.topics.length === 0 ? (
          <Text style={styles.empty}>No published topics yet.</Text>
        ) : (
          overall.topics.map((topic) => (
            <Interactive
              key={topic.topic.id}
              onPress={() => router.push(routes.topic(topic.topic.id))}
              accessibilityRole="link"
              style={({ hovered }) => [styles.topicRow, hovered && styles.hover]}
            >
              <TopicGlyph title={topic.topic.title} subject={topic.topic.subject} size={38} />
              <View style={styles.flex}>
                <View style={styles.rowTop}>
                  <Text style={styles.topicName} numberOfLines={1}>
                    {topic.topic.title}
                  </Text>
                  <Pill label={TOPIC_STATUS_LABEL[topic.status]} tone={topic.status === 'mastered' ? 'gold' : topic.status === 'completed' ? 'success' : 'neutral'} />
                </View>
                <Text style={styles.meta}>
                  {topic.completed}/{topic.total} lessons · mastery {Math.round(topic.mastery * 100)}% · {topic.due} due
                  {topic.lastRevisedAt ? ` · revised ${describeAgo(topic.lastRevisedAt, now)}` : ''}
                </Text>
              </View>
            </Interactive>
          ))
        )}
      </Card>
    </View>
  );

  const side = (
    <View style={styles.column}>
      <RankProgressCard lifetimeXp={progress.xp} />
      <LevelProgressCard xp={progress.xp} />

      <Card style={styles.card}>
        <SectionHeader title="Power-ups" subtitle={`${singleUse.length} ready${timedBoosts.length ? ` · ${timedBoosts.length} timed boost${timedBoosts.length === 1 ? '' : 's'} to activate` : ''}`} style={styles.noMargin} />
        <Text style={styles.meta}>Complete a lesson or quiz to earn a boost. Your strongest stored boost applies automatically to your next lesson or quiz.</Text>
        {singleUse.length > 0 ? (
          <View style={styles.powerupRow}>
            {[1.5, 2, 2.5, 3].map((multiplier) => {
              const count = singleUse.filter((powerup) => powerup.multiplier === multiplier).length;
              return count > 0 ? <Pill key={multiplier} label={`×${multiplier} · ${count}`} tone="gold" /> : null;
            })}
          </View>
        ) : <Text style={styles.muted}>Your next completed lesson or quiz will earn your first boost.</Text>}
        <Text style={styles.meta}>Streak boosts unlock at 7, 15, 30, 60, 90 and 100 days, then 150, 200, 365, 500 and 1,000 days.</Text>
        {timedBoosts.length > 0 ? <Button label="Activate timed boosts in Achievements" variant="ghost" size="sm" onPress={() => router.push('/achievements' as Href)} /> : null}
      </Card>

      <Card style={styles.card}>
        <SectionHeader title="Apex Coins" subtitle={coinBalance === null ? 'Balance unavailable' : `${coinBalance.toLocaleString()} coins`} style={styles.noMargin} />
        <Text style={styles.meta}>Earn 5 coins for completing an Apex Challenge and 10 coins when you complete every lesson in a topic.</Text>
        <Text style={styles.meta}>Streak freezes: {freezeBalance === null ? 'balance unavailable' : freezeBalance}. Complete five lessons in a week to earn one; up to two can be stored. One is used automatically to cover a single missed day.</Text>
        {coinError ? <Text style={styles.error}>{coinError}</Text> : null}
        {recoveryNotice ? <Text style={styles.success}>{recoveryNotice}</Text> : null}
        {canRecoverStreak ? (
          <>
            <Text style={styles.meta}>Recover your {recoveryOffer?.lost_streak ?? progress.streak}-day streak for 100 Apex Coins.</Text>
            <Button label={coinBalance !== null && coinBalance >= 100 ? 'Recover streak · 100 coins' : 'Earn 100 coins to recover'} onPress={() => void recoverStreak()} loading={recoveringStreak} disabled={coinBalance === null || coinBalance < 100 || recoveringStreak} />
            {coinBalance !== null && coinBalance < 100 ? <Text style={styles.muted}>A paid recovery option is not available yet.</Text> : null}
          </>
        ) : null}
      </Card>

      <Card style={styles.card}>
        <SectionHeader title="Quizzes & reviews" style={styles.noMargin} />
        {quizzes.length === 0 ? (
          <EmptyState icon="chart" title="No attempts yet" message="Complete a lesson, then take its quiz — your results will be saved here." />
        ) : (
          <>
            {visible.map((attempt) => (
              <Interactive
                key={attempt.id}
                onPress={() => router.push(routes.results(attempt.id))}
                accessibilityRole="link"
                accessibilityLabel={`${attemptTitle(attempt)}: ${attempt.percentage}%. Open results.`}
                style={({ hovered }) => [styles.attemptRow, hovered && styles.hover]}
              >
                <View style={styles.flex}>
                  <Text style={styles.attemptTitle} numberOfLines={1}>
                    {attemptTitle(attempt)}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {KIND_TITLE[attempt.kind]} · {describeAgo(attempt.completedAt, now)} · {attempt.score}/{attempt.total}
                    {attempt.xp ? ` · ${formatXp(attempt.xp.net)}` : ''}
                  </Text>
                  {attempt.wrongConcepts.length > 0 ? (
                    <Text style={styles.missed} numberOfLines={1}>
                      Missed: {attempt.wrongConcepts.join(', ')}
                    </Text>
                  ) : null}
                </View>
                <Text style={[styles.score, attempt.percentage >= 80 && styles.scoreGood]}>{attempt.percentage}%</Text>
              </Interactive>
            ))}
            {quizzes.length > RECENT_LIMIT ? (
              <Button label={showAll ? 'Show less' : `Show all (${quizzes.length})`} variant="ghost" size="sm" onPress={() => setShowAll(!showAll)} />
            ) : null}
          </>
        )}
      </Card>

      <Card style={styles.card}>
        <SectionHeader title="XP history" style={styles.noMargin} />
        {progress.xpLedger.length === 0 ? (
          <Text style={styles.empty}>XP you earn (or lose) appears here.</Text>
        ) : (
          progress.xpLedger.slice(0, 10).map((entry) => (
            <View key={entry.key} style={styles.xpRow}>
              <Text style={styles.xpLabel} numberOfLines={1}>
                {entry.label}
              </Text>
              <Text style={[styles.xpAmount, entry.amount < 0 && styles.xpNegative]}>{formatXp(entry.amount)}</Text>
            </View>
          ))
        )}
      </Card>
    </View>
  );

  return (
    <Screen width="wide">
      <Text style={styles.title} accessibilityRole="header">
        My Progress
      </Text>
      <Text style={styles.subtitle}>What you have learned, what is becoming stable, and what needs work.</Text>
      <Columns main={main} side={side} sideWidth={380} />
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    title: { fontSize: 30, fontWeight: '800', color: colors.text },
    subtitle: { fontSize: 15, color: colors.textSecondary, marginTop: 4, marginBottom: 20 },
    column: { gap: 14 },
    flex: { flex: 1, minWidth: 0 },
    statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    card: { gap: 10 },
    noMargin: { marginBottom: 0 },
    empty: { fontSize: 13, lineHeight: 19, color: colors.textSecondary },
    subjectRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
    subjectEmoji: { fontSize: 24 },
    rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 5 },
    subjectName: { fontSize: 15, fontWeight: '800', color: colors.text },
    meta: { fontSize: 12, color: colors.textSecondary },
    muted: { fontSize: 12, color: colors.textTertiary },
    error: { fontSize: 12, color: colors.error },
    success: { fontSize: 12, color: colors.successText },
    topicRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 6, borderRadius: 10 },
    topicEmoji: { fontSize: 20 },
    topicName: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
    hover: { backgroundColor: colors.surfaceMuted },
    attemptRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 6, borderRadius: 10 },
    attemptTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
    missed: { fontSize: 12, color: colors.warningText, marginTop: 2 },
    score: { fontSize: 16, fontWeight: '800', color: colors.textSecondary },
    scoreGood: { color: colors.success },
    xpRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 4 },
    powerupRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    xpLabel: { flex: 1, fontSize: 13, color: colors.textSecondary },
    xpAmount: { fontSize: 13, fontWeight: '800', color: colors.accentText },
    xpNegative: { color: colors.error },
  });
}
