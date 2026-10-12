import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '@/components/ui/text';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Card } from '@/components/ui/interactive';
import { Pill } from '@/components/ui/pill';
import { ProgressBar } from '@/components/ui/progress-bar';
import { SectionHeader } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Sheet } from '@/components/ui/sheet';
import { Type, type ThemeColors } from '@/constants/theme';
import { useDisplayName } from '@/data/user';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

type PostKind = 'status' | 'discussion' | 'question' | 'poll';
type Reaction = 'Like' | 'Love' | 'Funny' | 'Fire' | 'Wow' | 'Sad' | 'Angry' | 'Applause' | 'Interesting';
type FeedPost = {
  id: string; name: string; handle: string; text: string; kind: PostKind;
  reactions: number; reaction: Reaction | null; comments: string[];
  options?: { label: string; votes: number }[]; votedIndex?: number | null;
  demo?: boolean; audience: 'friends' | 'following';
};
type Story = { id: string; name: string; text: string; createdAt: number; demo?: boolean };
type FeedTab = 'for-you' | 'following' | 'friends';

const HOUR = 60 * 60 * 1000;
const REACTION_OPTIONS: Reaction[] = ['Like', 'Love', 'Funny', 'Fire', 'Wow', 'Sad', 'Angry', 'Applause', 'Interesting'];
const DEMO_POSTS: FeedPost[] = [
  { id: 'demo-campus', name: 'Ama Mensah', handle: '@ama.m', text: 'Finally submitted everything for this week. What are you all doing to unwind?', kind: 'status', reactions: 8, reaction: null, comments: ['A long nap is top of my list.'], demo: true, audience: 'friends' },
  { id: 'demo-discussion', name: 'Kojo Asare', handle: '@kojo.a', text: 'What is one small thing that made your week better?', kind: 'discussion', reactions: 12, reaction: null, comments: [], demo: true, audience: 'following' },
  { id: 'demo-poll', name: 'Sarah Owusu', handle: '@sarah.o', text: 'How are you taking a break after exams?', kind: 'poll', reactions: 5, reaction: null, comments: [], options: [{ label: 'Sleep', votes: 8 }, { label: 'See friends', votes: 5 }, { label: 'Watch something', votes: 4 }], votedIndex: null, demo: true, audience: 'friends' },
];
const FEED_OPTIONS = [
  { value: 'for-you' as const, label: 'For you' },
  { value: 'following' as const, label: 'Following' },
  { value: 'friends' as const, label: 'Friends' },
];
const KIND_OPTIONS = [
  { value: 'status' as const, label: 'Status' },
  { value: 'discussion' as const, label: 'Discussion' },
  { value: 'question' as const, label: 'Question' },
  { value: 'poll' as const, label: 'Poll' },
];
const SAMPLE_STORIES: Story[] = [
  { id: 'story-ama', name: 'Ama', text: 'At the library for one last push.', createdAt: Date.now() - 2 * HOUR, demo: true },
  { id: 'story-kwame', name: 'Kwame', text: 'A little rest goes a long way.', createdAt: Date.now() - 5 * HOUR, demo: true },
  { id: 'story-sarah', name: 'Sarah', text: 'Finally done with exams.', createdAt: Date.now() - 8 * HOUR, demo: true },
];

