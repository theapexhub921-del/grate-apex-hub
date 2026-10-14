import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Modal, PanResponder, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VideoPlayer } from '@/components/ui/video-player';
import { STORY_BACKGROUNDS, listStoryViewers, recordStoryView, type CommunityStory, type StoryViewer as Viewer } from '@/data/community';
import { markStorySeen } from '@/data/story-views';
import { poster } from '@/lib/media-urls';

// The full-screen story viewer, built to behave like Instagram:
//  - one progress bar per story of the person on screen
//  - tap the right side for the next story, the left side for the previous one
//  - hold a finger down to pause (the screen clears so you can see the story)
//  - swipe left / right to jump to the next / previous person, swipe down to close
//  - when someone's stories end it carries on with the next person
//  - the timer waits for a photo to finish loading
//  - on the web: arrow keys, Space (pause) and Esc
//
// The colours here are fixed on purpose: a story is always shown on black.

export type StoryGroup = {
  authorId: string;
  name: string;
  avatarUrl?: string | null;
  isMine: boolean;
  items: CommunityStory[];
};

const PHOTO_MS = 5000;
const VIDEO_FALLBACK_MS = 15000; // phones show a still frame, so a video gets a fixed time there
const TAP_MS = 250;
const WHITE = '#FFFFFF';
const SOFT_WHITE = 'rgba(255,255,255,0.72)';
const SCRIM = 'rgba(0,0,0,0.42)';

type Position = { group: number; item: number };

