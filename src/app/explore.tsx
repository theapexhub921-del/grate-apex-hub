import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '@/components/ui/text';

import { Icon } from '@/components/ui/icon';
import { ExploreFeatureGroups } from '@/components/explore/feature-groups';
import { FeatureGuideSimulator } from '@/components/explore/feature-guide-simulator';
import { OrganisationSimulator } from '@/components/explore/organisation-simulator';
import { PwaInstallCard } from '@/components/pwa-install-card';
import { Card, Interactive } from '@/components/ui/interactive';
import { Pill } from '@/components/ui/pill';
import { PageHeader, Screen, SectionHeader } from '@/components/ui/screen';
import { isDesktopWidth, Type, type ThemeColors } from '@/constants/theme';
import { POWERUP_MULTIPLIERS, XP_RULES } from '@/data/learning/xp-rules';
import { useProgress } from '@/data/progress';
import { getRankProgress, LEAGUE_RULES, RANKS } from '@/data/ranks';
import { CONTACT_EMAIL, openContactEmail } from '@/lib/contact';
import { routes } from '@/lib/routes';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { EXPLORE_TEAM, getExploreAnnouncements, getItemsByCategory, type ExploreAnnouncement, type ExploreItem } from '@/data/explore';
import { ABOUT_US } from '@/data/about';
import { useWeeklyExploreSession } from '@/data/weekly-explore';
import { weeklyCoursePicks } from '@/data/weekly-explore-picks';
import { type LiveResearch, useWeeklyResearch } from '@/data/weekly-research';
import { useNow } from '@/data/learning/use-learning';

function DiscoveryCard({ item }: { item: ExploreItem }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const [expanded, setExpanded] = useState(false);
  return (
    <Card style={styles.discoveryCard}>
      <View style={styles.discoveryTop}><Pill label={item.topic} tone="primary" />{item.category === 'research' ? <Pill label={item.research?.evidenceType ?? 'Research'} /> : null}</View>
      <Text style={styles.featureTitle}>{item.title}</Text>
      <Text style={styles.featureDescription}>{item.summary}</Text>
      {expanded ? (
        <View style={styles.discoveryDetails}>
          {item.connectionSteps?.length ? (
            <View style={styles.pathway}>
              {item.connectionSteps.map((step, index) => (
                <View key={step.label} style={styles.pathStep}>
                  <View style={styles.pathStepHead}><View style={styles.pathNode}><Text style={styles.pathNodeText}>{index + 1}</Text></View><Text style={styles.pathLabel}>{step.label}</Text></View>
                  <Text style={styles.featureDescription}>{step.detail}</Text>
                </View>
              ))}
            </View>
          ) : <Text style={styles.featureDescription}>{item.basicIdea}</Text>}
          {item.whyItMatters ? <View style={styles.detailBlock}><Text style={styles.detailLabel}>Why it matters</Text><Text style={styles.featureDescription}>{item.whyItMatters}</Text></View> : null}
          {item.research ? (
            <>
              <View style={styles.detailBlock}><Text style={styles.detailLabel}>What we know</Text><Text style={styles.featureDescription}>{item.research.whatWeKnow}</Text></View>
              <View style={styles.detailBlock}><Text style={styles.detailLabel}>What remains uncertain</Text><Text style={styles.featureDescription}>{item.research.whatRemainsUncertain}</Text></View>
              <Text style={styles.researchCaveat}>Supplementary research summary. It is not clinical guidance or authoritative course material.</Text>
            </>
          ) : null}
          {item.sources.map((source) => source.url ? (
            <Interactive key={source.url} onPress={() => void Linking.openURL(source.url!)} accessibilityRole="link" style={styles.sourceLink}>
              <Icon name="book" size={14} color={colors.primaryText} /><Text style={styles.sourceText}>{source.title}</Text>
            </Interactive>
          ) : <Text key={source.title} style={styles.sourceText}>{source.title}</Text>)}
          {item.action ? <Interactive onPress={() => router.push(item.action!.href as never)} accessibilityRole="link" style={styles.sourceLink}><Text style={styles.sourceText}>{item.action.label}</Text><Icon name="chevronRight" size={15} color={colors.primaryText} /></Interactive> : null}
        </View>
      ) : null}
      <Interactive onPress={() => setExpanded((value) => !value)} accessibilityRole="button" accessibilityLabel={`${expanded ? 'Collapse' : 'Explore'} ${item.title}`} style={styles.discoveryToggle}>
        <Text style={styles.discoveryToggleText}>{expanded ? 'Show less' : item.category === 'research' ? 'Read research summary' : 'Explore concept'}</Text>
        <Icon name={expanded ? 'chevronUp' : 'chevronDown'} size={16} color={colors.primaryText} />
      </Interactive>
    </Card>
  );
}