/** Local prototype only. Sample posts and interactions are not shared or saved. */
export function LocalConnectFeed({ compact = false }: { compact?: boolean }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const displayName = useDisplayName();
  const [posts, setPosts] = useState(DEMO_POSTS);
  const [stories, setStories] = useState(SAMPLE_STORIES);
  const [kind, setKind] = useState<PostKind>('status');
  const [tab, setTab] = useState<FeedTab>('for-you');
  const [draft, setDraft] = useState('');
  const [storyDraft, setStoryDraft] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<string[]>([]);
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [reactionPostId, setReactionPostId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => { queueMicrotask(() => setCurrentTime(Date.now())); }, []);
  const currentStories = useMemo(() => stories.filter((story) => currentTime > 0 && currentTime - story.createdAt < 24 * HOUR), [stories, currentTime]);
  const visiblePosts = posts.filter((post) => tab === 'for-you' || post.audience === tab);
  const reactionPost = posts.find((post) => post.id === reactionPostId) ?? null;

  const publish = () => {
    const text = draft.trim();
    const pollChoices = options.map((value) => value.trim()).filter(Boolean);
    if (!text || (kind === 'poll' && pollChoices.length < 2)) return;
    const post: FeedPost = {
      id: 'local-' + Date.now(), name: displayName?.trim() || 'You', handle: 'Your post',
      text, kind, reactions: 0, reaction: null, comments: [], audience: 'friends',
      ...(kind === 'poll' ? { options: pollChoices.map((label) => ({ label, votes: 0 })), votedIndex: null } : {}),
    };
    setPosts((all) => [post, ...all]);
    setDraft('');
    setOptions(['', '']);
    setKind('status');
    setTab('for-you');
  };

  const addStory = () => {
    const text = storyDraft.trim();
    if (!text) return;
    const story = { id: 'local-story-' + Date.now(), name: 'Your story', text, createdAt: Date.now() };
    setStories((all) => [story, ...all]);
    setStoryDraft('');
    setActiveStory(story);
  };

  const vote = (postId: string, selectedIndex: number) => {
    setPosts((all) => all.map((post) => {
      if (post.id !== postId || post.votedIndex !== null || !post.options) return post;
      return { ...post, votedIndex: selectedIndex, options: post.options.map((item, index) => ({ ...item, votes: item.votes + (index === selectedIndex ? 1 : 0) })) };
    }));
  };

  const addReply = (postId: string) => {
    const reply = replies[postId]?.trim();
    if (!reply) return;
    setPosts((all) => all.map((post) => post.id === postId ? { ...post, comments: [...post.comments, reply] } : post));
    setReplies((all) => ({ ...all, [postId]: '' }));
  };

  const chooseReaction = (choice: Reaction) => {
    if (!reactionPostId) return;
    setPosts((all) => all.map((post) => {
      if (post.id !== reactionPostId) return post;
      const reaction = post.reaction === choice ? null : choice;
      const countChange = Number(reaction !== null) - Number(post.reaction !== null);
      return { ...post, reaction, reactions: Math.max(0, post.reactions + countChange) };
    }));
    setReactionPostId(null);
  };

  if (compact) {
    return (
      <View style={styles.feed}>
        <Card style={styles.card}>
          <SectionHeader title="Stories" subtitle="Quick moments from your circle." style={styles.noMargin} right={<Pill label="Sample" />} />
          <View style={styles.storyRow}>
            {currentStories.slice(0, 4).map((story) => (
              <Pressable key={story.id} onPress={() => setActiveStory(story)} accessibilityRole="button" accessibilityLabel={'View ' + story.name + ' story'} style={styles.storyItem}>
                <Avatar name={story.name} size={50} ring="gold" />
                <Text style={styles.storyName} numberOfLines={1}>{story.name}</Text>
              </Pressable>
            ))}
          </View>
        </Card>
        {posts.slice(0, 2).map((post) => (
          <Card key={post.id} style={styles.card}>
            <View style={styles.postHeader}>
              <Avatar name={post.name} size={38} ring="subtle" />
              <View style={styles.nameBlock}><Text style={styles.name}>{post.name}</Text><Text style={styles.handle}>{post.handle}</Text></View>
              <Pill label={post.demo ? 'Sample' : 'New'} />
            </View>
            <Text style={styles.postText} numberOfLines={3}>{post.text}</Text>
            <Text style={styles.previewMeta}>{post.reactions} reactions · {post.comments.length} replies</Text>
          </Card>
        ))}
        <Button label="View all in Connect" variant="secondary" trailing="›" onPress={() => router.push('/social' as never)} />
        <Sheet visible={activeStory !== null} onClose={() => setActiveStory(null)} title={activeStory?.name ?? 'Story'} subtitle={activeStory ? (activeStory.demo ? 'Sample story · ' : 'Local story · ') + timeAgo(activeStory.createdAt) : undefined}>
          {activeStory ? <View style={styles.storyViewer}><ProgressBar value={1} height={4} color={colors.accent} /><View style={styles.storyContent}><Avatar name={activeStory.name} size={60} ring="gold" /><Text style={styles.storyText}>{activeStory.text}</Text><Text style={styles.hint}>Stories expire after 24 hours.</Text></View></View> : null}
        </Sheet>
      </View>
    );
  }

  return (
    <View style={styles.feed}>
      <Card style={styles.card}>
        <SectionHeader title="Stories" subtitle="Quick updates disappear after 24 hours." style={styles.noMargin} />
        <View style={styles.storyRow}>
          <View style={styles.storyItem}>
            <View style={styles.addStory}><Icon name="plus" size={22} color={colors.primaryText} /></View>
            <Text style={styles.storyName}>Your story</Text>
          </View>
          {currentStories.map((story) => (
            <Pressable key={story.id} onPress={() => setActiveStory(story)} accessibilityRole="button" accessibilityLabel={'View ' + story.name + ' story'} style={styles.storyItem}>
              <Avatar name={story.name} size={54} ring="gold" />
              <Text style={styles.storyName} numberOfLines={1}>{story.name}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.inline}>
          <TextInput value={storyDraft} onChangeText={setStoryDraft} placeholder="Share a quick update" placeholderTextColor={colors.textTertiary} maxLength={180} accessibilityLabel="Write a story status" style={styles.storyInput} />
          <Button label="Share" size="sm" variant="secondary" disabled={!storyDraft.trim()} onPress={addStory} />
        </View>
        <Text style={styles.hint}>Text stories only in this local preview.</Text>
      </Card>

      <Card style={styles.card}>
        <SectionHeader title="What's happening, Doc?" subtitle="Everyday life, ideas and learning all belong here." style={styles.noMargin} right={<Pill label="Local preview" tone="primary" />} />
        <SegmentedControl options={KIND_OPTIONS} value={kind} onChange={setKind} label="Choose post type" />
        <TextInput value={draft} onChangeText={setDraft} placeholder={kind === 'discussion' ? 'Start a conversation...' : kind === 'question' ? 'Ask the community...' : kind === 'poll' ? 'Ask a poll question...' : 'Share an update...'} placeholderTextColor={colors.textTertiary} multiline maxLength={2000} accessibilityLabel="Write a community post" style={styles.input} />
        {kind === 'poll' ? (
          <View style={styles.pollEditor}>
            {options.map((option, index) => (
              <TextInput key={index} value={option} onChangeText={(value) => setOptions((all) => all.map((item, i) => i === index ? value : item))} placeholder={'Option ' + (index + 1)} placeholderTextColor={colors.textTertiary} maxLength={80} accessibilityLabel={'Poll option ' + (index + 1)} style={styles.optionInput} />
            ))}
            {options.length < 5 ? <Pressable onPress={() => setOptions((all) => [...all, ''])} accessibilityRole="button" style={styles.addOption}><Icon name="plus" size={15} color={colors.primaryText} /><Text style={styles.addOptionText}>Add option</Text></Pressable> : null}
          </View>
        ) : null}
        <View style={styles.inline}>
          <Text style={styles.hint}>Nothing is sent to Supabase or saved.</Text>
          <Button label="Post" size="sm" disabled={!draft.trim() || (kind === 'poll' && options.filter((item) => item.trim()).length < 2)} onPress={publish} />
        </View>
      </Card>

      <SectionHeader title="Your feed" subtitle="A local sample to explore the Connect experience." style={styles.feedHeader} />
      <SegmentedControl options={FEED_OPTIONS} value={tab} onChange={setTab} label="Filter feed" />

      {visiblePosts.map((post) => {
        const commentsOpen = open.includes(post.id);
        const totalVotes = post.options?.reduce((sum, option) => sum + option.votes, 0) ?? 0;
        return (
          <Card key={post.id} style={styles.card}>
            <View style={styles.postHeader}>
              <Avatar name={post.name} size={42} ring={post.demo ? 'subtle' : 'primary'} />
              <View style={styles.nameBlock}><Text style={styles.name}>{post.name}</Text><Text style={styles.handle}>{post.handle}</Text></View>
              <Pill label={post.demo ? 'Sample' : post.kind[0].toUpperCase() + post.kind.slice(1)} />
            </View>
            <Text style={styles.postText}>{post.text}</Text>
            {post.options ? (
              <View style={styles.pollOptions}>
                {post.options.map((option, index) => {
                  const percent = totalVotes ? option.votes / totalVotes : 0;
                  return (
                    <Pressable key={option.label + index} onPress={() => vote(post.id, index)} disabled={post.votedIndex !== null} accessibilityRole="button" accessibilityState={{ selected: post.votedIndex === index, disabled: post.votedIndex !== null }} accessibilityLabel={option.label + ', ' + Math.round(percent * 100) + ' percent'} style={[styles.pollOption, post.votedIndex === index && styles.pollSelected]}>
                      <View style={styles.pollTop}><Text style={styles.pollLabel}>{option.label}</Text>{post.votedIndex !== null ? <Text style={styles.percent}>{Math.round(percent * 100)}%</Text> : null}</View>
                      {post.votedIndex !== null ? <ProgressBar value={percent} height={5} /> : <Text style={styles.votePrompt}>Tap to vote</Text>}
                    </Pressable>
                  );
                })}
                <Text style={styles.hint}>{totalVotes} vote{totalVotes === 1 ? '' : 's'}{post.votedIndex === null ? ' · Choose one option' : ' · Vote recorded locally'}</Text>
              </View>
            ) : null}
            <View style={styles.actions}>
              <Pressable onPress={() => setReactionPostId(post.id)} accessibilityRole="button" accessibilityLabel={(post.reaction ? 'Change reaction from ' + post.reaction : 'React to post') + '; ' + post.reactions + ' reactions'} style={styles.action}>
                <Icon name="achievement" size={16} color={post.reaction ? colors.accentText : colors.textSecondary} filled={Boolean(post.reaction)} />
                <Text style={[styles.actionText, post.reaction && styles.actionActive]}>{post.reaction ?? 'React'} · {post.reactions}</Text>
              </Pressable>
              <Pressable onPress={() => setOpen((all) => commentsOpen ? all.filter((id) => id !== post.id) : [...all, post.id])} accessibilityRole="button" accessibilityLabel={(commentsOpen ? 'Hide replies' : 'Open replies') + '; ' + post.comments.length + ' replies'} style={styles.action}>
                <Icon name="social" size={16} color={colors.textSecondary} />
                <Text style={styles.actionText}>{commentsOpen ? 'Hide replies' : 'Reply'} · {post.comments.length}</Text>
              </Pressable>
            </View>
            {commentsOpen ? (
              <View style={styles.comments}>
                {post.comments.map((comment, index) => <Text key={post.id + '-' + index} style={styles.comment}>{comment}</Text>)}
                <View style={styles.inline}>
                  <TextInput value={replies[post.id] ?? ''} onChangeText={(value) => setReplies((all) => ({ ...all, [post.id]: value }))} placeholder="Write a reply" placeholderTextColor={colors.textTertiary} accessibilityLabel="Write a reply" style={styles.replyInput} />
                  <Button label="Send" variant="ghost" size="sm" disabled={!replies[post.id]?.trim()} onPress={() => addReply(post.id)} />
                </View>
              </View>
            ) : null}
          </Card>
        );
      })}

      <Sheet visible={activeStory !== null} onClose={() => setActiveStory(null)} title={activeStory?.name ?? 'Story'} subtitle={activeStory ? (activeStory.demo ? 'Sample story · ' : 'Local story · ') + timeAgo(activeStory.createdAt) : undefined}>
        {activeStory ? <View style={styles.storyViewer}><ProgressBar value={1} height={4} color={colors.accent} /><View style={styles.storyContent}><Avatar name={activeStory.name} size={60} ring="gold" /><Text style={styles.storyText}>{activeStory.text}</Text><Text style={styles.hint}>Stories expire after 24 hours.</Text></View></View> : null}
      </Sheet>
      <Sheet visible={reactionPostId !== null} onClose={() => setReactionPostId(null)} title="Choose a reaction" subtitle="Your choice stays local in this preview.">
        <View style={styles.reactionGrid}>
          {REACTION_OPTIONS.map((choice) => {
            const selected = reactionPost?.reaction === choice;
            return (
              <Pressable key={choice} onPress={() => chooseReaction(choice)} accessibilityRole="button" accessibilityState={{ selected }} style={[styles.reactionOption, selected && styles.reactionOptionSelected]}>
                <Text style={[styles.reactionOptionText, selected && styles.reactionOptionTextSelected]}>{choice}</Text>
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </View>
  );
}

function timeAgo(at: number) {
  const minutes = Math.max(1, Math.floor((Date.now() - at) / 60000));
  return minutes < 60 ? minutes + 'm ago' : Math.floor(minutes / 60) + 'h ago';
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    feed: { gap: 14, marginBottom: 20 },
    card: { gap: 12 },
    noMargin: { marginBottom: 0 },
    feedHeader: { marginBottom: -4 },
    storyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, overflow: 'hidden' },
    storyItem: { width: 60, alignItems: 'center', gap: 6 },
    addStory: { width: 54, height: 54, borderRadius: 27, borderWidth: 1, borderColor: colors.primaryBorder, backgroundColor: colors.primarySubtle, alignItems: 'center', justifyContent: 'center' },
    storyName: { fontSize: 11.5, fontWeight: '700', color: colors.textSecondary, textAlign: 'center' },
    inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    storyInput: { flex: 1, minHeight: 40, paddingHorizontal: 12, borderRadius: 12, color: colors.text, backgroundColor: colors.surfaceMuted, ...Type.callout },
    hint: { flex: 1, fontSize: 11.5, lineHeight: 16, color: colors.textTertiary },
    input: { minHeight: 82, maxHeight: 180, borderRadius: 14, padding: 12, color: colors.text, backgroundColor: colors.surfaceMuted, textAlignVertical: 'top', ...Type.body },
    pollEditor: { gap: 8 },
    optionInput: { minHeight: 40, paddingHorizontal: 12, borderRadius: 11, color: colors.text, backgroundColor: colors.surfaceMuted, ...Type.callout },
    addOption: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 5, paddingHorizontal: 4 },
    addOptionText: { fontSize: 12, fontWeight: '700', color: colors.primaryText },
    postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    nameBlock: { flex: 1, gap: 2, minWidth: 0 },
    name: { fontSize: 14, fontWeight: '800', color: colors.text },
    handle: { fontSize: 12, color: colors.textTertiary },
    postText: { ...Type.body, color: colors.text, lineHeight: 23 },
    previewMeta: { fontSize: 11.5, color: colors.textTertiary },
    pollOptions: { gap: 8 },
    pollOption: { gap: 7, padding: 11, borderRadius: 12, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.hairline },
    pollSelected: { borderColor: colors.primaryBorder },
    pollTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    pollLabel: { ...Type.callout, color: colors.text, fontWeight: '700' },
    percent: { fontSize: 12, fontWeight: '800', color: colors.primaryText },
    votePrompt: { fontSize: 11, color: colors.textTertiary },
    actions: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 8 },
    action: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 8 },
    actionText: { fontSize: 12.5, fontWeight: '700', color: colors.textSecondary },
    actionActive: { color: colors.primaryText },
    reactionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    reactionOption: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.surfaceMuted },
    reactionOptionSelected: { borderColor: colors.primaryBorder, backgroundColor: colors.primarySubtle },
    reactionOptionText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
    reactionOptionTextSelected: { color: colors.primaryText },
    comments: { gap: 8, padding: 10, borderRadius: 12, backgroundColor: colors.surfaceMuted },
    comment: { ...Type.callout, color: colors.textSecondary },
    replyInput: { flex: 1, minHeight: 40, paddingHorizontal: 10, borderRadius: 10, color: colors.text, backgroundColor: colors.surfaceElevated, ...Type.callout },
    storyViewer: { minHeight: 320, justifyContent: 'space-between', gap: 24 },
    storyContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 28, borderRadius: 20, backgroundColor: colors.primarySubtle },
    storyText: { ...Type.title2, color: colors.text, textAlign: 'center' },
  });
}

