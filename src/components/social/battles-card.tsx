import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Interactive, PressableCard } from '@/components/ui/interactive';
import { Pill } from '@/components/ui/pill';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Type, type ThemeColors } from '@/constants/theme';
import { type Battle, type BattleCourse, battleRecord, battleStatus, createBattle, declineBattle, listBattles } from '@/data/battles';
import { readClassSelection } from '@/data/class-curriculum';
import { publishedTopics } from '@/data/curriculum';
import { legacyCoursesForClass } from '@/data/legacy-study';
import { useProgress } from '@/data/progress';
import { personName, useSocial } from '@/data/social';
import { useAuth } from '@/hooks/use-auth';
import { useExperience } from '@/hooks/use-experience';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

// Connect → Battles (the original app's Compete tab, without XP stakes): the
// card opens a panel with your XP and record and "Challenge someone".
export function BattlesCard() {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const originals = useExperience() === 'originals';
  const { user } = useAuth();
  const uid = user?.uid ?? '';
  const progress = useProgress();
  const social = useSocial();
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [battles, setBattles] = useState<Battle[]>([]);
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [courseKey, setCourseKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setBattles(await listBattles());
      setError(null);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Battles could not be loaded.');
    }
  }, []);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  // Courses to battle on: the learner's class courses (HB1), else this app's topics.
  const courses = useMemo<BattleCourse[]>(() => {
    const hb = legacyCoursesForClass(readClassSelection(user?.user_metadata)).map((course) => ({ kind: 'hb' as const, id: course.id, name: course.name }));
    return hb.length ? hb : publishedTopics.slice(0, 10).map((topic) => ({ kind: 'topic' as const, id: topic.id, name: topic.title }));
  }, [user?.user_metadata]);
  const people = social.people.filter((person) => person.relationship !== 'none');
  const record = battleRecord(battles, uid);
  const yourTurn = battles.filter((battle) => battleStatus(battle, uid) === 'waiting-for-you').length;

  async function send() {
    const person = people.find((item) => item.userId === opponentId);
    const course = courses.find((item) => `${item.kind}:${item.id}` === courseKey);
    if (!person || !course || busy) return;
    setBusy(true);
    setError(null);
    try {
      const battle = await createBattle({ userId: person.userId, username: person.username }, course);
      setOpen(false);
      setPicking(false);
      router.push({ pathname: '/social/battle', params: { id: battle.id } } as never);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'The challenge could not be sent.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PressableCard onPress={() => { setOpen(true); void refresh(); }} accessibilityLabel="Battles" style={styles.entry}>
        <View style={styles.entryIcon}>{originals ? <Text style={styles.emoji}>⚔️</Text> : <Icon name="challenge" size={22} color={colors.accentText} />}</View>
        <View style={styles.flex}>
          <Text style={styles.entryTitle}>Battles</Text>
          <Text style={styles.entryText}>Go head-to-head on the same questions. The winner earns XP.</Text>
        </View>
        {yourTurn ? <Pill label={`${yourTurn} your turn`} tone="gold" /> : <Icon name="chevronRight" size={18} color={colors.textTertiary} />}
      </PressableCard>

      <Sheet visible={open} onClose={() => { setOpen(false); setPicking(false); }} title={originals ? '⚔️ Battles' : 'Battles'} subtitle="You both answer the same 10 questions. Higher score wins; a tie goes to the faster player. No XP changes hands.">
        <View style={styles.stats}>
          <View>
            <Text style={styles.statLabel}>YOUR XP</Text>
            <Text style={styles.statValue}>{progress.xp.toLocaleString()}</Text>
          </View>
          <View style={styles.statRight}>
            <Text style={styles.statLabel}>RECORD</Text>
            <Text style={styles.statRecord}>{record.wins}W · {record.losses}L · {record.draws}D</Text>
          </View>
        </View>

        {picking ? (
          <View style={styles.picker}>
            <Text style={styles.pickLabel}>Who?</Text>
            {people.length ? (
              <View style={styles.chips}>
                {people.map((person) => (
                  <Interactive key={person.userId} onPress={() => setOpponentId(person.userId)} accessibilityRole="radio" accessibilityState={{ checked: opponentId === person.userId }} style={[styles.chip, opponentId === person.userId && styles.chipOn]}>
                    <Avatar uri={person.avatarUrl} name={personName(person)} size={22} />
                    <Text style={styles.chipText}>{personName(person)}</Text>
                  </Interactive>
                ))}
              </View>
            ) : (
              <Text style={styles.muted}>Follow classmates first (Connect → Find classmates).</Text>
            )}
            <Text style={styles.pickLabel}>On what?</Text>
            <View style={styles.chips}>
              {courses.map((course) => {
                const key = `${course.kind}:${course.id}`;
                return (
                  <Interactive key={key} onPress={() => setCourseKey(key)} accessibilityRole="radio" accessibilityState={{ checked: courseKey === key }} style={[styles.chip, courseKey === key && styles.chipOn]}>
                    <Text style={styles.chipText}>{course.name}</Text>
                  </Interactive>
                );
              })}
            </View>
            <View style={styles.row}>
              <Button label="Cancel" variant="ghost" onPress={() => setPicking(false)} />
              <Button label="Send and play" onPress={() => void send()} loading={busy} disabled={!opponentId || !courseKey} />
            </View>
          </View>
        ) : (
          <Button label="+ Challenge someone" size="lg" fullWidth onPress={() => setPicking(true)} />
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {battles.length === 0 && !picking ? <Text style={styles.muted}>No battles yet. Challenge a friend to get started.</Text> : null}
        <View style={styles.list}>
          {battles.slice(0, 12).map((battle) => {
            const status = battleStatus(battle, uid);
            const incoming = battle.opponentId === uid;
            const other = incoming ? battle.challengerName : battle.opponentName;
            const mine = incoming ? battle.opponent : battle.challenger;
            const theirs = incoming ? battle.challenger : battle.opponent;
            return (
              <View key={battle.id} style={styles.item}>
                <View style={styles.flex}>
                  <Text style={styles.itemTitle}>{battle.course.name}</Text>
                  <Text style={styles.muted}>
                    {incoming ? `From @${other ?? 'someone'}` : `With @${other ?? 'someone'}`}
                    {mine && theirs ? ` · ${mine.score}–${theirs.score}` : mine ? ` · you ${mine.score}/${mine.total}` : ''}
                  </Text>
                </View>
                {status === 'waiting-for-you' ? (
                  <View style={styles.row}>
                    <Button label="Play" size="sm" onPress={() => { setOpen(false); router.push({ pathname: '/social/battle', params: { id: battle.id } } as never); }} />
                    {incoming ? <Button label="Decline" size="sm" variant="ghost" onPress={() => void declineBattle(battle).then(refresh)} /> : null}
                  </View>
                ) : (
                  <Pill
                    label={status === 'won' ? 'Won' : status === 'lost' ? 'Lost' : status === 'draw' ? 'Draw' : status === 'declined' ? 'Declined' : 'Waiting'}
                    tone={status === 'won' ? 'success' : status === 'lost' ? 'error' : status === 'draw' ? 'gold' : 'neutral'}
                  />
                )}
              </View>
            );
          })}
        </View>
      </Sheet>
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    entry: { flexDirection: 'row', alignItems: 'center', gap: 14, borderColor: colors.accent + '66' },
    entryIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.accentSubtle, alignItems: 'center', justifyContent: 'center' },
    emoji: { fontSize: 24 },
    entryTitle: { ...Type.headline, color: colors.text },
    entryText: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    stats: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted, marginBottom: 14 },
    statRight: { alignItems: 'flex-end' },
    statLabel: { ...Type.overline, color: colors.textTertiary },
    statValue: { ...Type.title1, color: colors.text },
    statRecord: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 4 },
    picker: { gap: 8 },
    pickLabel: { fontSize: 13, fontWeight: '800', color: colors.text, marginTop: 6 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    chipOn: { borderColor: colors.primary, backgroundColor: colors.primarySubtle },
    chipText: { fontSize: 13, fontWeight: '700', color: colors.text },
    row: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
    error: { fontSize: 13, color: colors.error, marginTop: 8 },
    muted: { fontSize: 12.5, color: colors.textTertiary, marginTop: 8 },
    list: { gap: 8, marginTop: 12 },
    item: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    itemTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
  });
}
