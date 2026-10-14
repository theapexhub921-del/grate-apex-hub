import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '@/components/ui/text';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/avatar';
import { PersonAvatar } from '@/components/social/profile-card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Card } from '@/components/ui/interactive';
import { SectionHeader } from '@/components/ui/screen';
import { VideoPlayer } from '@/components/ui/video-player';
import { Sheet } from '@/components/ui/sheet';
import { findLesson, getTopic } from '@/data/curriculum';
import { markStorySeen, useSeenStories } from '@/data/story-views';
import { createCommunityStory, deleteCommunityStory, listLiveStories, listStoryViewers, recordStoryView, type CommunityMedia, type CommunityStory, type StoryViewer } from '@/data/community';
import { personName, refreshSocial, type FriendActivity, type SocialPerson, useSocial } from '@/data/social';
import { useAvatarUrl, useDisplayName } from '@/data/user';
import { type ThemeColors, Type } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

/** Feed built only from friend profiles and activity. */
export function SocialActivityFeed({ children, showActivity = true }: { children?: ReactNode; showActivity?: boolean }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const social = useSocial();
  const displayName = useDisplayName();
  const avatarUrl = useAvatarUrl();
  const insets = useSafeAreaInsets();
  const [stories, setStories] = useState<CommunityStory[]>([]);
  const [storyOpen, setStoryOpen] = useState(false);
  const [storyDraft, setStoryDraft] = useState('');
  const [storyMedia, setStoryMedia] = useState<CommunityMedia | undefined>();
  const [storyBusy, setStoryBusy] = useState(false);
  const [storyDeleting, setStoryDeleting] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);
  const [storySequence, setStorySequence] = useState<CommunityStory[]>([]);
  const [storyIndex, setStoryIndex] = useState(0);
  // Progress through the current story (0 to 1), and whether a finger is holding it still.
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [viewers, setViewers] = useState<StoryViewer[]>([]);
  const viewedRef = useRef<Set<string>>(new Set());
  const pressStart = useRef(0);
  const friends = social.people.filter((person) => person.relationship === 'friends');
  const myStories = useMemo(() => stories.filter((story) => story.author_id === social.userId).sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)), [stories, social.userId]);
  const myStory = myStories[myStories.length - 1];
  const seenStories = useSeenStories();
  const friendStoryGroups = useMemo(() => {
    const groups = new Map<string, CommunityStory[]>();
    for (const story of stories) {
      if (story.author_id === social.userId) continue;
      const group = groups.get(story.author_id) ?? [];
      group.push(story);
      groups.set(story.author_id, group);
    }
    return [...groups.entries()]
      .map(([authorId, items]) => ({ authorId, items: items.sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)) }))
      .map((group) => ({ ...group, seen: group.items.every((story) => seenStories.has(story.id)) }))
      // Unwatched first (newest first), then watched — like Instagram and WhatsApp.
      .sort((a, b) => Number(a.seen) - Number(b.seen) || Date.parse(b.items[b.items.length - 1].created_at) - Date.parse(a.items[a.items.length - 1].created_at));
  }, [stories, social.userId, seenStories]);
  const mySeen = myStories.length > 0 && myStories.every((story) => seenStories.has(story.id));
  const selectedStory = storySequence[storyIndex] ?? null;
  useEffect(() => { if (selectedStory) markStorySeen(selectedStory.id); }, [selectedStory]);

  async function refreshStories() {
    setStoryError(null);
    try {
      setStories(await listLiveStories());
    } catch (caught) {
      setStoryError(caught instanceof Error ? caught.message : 'Stories need the community database migration.');
    }
  }

  useEffect(() => { queueMicrotask(() => { void refreshStories(); }); }, []);

  // Each story fills its bar in 6 seconds (15 for video, where the video's end moves on sooner).
  // Holding a finger on the story pauses it.
  useEffect(() => {
    if (!selectedStory || paused) return;
    const total = selectedStory.media_type === 'video' ? 15000 : 6000;
    const started = Date.now() - progress * total;
    const timer = setInterval(() => {
      const next = (Date.now() - started) / total;
      if (next >= 1) { clearInterval(timer); stepStory(1); }
      else setProgress(next);
    }, 100);
    return () => clearInterval(timer);
    // progress is read once when a story starts or resumes, so it is left out on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStory?.id, storyIndex, storySequence.length, paused]);

  // Tell the owner I have seen their story (once per story, and never for my own).
  useEffect(() => {
    if (!selectedStory || selectedStory.author_id === social.userId || viewedRef.current.has(selectedStory.id)) return;
    viewedRef.current.add(selectedStory.id);
    void recordStoryView(selectedStory).catch(() => undefined);
  }, [selectedStory, social.userId]);

  // The owner sees who has viewed their story.
  useEffect(() => {
    if (!selectedStory || selectedStory.author_id !== social.userId) return;
    let live = true;
    void listStoryViewers(selectedStory.id).then((list) => { if (live) setViewers(list); }).catch(() => { if (live) setViewers([]); });
    return () => { live = false; };
  }, [selectedStory?.id, social.userId]);

  function holdStart() {
    pressStart.current = Date.now();
    setPaused(true);
  }

  // A quick tap moves to the previous or next story; a longer hold only pauses.
  function tap(direction: -1 | 1) {
    if (Date.now() - pressStart.current < 250) stepStory(direction);
  }

  function openStorySequence(sequence: CommunityStory[]) {
    setStorySequence(sequence);
    setProgress(0);
    setPaused(false);
    // Start at the first story not watched yet.
    const firstNew = sequence.findIndex((story) => !seenStories.has(story.id));
    setStoryIndex(firstNew > 0 ? firstNew : 0);
  }

  function closeStorySequence() {
    setStorySequence([]);
    setStoryIndex(0);
    setProgress(0);
    setPaused(false);
  }

  function stepStory(direction: -1 | 1) {
    const next = storyIndex + direction;
    if (next < 0) return;
    setProgress(0);
    if (next >= storySequence.length) closeStorySequence();
    else setStoryIndex(next);
  }

  async function publishStory() {
    if ((!storyDraft.trim() && !storyMedia) || storyBusy) return;
    setStoryBusy(true);
    setStoryError(null);
    try {
      await createCommunityStory(storyDraft, storyMedia);
      setStoryDraft('');
      setStoryMedia(undefined);
      setStoryOpen(false);
      await refreshStories();
    } catch (caught) {
      setStoryError(caught instanceof Error ? caught.message : 'Could not share your story.');
    } finally {
      setStoryBusy(false);
    }
  }

  async function deleteStory(story: CommunityStory) {
    if (storyDeleting) return;
    setStoryDeleting(true);
    setStoryError(null);
    try {
      await deleteCommunityStory(story.id, story.media_path);
      setStories((all) => all.filter((item) => item.id !== story.id));
      const remaining = storySequence.filter((item) => item.id !== story.id);
      if (!remaining.length) closeStorySequence();
      else {
        setStorySequence(remaining);
        setStoryIndex((index) => Math.min(index, remaining.length - 1));
      }
    } catch (caught) {
      setStoryError(caught instanceof Error ? caught.message : 'Could not delete this story.');
    } finally {
      setStoryDeleting(false);
    }
  }

  function confirmDeleteStory(story: CommunityStory) {
    if (Platform.OS === 'web') {
      if (globalThis.confirm('Delete this story and its attached photo or video?')) void deleteStory(story);
      return;
    }
    Alert.alert('Delete this story?', 'This removes the story and its attached photo or video.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { void deleteStory(story); } },
    ]);
  }

  async function chooseStoryMedia() {
    // On web, open the file chooser directly from the click handler. Awaiting a
    // permission promise first loses the browser's user-gesture activation.
    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setStoryError('Allow photo library access to add a photo or video to your story.');
        return;
      }
    }
    let result: ImagePicker.ImagePickerResult;
    try {
      result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.85, videoMaxDuration: 60 });
    } catch (caught) {
      setStoryError(caught instanceof Error ? caught.message : 'Could not open your photo library.');
      return;
    }
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const type = asset.type === 'video' ? 'video' : 'image';
    const fallbackExtension = type === 'video' ? 'mp4' : 'jpg';
    setStoryMedia({
      uri: asset.uri,
      type,
      mimeType: asset.mimeType ?? (type === 'video' ? 'video/mp4' : 'image/jpeg'),
      filename: asset.fileName ?? `grateapex-story-${Date.now()}.${fallbackExtension}`,
      size: asset.fileSize,
    });
    setStoryError(null);
  }

  return (
    <View style={styles.feed}>
      <View style={styles.storiesSection}>
        {storyError ? <Text style={styles.errorText}>{storyError}</Text> : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.friendStrip}>
          <Pressable
            onPress={() => myStories.length ? openStorySequence(myStories) : setStoryOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={myStory ? 'View your posted story' : 'Add a story'}
            style={styles.friendItem}
          >
            <View style={styles.storyAvatarWrap}>
              <StoryAvatar uri={avatarUrl} name={displayName || 'You'} hasStory={Boolean(myStory)} seen={mySeen} />
              {myStory ? <View style={styles.postedMark}><Icon name="check" size={10} color={colors.onPrimary} /></View> : <View style={styles.addBadge}><Icon name="plus" size={12} color={colors.primaryText} /></View>}
            </View>
            <Text style={styles.friendName} numberOfLines={1}>Your story</Text>
          </Pressable>
          {friendStoryGroups.map(({ authorId, items, seen }) => {
            const friend = social.people.find((person) => person.userId === authorId);
            const name = friend ? personName(friend) : 'Username pending';
            return (
              <Pressable key={authorId} onPress={() => openStorySequence(items)} accessibilityRole="button" accessibilityLabel={`View ${items.length} ${items.length === 1 ? 'story' : 'stories'} from ${name}`} style={styles.friendItem}>
                <StoryAvatar uri={friend?.avatarUrl ?? null} name={name} hasStory seen={seen} />
                <Text style={styles.friendName} numberOfLines={1}>{name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {children}

      {showActivity ? <SectionHeader title="From your people" subtitle="Recent study activity shared by your actual friends." style={styles.feedHeader} /> : null}

      {!showActivity ? null : social.status === 'error' ? (
        <Card style={styles.card}>
          <Text style={styles.errorTitle}>Couldn’t load your social feed</Text>
          <Text style={styles.muted}>{social.error ?? 'Check your connection and try again.'}</Text>
          <Button label="Try again" variant="secondary" size="sm" onPress={() => void refreshSocial()} />
        </Card>
      ) : social.activityError ? (
        <Card style={styles.card}>
          <Text style={styles.errorTitle}>Friend activity is unavailable</Text>
          <Text style={styles.muted}>{social.activityError}</Text>
          <Text style={styles.muted}>No sample activity is shown. Try refreshing your social data.</Text>
          <Button label="Try again" variant="secondary" size="sm" onPress={() => void refreshSocial()} />
        </Card>
      ) : social.activity.length ? (
        <View style={styles.activityGrid}>
          {social.activity.slice(0, 12).map((item) => (
            <View key={item.id} style={styles.activityTile}>
              <ActivityCard item={item} />
            </View>
          ))}
        </View>
      ) : (
        <Card style={styles.card}>
          <View style={styles.emptyMark}><Icon name="social" size={21} color={colors.primaryText} /></View>
          <Text style={styles.emptyTitle}>{social.status === 'loading' ? 'Loading friend activity…' : 'No shared activity yet'}</Text>
          <Text style={styles.muted}>
            {friends.length
              ? 'When your friends share a lesson, topic, or Apex Challenge milestone, it will appear here.'
              : 'Connect with classmates to see their real shared activity here.'}
          </Text>
          {!friends.length && social.userId ? <Button label="Find classmates" variant="secondary" size="sm" onPress={() => router.push('/social/friends')} /> : null}
        </Card>
      )}

      <Sheet visible={storyOpen} onClose={() => setStoryOpen(false)} title="Share a story" subtitle="Add text, a photo or a video. Stories expire after 24 hours.">
        <View style={styles.composer}>
          <TextInput value={storyDraft} onChangeText={setStoryDraft} multiline maxLength={500} placeholder="What would you like your friends to see?" placeholderTextColor={colors.textTertiary} accessibilityLabel="Write a story" style={styles.storyInput} />
          {storyMedia ? (
            <View style={styles.mediaSelected}>
              <Icon name={storyMedia.type === 'video' ? 'play' : 'image'} size={16} color={colors.primaryText} />
              <Text style={styles.muted} numberOfLines={1}>{storyMedia.filename}</Text>
              <Button label="Remove" size="sm" variant="ghost" onPress={() => setStoryMedia(undefined)} />
            </View>
          ) : null}
          {storyError ? <Text style={styles.errorText}>{storyError}</Text> : null}
          <View style={styles.storyActions}>
            <Button label="Add photo or video" variant="secondary" size="sm" onPress={() => void chooseStoryMedia()} disabled={storyBusy} />
            <Button label="Share story" onPress={() => void publishStory()} loading={storyBusy} disabled={(!storyDraft.trim() && !storyMedia) || storyBusy} />
          </View>
        </View>
      </Sheet>
      <Modal visible={selectedStory !== null} transparent animationType="fade" onRequestClose={closeStorySequence}>
        {selectedStory ? (
          <View style={[styles.storyModal, { paddingTop: Math.max(insets.top, 14), paddingBottom: Math.max(insets.bottom, 14) }]}>
            <View style={styles.storyProgress}>{storySequence.map((item, index) => <View key={item.id} style={styles.storyProgressTrack}><View style={[styles.storyProgressFill, { width: index < storyIndex ? '100%' : index === storyIndex ? `${Math.round(progress * 100)}%` : '0%' }]} /></View>)}</View>
            <View style={styles.storyModalHeader}>
              <Avatar uri={selectedStory.author_id === social.userId ? avatarUrl : social.people.find((person) => person.userId === selectedStory.author_id)?.avatarUrl} name={storyAuthorName(selectedStory, social.people, social.userId, displayName)} size={38} />
              <View style={styles.storyModalByline}><Text style={styles.storyModalName}>{storyAuthorName(selectedStory, social.people, social.userId, displayName)}</Text><Text style={styles.storyModalTime}>{timeAgo(new Date(selectedStory.created_at).getTime())}</Text></View>
              {selectedStory.author_id === social.userId ? <Button label="Delete" variant="ghost" size="sm" icon={<Icon name="trash" size={16} color={colors.error} />} onPress={() => confirmDeleteStory(selectedStory)} disabled={storyDeleting} /> : null}
              <Pressable onPress={closeStorySequence} accessibilityRole="button" accessibilityLabel="Close story" style={styles.storyClose}><Icon name="close" size={20} color={colors.text} /></Pressable>
            </View>
            <View style={styles.storyModalBody}>
              {selectedStory.media_url && selectedStory.media_type === 'image' ? <Image source={{ uri: selectedStory.media_url }} contentFit="contain" style={styles.storyImage} accessibilityLabel="Story photo" /> : null}
              {selectedStory.media_url && selectedStory.media_type === 'video' ? <VideoPlayer url={selectedStory.media_url} height={420} autoPlay label="Story video" onEnded={() => stepStory(1)} /> : null}
              {selectedStory.body ? <Text style={styles.storyText}>{selectedStory.body}</Text> : null}
              {selectedStory.media_type === 'video' ? null : (
                <View style={styles.tapZones}>
                  <Pressable style={styles.tapPrev} onPressIn={holdStart} onPressOut={() => setPaused(false)} onPress={() => tap(-1)} accessibilityLabel="Previous story" />
                  <Pressable style={styles.tapNext} onPressIn={holdStart} onPressOut={() => setPaused(false)} onPress={() => tap(1)} accessibilityLabel="Next story" />
                </View>
              )}
            </View>
            {selectedStory.author_id === social.userId ? (
              <Text style={styles.storyModalTime}>
                {viewers.length
                  ? `Seen by ${viewers.length} ${viewers.length === 1 ? 'person' : 'people'}: ${viewers.slice(0, 5).map((viewer) => viewer.username).join(', ')}${viewers.length > 5 ? '…' : ''}`
                  : 'No views yet'}
              </Text>
            ) : null}
            <View style={styles.storyPager}><Button label="Previous" size="sm" variant="secondary" onPress={() => stepStory(-1)} disabled={storyIndex === 0} /><Text style={styles.storyModalTime}>{storyIndex + 1} of {storySequence.length}</Text><Button label={storyIndex + 1 === storySequence.length ? 'Done' : 'Next'} size="sm" onPress={() => stepStory(1)} /></View>
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

function storyAuthorName(story: CommunityStory, people: readonly SocialPerson[], userId: string | null, displayName: string | null) {
  const friend = people.find((person) => person.userId === story.author_id);
  if (friend) return personName(friend);
  if (story.author_id === userId) return displayName || 'Your story';
  return story.author_name ? `@${story.author_name}` : 'Username pending';
}

function StoryAvatar({ uri, name, hasStory, seen }: { uri?: string | null; name: string; hasStory: boolean; seen?: boolean }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const ringId = `storyRing${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={styles.storyAvatarOuter}>
      {hasStory && seen ? (
        // Watched: a thin grey ring, the glow goes off.
        <Svg pointerEvents="none" style={StyleSheet.absoluteFill} viewBox="0 0 64 64"><Circle cx="32" cy="32" r="29.5" fill="none" stroke={colors.borderStrong} strokeWidth="2" /></Svg>
      ) : hasStory ? (
        <Svg pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id={ringId} x1="0" y1="1" x2="1" y2="0">
              <Stop offset="0" stopColor={colors.accent} />
              <Stop offset="0.5" stopColor={colors.warning} />
              <Stop offset="1" stopColor={colors.primary} />
            </LinearGradient>
          </Defs>
          <Circle cx="32" cy="32" r="29" fill="none" stroke={`url(#${ringId})`} strokeWidth="4" />
        </Svg>
      ) : <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.storyEmptyRing]} />}
      <Avatar uri={uri} name={name} size={52} />
    </View>
  );
}

function ActivityCard({ item }: { item: FriendActivity }) {
  const styles = useThemedStyles(createStyles);
  return (
    <Card style={styles.activityCard}>
      <PersonAvatar uid={item.userId} uri={item.avatarUrl} name={item.name} size={42} ring="subtle" />
      <View style={styles.activityBody}>
        <Text style={styles.activityText}><Text style={styles.name}>{item.name}</Text> {activityText(item)}</Text>
        <Text style={styles.when}>{timeAgo(item.at)}</Text>
      </View>
    </Card>
  );
}

function activityText(item: FriendActivity) {
  if (item.type === 'APEX_CHALLENGE_COMPLETED') return 'completed the Apex Challenge.';
  if (item.type === 'TOPIC_COMPLETED') return `finished ${getTopic(item.topicId)?.title ?? 'a topic'}.`;
  const lesson = item.lessonId ? findLesson(item.lessonId)?.lesson.title : undefined;
  return lesson ? `completed “${lesson}”.` : 'completed a lesson.';
}

function timeAgo(at: number) {
  const minutes = Math.max(1, Math.floor((Date.now() - at) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    feed: { gap: 14, marginBottom: 20 },
    storiesSection: { gap: 10, paddingTop: 2, paddingBottom: 3 },
    card: { gap: 12 },
    noMargin: { marginBottom: 0 },
    feedHeader: { marginTop: 4, marginBottom: -2 },
    friendStrip: { flexDirection: 'row', gap: 14, paddingVertical: 2 },
    storyAvatarWrap: { width: 68, height: 68, alignItems: 'center', justifyContent: 'center' },
    storyAvatarOuter: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
    storyEmptyRing: { borderRadius: 32, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.borderStrong },
    postedMark: { position: 'absolute', right: 0, bottom: 0, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.successText, borderWidth: 2, borderColor: colors.background },
    addBadge: { position: 'absolute', right: 0, bottom: 0, width: 19, height: 19, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySubtle, borderWidth: 2, borderColor: colors.background },
    storyMeta: { fontSize: 9.5, fontWeight: '700', color: colors.textTertiary, textAlign: 'center', width: 80 },
    addStory: { width: 54, height: 54, borderRadius: 27, borderWidth: 1.5, borderColor: colors.primaryBorder, borderStyle: 'dashed', backgroundColor: colors.primarySubtle, alignItems: 'center', justifyContent: 'center' },
    friendItem: { width: 68, alignItems: 'center', gap: 6 },
    friendName: { fontSize: 11.5, fontWeight: '700', color: colors.textSecondary, textAlign: 'center', width: 68 },
    emptyRow: { gap: 10, alignItems: 'flex-start' },
    muted: { ...Type.callout, color: colors.textSecondary },
    errorTitle: { ...Type.headline, color: colors.error },
    activityGrid: { gap: 12, width: '100%' },
    activityTile: { width: '100%' },
    activityCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, height: '100%' },
    activityBody: { flex: 1, minWidth: 0, gap: 5 },
    activityText: { ...Type.callout, color: colors.text, lineHeight: 21 },
    name: { fontWeight: '800', color: colors.text },
    when: { ...Type.caption, color: colors.textTertiary },
    emptyMark: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primarySubtle, alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { ...Type.title3, color: colors.text },
    storyModal: { flex: 1, justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, backgroundColor: colors.background },
    storyModalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    storyModalByline: { flex: 1, gap: 2 },
    storyModalName: { ...Type.callout, color: colors.text, fontWeight: '800' },
    storyModalTime: { ...Type.caption, color: colors.textSecondary },
    storyClose: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: colors.surfaceMuted },
    storyModalBody: { flex: 1, minHeight: 220, justifyContent: 'center', alignItems: 'center', gap: 14, paddingVertical: 8 },
    tapZones: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row' },
    tapPrev: { flex: 1 },
    tapNext: { flex: 2 },
    storyImage: { width: '100%', flex: 1, maxHeight: '84%', borderRadius: 16, backgroundColor: colors.surfaceMuted },
    storyProgress: { width: '100%', flexDirection: 'row', gap: 4 },
    storyProgressTrack: { height: 3, flex: 1, overflow: 'hidden', borderRadius: 2, backgroundColor: colors.track },
    storyProgressFill: { width: '0%', height: '100%', backgroundColor: colors.accent },
    storyProgressDone: { width: '100%' },
    storyProgressCurrent: { width: '45%' },
    storyPager: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
    storyText: { ...Type.title3, color: colors.text, textAlign: 'center' },
    composer: { gap: 12 },
    storyActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    mediaSelected: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    storyInput: { minHeight: 120, textAlignVertical: 'top', padding: 13, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 14, backgroundColor: colors.surfaceSunken, color: colors.text, fontSize: 15 },
    errorText: { ...Type.caption, color: colors.error },
  });
}

export const SupabaseSocialFeed = SocialActivityFeed;