export function StoryViewer({
  groups,
  startGroup,
  startItem = 0,
  onClose,
  onDelete,
}: {
  groups: StoryGroup[];
  startGroup: number;
  /** Which story of that person to begin with (the feed picks the first one not watched yet). */
  startItem?: number;
  onClose: () => void;
  /** Deletes one of my stories. Resolves true when it is gone. */
  onDelete: (story: CommunityStory) => Promise<boolean>;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  // A phone fills the screen; on a wide screen the story is a tall 9:16 card in the middle.
  const wide = width > 560;
  const cardHeight = wide ? Math.min(height - 32, 920) : height;
  const cardWidth = wide ? Math.min(width - 32, Math.round((cardHeight * 9) / 16)) : width;

  const [data, setData] = useState<StoryGroup[]>(groups);
  const [position, setPosition] = useState<Position>({ group: Math.max(0, startGroup), item: Math.max(0, startItem) });
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false); // the photo has loaded
  const [held, setHeld] = useState(false); // finger down: stop the clock
  const [chromeHidden, setChromeHidden] = useState(false); // finger down for a moment: clear the screen
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [viewerList, setViewerList] = useState<{ id: string; list: Viewer[] }>({ id: '', list: [] });
  const [dragY, setDragY] = useState(0);

  const group = data[position.group];
  const story = group?.items[position.item];
  const paused = held || confirming || deleting;
  const ready = loaded || !story?.media_url; // a text story is ready at once

  const elapsed = useRef(0);
  const pressStart = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewed = useRef<Set<string>>(new Set());
  const positionRef = useRef(position);
  const dataRef = useRef(data);
  useEffect(() => {
    positionRef.current = position;
    dataRef.current = data;
  });

  const isVideo = story?.media_type === 'video';
  // On the web a video drives its own progress bar; everywhere else a timer does.
  const videoDriven = isVideo && Platform.OS === 'web';
  const duration = isVideo ? VIDEO_FALLBACK_MS : PHOTO_MS;

  const go = useCallback(
    (to: Position | 'close') => {
      elapsed.current = 0;
      setProgress(0);
      setLoaded(false);
      if (to === 'close') onClose();
      else setPosition(to);
    },
    [onClose]
  );

  /** Next story: the next of this person, else the first of the next person, else close. */
  const next = useCallback(() => {
    const { group: g, item: i } = positionRef.current;
    const current = dataRef.current[g];
    if (!current) return go('close');
    if (i + 1 < current.items.length) return go({ group: g, item: i + 1 });
    if (g + 1 < dataRef.current.length) return go({ group: g + 1, item: 0 });
    go('close');
  }, [go]);

  /** Previous story: the earlier one of this person, else the last of the person before, else start over. */
  const previous = useCallback(() => {
    const { group: g, item: i } = positionRef.current;
    if (i > 0) return go({ group: g, item: i - 1 });
    if (g > 0) return go({ group: g - 1, item: dataRef.current[g - 1].items.length - 1 });
    go({ group: g, item: 0 });
  }, [go]);

  const nextPerson = useCallback(() => {
    const { group: g } = positionRef.current;
    if (g + 1 < dataRef.current.length) go({ group: g + 1, item: 0 });
    else go('close');
  }, [go]);

  const previousPerson = useCallback(() => {
    const { group: g } = positionRef.current;
    if (g > 0) go({ group: g - 1, item: 0 });
  }, [go]);

  // The progress bar. A photo waits until it has loaded; a web video reports its own progress.
  useEffect(() => {
    if (!story || paused || !ready || videoDriven) return;
    let last = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      elapsed.current += now - last;
      last = now;
      const share = elapsed.current / duration;
      if (share >= 1) {
        clearInterval(timer);
        next();
      } else setProgress(share);
    }, 50);
    return () => clearInterval(timer);
  }, [story, paused, ready, videoDriven, duration, next]);

  // Mark it watched, tell the owner (once, never for my own) and warm up the next photo.
  useEffect(() => {
    if (!story) return;
    markStorySeen(story.id);
    if (!group?.isMine && !viewed.current.has(story.id)) {
      viewed.current.add(story.id);
      void recordStoryView(story).catch(() => undefined);
    }
    const upcoming = group?.items[position.item + 1] ?? data[position.group + 1]?.items[0];
    if (upcoming?.media_url && upcoming.media_type === 'image') void Image.prefetch(upcoming.media_url).catch(() => undefined);
  }, [story, group, data, position.group, position.item]);

  // My own story: who has seen it.
  useEffect(() => {
    if (!story || !group?.isMine) return;
    let live = true;
    void listStoryViewers(story.id).then((list) => { if (live) setViewerList({ id: story.id, list }); }).catch(() => undefined);
    return () => { live = false; };
  }, [story, group?.isMine]);

  // Keyboard (web).
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') next();
      else if (event.key === 'ArrowLeft') previous();
      else if (event.key === 'Escape') onClose();
      else if (event.key === ' ') {
        event.preventDefault();
        setHeld((value) => !value);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [next, previous, onClose]);

  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);

  // The swipe handlers are made once, so they call the latest actions through this.
  const actions = useRef({ onClose, nextPerson, previousPerson });
  useEffect(() => {
    actions.current = { onClose, nextPerson, previousPerson };
  });

  // Swipes: down closes, sideways changes person. A plain tap or hold never starts one.
  // (PanResponder is not a React ref, though the lint rule mistakes it for one.)
  // eslint-disable-next-line react-hooks/refs
  const [swipe] = useState(() =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) > 14 || gesture.dy > 14,
        onPanResponderMove: (_event, gesture) => setDragY(Math.max(0, gesture.dy)),
        onPanResponderRelease: (_event, gesture) => {
          setDragY(0);
          if (gesture.dy > 90 && gesture.dy > Math.abs(gesture.dx)) actions.current.onClose();
          else if (gesture.dx < -60) actions.current.nextPerson();
          else if (gesture.dx > 60) actions.current.previousPerson();
        },
        onPanResponderTerminate: () => setDragY(0),
      })
  );

  function pressIn() {
    pressStart.current = Date.now();
    setHeld(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setChromeHidden(true), TAP_MS);
  }

  function pressOut() {
    setHeld(false);
    setChromeHidden(false);
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }

  /** A quick tap changes story; a longer hold only paused it. */
  function tap(direction: -1 | 1) {
    if (Date.now() - pressStart.current >= TAP_MS) return;
    if (direction === 1) next();
    else previous();
  }

  async function removeStory() {
    if (!story) return;
    setDeleting(true);
    const removed = await onDelete(story).catch(() => false);
    setDeleting(false);
    if (!removed) return;
    const { group: g, item: i } = positionRef.current;
    const remainingItems = dataRef.current[g].items.filter((item) => item.id !== story.id);
    const nextData = remainingItems.length
      ? dataRef.current.map((entry, index) => (index === g ? { ...entry, items: remainingItems } : entry))
      : dataRef.current.filter((_entry, index) => index !== g);
    if (!nextData.length) return onClose();
    setData(nextData);
    elapsed.current = 0;
    setProgress(0);
    setLoaded(false);
    // Stay on the same spot (the story after the deleted one slides into its place).
    const newGroup = remainingItems.length ? g : Math.min(g, nextData.length - 1);
    setPosition({ group: newGroup, item: remainingItems.length ? Math.min(i, remainingItems.length - 1) : 0 });
  }

  function confirmDelete() {
    if (Platform.OS === 'web') {
      setConfirming(true);
      const ok = globalThis.confirm('Delete this story?');
      setConfirming(false);
      if (ok) void removeStory();
      return;
    }
    setConfirming(true);
    Alert.alert('Delete this story?', 'It will be removed for everyone.', [
      { text: 'Cancel', style: 'cancel', onPress: () => setConfirming(false) },
      { text: 'Delete', style: 'destructive', onPress: () => { setConfirming(false); void removeStory(); } },
    ], { onDismiss: () => setConfirming(false) });
  }

  if (!story || !group) return null;
  const viewers = viewerList.id === story.id ? viewerList.list : [];
  const hasMedia = Boolean(story.media_url);
  const background = story.bg ?? STORY_BACKGROUNDS[0];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <View
          {...swipe.panHandlers}
          style={[styles.card, { width: cardWidth, height: cardHeight, borderRadius: wide ? 18 : 0, transform: [{ translateY: dragY }], opacity: dragY ? Math.max(0.5, 1 - dragY / 500) : 1 }]}
        >
          {/* The story itself */}
          {hasMedia ? (
            <>
              {/* A soft blurred copy fills the card so a wide photo never leaves bare bars. */}
              <Image source={{ uri: story.media_type === 'video' ? poster(story.media_url!) : story.media_url! }} contentFit="cover" blurRadius={40} style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, styles.dim]} />
              {story.media_type === 'video' && Platform.OS === 'web' ? (
                <View style={StyleSheet.absoluteFill}>
                  <VideoPlayer
                    key={story.id}
                    url={story.media_url!}
                    height="100%"
                    autoPlay
                    bare
                    paused={paused}
                    label="Story video"
                    onProgress={(share) => { setLoaded(true); setProgress(share); }}
                    onEnded={next}
                  />
                </View>
              ) : (
                <Image
                  key={story.id}
                  source={{ uri: story.media_type === 'video' ? poster(story.media_url!) : story.media_url! }}
                  contentFit="contain"
                  onLoad={() => setLoaded(true)}
                  onError={() => setLoaded(true)}
                  style={StyleSheet.absoluteFill}
                  accessibilityLabel={story.media_type === 'video' ? 'Story video (still frame)' : 'Story photo'}
                />
              )}
            </>
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.textStory, { backgroundColor: background }]}>
              <Text style={styles.bigText}>{story.body}</Text>
            </View>
          )}

          {/* Tap zones: left third goes back, the rest goes forward. */}
          <View style={StyleSheet.absoluteFill}>
            <View style={styles.zones}>
              <Pressable style={styles.zonePrev} onPressIn={pressIn} onPressOut={pressOut} onPress={() => tap(-1)} accessibilityRole="button" accessibilityLabel="Previous story" />
              <Pressable style={styles.zoneNext} onPressIn={pressIn} onPressOut={pressOut} onPress={() => tap(1)} accessibilityRole="button" accessibilityLabel="Next story" />
            </View>
          </View>

          {/* Top: progress bars, who it is, close */}
          <View pointerEvents={chromeHidden ? 'none' : 'box-none'} style={[styles.top, { paddingTop: wide ? 12 : Math.max(insets.top, 12), opacity: chromeHidden ? 0 : 1 }]}>
            <View style={styles.bars} pointerEvents="none">
              {group.items.map((item, index) => (
                <View key={item.id} style={styles.track}>
                  <View style={[styles.fill, { width: index < position.item ? '100%' : index === position.item ? `${Math.round(progress * 100)}%` : '0%' }]} />
                </View>
              ))}
            </View>
            <View style={styles.header} pointerEvents="box-none">
              <Avatar uri={group.avatarUrl} name={group.name} size={36} />
              <View style={styles.byline} pointerEvents="none">
                <Text style={styles.name} numberOfLines={1}>{group.isMine ? 'Your story' : group.name}</Text>
                <Text style={styles.time}>{timeAgo(Date.parse(story.created_at))}</Text>
              </View>
              {group.isMine ? (
                <Pressable onPress={confirmDelete} disabled={deleting} accessibilityRole="button" accessibilityLabel="Delete this story" hitSlop={8} style={styles.iconButton}>
                  <Icon name="trash" size={19} color={WHITE} />
                </Pressable>
              ) : null}
              <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close story" hitSlop={8} style={styles.iconButton}>
                <Icon name="close" size={21} color={WHITE} />
              </Pressable>
            </View>
          </View>

          {/* Bottom: caption on a photo or video, and who has seen my story */}
          <View pointerEvents="none" style={[styles.bottom, { paddingBottom: wide ? 16 : Math.max(insets.bottom, 16), opacity: chromeHidden ? 0 : 1 }]}>
            {hasMedia && story.body ? <Text style={styles.caption}>{story.body}</Text> : null}
            {group.isMine ? (
              <Text style={styles.seenBy}>
                {viewers.length
                  ? `Seen by ${viewers.length} ${viewers.length === 1 ? 'person' : 'people'}: ${viewers.slice(0, 4).map((viewer) => viewer.username).join(', ')}${viewers.length > 4 ? '…' : ''}`
                  : 'No views yet'}
              </Text>
            ) : null}
          </View>
        </View>

        {/* On a wide screen, arrows outside the card, like Instagram on the web. */}
        {wide ? (
          <>
            <Pressable onPress={previous} accessibilityRole="button" accessibilityLabel="Previous" style={[styles.arrow, { left: Math.max(16, (width - cardWidth) / 2 - 64) }]}>
              <Icon name="chevronLeft" size={22} color={WHITE} />
            </Pressable>
            <Pressable onPress={next} accessibilityRole="button" accessibilityLabel="Next" style={[styles.arrow, { right: Math.max(16, (width - cardWidth) / 2 - 64) }]}>
              <Icon name="chevronRight" size={22} color={WHITE} />
            </Pressable>
          </>
        ) : null}
      </View>
    </Modal>
  );
}

