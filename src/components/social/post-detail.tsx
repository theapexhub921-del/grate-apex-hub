import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useRef } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, type TextInput as RNTextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { canSwipe, SwipeToReply } from '@/components/chat/swipe-to-reply';
import { MentionInput } from '@/components/social/mention-input';
import { PersonAvatar } from '@/components/social/profile-card';
import { StumpCard } from '@/components/social/stump-card';
import { Icon, type IconName } from '@/components/ui/icon';
import { Interactive } from '@/components/ui/interactive';
import { Text } from '@/components/ui/text';
import { VerifiedBadge } from '@/components/ui/verified-badge';
import { VideoPlayer } from '@/components/ui/video-player';
import { isDesktopWidth, Radius, Type, type ThemeColors } from '@/constants/theme';
import { type CommunityPost } from '@/data/community';
import { personName, type SocialPerson } from '@/data/social';
import { stumpQuestion } from '@/data/stumps';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { routes } from '@/lib/routes';

export type PostComment = { id: string; author_id: string; author_name?: string | null; body: string; created_at: string };

const now = () => Date.now();

/** Instagram-style short times: now, 5m, 3h, 2d, 1w. */
function short(iso: string) {
  const minutes = Math.max(0, Math.round((now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return days < 7 ? `${days}d` : `${Math.round(days / 7)}w`;
}

/**
 * An opened post, laid out like Instagram: on a computer the photo is on the
 * left and the author, caption, comments, actions and comment box are on the
 * right; on a phone it fills the screen with the comment box pinned at the
 * bottom. Swipe a comment right (touch screens) or tap Reply to answer it.
 */
export function PostDetail({
  post, comments, people, ownId, ownName, draft, onDraft, replyingTo, onReply, onCancelReply, onSend, busy,
  onClose, onLike, onReshare, onShare, onReport, onReportComment, onDelete,
}: {
  post: CommunityPost | null; comments: readonly PostComment[]; people: readonly SocialPerson[]; ownId: string | null; ownName: string;
  draft: string; onDraft: (value: string) => void; replyingTo: string | null; onReply: (comment: PostComment) => void; onCancelReply: () => void; onSend: () => void; busy: boolean;
  onClose: () => void; onLike: () => void; onReshare: () => void; onShare: () => void; onReport: () => void; onReportComment: (comment: PostComment) => void; onDelete: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const input = useRef<RNTextInput>(null);
  const focusInput = useCallback(() => input.current?.focus(), []);
  if (!post) return null;

  const desktop = isDesktopWidth(width);
  const friend = people.find((person) => person.userId === post.author_id);
  const name = friend ? personName(friend) : post.author_id === ownId ? ownName : post.author_name ? `@${post.author_name}` : 'Learner';
  const handle = post.author_name ? post.author_name : name;
  const stumped = post.stump ? stumpQuestion(post.stump.qid) : null;
  const hasMedia = Boolean(post.media_url);
  const split = desktop && hasMedia;
  const panelHeight = Math.min(height - 80, 680);
  const openProfile = (uid: string) => {
    onClose();
    router.push(uid && uid !== ownId ? routes.profile(uid) : ('/profile' as never));
  };
  const commentName = (comment: PostComment) => {
    if (comment.author_id === ownId) return comment.author_name ?? 'You';
    const person = people.find((p) => p.userId === comment.author_id);
    return comment.author_name ?? (person ? personName(person) : 'Learner');
  };

  const media = post.media_url ? (
    post.media_type === 'video' ? (
      <VideoPlayer url={post.media_url} height={split ? panelHeight : 320} label="Video in community post" />
    ) : (
      <Image source={{ uri: post.media_url }} contentFit={split ? 'contain' : 'cover'} style={split ? styles.mediaSplit : styles.mediaStacked} accessibilityLabel="Photo in community post" />
    )
  ) : null;

  const header = (
    <View style={styles.head}>
      <Interactive onPress={() => openProfile(post.author_id)} accessibilityRole="link" accessibilityLabel={`View ${name}'s profile`} style={styles.headWho}>
        <PersonAvatar uid={post.author_id} uri={friend?.avatarUrl ?? null} name={name} size={34} ring="subtle" />
        <Text style={styles.headName} numberOfLines={1}>{handle}</Text>
        <VerifiedBadge username={post.author_name} uid={post.author_id} size={14} />
      </Interactive>
      {post.author_id === ownId ? (
        <Interactive onPress={onDelete} accessibilityRole="button" accessibilityLabel="Delete post" style={styles.iconButton}><Icon name="trash" size={19} color={colors.error} /></Interactive>
      ) : (
        <Interactive onPress={onReport} accessibilityRole="button" accessibilityLabel="Report post" style={styles.iconButton}><Icon name="more" size={20} color={colors.text} /></Interactive>
      )}
      <Interactive onPress={onClose} accessibilityRole="button" accessibilityLabel="Close post" style={styles.iconButton}><Icon name="close" size={20} color={colors.text} /></Interactive>
    </View>
  );

  const caption = (
    <>
      {post.stump && stumped ? (
        <StumpCard postId={post.id} question={stumped} stump={post.stump} authorId={post.author_id} authorName={name} ownId={ownId} people={people} />
      ) : post.body ? (
        <View style={styles.row}>
          <PersonAvatar uid={post.author_id} uri={friend?.avatarUrl ?? null} name={name} size={32} />
          <View style={styles.rowText}>
            <Text style={styles.text}><Text style={styles.bold} onPress={() => openProfile(post.author_id)}>{handle}</Text> {post.body}</Text>
            <Text style={styles.meta}>{short(post.created_at)}</Text>
          </View>
        </View>
      ) : null}
      {post.reshared_post_id ? (
        <View style={styles.reshare}>
          <Text style={styles.meta}>Reposted</Text>
          {post.reshared_body ? <Text style={styles.text}>{post.reshared_body}</Text> : null}
          {post.reshared_media_url && post.reshared_media_type === 'image' ? <Image source={{ uri: post.reshared_media_url }} contentFit="cover" style={styles.reshareImage} accessibilityLabel="Reshared photo" /> : null}
          {post.reshared_media_url && post.reshared_media_type === 'video' ? <VideoPlayer url={post.reshared_media_url} height={220} label="Reshared video" /> : null}
        </View>
      ) : null}
    </>
  );

  const commentList = (
    <>
      {comments.map((comment) => {
        const person = people.find((p) => p.userId === comment.author_id);
        const who = commentName(comment);
        const canReply = Boolean(comment.author_name) && comment.author_id !== ownId;
        return (
          <SwipeToReply key={comment.id} onReply={() => { onReply(comment); focusInput(); }} enabled={canSwipe && canReply}>
            <View style={styles.row}>
              <Interactive onPress={() => openProfile(comment.author_id)} accessibilityRole="link" accessibilityLabel={`View ${who}'s profile`}>
                <PersonAvatar uid={comment.author_id} uri={person?.avatarUrl ?? null} name={who} size={32} />
              </Interactive>
              <View style={styles.rowText}>
                <Text style={styles.text}>
                  <Text style={styles.bold} onPress={() => openProfile(comment.author_id)}>{who}</Text>{' '}
                  <VerifiedBadge username={comment.author_name} uid={comment.author_id} size={12} /> {comment.body}
                </Text>
                <View style={styles.metaRow}>
                  <Text style={styles.meta}>{short(comment.created_at)}</Text>
                  {canReply ? <Text style={styles.metaAction} onPress={() => { onReply(comment); focusInput(); }} accessibilityRole="button">Reply</Text> : null}
                  {comment.author_id !== ownId ? <Text style={styles.metaAction} onPress={() => onReportComment(comment)} accessibilityRole="button">Report</Text> : null}
                </View>
              </View>
            </View>
          </SwipeToReply>
        );
      })}
      {!comments.length ? (
        <View style={styles.none}>
          <Text style={styles.noneTitle}>No comments yet.</Text>
          <Text style={styles.meta}>Start the conversation.</Text>
        </View>
      ) : null}
    </>
  );


  const bottom = (
    <View style={[styles.bottom, !desktop && { paddingBottom: insets.bottom + 6 }]}>
      <View style={styles.actions}>
        <ActionIcon icon="heart" label={`${post.my_reaction ? 'Unlike' : 'Like'} post, ${post.reactions} likes`} onPress={onLike} active={Boolean(post.my_reaction)} />
        <ActionIcon icon="comment" label={`Comment, ${post.comments} comments`} onPress={focusInput} />
        <ActionIcon icon="repost" label={`Repost, ${post.reshares} reshares`} onPress={onReshare} />
        <ActionIcon icon="share" label="Share post" onPress={onShare} />
      </View>
      <View style={styles.counts}>
        <Text style={styles.likes}>{post.reactions.toLocaleString()} {post.reactions === 1 ? 'like' : 'likes'}</Text>
        <Text style={styles.meta}>{new Date(post.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</Text>
      </View>
      {replyingTo ? (
        <View style={styles.replying}>
          <Text style={styles.meta}>Replying to @{replyingTo}</Text>
          <Interactive onPress={onCancelReply} accessibilityRole="button" accessibilityLabel="Cancel reply"><Icon name="close" size={14} color={colors.textSecondary} /></Interactive>
        </View>
      ) : null}
      <View style={styles.composer}>
        <View style={styles.flex}>
          <MentionInput ref={input} compact people={people} value={draft} onChangeText={onDraft} maxLength={2000} placeholder="Add a comment…" placeholderTextColor={colors.textTertiary} accessibilityLabel="Write a comment" style={styles.input} onSubmitEditing={onSend} />
        </View>
        <Interactive onPress={onSend} disabled={!draft.trim() || busy} accessibilityRole="button" accessibilityLabel="Post comment">
          <Text style={[styles.post, (!draft.trim() || busy) && styles.postOff]}>{busy ? 'Posting…' : 'Post'}</Text>
        </Interactive>
      </View>
    </View>
  );

  const side = (
    <View style={[styles.side, split && styles.sideSplit]}>
      {header}
      <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {!split ? media : null}
        {caption}
        {commentList}
      </ScrollView>
      {bottom}
    </View>
  );

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.root, desktop && styles.rootDesktop]}>
        {desktop ? <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" /> : null}
        <View
          accessibilityViewIsModal
          style={
            desktop
              ? [styles.panel, styles.panelDesktop, { height: panelHeight, width: Math.min(split ? 1000 : 560, width - 48) }]
              : [styles.panel, styles.panelPhone, { paddingTop: insets.top }]
          }
        >
          {split ? <View style={styles.mediaPane}>{media}</View> : null}
          {side}
        </View>
      </View>
    </Modal>
  );
}

function ActionIcon({ icon, label, onPress, active = false }: { icon: IconName; label: string; onPress: () => void; active?: boolean }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  return (
    <Interactive onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.action}>
      <Icon name={icon} size={24} color={active ? colors.primaryText : colors.text} filled={active} />
    </Interactive>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    root: { flex: 1 },
    rootDesktop: { alignItems: 'center', justifyContent: 'center' },
    panel: { backgroundColor: colors.surfaceElevated, overflow: 'hidden', flexDirection: 'row' },
    panelDesktop: { borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.hairline },
    panelPhone: { flex: 1 },
    mediaPane: { flex: 1, minWidth: 0, backgroundColor: '#000', justifyContent: 'center' },
    mediaSplit: { width: '100%', height: '100%' },
    mediaStacked: { width: '100%', aspectRatio: 1, maxHeight: 420, borderRadius: Radius.md, backgroundColor: colors.surfaceMuted },
    side: { flex: 1, minWidth: 0 },
    sideSplit: { flex: 0, width: 400, borderLeftWidth: 1, borderLeftColor: colors.divider },
    head: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.divider },
    headWho: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
    headName: { ...Type.headline, fontSize: 14.5, color: colors.text, flexShrink: 1 },
    iconButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19 },
    scroll: { padding: 14, gap: 18 },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    rowText: { flex: 1, minWidth: 0, gap: 4 },
    text: { fontSize: 14, lineHeight: 20, color: colors.text },
    bold: { fontWeight: '800', color: colors.text },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    meta: { fontSize: 12, color: colors.textTertiary },
    metaAction: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
    none: { alignItems: 'center', gap: 4, paddingVertical: 28 },
    noneTitle: { ...Type.title3, color: colors.text },
    reshare: { gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: Radius.md, padding: 12, backgroundColor: colors.surfaceMuted },
    reshareImage: { width: '100%', height: 220, borderRadius: Radius.sm },
    bottom: { borderTopWidth: 1, borderTopColor: colors.divider },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingTop: 6 },
    action: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
    counts: { paddingHorizontal: 14, paddingBottom: 10, gap: 2 },
    likes: { fontSize: 14, fontWeight: '800', color: colors.text },
    replying: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginHorizontal: 14, marginBottom: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.md, backgroundColor: colors.surfaceMuted },
    composer: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.divider },
    input: { minHeight: 40, paddingVertical: 8, color: colors.text, fontSize: 14 },
    post: { fontSize: 14, fontWeight: '800', color: colors.primaryText },
    postOff: { opacity: 0.4 },
  });
}
