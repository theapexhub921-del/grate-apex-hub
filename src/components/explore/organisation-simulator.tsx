import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { SubjectGlyph } from '@/components/learning/glyphs';
import { MOBILE_NAV_ITEMS, NavIconView } from '@/components/nav-items';
import { Icon, type IconName } from '@/components/ui/icon';
import { Card } from '@/components/ui/interactive';
import { Pill } from '@/components/ui/pill';
import { Text } from '@/components/ui/text';
import { webStyle } from '@/components/ui/web';
import { MOTION } from '@/constants/motion';
import { Type, type ThemeColors } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

// Explore → "How GrAte Apex Hub is organised", as a small simulation: a phone
// with the five tabs. Tap one (or let it play) to see a sample screen and what
// lives there. Sample screens only — no real names or numbers.

type TabInfo = { title: string; detail: string };

const TABS: Record<string, TabInfo> = {
  '/': { title: 'Feed', detail: 'Stories and posts from everyone. Like, comment, repost, and tap a name to open their profile and follow them.' },
  '/social': { title: 'Connect', detail: 'Find classmates, create study groups, discuss assignments and message accepted friends.' },
  '/learn': { title: 'Study', detail: 'Your class’s courses — lessons section by section, practice in four question types, Apex Challenges, your week and your goals.' },
  '/explore': { title: 'Explore', detail: 'Learn what each feature does, see announcements and discover what’s being built.' },
  '/profile': { title: 'You', detail: 'Your profile, achievements, progress and settings — including the experience and theme you chose.' },
};

const AUTOPLAY_MS = 4200;

