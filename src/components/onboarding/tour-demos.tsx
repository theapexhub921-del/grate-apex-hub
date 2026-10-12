import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, TextInput } from '@/components/ui/text';

import { SubjectGlyph, TopicGlyph } from '@/components/learning/glyphs';
import { ApexWordmark } from '@/components/motion/apex-wordmark';
import { QuestionCard } from '@/components/question-card';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { Interactive } from '@/components/ui/interactive';
import { ProgressRing } from '@/components/ui/progress-ring';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { webStyle } from '@/components/ui/web';
import { cssTransition, MOTION } from '@/constants/motion';
import { elevation, Radius, Type, type ThemeColors } from '@/constants/theme';
import { getCourseTopics, getCoursesForSubject, getLessonQuizBank, getTopic } from '@/data/curriculum';
import { getFeaturedItem } from '@/data/explore';
import { APEX } from '@/data/learning/apex';
import { XP_RULES } from '@/data/learning/xp-rules';
import type { Answer } from '@/data/questions';
import { APPEARANCE_OPTIONS, setAppearancePreference, setPushNotificationsPreference, useAppearancePreference } from '@/data/settings';
import { setUsername, useSocial } from '@/data/social';
import { subjects } from '@/data/subjects';
import { setDisplayName, useDisplayName } from '@/data/user';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { enableDeviceNotifications } from '@/lib/device-notifications';

// Miniature, working pieces of GRATEAPEX for the first-run introduction.
// Everything here is PRACTICE: answers, XP and schedules shown are examples
// and are never recorded — except "Make it yours", whose name and theme
// choices are real settings and say so.

export type DemoProps = { done: boolean; onDone: () => void };

const FIRST_TOPIC_ID = 'fatty-acid-biosynthesis';

// The frame every demo sits in, with an honest label.
export function SimFrame({ children, kind = 'demo', dark = false }: { children: ReactNode; kind?: 'demo' | 'real' | 'guide'; dark?: boolean }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const real = kind === 'real';
  const guide = kind === 'guide';
  return (
    <View style={[styles.frame, dark && styles.frameDark, elevation(colors, 3)]}>
      <View style={[styles.frameLabel, (real || guide) ? styles.frameLabelReal : null]}>
        <Icon name={real ? 'check' : guide ? 'share' : 'sparkle'} size={12} color={real || guide ? colors.successText : colors.accentText} strokeWidth={2.4} />
        <Text style={[styles.frameLabelText, (real || guide) ? styles.frameLabelTextReal : null]}>
          {real ? 'REAL SETTINGS · SAVED TO YOUR PROFILE' : guide ? 'DEVICE GUIDE · INSTALL FOR QUICK ACCESS' : 'TUTORIAL · PRACTICE ONLY — NOT RECORDED'}
        </Text>
      </View>
      <View style={styles.frameBody}>{children}</View>
    </View>
  );
}

export function InstallGuideDemo() {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const steps: { icon: IconName; title: string; detail: string }[] = [
    { icon: 'share', title: 'iPhone or iPad', detail: 'Safari → Share → Add to Home Screen.' },
    { icon: 'home', title: 'Android phone or tablet', detail: 'Chrome → ⋮ → Install app or Add to Home screen.' },
    { icon: 'profile', title: 'Desktop or laptop', detail: 'Chrome/Edge: use the install icon or browser menu. Mac Safari: File → Add to Dock.' },
  ];
  return (
    <SimFrame kind="guide">
      <View style={styles.installGuide}>
        {steps.map((step) => (
          <View key={step.title} style={styles.welcomeRow}>
            <View style={styles.welcomeIcon}>
              <Icon name={step.icon} size={19} color={colors.accentText} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.welcomeTitle}>{step.title}</Text>
              <Text style={styles.muted}>{step.detail}</Text>
            </View>
          </View>
        ))}
        <Text style={styles.muted}>Sign in on each device to sync your account and progress. Find these steps again in Settings → Install on your devices.</Text>
      </View>
    </SimFrame>
  );
}

function DoneNote({ show, text }: { show: boolean; text: string }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  if (!show) return null;
  return (
    <View style={styles.doneNote} accessibilityLiveRegion="polite">
      <Icon name="check" size={14} color={colors.successText} strokeWidth={2.6} />
      <Text style={styles.doneText}>{text}</Text>
    </View>
  );
}

