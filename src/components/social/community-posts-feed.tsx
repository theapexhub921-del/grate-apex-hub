import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform, Share, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';

import { Avatar } from '@/components/ui/avatar';
import { PersonAvatar } from '@/components/social/profile-card';
import { VerifiedBadge } from '@/components/ui/verified-badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Card, Interactive } from '@/components/ui/interactive';
import { Pill } from '@/components/ui/pill';
import { VideoPlayer } from '@/components/ui/video-player';
import { routes } from '@/lib/routes';
import { ReportSheet, type ReportTarget } from '@/components/social/report-sheet';
import { StumpCard } from '@/components/social/stump-card';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Sheet } from '@/components/ui/sheet';
import { addPostComment, deletePostComment, createCommunityPost, deleteCommunityPost, listCommunityFeed, listPostsBy, listPostComments, recordPostView, togglePostLike, type CommunityMedia, type CommunityPost } from '@/data/community';
import { personName, type SocialPerson, useSocial } from '@/data/social';
import { stumpQuestion } from '@/data/stumps';
import { useDisplayName } from '@/data/user';
import { useAuth } from '@/hooks/use-auth';
import { Radius, Type, type ThemeColors } from '@/constants/theme';
import { MentionInput } from '@/components/social/mention-input';
import { PostDetail, type PostComment } from '@/components/social/post-detail';
import { MediaCarousel, postMedia } from '@/components/social/media-carousel';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';


// Posts this learner chose "Not interested" for (this device only).
const HIDDEN_KEY = 'grateapex_hidden_posts';