/** A paper from this week's research (Europe PMC): shown as published, with the authors' abstract. */
function LiveResearchCard({ item }: { item: LiveResearch }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const [expanded, setExpanded] = useState(false);
  const date = item.date ? new Date(`${item.date}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  return (
    <Card style={styles.discoveryCard}>
      <View style={styles.discoveryTop}><Pill label={item.theme} tone="primary" /><Pill label={item.design} /></View>
      <Text style={styles.featureTitle}>{item.title}</Text>
      <Text style={styles.featureDescription}>{[item.journal, date].filter(Boolean).join(' · ')}{item.authors ? `
${item.authors}` : ''}</Text>
      {expanded ? (
        <View style={styles.discoveryDetails}>
          {item.abstract ? <View style={styles.detailBlock}><Text style={styles.detailLabel}>Abstract (from the authors)</Text><Text style={styles.featureDescription}>{item.abstract}</Text></View> : null}
          <Text style={styles.researchCaveat}>Chosen automatically from Europe PMC this week and shown as published. It is not clinical guidance or course material.</Text>
          <Interactive onPress={() => void Linking.openURL(item.url)} accessibilityRole="link" style={styles.sourceLink}>
            <Icon name="book" size={14} color={colors.primaryText} /><Text style={styles.sourceText}>Read the paper on Europe PMC</Text>
          </Interactive>
        </View>
      ) : null}
      <Interactive onPress={() => setExpanded((value) => !value)} accessibilityRole="button" accessibilityLabel={`${expanded ? 'Collapse' : 'Read'} ${item.title}`} style={styles.discoveryToggle}>
        <Text style={styles.discoveryToggleText}>{expanded ? 'Show less' : 'Read the abstract'}</Text>
        <Icon name={expanded ? 'chevronUp' : 'chevronDown'} size={16} color={colors.primaryText} />
      </Interactive>
    </Card>
  );
}

function AnnouncementCard({ item }: { item: ExploreAnnouncement }) {
  const styles = useThemedStyles(createStyles);
  const label = item.status === 'available' ? 'Available' : item.status === 'preview' ? 'Preview' : 'Coming soon';
  return <Card style={styles.announcementCard}><View style={styles.announcementHeader}><Icon name="sparkle" size={18} color="#0A1F5C" /><Pill label={`${new Date(`${item.publishedAt}T00:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })} · ${label}`} tone="gold" /></View><Text style={styles.featureTitle}>{item.title}</Text><Text style={styles.featureDescription}>{item.summary}</Text></Card>;
}

// The four first steps, under the welcome (links to the real places).
const START_HERE: readonly { icon: 'learn' | 'home' | 'social' | 'sparkle'; label: string; detail: string; href: string }[] = [
  { icon: 'learn', label: 'Study a lesson', detail: 'Pick up your class curriculum', href: '/learn' },
  { icon: 'home', label: 'Share a post', detail: 'Stories, photos and videos', href: '/' },
  { icon: 'social', label: 'Find classmates', detail: 'Follow people and make friends', href: '/social/friends' },
  { icon: 'sparkle', label: 'Make it yours', detail: 'Experience and theme', href: '/settings' },
];

export default function ExploreScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const weeklySession = useWeeklyExploreSession();
  const [noEmailApp, setNoEmailApp] = useState(false);
  const emailUs = () => void openContactEmail().then((opened) => setNoEmailApp(!opened));
  const weeklyItems = weeklySession?.items ?? [];
  // Refreshed every Monday: course concepts and connections, and live research.
  const now = useNow();
  const week = useMemo(() => weeklyCoursePicks(now), [now]);
  const research = useWeeklyResearch();
  const updated = new Date(`${week.week}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
  const upcoming = weeklySession ? new Date(`${weeklySession.week_start}T00:00:00`) > new Date() : false;
  const weekLabel = weeklySession
    ? new Date(`${weeklySession.week_start}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : '';

  return (
    <Screen width="wide">
      <PageHeader eyebrow="The GrAte Apex Hub guide" title="Explore" subtitle="A friendly guide to studying, connecting and growing with GrAte Apex Hub." />

      {/* Discovery first (owner request): concepts, connections and research; the
          welcome and the simulations follow. */}

      {weeklySession ? <SectionHeader title={`${upcoming ? 'Next week' : 'This week'} · ${weeklySession.title}`} subtitle={`${weeklySession.summary} Begins ${weekLabel}.`} style={styles.section} /> : null}

      <View style={styles.weekPill}><Pill label={`This week · updated ${updated}`} tone="gold" /><Text style={styles.weekNote}>New concepts, connections and research every Monday.</Text></View>
      <SectionHeader title="Medical concepts" subtitle="This week’s ideas from your course lessons, plus a few that sit across the curriculum." style={styles.firstSection} />
      <View style={styles.featureGrid}>{[...week.concepts, ...getItemsByCategory('concept'), ...weeklyItems.filter((item) => item.category === 'concept')].map((item) => <DiscoveryCard key={item.id} item={item} />)}</View>

      <SectionHeader title="Connections" subtitle="Follow a mechanism from foundational science to what it can mean in a clinical setting." style={styles.section} />
      <View style={styles.featureGrid}>{[...week.connections, ...getItemsByCategory('connection'), ...weeklyItems.filter((item) => item.category === 'connection')].map((item) => <DiscoveryCard key={item.id} item={item} />)}</View>

      <SectionHeader title="Emerging research" subtitle="The newest peer-reviewed reviews and trials on this week’s themes (from Europe PMC), dated and labelled by study design. Research here is supplemental and does not replace course material." style={styles.section} />
      {research.status === 'loading' ? <Text style={styles.weekNote}>Finding this week’s research…</Text> : null}
      {research.status === 'offline' ? <Text style={styles.weekNote}>This week’s research couldn’t be loaded right now — showing earlier summaries.</Text> : null}
      <View style={styles.featureGrid}>{research.items.map((item) => <LiveResearchCard key={item.id} item={item} />)}{[...getItemsByCategory('research'), ...weeklyItems.filter((item) => item.category === 'research')].map((item) => <DiscoveryCard key={item.id} item={item} />)}</View>

      <View style={[styles.introGrid, styles.section]}>
        <Card style={styles.introCard}>
          <View style={styles.introBrand}><Icon name="sparkle" size={22} color={colors.accentText} /><Text style={styles.introLabel}>WELCOME TO GrAte Apex Hub</Text></View>
          <Text style={styles.introTitle}>Learn your way. Rise together.</Text>
          <Text style={styles.introBody}>Bring your lecture material into focused lessons, practise with fresh questions, and return to concepts when they are due. Feed is your social space for Stories and community posts. Explore explains every feature, shares updates and shows what is coming next.</Text>
          {/* Start here: fills the card to the simulation's height with the four first steps. */}
          <View style={styles.startGrid}>
            {START_HERE.map((item) => (
              <Interactive key={item.label} onPress={() => router.push(item.href as never)} accessibilityRole="link" style={({ hovered }) => [styles.startTile, hovered && styles.startTileHover]}>
                <View style={styles.startIcon}><Icon name={item.icon} size={18} color={colors.primaryText} /></View>
                <View style={styles.flex}>
                  <Text style={styles.startLabel}>{item.label}</Text>
                  <Text style={styles.startDetail}>{item.detail}</Text>
                </View>
                <Icon name="chevronRight" size={16} color={colors.textTertiary} />
              </Interactive>
            ))}
          </View>
          <View style={styles.introActions}>
            <Interactive onPress={() => router.push(routes.onboarding({ replay: true }))} accessibilityRole="button" style={styles.guideLink}>
              <Icon name="learn" size={16} color={colors.primaryText} /><Text style={styles.guideLinkText}>Replay the full introduction</Text>
            </Interactive>
            <Interactive onPress={emailUs} accessibilityRole="link" style={styles.guideLink}>
              <Icon name="mail" size={16} color={colors.primaryText} /><Text style={styles.guideLinkText}>Questions or ideas? Contact us</Text>
            </Interactive>
          </View>
        </Card>
        {/* "How GrAte Apex Hub is organised": a tap-through simulation (owner request). */}
        <OrganisationSimulator />
      </View>

      <PwaInstallCard />
      <SectionHeader title="Explore by theme" subtitle="Related features are grouped together. Open a theme for details, or try a short interactive walkthrough." style={styles.section} />
      <ExploreFeatureGroups />
      <SectionHeader title="GrAte Apex Hub feature guide" subtitle="A plain-language guide to the app, its systems and the features you can explore." style={styles.section} />
      {/* A guided tour of every feature (owner request: a simulation, not a wall of cards). */}
      <FeatureGuideSimulator />
      <SectionHeader title="What's New" subtitle="Dated product updates, kept separate from medical research." style={styles.section} />
      <View style={styles.featureGrid}>{getExploreAnnouncements().map((item) => <AnnouncementCard key={item.id} item={item} />)}</View>

      <SectionHeader title="About GrAte Apex Hub" subtitle="A learning companion built around your course material and your study circle." style={styles.section} />
      <Card style={styles.aboutCard}>
        <Text style={styles.featureDescription}>{ABOUT_US}</Text>
      </Card>

      <SectionHeader title="Meet the team" subtitle="The people building and supporting GrAte Apex Hub." style={styles.section} />
      <View style={styles.featureGrid}>
        {EXPLORE_TEAM.map((member) => <Card key={member.name} style={styles.teamCard}>
          <View style={styles.featureIcon}><Icon name={member.icon} size={19} color={colors.primaryText} /></View>
          <Text style={styles.featureTitle}>{member.name}</Text>
          <Text style={styles.featureDescription}>{member.role}</Text>
        </Card>)}
      </View>
      <Card style={[styles.aboutCard, styles.contactCard]}>
        <Text style={styles.featureTitle}>Contact us</Text>
        <Text style={styles.featureDescription}>Send the GrAte Apex Hub team a question, idea or feedback.</Text>
        <Interactive onPress={emailUs} accessibilityRole="link" style={styles.guideLink}>
          <Icon name="mail" size={16} color={colors.primaryText} /><Text style={styles.guideLinkText}>Email the GrAte Apex Hub team</Text>
        </Interactive>
        {/* Always visible, so the address can be copied if no email app opens. */}
        <Text selectable style={styles.featureDescription}>
          {noEmailApp ? 'No email app could be opened on this device. ' : 'Or write to us at '}
          <Text selectable style={styles.contactAddress}>{CONTACT_EMAIL}</Text>
        </Text>
      </Card>

      <Journey />
    </Screen>
  );
}

// "The GrAte Apex Hub journey" — the one place the full rank ladder is revealed.
// Everyday screens only ever show the current rank and the gap to the next.
function Journey() {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const { width } = useWindowDimensions();
  const desktop = isDesktopWidth(width);
  const progress = useProgress();
  const current = getRankProgress(progress.xp);
  const ready = RANKS.every((rank) => rank.minXp !== null);
  if (!ready) return null;

  const ladder = (
    <Card style={styles.ladderCard}>
      {RANKS.map((rank, index) => {
        const reached = progress.xp >= (rank.minXp ?? 0);
        const isCurrent = current?.rank.id === rank.id;
        const last = index === RANKS.length - 1;
        return (
          <View key={rank.id} style={styles.ladderRow}>
            <View style={styles.ladderRail}>
              <View style={[styles.ladderNode, reached && styles.ladderNodeReached, isCurrent && styles.ladderNodeCurrent]}>
                {reached ? <Icon name={isCurrent ? 'rank' : 'check'} size={isCurrent ? 14 : 12} color={isCurrent ? '#0A1F5C' : colors.onPrimary} strokeWidth={2.4} /> : null}
              </View>
              {!last ? <View style={[styles.ladderLine, reached && styles.ladderLineReached]} /> : null}
            </View>
            <View style={[styles.ladderText, !last && styles.ladderTextSpaced]}>
              <View style={styles.ladderTitleRow}>
                <Text style={[styles.ladderName, !reached && styles.ladderNameLocked]}>{rank.name}</Text>
                {isCurrent ? <Pill label="You are here" tone="gold" /> : null}
              </View>
              <Text style={styles.ladderXp}>{(rank.minXp ?? 0).toLocaleString()} XP</Text>
            </View>
          </View>
        );
      })}
    </Card>
  );

  const rules = (
    <View style={styles.rulesColumn}>
      <Card style={styles.ruleCard}>
        <View style={styles.ruleHeader}>
          <Icon name="xp" size={18} color={colors.accentText} filled />
          <Text style={styles.ruleTitle}>How XP works</Text>
        </View>
        <Text style={styles.ruleText}>
          Meaningful tasks earn {XP_RULES.taskMin}–{XP_RULES.taskMax} XP: a lesson, a quiz, a review session, an Apex run. Each reward is given once per source.
        </Text>
        <Text style={styles.ruleText}>
          Wrong answers in lesson and topic quizzes cost {XP_RULES.lessonQuiz.wrongPenalty} XP each. Review and practising wrong answers never cost XP — forgetting is expected there.
        </Text>
      </Card>
      <Card style={styles.ruleCard}>
        <View style={styles.ruleHeader}>
          <Icon name="sparkle" size={18} color={colors.accentText} />
          <Text style={styles.ruleTitle}>Power-ups</Text>
          <Pill label="Available" tone="primary" />
        </View>
        <View style={styles.multipliers}>
          {POWERUP_MULTIPLIERS.filter((value) => value > 1).map((value) => (
            <View key={value} style={styles.multiplier}>
              <Text style={styles.multiplierText}>×{value}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.ruleText}>Complete a lesson or quiz to earn a boost. Streak milestones and sharing the app also earn boosts. The strongest stored boost applies to your next lesson or quiz; boosts multiply XP gains only.</Text>
      </Card>
      <Card style={styles.ruleCard}>
        <View style={styles.ruleHeader}>
          <Icon name="rank" size={18} color={colors.primaryText} />
          <Text style={styles.ruleTitle}>Leagues</Text>
        </View>
        <Text style={styles.ruleText}>
          Weekly, among learners at your rank. The top {Math.round(LEAGUE_RULES.promotionShare * 100)}% advance — only if they also meet the next level&apos;s XP requirement. The bottom {Math.round(LEAGUE_RULES.relegationShare * 100)}% move down; everyone else stays.
        </Text>
      </Card>
    </View>
  );

  return (
    <View style={styles.journey}>
      <SectionHeader
        title="The GrAte Apex Hub journey"
        subtitle="Lifetime XP carries you from Fresher to Immortal — 10,000,000 XP, the original GrAte Apex ranks. Each rank takes about two and a half times the last."
        style={styles.section}
      />
      {desktop ? (
        <View style={styles.journeyRow}>
          <View style={styles.flex}>{ladder}</View>
          <View style={styles.journeySide}>{rules}</View>
        </View>
      ) : (
        <View style={styles.rulesColumn}>
          {ladder}
          {rules}
        </View>
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    section: { marginTop: 34 },
    firstSection: { marginTop: 4 },
    weekPill: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 4, marginBottom: 6 },
    weekNote: { fontSize: 13, color: colors.textSecondary, marginBottom: 8 },
    introGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'stretch' },
    startGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
    startTile: { flexBasis: '47%', flexGrow: 1, minWidth: 200, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted },
    startTileHover: { borderColor: colors.primaryBorder },
    startIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySubtle },
    startLabel: { fontSize: 14, fontWeight: '800', color: colors.text },
    startDetail: { fontSize: 12, lineHeight: 16, color: colors.textSecondary, marginTop: 1 },
    introCard: { flex: 1.35, minWidth: 300, gap: 12, padding: 24, justifyContent: 'space-between' },
    introBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    introLabel: { ...Type.overline, color: colors.accentText },
    introTitle: { ...Type.title1, color: colors.text },
    introBody: { fontSize: 14, lineHeight: 21, color: colors.textSecondary },
    introActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
    guideLink: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.primarySubtle },
    guideLinkText: { fontSize: 13, fontWeight: '700', color: colors.primaryText },
    contactAddress: { fontWeight: '700', color: colors.text },
    featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    featureCard: { flexBasis: '31%', flexGrow: 1, minWidth: 230, gap: 9, padding: 16 },
    featureTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    featureIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.primarySubtle, alignItems: 'center', justifyContent: 'center' },
    featureTitle: { ...Type.headline, color: colors.text },
    featureDescription: { fontSize: 13, lineHeight: 19, color: colors.textSecondary },
    announcementCard: { flexBasis: '48%', flexGrow: 1, minWidth: 270, gap: 10, padding: 18 },
    announcementHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    aboutCard: { gap: 12, padding: 18 },
    contactCard: { marginTop: 14 },
    widgetCard: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 14, padding: 18 },
    widgetCopy: { flex: 1, minWidth: 260, gap: 5 },
    teamCard: { flex: 1, minWidth: 180, gap: 10, padding: 18 },
    discoveryCard: { flexBasis: '48%', flexGrow: 1, minWidth: 280, gap: 11, padding: 18 },
    discoveryTop: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
    discoveryDetails: { borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 12, gap: 12 },
    discoveryToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 11 },
    discoveryToggleText: { fontSize: 13, fontWeight: '800', color: colors.primaryText },
    pathway: { gap: 10 },
    pathStep: { gap: 5, borderLeftWidth: 1.5, borderLeftColor: colors.primaryBorder, marginLeft: 12, paddingLeft: 14, paddingBottom: 3 },
    pathStepHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    pathNode: { width: 23, height: 23, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySubtle },
    pathNodeText: { fontSize: 11, fontWeight: '800', color: colors.primaryText },
    pathLabel: { fontSize: 13, fontWeight: '800', color: colors.text },
    detailBlock: { gap: 4 },
    detailLabel: { fontSize: 12, fontWeight: '800', color: colors.text },
    researchCaveat: { fontSize: 11, lineHeight: 16, color: colors.textTertiary },
    sourceLink: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', paddingVertical: 4 },
    sourceText: { fontSize: 12, lineHeight: 17, color: colors.primaryText, flexShrink: 1, fontWeight: '700' },

    journey: { marginTop: 6 },
    journeyRow: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
    journeySide: { width: 380 },
    rulesColumn: { gap: 14 },
    ladderCard: { paddingVertical: 20 },
    ladderRow: { flexDirection: 'row', gap: 14 },
    ladderRail: { alignItems: 'center', width: 28 },
    ladderNode: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 2,
      borderColor: colors.borderStrong,
      backgroundColor: colors.surfaceSunken,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ladderNodeReached: { backgroundColor: colors.primary, borderColor: colors.primary },
    ladderNodeCurrent: { backgroundColor: colors.accent, borderColor: colors.accent, boxShadow: `0px 0px 0px 4px ${colors.accent}33` },
    ladderLine: { flex: 1, width: 2, minHeight: 18, backgroundColor: colors.border, marginVertical: 2 },
    ladderLineReached: { backgroundColor: colors.primary },
    ladderText: { flex: 1, minWidth: 0, paddingTop: 2 },
    ladderTextSpaced: { paddingBottom: 16 },
    ladderTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
    ladderName: { fontSize: 15, fontWeight: '800', color: colors.text },
    ladderNameLocked: { color: colors.textSecondary, fontWeight: '700' },
    ladderXp: { ...Type.numeral, fontSize: 12, fontWeight: '700', color: colors.textTertiary, marginTop: 2 },
    ruleCard: { gap: 10 },
    ruleHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    ruleTitle: { ...Type.headline, color: colors.text, flex: 1 },
    ruleText: { fontSize: 13, lineHeight: 19, color: colors.textSecondary },
    multipliers: { flexDirection: 'row', gap: 8 },
    multiplier: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.accent + '88',
      backgroundColor: colors.accentSubtle,
    },
    multiplierText: { ...Type.numeral, fontSize: 14, color: colors.accentText },
  });
}