function timeAgo(at: number) {
  const minutes = Math.max(1, Math.floor((Date.now() - at) / 60000));
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h`;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000' },
  card: { overflow: 'hidden', backgroundColor: '#000000' },
  dim: { backgroundColor: 'rgba(0,0,0,0.35)' },
  textStory: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  bigText: { color: WHITE, fontSize: 30, lineHeight: 38, fontWeight: '800', textAlign: 'center' },
  zones: { flex: 1, flexDirection: 'row' },
  zonePrev: { flex: 1 },
  zoneNext: { flex: 2 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 10, paddingBottom: 18, gap: 10, backgroundColor: SCRIM },
  bars: { flexDirection: 'row', gap: 4 },
  track: { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.35)' },
  fill: { height: '100%', backgroundColor: WHITE },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  byline: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  name: { color: WHITE, fontSize: 14, fontWeight: '800', flexShrink: 1 },
  time: { color: SOFT_WHITE, fontSize: 12.5, fontWeight: '600' },
  iconButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 24, gap: 10, backgroundColor: SCRIM },
  caption: { color: WHITE, fontSize: 16, lineHeight: 22, fontWeight: '600', textAlign: 'center' },
  seenBy: { color: SOFT_WHITE, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  arrow: { position: 'absolute', top: '50%', width: 44, height: 44, marginTop: -22, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
});