/** Everyone's posts (Feed), or one learner's posts (their profile, with authorId). */
export function CommunityPostsFeed({ authorId, showComposer = true }: { authorId?: string; showComposer?: boolean } = {}) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const social = useSocial();
  const { user } = useAuth();
  const displayName = useDisplayName();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [media, setMedia] = useState<CommunityMedia[]>([]);
  const [busy, setBusy] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentDraft, setCommentDraft] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  // The top-level comment a reply is filed under (set together with replyingTo).
  const [replyParent, setReplyParent] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [hiddenIds, setHiddenIds] = useState<readonly string[]>([]);
  useEffect(() => {
    void AsyncStorage.getItem(HIDDEN_KEY).then((saved) => { if (saved) setHiddenIds(JSON.parse(saved)); }).catch(() => {});
  }, []);
  const hidePost = (target: ReportTarget) => {
    const next = [...new Set([...hiddenIds, target.id])].slice(-500);
    setHiddenIds(next);
    setSelectedPost((current) => (current?.id === target.id ? null : current));
    void AsyncStorage.setItem(HIDDEN_KEY, JSON.stringify(next)).catch(() => {});
  };
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const nextPosts = authorId ? await listPostsBy(authorId) : await listCommunityFeed();
      setPosts(nextPosts);
      setSelectedPost((current) => current ? nextPosts.find((post) => post.id === current.id) ?? current : current);
    }
    catch (caught) { setError(getErrorMessage(caught, 'Could not load posts.')); }
    finally { setLoading(false); }
  }, [authorId]);

  useEffect(() => { queueMicrotask(() => { void refresh(); }); }, [refresh]);

  useEffect(() => {
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, []);

  async function chooseMedia() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setError('Allow photo library access to attach media.'); return; }
    // Up to 3 photos or videos per post (the shared rules' limit), shown as a carousel.
    const room = 3 - media.length;
    if (room <= 0) { setError('A post can have up to 3 photos or videos.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.85, videoMaxDuration: 60, allowsMultipleSelection: true, selectionLimit: room });
    if (result.canceled || !result.assets.length) return;
    const picked = result.assets.slice(0, room).map((asset, at): CommunityMedia => {
      const type = asset.type === 'video' ? 'video' : 'image';
      return { uri: asset.uri, type, mimeType: asset.mimeType ?? (type === 'video' ? 'video/mp4' : 'image/jpeg'), filename: asset.fileName ?? `grateapex-${Date.now()}-${at}.${type === 'video' ? 'mp4' : 'jpg'}`, size: asset.fileSize };
    });
    setMedia((list) => [...list, ...picked].slice(0, 3));
    setError(null);
  }

  async function publish(resharedPostId?: string) {
    if ((!draft.trim() && !media.length && !resharedPostId) || busy) return;
    setBusy(true);
    setError(null);
    try {
      await createCommunityPost(draft, resharedPostId ? undefined : media, resharedPostId);
      setDraft('');
      setMedia([]);
      setComposeOpen(false);
      setNotice(resharedPostId ? 'Reposted to your feed.' : 'Your post is live for your friends.');
      await refresh();
    } catch (caught) { setError(getErrorMessage(caught, 'Could not publish this post.')); }
    finally { setBusy(false); }
  }

  // Repost: shares the original post (a repost of a repost shares its original).
  async function repost(post: CommunityPost) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await createCommunityPost('', undefined, post.reshared_post_id ?? post.id);
      setNotice('Reposted to the feed.');
      await refresh();
    } catch (caught) { setError(getErrorMessage(caught, 'Could not repost this post.')); }
    finally { setBusy(false); }
  }

  async function like(post: CommunityPost) {
    try {
      const liked = await togglePostLike(post.id);
      setPosts((all) => all.map((item) => item.id === post.id ? { ...item, my_reaction: liked ? 'like' : null, reactions: Math.max(0, item.reactions + (liked ? 1 : -1)) } : item));
      setSelectedPost((item) => item?.id === post.id ? { ...item, my_reaction: liked ? 'like' : null, reactions: Math.max(0, item.reactions + (liked ? 1 : -1)) } : item);
    } catch (caught) {
      setError(getErrorMessage(caught, 'Could not update this reaction.'));
    }
  }

  async function sharePost(post: CommunityPost) {
    const appUrl = 'https://grateapex.vercel.app/';
    const message = `${post.body.trim() || 'A post from my GrAte Apex Hub community'}\n\n${appUrl}`;
    try {
      if (Platform.OS === 'web') {
        const browserNavigator = globalThis.navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
        if (typeof browserNavigator.share === 'function') {
          await browserNavigator.share({ title: 'GrAte Apex Hub', text: post.body.trim(), url: appUrl });
        } else if (browserNavigator.clipboard?.writeText) {
          await browserNavigator.clipboard.writeText(message);
          setNotice('Post text and app link copied.');
        } else {
          setNotice(message);
        }
        return;
      }
      const result = await Share.share({ message, title: 'GrAte Apex Hub' });
      if (result.action === Share.sharedAction) setNotice('Post shared.');
    } catch (caught) {
      if (caught instanceof Error && caught.name === 'AbortError') return;
      setError(getErrorMessage(caught, 'Could not share this post.'));
    }
  }

  // Counts my view once (not for my own posts) and shows it straight away.
  function markSeen(post: CommunityPost) {
    void recordPostView(post.id, post.author_id).then((counted) => {
      if (!counted) return;
      const bump = (item: CommunityPost) => (item.id === post.id ? { ...item, views: (item.views ?? 0) + 1 } : item);
      setPosts((all) => all.map(bump));
      setSelectedPost((current) => (current ? bump(current) : current));
    });
  }

  async function openPost(post: CommunityPost) {
    markSeen(post);
    setSelectedPost(post);
    setComments([]);
    setCommentDraft('');
    setReplyingTo(null);
    setReplyParent(null);
    try { setComments(await listPostComments(post.id) as PostComment[]); }
    catch (caught) { setError(getErrorMessage(caught, 'Could not load comments.')); }
  }

  async function sendComment() {
    if (!selectedPost || !commentDraft.trim()) return;
    setBusy(true);
    try {
      await addPostComment(selectedPost.id, commentDraft, replyParent ? { parentId: replyParent, replyTo: replyingTo } : undefined);
      setCommentDraft('');
      setReplyingTo(null);
      setReplyParent(null);
      setComments(await listPostComments(selectedPost.id) as PostComment[]);
      setPosts((all) => all.map((post) => post.id === selectedPost.id ? { ...post, comments: post.comments + 1 } : post));
      setSelectedPost((post) => post?.id === selectedPost.id ? { ...post, comments: post.comments + 1 } : post);
    } catch (caught) { setError(getErrorMessage(caught, 'Could not add your comment.')); }
    finally { setBusy(false); }
  }

  // Report: opens the reasons sheet (components/social/report-sheet.tsx).
  async function removeComment(comment: PostComment) {
    if (!selectedPost) return;
    const postId = selectedPost.id;
    try {
      await deletePostComment(postId, comment.id);
      setComments((list) => list.filter((item) => item.id !== comment.id));
      setPosts((all) => all.map((post) => post.id === postId ? { ...post, comments: Math.max(0, post.comments - 1) } : post));
      setSelectedPost((post) => post?.id === postId ? { ...post, comments: Math.max(0, post.comments - 1) } : post);
      setNotice('Comment deleted.');
    } catch (caught) { setError(getErrorMessage(caught, 'Could not delete the comment.')); }
  }

  // Reply to a comment the Instagram way: the reply sits under the top-level comment and starts with their @username.
  function replyTo(comment: PostComment) {
    const handle = comment.author_name?.trim();
    if (!handle) return;
    setReplyingTo(handle);
    setReplyParent(comment.parent_id ?? comment.id);
    setCommentDraft((draft) => (draft.startsWith(`@${handle} `) ? draft : `@${handle} ${draft.replace(/^@\S+\s/, '')}`));
  }

  function report(targetType: 'post' | 'comment' | 'user', id: string, label: string = targetType) {
    setReportTarget({ type: targetType, id, label });
  }

  async function deletePost(post: CommunityPost) {
    try {
      await deleteCommunityPost(post.id);
      setPosts((all) => all.filter((item) => item.id !== post.id));
      setSelectedPost((current) => current?.id === post.id ? null : current);
      setNotice('Post and its attached upload were deleted.');
      setError(null);
    } catch (caught) {
      setError(getErrorMessage(caught, 'Could not delete this post.'));
    }
  }

  function confirmDeletePost(post: CommunityPost) {
    if (Platform.OS === 'web') {
      if (globalThis.confirm('Delete this post and its attached photo or video?')) void deletePost(post);
      return;
    }
    Alert.alert('Delete this post?', 'This removes the post and its attached photo or video from your feed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { void deletePost(post); } },
    ]);
  }

  return (
    <View style={styles.feed}>
      {showComposer ? <Card style={styles.composerCard}>
        <View style={styles.composerHeader}>
          <Avatar name={displayName || 'You'} size={40} ring="subtle" />
          <Text style={styles.composerPrompt}>Share what’s on your mind</Text>
        </View>
        <View style={styles.actions}>
          <Button label="Write a post" variant="secondary" size="sm" onPress={() => setComposeOpen(true)} />
          <Button label="Add photos or video" variant="ghost" size="sm" icon={<Icon name="image" size={16} color={colors.primaryText} />} onPress={() => { setComposeOpen(true); void chooseMedia(); }} />
        </View>
      </Card> : null}
      {notice ? <Text accessibilityRole="text" style={styles.notice}>{notice}</Text> : null}
      {error ? <Card style={styles.errorCard}><Text style={styles.errorTitle}>Community feed issue</Text><Text style={styles.muted}>{error}</Text><Button label="Try again" size="sm" variant="secondary" onPress={() => void refresh()} /></Card> : null}
      {loading ? <Text style={styles.muted}>Loading posts…</Text> : null}
      {!loading && !posts.length && !error ? <Card style={styles.empty}><Icon name="social" size={22} color={colors.primaryText} /><Text style={styles.emptyTitle}>Your feed is ready for your circle</Text><Text style={styles.muted}>Posts from people across GrAte Apex Hub will appear here.</Text></Card> : null}
      {posts.filter((post) => !hiddenIds.includes(post.id)).map((post) => (
        <PostCard key={post.id} post={post} socialPeople={social.people} ownId={user?.id ?? social.userId} ownName={displayName || 'You'} onOpen={() => void openPost(post)} onLike={() => void like(post)} onComment={() => void openPost(post)} onReshare={() => void repost(post)} onShare={() => void sharePost(post)} onReport={() => report('post', post.id, `post by ${post.author_name ? `@${post.author_name}` : 'a learner'}`)} onDelete={() => confirmDeletePost(post)} onSeen={() => markSeen(post)} />
      ))}
      <ReportSheet target={reportTarget} reporter={displayName || 'a learner'} onClose={() => setReportTarget(null)} onHide={hidePost} onDone={(message) => { setReportTarget(null); setNotice(message); }} />
      <Sheet visible={composeOpen} onClose={() => setComposeOpen(false)} title="Create a post" subtitle="Share something with the GrAte Apex Hub community.">
        <View style={styles.composeSheet}>
        <Text style={styles.muted}>Share how you’re feeling, what’s happening in your life, or anything you’d like your friends to know.</Text>
        <MentionInput people={social.people} value={draft} onChangeText={setDraft} multiline maxLength={5000} placeholder="What’s on your mind today?" placeholderTextColor={colors.textTertiary} accessibilityLabel="Write a post" style={styles.postInput} />
          {media.map((item, at) => <View key={`${item.uri}-${at}`} style={styles.mediaSelected}><Icon name={item.type === 'video' ? 'play' : 'image'} size={16} color={colors.primaryText} /><Text style={[styles.muted, styles.flex]} numberOfLines={1}>{item.filename}</Text><Button label="Remove" size="sm" variant="ghost" onPress={() => setMedia((list) => list.filter((_, index) => index !== at))} /></View>)}
          <View style={styles.actions}>
            <Button label={media.length ? `Add more (${media.length}/3)` : 'Choose photos or video'} variant="secondary" size="sm" onPress={() => void chooseMedia()} />
            <Button label="Publish" size="sm" onPress={() => void publish()} loading={busy} disabled={(!draft.trim() && !media.length) || busy} />
          </View>
        </View>
      </Sheet>
      <PostDetail
        key={selectedPost?.id ?? 'none'}
        post={selectedPost}
        comments={comments}
        people={social.people}
        ownId={user?.id ?? social.userId}
        ownName={displayName || 'You'}
        draft={commentDraft}
        onDraft={setCommentDraft}
        replyingTo={replyingTo}
        onReply={replyTo}
        onCancelReply={() => { const handle = replyingTo; setReplyingTo(null); setReplyParent(null); if (handle) setCommentDraft((text) => text.replace(`@${handle} `, '')); }}
        onSend={() => void sendComment()}
        busy={busy}
        onClose={() => setSelectedPost(null)}
        onLike={() => { if (selectedPost) void like(selectedPost); }}
        onReshare={() => { if (selectedPost) void repost(selectedPost); }}
        onShare={() => { if (selectedPost) void sharePost(selectedPost); }}
        onReport={() => { if (selectedPost) report('post', selectedPost.id, `post by ${selectedPost.author_name ? `@${selectedPost.author_name}` : 'a learner'}`); }}
        onReportComment={(comment) => report('comment', comment.id, `comment by ${comment.author_name ? `@${comment.author_name}` : 'a learner'}`)}
        onDeleteComment={(comment) => void removeComment(comment)}
        onDelete={() => { if (selectedPost) confirmDeletePost(selectedPost); }}
      />
    </View>
  );
}