// ── 1. Welcome ──────────────────────────────────────────────────────────
export function WelcomeDemo() {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const rows: { icon: IconName; title: string; text: string }[] = [
    { icon: 'learn', title: 'Learn from your lectures', text: 'Follow your curriculum, practise recall and review concepts.' },
    { icon: 'calendar', title: 'Plan a steady study week', text: 'Build a lesson path, add study times and set goals.' },
    { icon: 'social', title: 'Connect and grow together', text: 'Share with classmates, study in groups and earn progress rewards.' },
  ];
  return (
    <SimFrame>
      <View style={styles.welcome}>
        {rows.map((row) => (
          <View key={row.title} style={styles.welcomeRow}>
            <View style={styles.welcomeIcon}>
              <Icon name={row.icon} size={20} color={colors.accentText} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.welcomeTitle}>{row.title}</Text>
              <Text style={styles.muted}>{row.text}</Text>
            </View>
          </View>
        ))}
      </View>
    </SimFrame>
  );
}

// ── 2. Home: the next best action ──────────────────────────────────────
export function HomeDemo({ done, onDone, nextTitle, greeting }: DemoProps & { nextTitle: string; greeting: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <SimFrame>
      <Text style={styles.miniGreeting}>{greeting}</Text>
      <View style={[styles.miniHero, done && styles.miniHeroDone]}>
        <Text style={styles.miniHeroKicker}>READY FOR THE NEXT LESSON?</Text>
        <Text style={styles.miniHeroTitle}>{nextTitle}</Text>
        <Button label={done ? 'That’s your next step' : 'Begin'} trailing="→" variant="gold" size="sm" onPress={onDone} style={styles.miniHeroButton} />
      </View>
      <View style={styles.miniStats}>
        <MiniStat icon="xp" value="+0" label="XP today" />
        <MiniStat icon="reinforce" value="0" label="reviews due" />
        <MiniStat icon="streak" value="0" label="day streak" />
      </View>
      <DoneNote show={done} text="Feed always points to your best next step — it updates after every lesson, quiz and review." />
    </SimFrame>
  );
}

