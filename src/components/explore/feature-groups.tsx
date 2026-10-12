import { useEffect, useState, type ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { ExploreDemo, LearnDemo, ReviewDemo, SimFrame, type DemoProps } from '@/components/onboarding/tour-demos';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { Card, Interactive } from '@/components/ui/interactive';
import { Pill } from '@/components/ui/pill';
import { Sheet } from '@/components/ui/sheet';
import { Type, type ThemeColors } from '@/constants/theme';
import { EXPLORE_GUIDE } from '@/data/explore';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

type Feature = { title: string; detail: string; status?: string };
type Group = { id: string; icon: IconName; title: string; summary: string; demo: ComponentType<DemoProps>; features: Feature[] };
const groups: Group[] = [
  { id: 'study', icon: 'learn', title: 'Learn & build mastery', summary: 'Lessons, quizzes, reviews, XP, ranks and challenges.', demo: LearnDemo, features: [...EXPLORE_GUIDE.filter((item) => ['Study', 'XP and ranks', 'Learning power-ups', 'Leagues', 'Learning streak', 'Apex Challenge', 'Past Question Bank'].includes(item.title)), { title: 'Lessons, quizzes and spaced review', detail: 'Learn from course material, practise recall and revisit concepts when due.', status: 'available' }] },
  { id: 'planning', icon: 'calendar', title: 'Plan & stay on track', summary: 'Study plans, timetables, goals and reminders.', demo: ReviewDemo, features: [...EXPLORE_GUIDE.filter((item) => ['Study Plans', 'Timetable', 'Goals', 'Notifications'].includes(item.title)), { title: 'Study planner', detail: 'Choose topics and set up a lesson path and weekly timetable.', status: 'available' }] },
  { id: 'community', icon: 'social', title: 'Study with people', summary: 'Classmates, posts, study groups and messages.', demo: CommunityDemo, features: [...EXPLORE_GUIDE.filter((item) => ['Connect', 'Friend streaks, freezes and restores', 'Study groups and discussions', 'Messages', 'Table Conferences', 'Live voice calls', 'Posts, reactions, comments and reshares'].includes(item.title)), { title: 'Stories and community feed', detail: 'Share study moments and interact with classmates.', status: 'available' }] },
  { id: 'personal', icon: 'profile', title: 'Make it yours', summary: 'Your profile, appearance, settings and app controls.', demo: PersonalDemo, features: [...EXPLORE_GUIDE.filter((item) => ['You', 'Settings', 'Widgets and personalization', 'Install and share the app'].includes(item.title)), { title: 'Study widget', detail: 'Keep your XP, streak and lesson progress in a compact laptop window.', status: 'available' }, { title: 'Appearance and navigation', detail: 'Choose a theme, web zoom and how you move around the app.', status: 'available' }] },
  { id: 'discovery', icon: 'explore', title: 'Explore & discover', summary: 'Medical ideas, research, updates and what is coming next.', demo: ExploreDemo, features: [{ title: 'Medical concepts and connections', detail: 'Explore ideas bridging foundational science and clinical settings.', status: 'available' }, { title: 'Emerging research', detail: 'Read dated, evidence-labelled summaries of peer-reviewed findings.', status: 'available' }, { title: 'Product updates and roadmap', detail: 'See what is new and which features are in development.', status: 'available' }, { title: 'AI tutor and voice', detail: 'Lecture-grounded chat and voice support are being prepared.', status: 'coming-soon' }] },
];

export function ExploreFeatureGroups() {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tourIndex, setTourIndex] = useState<number | null>(null);
  return <>
    <View style={styles.grid}>{groups.map((group, index) => <Card key={group.id} style={styles.group}>
      <View style={styles.heading}><View style={styles.icon}><Icon name={group.icon} size={19} color={colors.primaryText} /></View><View style={styles.copy}><Text style={styles.title}>{group.title}</Text><Text style={styles.detail}>{group.summary}</Text></View></View>
      <View style={styles.actions}>
        <Interactive onPress={() => setExpanded(expanded === group.id ? null : group.id)} style={styles.action}><Text style={styles.actionText}>{expanded === group.id ? 'Hide features' : `View ${group.features.length} features`}</Text><Icon name={expanded === group.id ? 'chevronUp' : 'chevronDown'} size={15} color={colors.primaryText} /></Interactive>
        <Interactive onPress={() => setTourIndex(index)} style={styles.action}><Text style={styles.actionText}>Try this group</Text><Icon name="play" size={14} color={colors.primaryText} /></Interactive>
      </View>
      {expanded === group.id ? <View style={styles.list}>{group.features.map((feature) => { const status = feature.status === 'available' ? 'Available' : feature.status === 'limited' ? 'In progress' : feature.status === 'coming-soon' ? 'Coming soon' : feature.status; return <View key={feature.title} style={styles.feature}><View style={styles.copy}><Text style={styles.featureTitle}>{feature.title}</Text><Text style={styles.detail}>{feature.detail}</Text></View>{status ? <Pill label={status} tone={status === 'Available' ? 'primary' : 'neutral'} /> : null}</View>; })}</View> : null}
    </Card>)}</View>
    {tourIndex !== null ? <Walkthrough group={groups[tourIndex]} onClose={() => setTourIndex(null)} onNext={() => setTourIndex((tourIndex + 1) % groups.length)} /> : null}
  </>;
}

