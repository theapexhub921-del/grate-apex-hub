import { router } from 'expo-router';
import { type ReactNode, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LogoMark } from '@/components/logo-mark';
import { AnimatedContent } from '@/components/motion';
import {
  ApexDemo,
  ExploreDemo,
  HomeDemo,
  InstallGuideDemo,
  LearnDemo,
  NotificationsDemo,
  PersonaliseDemo,
  PlanningDemo,
  ProgressDemo,
  QuizDemo,
  ReadDemo,
  RecallDemo,
  ReviewDemo,
  SimFrame,
  SocialDemo,
  UsernameDemo,
  WelcomeDemo,
} from '@/components/onboarding/tour-demos';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { webStyle } from '@/components/ui/web';
import { cssTransition, MOTION } from '@/constants/motion';
import { elevation, isDesktopWidth, Radius, Type, type ThemeColors } from '@/constants/theme';
import { ABOUT_US } from '@/data/about';
import { EXPLORE_TEAM } from '@/data/explore';
import { getNextActions } from '@/data/learning/next-action';
import { useLearning } from '@/data/learning/use-learning';
import { acceptCurrentLegalVersions, completeOnboarding, needsLegalAcceptance } from '@/data/onboarding';
import { useDisplayName } from '@/data/user';
import { useAuth } from '@/hooks/use-auth';
import { useGreeting } from '@/hooks/use-greeting';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { InlineNotice } from '@/components/ui/state-views';
import { Interactive } from '@/components/ui/interactive';

// The first-run introduction: a short, interactive walk through a
// miniature GRATEAPEX. Skippable at any point; finishing or skipping is
// remembered (data/onboarding.ts). Replay from Settings.

type Chapter = {
  id: string;
  icon: IconName;
  kicker: string;
  title: string;
  body: string;
  tryIt?: string;
  demo: (props: { done: boolean; onDone: () => void }) => ReactNode;
};