function getErrorMessage(caught: unknown, fallback: string) {
  if (typeof caught === 'string' && caught.trim()) return caught;
  if (caught instanceof Error && caught.message) return caught.message;
  if (caught && typeof caught === 'object' && 'message' in caught && typeof caught.message === 'string' && caught.message.trim()) {
    const code = 'code' in caught && typeof caught.code === 'string' ? ` (${caught.code})` : '';
    return `${caught.message}${code}`;
  }
  return fallback;
}

// "Seen" = at least 60% of the post on screen for a second (web). Elsewhere a
// view is counted when the post is opened.
function useSeenOnScreen(onSeen?: () => void) {
  const ref = useRef<View>(null);
  const callback = useRef(onSeen);
  useEffect(() => { callback.current = onSeen; }, [onSeen]);
  useEffect(() => {
    const node = ref.current as unknown as Element | null;
    if (Platform.OS !== 'web' || !node || typeof IntersectionObserver === 'undefined') return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        timer ??= setTimeout(() => { callback.current?.(); observer.disconnect(); }, 1000);
      } else if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    }, { threshold: 0.6 });
    observer.observe(node);
    return () => { if (timer) clearTimeout(timer); observer.disconnect(); };
  }, []);
  return ref;
}

const viewsLabel = (views: number) => `${views.toLocaleString()} ${views === 1 ? 'view' : 'views'}`;