function Walkthrough({ group, onClose, onNext }: { group: Group; onClose: () => void; onNext: () => void }) {
  const styles = useThemedStyles(createStyles);
  const [done, setDone] = useState(false);
  const Demo = group.demo;
  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(onClose, 1800);
    return () => clearTimeout(timer);
  }, [done, onClose]);
  return <Sheet visible onClose={onClose} title={group.title} subtitle={group.summary} width={700} footer={<View style={styles.tourActions}><Button label="Close tour" variant="ghost" size="sm" onPress={onClose} /><Button label="Next theme" variant="gold" size="sm" onPress={onNext} trailing="→" /></View>}>
    <Text style={styles.detail}>Try the sample below. It is practice only and does not change your account or learning progress. {done ? 'Finished — closing shortly.' : ''}</Text>
    <Demo key={group.id} done={done} onDone={() => setDone(true)} />
  </Sheet>;
}

function CommunityDemo({ done, onDone }: DemoProps) {
  const styles = useThemedStyles(createStyles);
  const [liked, setLiked] = useState(false);
  return <SimFrame><Text style={styles.simKicker}>YOUR STUDY CIRCLE · PRACTICE</Text><View style={styles.samplePost}><Text style={styles.simTitle}>Biochemistry study group</Text><Text style={styles.detail}>Ama shared a quick recap of today’s lecture with the group.</Text><Interactive onPress={() => { setLiked((value) => !value); onDone(); }} style={styles.simAction}><Icon name="social" size={16} color="#3159C8" /><Text style={styles.actionText}>{liked ? 'Liked · 4' : 'Like · 3'}</Text></Interactive></View><Text style={styles.detail}>{done ? 'That reaction is only part of this sample and was not posted.' : 'Tap Like to try a sample feed action.'}</Text></SimFrame>;
}

function PersonalDemo({ done, onDone }: DemoProps) {
  const styles = useThemedStyles(createStyles);
  const [choice, setChoice] = useState('Apex');
  return <SimFrame><Text style={styles.simKicker}>PROFILE & APPEARANCE · PRACTICE</Text><Text style={styles.simTitle}>Choose a sample theme</Text><View style={styles.themeOptions}>{['Apex', 'Light', 'Dark'].map((theme) => <Interactive key={theme} onPress={() => { setChoice(theme); onDone(); }} style={[styles.themeOption, choice === theme && styles.themeOptionSelected]}><Text style={[styles.actionText, choice === theme && styles.themeSelectedText]}>{theme}</Text></Interactive>)}</View><Text style={styles.detail}>{done ? `${choice} is selected for this preview only. Your real settings are unchanged.` : 'Try a theme option. This preview will not change your saved settings.'}</Text></SimFrame>;
}
function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, group: { flexBasis: '31%', flexGrow: 1, minWidth: 285, gap: 13, padding: 17 },
    heading: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 }, icon: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.primarySubtle, alignItems: 'center', justifyContent: 'center' },
    copy: { flex: 1, minWidth: 0, gap: 3 }, title: { ...Type.headline, color: colors.text }, detail: { fontSize: 13, lineHeight: 19, color: colors.textSecondary },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 11 }, action: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 3 }, actionText: { fontSize: 12, fontWeight: '800', color: colors.primaryText },
    list: { gap: 11, paddingTop: 4 },
    simKicker: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: colors.textTertiary },
    simTitle: { ...Type.headline, color: colors.text },
    samplePost: { gap: 8, padding: 14, borderRadius: 14, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.hairline },
    simAction: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 9, backgroundColor: colors.primarySubtle },
    themeOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    themeOption: { paddingVertical: 8, paddingHorizontal: 13, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted },
    themeOptionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySubtle },
    themeSelectedText: { color: colors.primaryText }, feature: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }, featureTitle: { fontSize: 13, fontWeight: '800', color: colors.text },
    tour: { marginTop: 16, gap: 14, padding: 20, borderColor: colors.primaryBorder }, tourHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 }, kicker: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: colors.accentText, marginBottom: 5 }, close: { padding: 5 }, tourActions: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 },
  });
}