export function OnboardingTour({ replay = false }: { replay?: boolean }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = isDesktopWidth(width);
  const { user } = useAuth();
  const { inputs } = useLearning();
  const { greeting } = useGreeting();
  const displayName = useDisplayName();
  const nextAction = useMemo(() => getNextActions(inputs)[0], [inputs]);
  const name = displayName?.trim() ? `Doc. ${displayName.trim()}` : 'Doc.';

  const [index, setIndex] = useState(0);
  const [doneSteps, setDoneSteps] = useState<Record<string, boolean>>({});
  const [leaving, setLeaving] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [legalSaved, setLegalSaved] = useState(false);
  const [legalSaving, setLegalSaving] = useState(false);
  const [legalError, setLegalError] = useState<string | null>(null);
  const showLegalGate = !legalSaved && needsLegalAcceptance(user);

  const chapters: Chapter[] = [
    {
      id: 'welcome',
      icon: 'sparkle',
      kicker: 'WELCOME',
      title: `Welcome to GrAte Apex Hub, ${name}`,
      body: 'A quick tour of the main features. Try each sample as you go — practice actions do not change your learning progress.',
      demo: () => <WelcomeDemo />,
    },
    {
      id: 'about-us',
      icon: 'profile',
      kicker: 'ABOUT US',
      title: 'A learning companion for medical students',
      body: ABOUT_US,
      demo: () => (
        <SimFrame>
          <View style={styles.aboutTeam}>
            <Text style={styles.finishKicker}>MEET THE TEAM</Text>
            {EXPLORE_TEAM.map((member) => (
              <View key={member.name} style={styles.aboutTeamRow}>
                <View style={styles.aboutTeamIcon}>
                  <Icon name={member.icon} size={16} color={colors.primaryText} />
                </View>
                <View style={styles.teamMemberCopy}>
                  <Text style={styles.aboutTeamName}>{member.name}</Text>
                  <Text style={styles.aboutTeamRole}>{member.role}</Text>
                </View>
              </View>
            ))}
          </View>
        </SimFrame>
      ),
    },
    {
      id: 'home',
      icon: 'home',
      kicker: 'HOME',
      title: 'Your study circle, all in one place',
      body: 'Feed is your social space. Watch and share Stories, post photos, videos and study moments, then like, comment on, reply to and reshare posts from friends.',
      tryIt: 'See how Stories and the community feed work.',
      demo: (props) => <HomeDemo {...props} nextTitle={nextAction?.title ?? 'Your next lesson is waiting in Study'} greeting={`${greeting}, ${name}`} />,
    },
    {
      id: 'learn',
      icon: 'learn',
      kicker: 'LEARN',
      title: 'Subjects → courses → topics → lessons',
      body: 'Choose your class and semester, then follow its subjects, courses, topics and lessons in order. Question of the Day, past questions, flashcards and your timetable are in Study too.',
      tryIt: 'Tap your way down to a lesson.',
      demo: (props) => <LearnDemo {...props} />,
    },
    {
      id: 'recall',
      icon: 'mastery',
      kicker: 'LEARN ACTIVELY',
      title: 'Answer first, then learn why',
      body: 'Lessons are interactive: you try to recall before you’re told. Wrong answers are expected — they decide what comes back for review.',
      tryIt: 'Answer the practice question.',
      demo: (props) => <RecallDemo {...props} />,
    },
    {
      id: 'read',
      icon: 'book',
      kicker: 'READ & REVISE',
      title: 'The reference layer',
      body: 'Every lesson also has a reading version: the full explanation, the slide sources, high-yield points and common confusions.',
      tryIt: 'Show the key points.',
      demo: (props) => <ReadDemo {...props} />,
    },
    {
      id: 'quiz',
      icon: 'lesson',
      kicker: 'LESSON QUIZZES',
      title: 'Check your understanding',
      body: 'After a lesson, take its quiz with instant feedback or as an exam. Results show your strengths, what to revise, and let you practise the misses.',
      tryIt: 'Switch the feedback mode.',
      demo: (props) => <QuizDemo {...props} />,
    },
    {
      id: 'review',
      icon: 'reinforce',
      kicker: 'REVIEW',
      title: 'Spaced repetition, built in',
      body: 'Each concept is scheduled to come back just before you would forget it. Your review calendar in Study shows what’s due and when.',
      tryIt: 'Tap a day with dots.',
      demo: (props) => <ReviewDemo {...props} />,
    },
    {
      id: 'progress',
      icon: 'rank',
      kicker: 'XP, LEAGUES & STREAKS',
      title: 'Progress that builds good habits',
      body: 'Learning earns XP and advances your rank. Each week you compete in a league on that week’s XP. Weekly challenges can earn streak freezes, and Apex Coins can restore a lost streak.',
      tryIt: 'Finish an example lesson.',
      demo: (props) => <ProgressDemo {...props} />,
    },
    {
      id: 'planning',
      icon: 'calendar',
      kicker: 'PLAN YOUR WEEK',
      title: 'Turn your goals into a study routine',
      body: 'Build your timetable in Study and set lesson, XP or streak goals in Your progress. Your next learning step is always waiting in Study.',
      tryIt: 'Choose days for a sample study timetable.',
      demo: (props) => <PlanningDemo {...props} />,
    },
    {
      id: 'apex',
      icon: 'challenge',
      kicker: 'APEX CHALLENGE & BATTLES',
      title: 'The mastery test',
      body: 'A timed run across a whole course. Fast, serious and separate from lesson quizzes — your best score is your benchmark. In Connect you can also battle a friend on the same questions.',
      tryIt: 'Start the clock.',
      demo: (props) => <ApexDemo {...props} />,
    },
    {
      id: 'explore',
      icon: 'explore',
      kicker: 'EXPLORE',
      title: 'Explore every feature',
      body: 'Explore explains how each part of GrAte Apex Hub works, shares announcements, and shows what is coming next. There is more to discover in Explore.',
      tryIt: 'See the feature guide and updates.',
      demo: (props) => <ExploreDemo {...props} />,
    },
    {
      id: 'social',
      icon: 'social',
      kicker: 'CONNECT',
      title: 'Study with your classmates',
      body: 'Follow classmates and message friends or groups with photos, documents and voice notes — swipe a message to reply. Keep friend streaks going, and join study groups and Table Conferences. Voice and video calls are coming later.',
      tryIt: 'Explore a sample group or study session.',
      demo: (props) => <SocialDemo {...props} />,
    },
    {
      id: 'team',
      icon: 'profile',
      kicker: 'MEET THE TEAM',
      title: 'The people behind GrAte Apex Hub',
      body: 'The people building and supporting GrAte Apex Hub.',
      demo: () => (
        <SimFrame>
          <View style={styles.aboutTeam}>
            {EXPLORE_TEAM.map((member) => (
              <View key={member.name} style={styles.aboutTeamRow}>
                <View style={styles.aboutTeamIcon}><Icon name={member.icon} size={16} color={colors.accentText} /></View>
                <View style={styles.teamMemberCopy}>
                  <Text style={styles.aboutTeamName}>{member.name}</Text>
                  <Text style={styles.aboutTeamRole}>{member.role}</Text>
                </View>
              </View>
            ))}
          </View>
        </SimFrame>
      ),
    },
    {
      id: 'personalise',
      icon: 'profile',
      kicker: 'PROFILE & SETTINGS',
      title: 'Make it yours',
      body: 'Choose a profile photo, an illustrated avatar or initials, add an About line, and set your theme, text zoom and navigation style. You can change these anytime in You and Settings.',
      tryIt: 'Make the app feel like yours (optional).',
      demo: (props) => <PersonaliseDemo {...props} />,
    },
    {
      id: 'username',
      icon: 'social',
      kicker: 'YOUR USERNAME',
      title: 'Let classmates recognise you',
      body: 'Choose a username for Connect. It appears beside your name when classmates search for you, add you as a friend or study with you.',
      tryIt: 'Save the username classmates will use to find you.',
      demo: (props) => <UsernameDemo {...props} />,
    },
    {
      id: 'notifications',
      icon: 'bell',
      kicker: 'NOTIFICATIONS',
      title: 'Stay updated beyond the app',
      body: 'Allow device alerts for messages, follow requests, league promotions and study reminders. You can change notification categories at any time in Settings.',
      tryIt: 'Allow notifications to receive a test alert.',
      demo: (props) => <NotificationsDemo {...props} />,
    },
    {
      id: 'install',
      icon: 'share',
      kicker: 'INSTALL ON YOUR DEVICES',
      title: 'Keep GrAte Apex Hub close at hand',
      body: 'Add the app to your home screen or desktop for quick access. No app-store download is needed.',
      demo: () => <InstallGuideDemo />,
    },
    {
      id: 'finish',
      icon: 'achievement',
      kicker: 'YOU’RE READY',
      title: `You’re all set, ${name}`,
      body: 'Open Study for lessons, practice and your plan, Feed for Stories and posts, Connect for messages and classmates, and Explore for the feature guide and updates. Replay this introduction anytime from Settings.',
      demo: () => (
        <SimFrame kind="real">
          <View style={styles.finish}>
            <View style={styles.finishIcon}>
              <Icon name="play" size={22} color="#0A1F5C" filled />
            </View>
            <Text style={styles.finishKicker}>READY TO BEGIN?</Text>
            <Text style={styles.finishTitle}>Start where you need most</Text>
            <Text style={styles.finishText}>Lessons and plans in Study · classmates in Connect · discoveries and updates in Explore</Text>
          </View>
        </SimFrame>
      ),
    },
  ];

  const last = chapters.length - 1;
  const chapter = chapters[index];
  const done = Boolean(doneSteps[chapter.id]);

  async function finish(how: 'finished' | 'skipped') {
    if (leaving) return;
    setLeaving(true);
    if (user) await completeOnboarding(user.id, how);
    // First time through: suggest the gold-tick accounts to follow.
    if (!replay) { router.replace('/suggested' as never); return; }
    router.replace('/');
  }

  async function acceptLegal() {
    if (!termsChecked || !privacyChecked || legalSaving) return;
    setLegalSaving(true);
    setLegalError(null);
    const result = await acceptCurrentLegalVersions();
    setLegalSaving(false);
    if (result.error) {
      setLegalError(result.error);
      return;
    }
    setLegalSaved(true);
  }

  const next = () => (index === last ? void finish('finished') : setIndex(Math.min(last, index + 1)));
  const back = () => setIndex(Math.max(0, index - 1));

  useKeyboardShortcuts({
    ArrowRight: next,
    ArrowLeft: index > 0 ? back : undefined,
    Escape: index < last ? () => void finish('skipped') : undefined,
  });

  const progress = (
    <View style={styles.progress} accessibilityLabel={`Step ${index + 1} of ${chapters.length}`}>
      {chapters.map((item, i) => (
        <View key={item.id} style={[styles.segment, i <= index && styles.segmentDone, i === index && styles.segmentCurrent]} />
      ))}
    </View>
  );

  const text = (
    <View style={styles.textBlock}>
      <View style={styles.kickerRow}>
        <View style={styles.kickerIcon}>
          <Icon name={chapter.icon} size={16} color="#0A1F5C" strokeWidth={2.2} />
        </View>
        <Text style={styles.kicker}>{chapter.kicker}</Text>
        <Text style={styles.stepCount}>
          {index + 1} / {chapters.length}
        </Text>
      </View>
      <Text style={styles.title} accessibilityRole="header">
        {chapter.title}
      </Text>
      <Text style={styles.body}>{chapter.body}</Text>
      {chapter.tryIt ? (
        <View style={[styles.tryIt, done && styles.tryItDone]}>
          <Icon name={done ? 'check' : 'sparkle'} size={14} color={done ? colors.successText : colors.accentText} strokeWidth={2.4} />
          <Text style={styles.tryItText}>{done ? 'Nice — that’s how it works.' : `Try it: ${chapter.tryIt}`}</Text>
        </View>
      ) : null}
    </View>
  );

  const controls = (
    <View style={[styles.controls, !desktop && { paddingBottom: insets.bottom + 14 }]}>
      {index > 0 ? (
        <Button label="Back" variant="ghost" icon={<Icon name="chevronLeft" size={16} color={colors.text} />} onPress={back} />
      ) : (
        <View />
      )}
      <Button
        label={index === 0 ? 'Start the tour' : index === last ? (replay ? 'Back to Feed' : 'Go to Feed') : 'Next'}
        trailing="→"
        variant={index === last ? 'gold' : 'primary'}
        size="lg"
        loading={leaving}
        onPress={next}
        style={styles.nextButton}
      />
    </View>
  );

  const demo = (
    <AnimatedContent key={chapter.id} style={styles.demo}>
      {chapter.demo({ done, onDone: () => setDoneSteps((current) => ({ ...current, [chapter.id]: true })) })}
    </AnimatedContent>
  );

  if (showLegalGate) {
    return (
      <View style={styles.root}>
        <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
          <View style={styles.brand}>
            <LogoMark height={24} />
            <Text style={styles.brandText}>WELCOME TO GrAte Apex Hub</Text>
          </View>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={[styles.legalContent, desktop && styles.contentDesktop]}>
          <View style={styles.textBlock}>
            <Text style={styles.kicker}>BEFORE WE BEGIN</Text>
            <Text style={styles.title} accessibilityRole="header">A clear start for your account</Text>
            <Text style={styles.body}>Please review and explicitly accept the current Terms & Conditions and acknowledge the Privacy Policy. We record each version and the time you accept it with your account.</Text>
          </View>
          <View style={styles.legalChecks}>
            <ConsentRow checked={termsChecked} onPress={() => setTermsChecked((value) => !value)} label="I have read and agree to the Terms & Conditions." onOpen={() => router.push('/terms' as never)} linkLabel="Read Terms & Conditions" />
            <ConsentRow checked={privacyChecked} onPress={() => setPrivacyChecked((value) => !value)} label="I have read and acknowledge the Privacy Policy." onOpen={() => router.push('/privacy' as never)} linkLabel="Read Privacy Policy" />
          </View>
          {legalError ? <InlineNotice tone="error" title="Acceptance was not saved" message={legalError} /> : null}
          <View style={styles.controls}>
            <View />
            <Button label="Accept and continue" variant="gold" size="lg" loading={legalSaving} disabled={!termsChecked || !privacyChecked} onPress={() => void acceptLegal()} />
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <View style={styles.brand}>
          <LogoMark height={24} />
          <Text style={styles.brandText}>{replay ? 'INTRODUCTION · REPLAY' : 'INTRODUCTION'}</Text>
        </View>
        {index < last ? <Button label="Skip" variant="ghost" size="sm" onPress={() => void finish('skipped')} accessibilityLabel="Skip the introduction" /> : null}
      </View>
      {progress}

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, desktop && styles.contentDesktop]} keyboardShouldPersistTaps="handled">
        {desktop ? (
          <View style={styles.columns}>
            <View style={styles.left}>
              <AnimatedContent key={`text-${chapter.id}`}>{text}</AnimatedContent>
              {controls}
            </View>
            <View style={styles.right}>{demo}</View>
          </View>
        ) : (
          <>
            <AnimatedContent key={`text-${chapter.id}`}>{text}</AnimatedContent>
            {demo}
          </>
        )}
      </ScrollView>

      {!desktop ? controls : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1 },
    flex: { flex: 1, minWidth: 0 },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10 },
    brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    brandText: { ...Type.overline, letterSpacing: 1.6, color: colors.textSecondary },
    progress: { flexDirection: 'row', gap: 4, paddingHorizontal: 20 },
    segment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.track, ...webStyle(cssTransition('background-color', MOTION.standard)) },
    segmentDone: { backgroundColor: colors.primary },
    segmentCurrent: { backgroundColor: colors.accent },
    scroll: { flex: 1 },
    legalContent: { padding: 24, paddingBottom: 36, gap: 26, width: '100%', maxWidth: 720, alignSelf: 'center', flexGrow: 1, justifyContent: 'center' },
    legalChecks: { gap: 12 },
    consentRow: { gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: Radius.lg, backgroundColor: colors.surface, padding: 16 },
    consentMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    consentBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
    consentBoxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
    consentLabel: { flex: 1, ...Type.callout, color: colors.text, fontWeight: '700' },
    consentLink: { ...Type.caption, color: colors.primaryText, fontWeight: '800', paddingLeft: 34 },
    content: { padding: 20, paddingBottom: 32, gap: 18, width: '100%', maxWidth: 640, alignSelf: 'center' },
    contentDesktop: { maxWidth: 1120, paddingTop: 48, paddingHorizontal: 40, flexGrow: 1, justifyContent: 'center' },
    columns: { flexDirection: 'row', alignItems: 'center', gap: 56 },
    left: { width: 420, gap: 28 },
    right: { flex: 1, minWidth: 0, maxWidth: 560 },
    demo: { width: '100%' },
    textBlock: { gap: 10 },
    kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    kickerIcon: { width: 28, height: 28, borderRadius: 9, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
    kicker: { ...Type.overline, color: colors.accentText, flex: 1 },
    stepCount: { ...Type.numeral, fontSize: 13, color: colors.textTertiary },
    title: { ...Type.display, fontSize: 32, lineHeight: 38, color: colors.text },
    body: { ...Type.body, fontSize: 16, lineHeight: 25, color: colors.textSecondary },
    tryIt: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      alignSelf: 'flex-start',
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: colors.accentSubtle,
      borderWidth: 1,
      borderColor: colors.accent + '55',
    },
    tryItDone: { backgroundColor: colors.successSubtle, borderColor: colors.successBorder },
    tryItText: { fontSize: 13, fontWeight: '700', color: colors.text },
    controls: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 12,
    },
    nextButton: { minWidth: 168 },
    finish: { alignItems: 'center', gap: 8, paddingVertical: 10 },
    finishIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', ...elevation(colors, 2) },
    finishKicker: { ...Type.overline, color: colors.textTertiary, marginTop: 6 },
    finishTitle: { ...Type.title2, color: colors.text, textAlign: 'center' },
    finishText: { fontSize: 14, lineHeight: 20, color: colors.textSecondary, textAlign: 'center' },
    aboutTeam: { gap: 10, paddingVertical: 4 },
    aboutTeamRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
    aboutTeamIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.accentSubtle, alignItems: 'center', justifyContent: 'center' },
    teamMemberCopy: { flex: 1, minWidth: 0 },
    aboutTeamName: { ...Type.callout, color: colors.text, fontWeight: '700' },
    aboutTeamRole: { ...Type.caption, color: colors.textSecondary, marginTop: 1 },
    radius: { borderRadius: Radius.lg },
  });
}

function ConsentRow({ checked, onPress, label, onOpen, linkLabel }: {
  checked: boolean;
  onPress: () => void;
  label: string;
  onOpen: () => void;
  linkLabel: string;
}) {
  const colors = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.consentRow}>
      <Interactive onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={label} style={styles.consentMain}>
        <View style={[styles.consentBox, checked && styles.consentBoxChecked]}>{checked ? <Icon name="check" size={14} color={colors.onPrimary} strokeWidth={3} /> : null}</View>
        <Text style={styles.consentLabel}>{label}</Text>
      </Interactive>
      <Interactive onPress={onOpen} accessibilityRole="link" style={styles.consentLink}><Text style={styles.consentLink}>{linkLabel}</Text></Interactive>
    </View>
  );
}