function PostCard({ post, socialPeople, ownId, ownName, onOpen, onLike, onComment, onReshare, onShare, onReport, onDelete, onSeen, verticalActions = false }: {
  post: CommunityPost; socialPeople: readonly SocialPerson[]; ownId: string | null; ownName: string;
  onOpen: () => void; onSeen?: () => void; verticalActions?: boolean;
  onLike: () => void; onComment: () => void; onReshare: () => void; onShare: () => void; onReport: () => void; onDelete: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const friend = socialPeople.find((person) => person.userId === post.author_id);
  const name = friend ? personName(friend) : post.author_id === ownId ? ownName : post.author_name ? `@${post.author_name}` : 'Username pending';
  const resharedFriend = socialPeople.find((person) => person.userId === post.reshared_author_id);
  const resharedName = post.reshared_author_id === ownId ? ownName : resharedFriend ? personName(resharedFriend) : 'Username pending';
  // A Stump a friend post shows its question card (the plain text is for the original app).
  const stumped = post.stump ? stumpQuestion(post.stump.qid) : null;
  const seenRef = useSeenOnScreen(onSeen);
  const views = typeof post.views === 'number' ? ` · ${viewsLabel(post.views)}` : '';
  return (
    <View ref={seenRef} collapsable={false}>
    <Card style={[styles.postCard, verticalActions && styles.postDetailCard]}>
      <View style={verticalActions ? styles.postDetailLayout : undefined}>
      <View style={verticalActions ? styles.postDetailContent : styles.postContent}>
      <View style={styles.postHead}><View style={styles.postAuthor}><PersonAvatar uid={post.author_id} uri={friend?.avatarUrl ?? null} name={name} size={42} ring="subtle" /><Interactive onPress={() => router.push(post.author_id && post.author_id !== ownId ? routes.profile(post.author_id) : ('/profile' as never))} accessibilityRole="link" accessibilityLabel={`View ${name}'s profile`} style={styles.flex}><View style={styles.nameRow}><Text style={styles.author}>{name}</Text><VerifiedBadge username={post.author_name} uid={post.author_id} /></View><Text style={styles.muted}>{new Date(post.created_at).toLocaleString()}</Text></Interactive></View>{post.reshared_post_id ? <Pill label="Reposted" /> : null}{post.author_id === ownId ? <Button label="Delete" size="sm" variant="ghost" icon={<Icon name="trash" size={16} color={colors.error} />} onPress={onDelete} accessibilityLabel="Delete post" /> : null}</View>
      {post.stump && stumped ? <StumpCard postId={post.id} question={stumped} stump={post.stump} authorId={post.author_id} authorName={name} ownId={ownId} people={socialPeople} /> : post.body ? <Interactive onPress={onOpen} accessibilityRole="button" accessibilityLabel="Open post" style={styles.postBodyOpen}><Text style={styles.body}>{post.body}</Text></Interactive> : null}
      {post.reshared_post_id ? (
        <View style={styles.reshareBox}>
          <Text style={styles.muted}>Original post by {resharedName}</Text>
          {post.reshared_body ? <Text style={styles.body}>{post.reshared_body}</Text> : null}
          {post.reshared_media_url && post.reshared_media_type === 'image' ? <Image source={{ uri: post.reshared_media_url }} contentFit="cover" style={styles.image} accessibilityLabel="Reshared photo" /> : null}
          {post.reshared_media_url && post.reshared_media_type === 'video' ? <VideoPlayer url={post.reshared_media_url} height={260} label="Reshared video" /> : null}
        </View>
      ) : null}
      {postMedia(post).length ? <MediaCarousel items={postMedia(post)} height={560} minHeight={260} adaptive fit="contain" onPress={onOpen} /> : null}
      {!verticalActions ? <Text style={styles.counts}>{post.reactions} likes · {post.comments} comments · {post.reshares} reshares{views}</Text> : <Text style={styles.counts}>{post.reactions} likes{views}</Text>}
      {!verticalActions ? <View style={styles.postActions}>
        <Interactive onPress={onLike} accessibilityRole="button" accessibilityLabel={post.my_reaction ? 'Unlike post' : 'Like post'} style={styles.action}><Icon name="heart" size={20} color={post.my_reaction ? colors.primaryText : colors.textSecondary} filled={Boolean(post.my_reaction)} /></Interactive>
        <Interactive onPress={onComment} accessibilityRole="button" accessibilityLabel={`Comment on post, ${post.comments} comments`} style={styles.action}><Icon name="comment" size={20} color={colors.textSecondary} /></Interactive>
        <Interactive onPress={onReshare} accessibilityRole="button" accessibilityLabel={`Repost, ${post.reshares} reshares`} style={styles.action}><Icon name="repost" size={20} color={colors.textSecondary} /></Interactive>
        <Interactive onPress={onShare} accessibilityRole="button" accessibilityLabel="Share post" style={styles.action}><Icon name="share" size={20} color={colors.textSecondary} /></Interactive>
        <Interactive onPress={onReport} accessibilityRole="button" accessibilityLabel="Report post" style={styles.action}><Icon name="warning" size={20} color={colors.textSecondary} /></Interactive>
      </View> : null}
      </View>
      {verticalActions ? <View style={styles.postActionsVertical}>
        <Interactive onPress={onLike} accessibilityRole="button" accessibilityLabel={`${post.my_reaction ? 'Unlike' : 'Like'} post, ${post.reactions} likes`} style={styles.railAction}><Icon name="heart" size={21} color={post.my_reaction ? colors.primaryText : colors.textSecondary} filled={Boolean(post.my_reaction)} /></Interactive>
        <Interactive onPress={onComment} accessibilityRole="button" accessibilityLabel={`Comment, ${post.comments} comments`} style={styles.railAction}><Icon name="comment" size={21} color={colors.textSecondary} /></Interactive>
        <Interactive onPress={onReshare} accessibilityRole="button" accessibilityLabel={`Repost, ${post.reshares} reshares`} style={styles.railAction}><Icon name="repost" size={21} color={colors.textSecondary} /></Interactive>
        <Interactive onPress={onShare} accessibilityRole="button" accessibilityLabel="Share post" style={styles.railAction}><Icon name="share" size={21} color={colors.textSecondary} /></Interactive>
        <Interactive onPress={onReport} accessibilityRole="button" accessibilityLabel="Report post" style={styles.railAction}><Icon name="warning" size={19} color={colors.textSecondary} /></Interactive>
      </View> : null}
      </View>
    </Card>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    feed: { gap: 12, marginBottom: 16 },
    notice: { ...Type.caption, color: colors.successText },
    composerCard: { gap: 12 },
    composerHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    composerPrompt: { ...Type.callout, color: colors.textSecondary },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    postCard: { gap: 11 },
    postDetailCard: { padding: 0, borderWidth: 0, backgroundColor: 'transparent', elevation: 0 },
    postDetailLayout: { flexDirection: 'row', alignItems: 'stretch', gap: 12 },
    postDetailContent: { flex: 1, minWidth: 0, gap: 11 },
    postContent: { gap: 11 },
    postBodyOpen: { alignSelf: 'stretch' },
    postHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    postAuthor: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
    flex: { flex: 1, minWidth: 0 },
    author: { ...Type.headline, color: colors.text },
    body: { ...Type.callout, color: colors.text, lineHeight: 21 },
    muted: { ...Type.caption, color: colors.textTertiary },
    counts: { ...Type.caption, color: colors.textTertiary },
    image: { width: '100%', height: 320, borderRadius: 14, backgroundColor: colors.surfaceMuted },
    video: { minHeight: 180, borderRadius: 14, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center', gap: 8 },
    videoText: { ...Type.caption, color: colors.onSecondary },
    reshareBox: { gap: 9, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12, backgroundColor: colors.surfaceMuted },
    postActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 8, gap: 8 },
    postActionsVertical: { width: 62, alignItems: 'center', gap: 14, borderLeftWidth: 1, borderLeftColor: colors.divider, paddingLeft: 8, paddingTop: 8 },
    railAction: { minWidth: 48, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingVertical: 3 },
    action: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', minHeight: 42, paddingVertical: 8 },
    composeSheet: { gap: 12 },
    postInput: { minHeight: 140, textAlignVertical: 'top', padding: 13, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 14, backgroundColor: colors.surfaceSunken, color: colors.text, fontSize: 15 },
    mediaSelected: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    input: { minHeight: 42, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: Radius.md, backgroundColor: colors.surfaceSunken, paddingHorizontal: 12, color: colors.text, fontSize: 14 },
    empty: { gap: 9, alignItems: 'center', padding: 20 },
    emptyTitle: { ...Type.title3, color: colors.text, textAlign: 'center' },
    errorCard: { gap: 8 },
    errorTitle: { ...Type.headline, color: colors.error },
  });
}