export function OrganisationSimulator() {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [touched, setTouched] = useState(false);
  const [fade] = useState(() => new Animated.Value(1));
  const first = useRef(true);
  const item = MOBILE_NAV_ITEMS[index];
  const info = TABS[item.path];

  // Plays through the tabs until the learner taps one (never under reduced motion).
  useEffect(() => {
    if (touched || reduceMotion) return;
    const timer = setTimeout(() => setIndex((value) => (value + 1) % MOBILE_NAV_ITEMS.length), AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [index, touched, reduceMotion]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduceMotion) return;
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: MOTION.standard, useNativeDriver: false }).start();
  }, [index, fade, reduceMotion]);

  return (
    <Card style={styles.card} tone="insight">
      <View style={styles.head}>
        <Text style={styles.title}>How GrAte Apex Hub is organised</Text>
        <Pill label="Simulation" tone="primary" />
      </View>
      <Text style={styles.lead}>Five tabs, one place each. Tap a tab on the phone to see what lives there.</Text>

      <View style={styles.body}>
        <View style={styles.phone} accessibilityRole="tablist" accessibilityLabel="Simulated app">
          <Animated.View style={[styles.screen, { opacity: fade }]}>
            <SampleScreen path={item.path} />
          </Animated.View>
          <View style={styles.bar}>
            {MOBILE_NAV_ITEMS.map((tab, i) => {
              const selected = i === index;
              return (
                <Pressable
                  key={tab.route}
                  onPress={() => {
                    setTouched(true);
                    setIndex(i);
                  }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Show ${tab.label}`}
                  style={[styles.barItem, selected && styles.barItemOn, webStyle({ cursor: 'pointer' })]}
                >
                  <NavIconView icon={tab.icon} size={16} color={selected ? colors.navActive : colors.navInactive} active={selected} />
                  <Text style={[styles.barLabel, selected && { color: colors.navActive }]}>{tab.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.explain} accessibilityLiveRegion="polite">
          <Text style={styles.step}>{String(index + 1).padStart(2, '0')} / 05</Text>
          <Text style={styles.tabTitle}>{info.title}</Text>
          <Text style={styles.detail}>{info.detail}</Text>
          <View style={styles.dots}>
            {MOBILE_NAV_ITEMS.map((tab, i) => (
              <View key={tab.route} style={[styles.dot, i === index && styles.dotOn]} />
            ))}
          </View>
          <Text style={styles.note}>Sample screens — not your data.</Text>
        </View>
      </View>
    </Card>
  );
}

function Bar({ width, strong = false }: { width: `${number}%`; strong?: boolean }) {
  const styles = useThemedStyles(createStyles);
  return <View style={[styles.line, strong && styles.lineStrong, { width }]} />;
}

function Row({ icon, children }: { icon: IconName; children: React.ReactNode }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}><Icon name={icon} size={13} color={colors.primaryText} /></View>
      <View style={styles.rowBody}>{children}</View>
    </View>
  );
}

function SampleScreen({ path }: { path: string }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  if (path === '/') {
    return (
      <View style={styles.sample}>
        <Text style={styles.sampleTitle}>Feed</Text>
        <View style={styles.stories}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[styles.story, i === 0 && { borderStyle: 'dashed' }]}>
              {i === 0 ? <Icon name="plus" size={12} color={colors.primaryText} /> : null}
            </View>
          ))}
        </View>
        <View style={styles.post}>
          <Bar width="45%" strong />
          <View style={styles.media}><Icon name="image" size={18} color={colors.textTertiary} /></View>
          <View style={styles.actions}>
            <Icon name="heart" size={13} color={colors.textSecondary} />
            <Icon name="share" size={13} color={colors.textSecondary} />
          </View>
        </View>
      </View>
    );
  }
  if (path === '/social') {
    return (
      <View style={styles.sample}>
        <Text style={styles.sampleTitle}>Connect</Text>
        <Row icon="search"><Bar width="70%" /></Row>
        <Row icon="social"><Bar width="55%" strong /><Bar width="35%" /></Row>
        <Row icon="social"><Bar width="60%" strong /><Bar width="30%" /></Row>
        <Row icon="mail"><Bar width="50%" strong /><Bar width="40%" /></Row>
      </View>
    );
  }
  if (path === '/learn') {
    return (
      <View style={styles.sample}>
        <Text style={styles.sampleTitle}>Study</Text>
        <View style={styles.subjects}>
          <SubjectGlyph subject="biochemistry" size={30} />
          <SubjectGlyph subject="physiology" size={30} />
          <SubjectGlyph subject="anatomy" size={30} />
        </View>
        <Row icon="lesson"><Bar width="65%" strong /><View style={styles.progress}><View style={[styles.progressFill, { width: '60%' }]} /></View></Row>
        <Row icon="calendar"><Bar width="55%" strong /><Bar width="35%" /></Row>
      </View>
    );
  }
  if (path === '/explore') {
    return (
      <View style={styles.sample}>
        <Text style={styles.sampleTitle}>Explore</Text>
        <Row icon="sparkle"><Bar width="60%" strong /><Bar width="80%" /></Row>
        <Row icon="research"><Bar width="50%" strong /><Bar width="70%" /></Row>
        <Row icon="announcement"><Bar width="55%" strong /><Bar width="45%" /></Row>
      </View>
    );
  }
  return (
    <View style={styles.sample}>
      <Text style={styles.sampleTitle}>You</Text>
      <View style={styles.profile}>
        <View style={styles.avatar}><Icon name="profile" size={16} color={colors.primaryText} /></View>
        <View style={styles.rowBody}><Bar width="60%" strong /><Bar width="40%" /></View>
      </View>
      <Row icon="achievement"><Bar width="55%" strong /></Row>
      <Row icon="chart"><Bar width="65%" strong /></Row>
      <Row icon="settings"><Bar width="45%" strong /></Row>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: { flex: 1, minWidth: 280, gap: 12, padding: 22 },
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
    title: { ...Type.title3, color: colors.text, flexShrink: 1 },
    lead: { fontSize: 13, lineHeight: 19, color: colors.textSecondary },
    body: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, alignItems: 'center' },
    phone: { width: 210, height: 300, borderRadius: 28, borderWidth: 6, borderColor: colors.borderStrong, backgroundColor: colors.background, overflow: 'hidden', alignSelf: 'center' },
    screen: { flex: 1 },
    bar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: colors.surface, paddingVertical: 6, paddingHorizontal: 3 },
    barItem: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 3, borderRadius: 10 },
    barItemOn: { backgroundColor: colors.navActiveSubtle },
    barLabel: { fontSize: 8.5, fontWeight: '700', color: colors.navInactive },
    explain: { flex: 1, minWidth: 180, gap: 6 },
    step: { ...Type.overline, color: colors.textTertiary },
    tabTitle: { ...Type.title2, color: colors.text },
    detail: { fontSize: 14, lineHeight: 21, color: colors.textSecondary },
    dots: { flexDirection: 'row', gap: 6, marginTop: 6 },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.track },
    dotOn: { width: 18, backgroundColor: colors.primary },
    note: { fontSize: 11, color: colors.textTertiary, marginTop: 4 },

    sample: { flex: 1, padding: 12, gap: 9 },
    sampleTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
    stories: { flexDirection: 'row', gap: 7 },
    story: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
    post: { gap: 7, padding: 9, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline },
    media: { height: 62, borderRadius: 8, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
    actions: { flexDirection: 'row', gap: 12 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: 11, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline },
    rowIcon: { width: 24, height: 24, borderRadius: 8, backgroundColor: colors.primarySubtle, alignItems: 'center', justifyContent: 'center' },
    rowBody: { flex: 1, gap: 5 },
    line: { height: 6, borderRadius: 3, backgroundColor: colors.track },
    lineStrong: { backgroundColor: colors.textTertiary, opacity: 0.55 },
    subjects: { flexDirection: 'row', gap: 8 },
    progress: { height: 5, borderRadius: 3, backgroundColor: colors.track, overflow: 'hidden' },
    progressFill: { height: 5, borderRadius: 3, backgroundColor: colors.primary },
    profile: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primarySubtle, alignItems: 'center', justifyContent: 'center' },
  });
}