function MiniStat({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  return (
    <View style={styles.miniStat}>
      <Icon name={icon} size={14} color={icon === 'reinforce' ? colors.primaryText : colors.accentText} filled={icon !== 'reinforce'} />
      <Text style={styles.miniStatValue}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

// ── 3. Learn: Subject → Course → Topic → Lesson ────────────────────────
export function LearnDemo({ done, onDone }: DemoProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const [depth, setDepth] = useState(0);
  const course = getCoursesForSubject('biochemistry')[0];
  const topics = course ? getCourseTopics(course.id).slice(0, 3) : [];
  const topic = topics[0];
  const crumbs = ['Study', 'Biochemistry', course?.title ?? 'Course', topic?.title ?? 'Topic'].slice(0, depth + 1);

  function go(next: number) {
    setDepth(next);
    if (next >= 3) onDone();
  }

  return (
    <SimFrame>
      <View style={styles.crumbs}>
        {crumbs.map((crumb, index) => (
          <View key={crumb + index} style={styles.crumbItem}>
            {index > 0 ? <Icon name="chevronRight" size={11} color={colors.textTertiary} strokeWidth={2.4} /> : null}
            <Text style={[styles.crumbText, index === crumbs.length - 1 && styles.crumbCurrent]} numberOfLines={1}>
              {crumb}
            </Text>
          </View>
        ))}
      </View>
      <Text style={styles.levelLabel}>{['SUBJECTS', 'COURSES', 'TOPICS (IN ORDER)', 'LESSONS'][depth]}</Text>
      <View style={styles.list}>
        {depth === 0
          ? subjects.map((subject) => (
              <DemoRow
                key={subject.id}
                onPress={subject.id === 'biochemistry' ? () => go(1) : undefined}
                left={<SubjectGlyph subject={subject.id} size={30} />}
                title={subject.name}
                meta={subject.id === 'biochemistry' ? 'Tap to open' : 'Lessons in preparation'}
              />
            ))
          : null}
        {depth === 1 && course ? <DemoRow onPress={() => go(2)} left={<Icon name="course" size={20} color={colors.primaryText} />} title={course.title} meta="Your lecture course" /> : null}
        {depth === 2
          ? topics.map((item, index) => (
              <DemoRow
                key={item.id}
                onPress={index === 0 ? () => go(3) : undefined}
                left={<TopicGlyph title={item.title} subject={item.subject} size={30} />}
                title={`${index + 1}. ${item.title}`}
                meta={index === 0 ? 'Start here' : 'Next in the path'}
              />
            ))
          : null}
        {depth === 3 && topic
          ? topic.lessons.slice(0, 3).map((lesson, index) => (
              <DemoRow key={lesson.id} left={<Text style={styles.lessonNumber}>{index + 1}</Text>} title={lesson.title} meta={`~${lesson.estimatedMinutes ?? 8} min`} />
            ))
          : null}
      </View>
      {depth > 0 && !done ? <Button label="Back" variant="ghost" size="sm" onPress={() => setDepth(depth - 1)} style={styles.inlineStart} /> : null}
      <DoneNote show={done} text="Every subject opens into courses, topics in order, then lessons." />
    </SimFrame>
  );
}

function DemoRow({ left, title, meta, onPress }: { left: ReactNode; title: string; meta: string; onPress?: () => void }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const body = (
    <>
      {left}
      <View style={styles.flex}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.rowMeta}>{meta}</Text>
      </View>
      {onPress ? <Icon name="chevronRight" size={16} color={colors.primaryText} /> : null}
    </>
  );
  return onPress ? (
    <Interactive onPress={onPress} accessibilityLabel={title} style={({ hovered }) => [styles.row, styles.rowActive, hovered && styles.rowHover]}>
      {body}
    </Interactive>
  ) : (
    <View style={[styles.row, styles.rowIdle]}>{body}</View>
  );
}

// ── 4. Active recall ───────────────────────────────────────────────────
export function RecallDemo({ done, onDone }: DemoProps) {
  const question = useMemo(() => getLessonQuizBank(`${FIRST_TOPIC_ID}-1`).find((item) => item.type === 'choice'), []);
  const [value, setValue] = useState<Answer | undefined>(undefined);
  if (!question) return <SimFrame>{null}</SimFrame>;
  return (
    <SimFrame>
      <QuestionCard
        question={question}
        value={value}
        onChange={(answer) => {
          setValue(answer);
          onDone();
        }}
        revealed={done}
        shuffleSeed="tour"
        heading="CHECKPOINT · PRACTICE"
      />
    </SimFrame>
  );
}

// ── 5. Reading layer ───────────────────────────────────────────────────
export function ReadDemo({ done, onDone }: DemoProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const lesson = getTopic(FIRST_TOPIC_ID)?.lessons[0];
  const chunk = lesson?.chunks[0];
  const points = (lesson?.highYield ?? lesson?.summary ?? []).slice(0, 3);
  return (
    <SimFrame>
      <Text style={styles.levelLabel}>READ &amp; REVISE · PART 1</Text>
      <Text style={styles.readTitle}>{chunk?.title ?? lesson?.title}</Text>
      <Text style={styles.readText} numberOfLines={5}>
        {chunk?.paragraphs?.[0] ?? lesson?.description}
      </Text>
      {done ? (
        <View style={styles.keyPoints}>
          <View style={styles.keyHeader}>
            <Icon name="xp" size={13} color={colors.accentText} filled />
            <Text style={styles.keyTitle}>HIGH-YIELD</Text>
          </View>
          {points.map((point) => (
            <View key={point} style={styles.bulletRow}>
              <View style={styles.bullet} />
              <Text style={styles.bulletText}>{point}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Button label="Show the key points" variant="secondary" size="sm" onPress={onDone} style={styles.inlineStart} />
      )}
      <DoneNote show={done} text="The reading layer is your reference: every section, with sources and key points." />
    </SimFrame>
  );
}

// ── 6. Lesson quizzes ──────────────────────────────────────────────────
export function QuizDemo({ done, onDone }: DemoProps) {
  const styles = useThemedStyles(createStyles);
  const [mode, setMode] = useState<'instant' | 'submit'>('instant');
  return (
    <SimFrame>
      <Text style={styles.levelLabel}>LESSON QUIZ · HOW DO YOU WANT FEEDBACK?</Text>
      <SegmentedControl<'instant' | 'submit'>
        label="Feedback mode"
        value={mode}
        onChange={(next) => {
          setMode(next);
          onDone();
        }}
        options={[
          { value: 'instant', label: 'Instant feedback' },
          { value: 'submit', label: 'Submit at the end' },
        ]}
      />
      <Text style={styles.readText}>
        {mode === 'instant'
          ? 'See right or wrong, and why, after every answer.'
          : 'Answer everything first, like an exam — explanations on the results page.'}
      </Text>
      <View style={styles.miniStats}>
        <MiniStat icon="lesson" value="25" label="questions max" />
        <MiniStat icon="xp" value={`+${XP_RULES.lessonQuiz.completion}`} label="XP to finish" />
        <MiniStat icon="reinforce" value={`−${XP_RULES.lessonQuiz.wrongPenalty}`} label="XP per miss" />
      </View>
      <DoneNote show={done} text="Each attempt draws a fresh mix — new questions first, then the ones you found hard." />
    </SimFrame>
  );
}

// ── 7. Review & spaced repetition ──────────────────────────────────────
export function ReviewDemo({ done, onDone }: DemoProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const concepts = getTopic(FIRST_TOPIC_ID)?.lessons[0]?.concepts.map((concept) => concept.name) ?? [];
  // An example week: which days concepts come back (illustration only).
  const plan = [0, 2, 0, 1, 0, 0, 3];
  const [picked, setPicked] = useState<number | null>(null);
  const today = new Date();
  return (
    <SimFrame>
      <Text style={styles.levelLabel}>EXAMPLE SCHEDULE · NEXT 7 DAYS</Text>
      <View style={styles.week}>
        {plan.map((count, index) => {
          const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + index);
          const selected = picked === index;
          return (
            <Interactive
              key={index}
              onPress={() => {
                setPicked(index);
                if (count > 0) onDone();
              }}
              accessibilityLabel={`${count} concepts return on day ${index + 1}`}
              style={[styles.day, selected && styles.daySelected]}
            >
              <Text style={[styles.dayLetter, selected && styles.dayTextSelected]}>{date.toLocaleDateString(undefined, { weekday: 'narrow' })}</Text>
              <Text style={[styles.dayNumber, selected && styles.dayTextSelected]}>{date.getDate()}</Text>
              <View style={styles.dayDots}>
                {Array.from({ length: Math.min(count, 3) }, (_, dot) => (
                  <View key={dot} style={[styles.dot, { backgroundColor: selected ? colors.onPrimary : colors.accent }]} />
                ))}
              </View>
            </Interactive>
          );
        })}
      </View>
      <View style={styles.reviewPanel}>
        {picked === null ? (
          <Text style={styles.muted}>Tap a day with dots.</Text>
        ) : plan[picked] === 0 ? (
          <Text style={styles.muted}>Nothing returns that day.</Text>
        ) : (
          concepts.slice(0, plan[picked]).map((name) => (
            <View key={name} style={styles.bulletRow}>
              <View style={[styles.bullet, { backgroundColor: colors.stateLearning }]} />
              <Text style={styles.bulletText}>{name}</Text>
            </View>
          ))
        )}
      </View>
      <DoneNote show={done} text="Concepts come back just before you’d forget them. Weak ones return sooner; review on time and the gaps grow." />
    </SimFrame>
  );
}

// ── 8. XP, ranks and progression ───────────────────────────────────────
export function ProgressDemo({ done, onDone }: DemoProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const xp = done ? 25 : 0;
  const nextRankAt = 530; // the first promotion (data/ranks.ts)
  return (
    <SimFrame>
      <View style={styles.rankRow}>
        <ProgressRing value={xp / nextRankAt} size={74} thickness={6} gradient={['#FFD54A', '#E3A400']} label="Example rank progress">
          <Icon name="rank" size={24} color={colors.accentText} strokeWidth={2.1} />
        </ProgressRing>
        <View style={styles.flex}>
          <Text style={styles.levelLabel}>CURRENT RANK · EXAMPLE</Text>
          <Text style={styles.readTitle}>Fresher</Text>
          <View style={styles.xpLine}>
            <Icon name="xp" size={14} color={colors.accent} filled />
            <AnimatedNumber value={xp} style={styles.xpValue} />
            <Text style={styles.muted}>lifetime XP</Text>
          </View>
        </View>
      </View>
      <Text style={styles.readText}>
        <Text style={styles.strong}>{nextRankAt - xp} XP</Text> to your next rank — its name stays a surprise until you get there.
      </Text>
      <View style={styles.miniStats}>
        <MiniStat icon="streak" value="5 lessons" label="weekly freeze" />
        <MiniStat icon="xp" value="100 coins" label="streak restore" />
      </View>
      {!done ? <Button label="Finish a lesson (example)" variant="gold" size="sm" onPress={onDone} style={styles.inlineStart} /> : null}
      <DoneNote show={done} text="This is a preview: lessons earn XP, five lessons in a week earn a freeze, and 100 Apex Coins can restore a lost streak." />
    </SimFrame>
  );
}

// ── 9. Apex Challenge ──────────────────────────────────────────────────
export function ApexDemo({ done, onDone }: DemoProps) {
  const styles = useThemedStyles(createStyles);
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (left === null || left <= 0) return;
    const timer = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);
  return (
    <SimFrame dark>
      <View style={styles.apexStage}>
        <ApexWordmark size={40} />
        <ProgressRing value={(left ?? APEX.secondsPerQuestion) / APEX.secondsPerQuestion} size={110} thickness={6} color="#FDC00A" trackColor="rgba(255,255,255,0.1)" label="Example question timer">
          <Text style={styles.apexCount}>{left === null ? APEX.secondsPerQuestion : left}</Text>
        </ProgressRing>
        <Text style={styles.apexText}>
          The whole course · {APEX.secondsPerQuestion} seconds a question · answers lock instantly · no second chances.
        </Text>
        {left === null ? (
          <Button
            label="Start the clock"
            variant="apex"
            size="sm"
            trailing="⚡"
            onPress={() => {
              setLeft(APEX.secondsPerQuestion);
              onDone();
            }}
          />
        ) : null}
      </View>
      <DoneNote show={done} text="A separate mastery event — not a lesson quiz. Try it when you’re ready to test a whole course." />
    </SimFrame>
  );
}

// ── 10. Explore ────────────────────────────────────────────────────────
export function ExploreDemo({ done, onDone }: DemoProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const featured = getFeaturedItem();
  return (
    <SimFrame>
      <Interactive onPress={onDone} accessibilityLabel="Open the featured story" style={({ hovered }) => [styles.feature, hovered && styles.featureHover]}>
        <Text style={styles.featureKicker}>FEATURED · {(featured?.topic ?? 'Discovery').toUpperCase()}</Text>
        <Text style={styles.featureTitle}>{featured?.title ?? 'Medicine beyond the syllabus'}</Text>
        {done ? <Text style={styles.featureText}>{featured?.summary}</Text> : <Text style={styles.featureHint}>Tap to read</Text>}
      </Interactive>
      <View style={styles.row}>
        <Icon name="rank" size={18} color={colors.primaryText} />
        <View style={styles.flex}>
          <Text style={styles.rowTitle}>The GrAte Apex Hub journey</Text>
          <Text style={styles.rowMeta}>The full rank ladder, XP rules and leagues</Text>
        </View>
      </View>
      <DoneNote show={done} text="Explore is optional discovery — clinical connections, what’s new, and how progression works. Never graded." />
    </SimFrame>
  );
}

// ── Planning and weekly goals ──────────────────────────────────────────
export function PlanningDemo({ done, onDone }: DemoProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const [days, setDays] = useState(['Mon', 'Wed', 'Fri']);
  const week = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return (
    <SimFrame>
      <Text style={styles.levelLabel}>YOUR WEEK · PRACTICE PLAN</Text>
      <Text style={styles.readText}>Choose study days for a sample weekly timetable.</Text>
      <View style={styles.planDays}>
        {week.map((day) => {
          const selected = days.includes(day);
          return (
            <Interactive
              key={day}
              onPress={() => {
                setDays((current) => selected ? current.filter((item) => item !== day) : [...current, day]);
                onDone();
              }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${day} study day`}
              style={[styles.planDay, selected && styles.planDaySelected]}
            >
              <Text style={[styles.planDayText, selected && styles.planDayTextSelected]}>{day}</Text>
            </Interactive>
          );
        })}
      </View>
      <View style={[styles.row, styles.rowIdle]}>
        <Icon name="calendar" size={18} color={colors.primaryText} />
        <View style={styles.flex}>
          <Text style={styles.rowTitle}>{days.length ? `${days.length} study blocks` : 'No study blocks yet'}</Text>
          <Text style={styles.rowMeta}>{days.length ? days.join(' · ') : 'Choose a day above to add one'}</Text>
        </View>
      </View>
      <View style={[styles.row, styles.rowIdle]}>
        <Icon name="achievement" size={18} color={colors.accentText} />
        <View style={styles.flex}>
          <Text style={styles.rowTitle}>Goals</Text>
          <Text style={styles.rowMeta}>Track lesson, XP or streak targets</Text>
        </View>
      </View>
      <DoneNote show={done} text="Open the study planner in Study and View goals on Feed. This preview did not save anything." />
    </SimFrame>
  );
}

// ── Connect ────────────────────────────────────────────────────────────
export function SocialDemo({ done, onDone }: DemoProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const [section, setSection] = useState('Friends');
  const previews: Record<string, { title: string; detail: string; icon: IconName }> = {
    Friends: { title: 'Find your classmates', detail: 'Send and manage friend requests.', icon: 'profile' },
    Groups: { title: 'Study groups', detail: 'Invite friends and discuss a course together.', icon: 'social' },
    Messages: { title: 'Private messages', detail: 'Text friends you have connected with.', icon: 'mail' },
    Sessions: { title: 'Table Conferences', detail: 'Schedule a text-first study session. Live calls are coming later.', icon: 'calendar' },
  };
  const preview = previews[section];
  return (
    <SimFrame>
      <Text style={styles.levelLabel}>CONNECT · PRACTICE</Text>
      <View style={styles.connectSections}>
        {Object.keys(previews).map((name) => {
          const selected = name === section;
          return (
            <Interactive
              key={name}
              onPress={() => {
                setSection(name);
                onDone();
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={[styles.themeChip, selected && styles.themeChipSelected]}
            >
              <Text style={[styles.connectSectionText, selected && styles.themeTextSelected]}>{name}</Text>
            </Interactive>
          );
        })}
      </View>
      <View style={[styles.row, styles.rowActive]}>
        <Icon name={preview.icon} size={20} color={colors.primaryText} />
        <View style={styles.flex}>
          <Text style={styles.rowTitle}>{preview.title}</Text>
          <Text style={styles.rowMeta}>{preview.detail}</Text>
        </View>
      </View>
      <DoneNote show={done} text="Connect includes friends, groups, messages and text-first study sessions. This sample did not send or save anything." />
    </SimFrame>
  );
}

// ── Make it yours (REAL settings) ──────────────────────────────────────
export function PersonaliseDemo({ onDone }: DemoProps) {
  const styles = useThemedStyles(createStyles);
  const savedName = useDisplayName();
  const appearance = useAppearancePreference();
  const [name, setName] = useState(savedName ?? '');
  const [saved, setSaved] = useState(false);

  async function saveName() {
    if (!name.trim() || name.trim() === (savedName ?? '')) return;
    await setDisplayName(name);
    setSaved(true);
    onDone();
  }

  return (
    <SimFrame kind="real">
      <Text style={styles.levelLabel}>WHAT SHOULD WE CALL YOU?</Text>
      <View style={styles.nameRow}>
        <TextInput
          value={name}
          onChangeText={(text) => {
            setName(text);
            setSaved(false);
          }}
          onSubmitEditing={() => void saveName()}
          onBlur={() => void saveName()}
          placeholder="Your name"
          maxLength={30}
          autoCapitalize="words"
          style={styles.nameInput}
          accessibilityLabel="Your name"
        />
        {saved ? <Text style={styles.savedText}>Saved</Text> : null}
      </View>
      <Text style={styles.muted}>Shown on Feed as “Doc. {name.trim() || 'you'}”.</Text>

      <Text style={[styles.levelLabel, styles.spaced]}>THEME</Text>
      <View style={styles.themeRow}>
        {APPEARANCE_OPTIONS.map((theme) => (
          <Interactive
            key={theme.value}
            onPress={() => {
              setAppearancePreference(theme.value);
              onDone();
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: appearance === theme.value }}
            accessibilityLabel={`${theme.label} theme`}
            style={[styles.themeChip, appearance === theme.value && styles.themeChipSelected]}
          >
            <Text style={[styles.themeText, appearance === theme.value && styles.themeTextSelected]}>{theme.label}</Text>
          </Interactive>
        ))}
      </View>
      <Text style={styles.muted}>Change any of these later in You and Settings. You can also upload your own photo there.</Text>
    </SimFrame>
  );
}

// ── Username (REAL account setting) ───────────────────────────────────
export function UsernameDemo({ done, onDone }: DemoProps) {
  const styles = useThemedStyles(createStyles);
  const social = useSocial();
  const [value, setValue] = useState(social.username ?? '');
  const [saved, setSaved] = useState(Boolean(social.username));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (value.length < 3 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await setUsername(value);
      setSaved(true);
      onDone();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save your username. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SimFrame kind="real">
      <Text style={styles.levelLabel}>HOW CLASSMATES FIND YOU</Text>
      <View style={styles.nameRow}>
        <TextInput
          value={value}
          onChangeText={(text) => { setValue(text.toLowerCase().replace(/[^a-z0-9_]/g, '')); setSaved(false); }}
          onSubmitEditing={() => void save()}
          placeholder="e.g. doc_amara"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
          style={styles.nameInput}
          accessibilityLabel="Choose your username"
        />
        <Button label={saved ? 'Saved' : 'Save'} size="sm" onPress={() => void save()} loading={busy} disabled={value.length < 3 || busy} />
      </View>
      <Text style={styles.muted}>Your username appears beside your name when classmates search, add or study with you. Use 3–20 lowercase letters, numbers or underscores.</Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <DoneNote show={done || saved} text={`Saved as @${social.username ?? value}. You can change this later in Connect.`} />
    </SimFrame>
  );
}

// ── Device notifications (REAL preference) ─────────────────────────────
export function NotificationsDemo({ done, onDone }: DemoProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function enable() {
    if (busy) return;
    setBusy(true);
    const result = await enableDeviceNotifications();
    await setPushNotificationsPreference(result.granted);
    setMessage(result.granted ? 'Device notifications are on. A test notification has been sent.' : result.message ?? 'Notifications were not enabled.');
    if (result.granted) onDone();
    setBusy(false);
  }

  return (
    <SimFrame kind="real">
      <View style={styles.row}>
        <View style={styles.welcomeIcon}><Icon name="bell" size={20} color={colors.primaryText} /></View>
        <View style={styles.flex}>
          <Text style={styles.rowTitle}>Stay updated outside the app</Text>
          <Text style={styles.rowMeta}>Allow alerts for friend requests, study reminders and the notification categories you choose.</Text>
        </View>
      </View>
      <Button label="Allow notifications" variant="secondary" size="sm" onPress={() => void enable()} loading={busy} />
      {message ? <Text style={styles.muted}>{message}</Text> : null}
      <Text style={styles.muted}>You can change this at any time in Settings → Notifications.</Text>
      <DoneNote show={done} text="You will receive selected updates as device alerts while the installed web app is in the background." />
    </SimFrame>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    strong: { fontWeight: '800', color: colors.text },
    muted: { fontSize: 13, lineHeight: 19, color: colors.textSecondary },
    spaced: { marginTop: 14 },
    inlineStart: { alignSelf: 'flex-start', marginTop: 4 },

    frame: {
      borderRadius: Radius.xl,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.hairline,
      overflow: 'hidden',
    },
    frameDark: { backgroundColor: colors.apexBackground, borderColor: 'rgba(253,192,10,0.25)' },
    frameLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.accentSubtle,
      borderBottomWidth: 1,
      borderBottomColor: colors.hairline,
    },
    frameLabelReal: { backgroundColor: colors.successSubtle },
    frameLabelText: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: colors.accentText },
    frameLabelTextReal: { color: colors.successText },
    frameBody: { padding: 18, gap: 12 },

    doneNote: {
      flexDirection: 'row',
      gap: 8,
      padding: 10,
      borderRadius: 12,
      backgroundColor: colors.successSubtle,
      borderWidth: 1,
      borderColor: colors.successBorder,
    },
    doneText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: colors.text },

    welcome: { gap: 14 },
    installGuide: { gap: 16 },
    welcomeRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    welcomeIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.accentSubtle, alignItems: 'center', justifyContent: 'center' },
    welcomeTitle: { ...Type.headline, color: colors.text },

    miniGreeting: { ...Type.title3, color: colors.text },
    miniHero: {
      borderRadius: Radius.lg,
      padding: 16,
      backgroundColor: '#0A2A84',
      borderWidth: 1,
      borderColor: 'rgba(140,175,255,0.28)',
      gap: 6,
      ...webStyle({ backgroundImage: 'linear-gradient(135deg, #123FB8 0%, #0A2A84 60%, #081F66 100%)', ...cssTransition('box-shadow', MOTION.standard) }),
    },
    miniHeroDone: { boxShadow: '0px 0px 0px 3px rgba(253,192,10,0.45)' },
    miniHeroKicker: { ...Type.overline, fontSize: 10, color: '#FFD04A' },
    miniHeroTitle: { ...Type.title3, color: '#FFFFFF' },
    miniHeroButton: { alignSelf: 'flex-start', marginTop: 6 },
    miniStats: { flexDirection: 'row', gap: 8 },
    miniStat: { flex: 1, minWidth: 0, gap: 2, padding: 10, borderRadius: 12, backgroundColor: colors.surfaceMuted },
    miniStatValue: { ...Type.numeral, fontSize: 17, color: colors.text },
    miniStatLabel: { fontSize: 10.5, fontWeight: '700', color: colors.textSecondary },

    crumbs: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 },
    crumbItem: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%' },
    crumbText: { fontSize: 11.5, fontWeight: '700', color: colors.textTertiary },
    crumbCurrent: { color: colors.text },
    levelLabel: { ...Type.overline, fontSize: 10, color: colors.textTertiary },
    list: { gap: 8 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14 },
    rowActive: { backgroundColor: colors.primarySubtle, borderWidth: 1, borderColor: colors.primaryBorder },
    rowIdle: { backgroundColor: colors.surfaceMuted },
    rowHover: { borderColor: colors.primary },
    rowTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
    rowMeta: { fontSize: 11.5, color: colors.textSecondary, marginTop: 1 },
    lessonNumber: { ...Type.numeral, width: 30, textAlign: 'center', fontSize: 15, color: colors.primaryText },

    readTitle: { ...Type.title3, color: colors.text },
    readText: { fontSize: 14, lineHeight: 21, color: colors.textSecondary },
    keyPoints: { gap: 6, padding: 12, borderRadius: 14, backgroundColor: colors.accentSubtle },
    keyHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    keyTitle: { ...Type.overline, fontSize: 10, color: colors.accentText },
    bulletRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
    bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent, marginTop: 7 },
    bulletText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.text },

    week: { flexDirection: 'row', gap: 6 },
    day: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 8, borderRadius: 14, backgroundColor: colors.surfaceMuted },
    daySelected: { backgroundColor: colors.primary },
    dayLetter: { fontSize: 10.5, fontWeight: '700', color: colors.textTertiary },
    dayNumber: { ...Type.numeral, fontSize: 15, color: colors.text },
    dayTextSelected: { color: colors.onPrimary },
    dayDots: { flexDirection: 'row', gap: 3, height: 6 },
    dot: { width: 5, height: 5, borderRadius: 3 },
    reviewPanel: { minHeight: 52, padding: 12, borderRadius: 14, backgroundColor: colors.surfaceSunken, gap: 6, justifyContent: 'center' },

    rankRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    xpLine: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
    xpValue: { ...Type.numeral, fontSize: 15, color: colors.text },

    apexStage: { alignItems: 'center', gap: 14, paddingVertical: 6 },
    apexCount: { ...Type.numeral, fontSize: 34, color: '#FDC00A' },
    apexText: { fontSize: 13, lineHeight: 19, color: '#C9D6F7', textAlign: 'center', maxWidth: 340 },

    feature: {
      padding: 16,
      borderRadius: Radius.lg,
      backgroundColor: '#0A2A84',
      gap: 4,
      ...webStyle({ backgroundImage: 'radial-gradient(90% 120% at 100% 0%, rgba(253,192,10,0.18), transparent 50%), linear-gradient(140deg, #1446C8 0%, #0A2A84 60%)' }),
    },
    featureHover: { boxShadow: '0px 0px 0px 2px rgba(253,192,10,0.45)' },
    featureKicker: { ...Type.overline, fontSize: 10, color: '#FFD04A' },
    featureTitle: { ...Type.title3, color: '#FFFFFF' },
    featureText: { fontSize: 13, lineHeight: 19, color: '#D3DEFA' },
    featureHint: { fontSize: 12, fontWeight: '700', color: '#FFD04A' },

    chart: { flexDirection: 'row', gap: 8, height: 80, alignItems: 'flex-end' },
    chartTrack: { flex: 1, height: '100%', borderRadius: 8, backgroundColor: colors.surfaceSunken, justifyContent: 'flex-end', overflow: 'hidden' },
    chartBar: { width: '100%', borderRadius: 8 },

    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    nameInput: {
      flex: 1,
      minHeight: 46,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSunken,
      paddingHorizontal: 14,
      fontSize: 15,
      color: colors.text,
    },
    savedText: { fontSize: 12.5, fontWeight: '800', color: colors.successText },
    errorText: { fontSize: 12.5, lineHeight: 18, color: colors.error },
    themeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    planDays: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
    planDay: { minWidth: 43, paddingVertical: 9, paddingHorizontal: 8, alignItems: 'center', borderRadius: 11, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border },
    planDaySelected: { backgroundColor: colors.primarySubtle, borderColor: colors.primary },
    planDayText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
    planDayTextSelected: { color: colors.primaryText },
    connectSections: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
    connectSectionText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
    themeChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border },
    themeChipSelected: { backgroundColor: colors.primarySubtle, borderColor: colors.primary },
    themeText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
    themeTextSelected: { color: colors.primaryText },
  });
}
