import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, ScrollView, StyleSheet, TextInput as RNTextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ReportSheet, type ReportTarget } from '@/components/social/report-sheet';
import { openProfileCard, PersonAvatar } from '@/components/social/profile-card';
import { GroupInfoSheet } from '@/components/chat/group-info';
import { canSwipe, SwipeToReply } from '@/components/chat/swipe-to-reply';
import { Avatar } from '@/components/ui/avatar';
import { router } from 'expo-router';
import { deleteGroupMessage, getGroup, type GroupInfo, listGroupMessages, reactToGroupMessage, sendGroupMessage } from '@/data/group-chat';
import { clock, useVoiceRecorder, voiceNotesSupported, VoiceNotePlayer } from '@/components/social/voice-note';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { Interactive } from '@/components/ui/interactive';
import { Sheet } from '@/components/ui/sheet';
import { Text, TextInput } from '@/components/ui/text';
import { VerifiedBadge } from '@/components/ui/verified-badge';
import { webStyle } from '@/components/ui/web';
import { Radius, ReadReceiptBlues, Type, type ThemeColors } from '@/constants/theme';
import { hideMessage, isHidden, isStarred, previewOf, REACTIONS, reactToMessage, type ReplyRef, sendChatMessage, setTyping, toggleStar, togglePin, uploadChatDocument, useChatPrefs } from '@/data/chat';
import { contrastRatio } from '@/data/contrast';
import { deleteCommunityMessage, getOrCreateFriendConversation, listConversationMessages, loadConversationMeta, markConversationSeen, messageStatus, sendVoiceNote, VOICE_NOTE_MAX_SECONDS, type CommunityMessage, type ConversationMeta, type MessageStatus } from '@/data/community';
import { friendStreak } from '@/data/friend-streaks';
import { usePrivacyPreferences } from '@/data/settings';
import { personName, useSocial } from '@/data/social';
import { useAuth } from '@/hooks/use-auth';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { uploadMedia, uploadVoiceNote, type Media } from '@/lib/media';
import { announceMessage } from '@/lib/web-push';

const EMOJI = ['😀', '😂', '🥹', '😍', '😎', '🤔', '😴', '😭', '🔥', '❤️', '👍', '🙏', '🎉', '📚', '🧠', '💯', '✅', '🩺'];
const STATUS_LABEL: Record<MessageStatus, string> = { sent: 'Sent', delivered: 'Delivered', read: 'Seen' };
const isWeb = Platform.OS === 'web';
const now = () => Date.now();

function ago(at: number) {
  const minutes = Math.max(0, Math.round((now() - at) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function dayLabel(at: number) {
  const date = new Date(at);
  const today = new Date();
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (date.toDateString() === today.toDateString()) return `Today ${time}`;
  if (today.getTime() - at < 7 * 86_400_000) return `${date.toLocaleDateString([], { weekday: 'short' })} ${time}`;
  return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

/** A conversation with a friend, like WhatsApp and Instagram messages. */
export function ChatThread({ friendId = '', groupId, name, onBack }: { friendId?: string; groupId?: string | null; name?: string | null; /** Phones: returns to the chats list. */ onBack?: () => void }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const { user } = useAuth();
  const social = useSocial();
  const privacy = usePrivacyPreferences();
  const prefs = useChatPrefs();
  const friend = social.people.find((person) => person.userId === friendId);
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [groupInfo, setGroupInfo] = useState(false);
  const isGroup = Boolean(groupId);
  const title = isGroup ? group?.name ?? name ?? 'Group' : friend ? personName(friend) : name || 'Friend';
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [meta, setMeta] = useState<ConversationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [reply, setReply] = useState<ReplyRef | null>(null);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState<CommunityMessage | null>(null);
  const [who, setWho] = useState<CommunityMessage | null>(null);
  const [forward, setForward] = useState<CommunityMessage | null>(null);
  const [report, setReport] = useState<ReportTarget | null>(null);
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const scroll = useRef<ScrollView>(null);
  const input = useRef<RNTextInput>(null);

  const refresh = useCallback(async (id: string) => {
    try {
      if (groupId) {
        const [list, info] = await Promise.all([listGroupMessages(id), getGroup(id)]);
        setMessages(list);
        setGroup(info);
        setError(info ? null : 'This group could not be found.');
        return;
      }
      const [list, info] = await Promise.all([listConversationMessages(id), loadConversationMeta(id, privacy).catch(() => null)]);
      setMessages(list);
      setMeta(info);
      setError(null);
      if (list.some((message) => message.sender_id !== user?.id)) void markConversationSeen(id, privacy.readReceipts);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load messages.');
    } finally {
      setLoading(false);
    }
  }, [privacy, user?.id, groupId]);

  useEffect(() => {
    let live = true;
    queueMicrotask(() => { if (live) { setLoading(true); setMessages([]); setReply(null); } });
    (groupId ? Promise.resolve(groupId) : getOrCreateFriendConversation(friendId))
      .then(async (id) => { if (!live) return; setChatId(id); await refresh(id); })
      .catch((caught) => { if (live) { setError(caught instanceof Error ? caught.message : 'Could not open this conversation.'); setLoading(false); } });
    return () => { live = false; };
  }, [friendId, groupId, refresh]);

  useEffect(() => {
    if (!chatId) return;
    const timer = setInterval(() => { if (typeof document === 'undefined' || document.visibilityState === 'visible') void refresh(chatId); }, 4000);
    return () => clearInterval(timer);
  }, [chatId, refresh]);

  const readBlue = [...ReadReceiptBlues].sort((a, b) => contrastRatio(b, colors.primary) - contrastRatio(a, colors.primary))[0];
  const visible = useMemo(() => (chatId ? messages.filter((message) => !isHidden(prefs, chatId, message.id)) : messages), [messages, prefs, chatId]);
  const shown = search.trim() ? visible.filter((message) => message.body.toLowerCase().includes(search.trim().toLowerCase())) : visible;
  const pinnedId = chatId ? prefs.pinned[chatId] : undefined;
  const pinned = pinnedId ? visible.find((message) => message.id === pinnedId) : undefined;
  const streak = user && !isGroup ? friendStreak(messages, user.id, friendId) : 0;
  const typing = Boolean(meta?.otherTyping && now() - meta.otherTyping < 7000);
  const presence = isGroup ? `${group?.memberUids.length ?? 0} members${group?.description ? ` · ${group.description}` : ''}` : typing ? 'typing…' : meta?.otherOnline ? 'Active now' : meta?.otherLastSeen ? `Active ${ago(meta.otherLastSeen)}` : 'Messages with your friend';
  const last = visible[visible.length - 1];
  const lastMine = last && last.sender_id === user?.id ? last : null;
  const byId = new Map(messages.map((message) => [message.id, message]));

  // ── Sending ──
  const voice = useVoiceRecorder(() => void sendVoice());
  const [canRecord] = useState(voiceNotesSupported);

  async function sendVoice() {
    if (!chatId) return;
    const note = await voice.finish();
    if (!note) return;
    setBusy(true);
    try {
      const url = await uploadVoiceNote(note.blob);
      if (isGroup) await sendGroupMessage(chatId, '', { audio: { url, seconds: note.seconds } });
      else { await sendVoiceNote(chatId, url, note.seconds); void announceMessage(chatId, friendId); }
      await refresh(chatId);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'Could not send this recording.');
    } finally {
      setBusy(false);
    }
  }

  async function send(extras: { media?: Media[]; doc?: { url: string; name: string } } = {}) {
    if (!chatId || busy) return;
    if (!draft.trim() && !extras.media && !extras.doc) return;
    setBusy(true);
    setNotice(null);
    try {
      if (isGroup) await sendGroupMessage(chatId, draft, { reply, ...extras });
      else { await sendChatMessage(chatId, draft, { reply, ...extras }); void announceMessage(chatId, friendId); }
      setDraft('');
      setReply(null);
      await refresh(chatId);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'Could not send this message.');
    } finally {
      setBusy(false);
    }
  }

  async function sendPhotos() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], allowsMultipleSelection: true, selectionLimit: 3, quality: 0.85 });
    if (result.canceled || !result.assets.length) return;
    setBusy(true);
    try {
      const media = await Promise.all(result.assets.slice(0, 3).map((asset) => {
        const type = asset.type === 'video' ? 'video' : 'image';
        return uploadMedia({ uri: asset.uri, type, mimeType: asset.mimeType ?? undefined, filename: asset.fileName ?? undefined, size: asset.fileSize ?? undefined });
      }));
      setBusy(false);
      await send({ media });
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'Could not send these photos.');
      setBusy(false);
    }
  }

  function sendDocument() {
    if (!isWeb || typeof document === 'undefined') {
      setNotice('Documents can be sent from the web app for now.');
      return;
    }
    const picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.csv';
    picker.onchange = async () => {
      const file = picker.files?.[0];
      if (!file) return;
      setBusy(true);
      try {
        const uploaded = await uploadChatDocument({ uri: '', name: file.name, size: file.size, file });
        setBusy(false);
        await send({ doc: uploaded });
      } catch (caught) {
        setNotice(caught instanceof Error ? caught.message : 'Could not send this document.');
        setBusy(false);
      }
    };
    picker.click();
  }

  function startReply(message: CommunityMessage) {
    setReply({ mid: message.id, from: message.sender_id, text: previewOf(message) });
    setMenu(null);
    input.current?.focus();
  }

  async function copy(message: CommunityMessage) {
    setMenu(null);
    try {
      await navigator.clipboard.writeText(message.body);
      setNotice('Copied.');
    } catch {
      setNotice('Copy is not available here.');
    }
  }

  async function deleteForEveryone(message: CommunityMessage) {
    if (!chatId) return;
    setMenu(null);
    try {
      if (isGroup) await deleteGroupMessage(chatId, message.id);
      else await deleteCommunityMessage(chatId, message.id);
      await refresh(chatId);
    } catch {
      setNotice('That message could not be deleted.');
    }
  }

  async function react(message: CommunityMessage, emoji: string) {
    if (!chatId || !user) return;
    setMenu(null);
    const current = message.reactions?.[user.id];
    setMessages((list) => list.map((item) => (item.id === message.id ? { ...item, reactions: { ...(item.reactions ?? {}), ...(current === emoji ? { [user.id]: '' } : { [user.id]: emoji }) } } : item)));
    try { await (isGroup ? reactToGroupMessage : reactToMessage)(chatId, message.id, current === emoji ? null : emoji); } catch { setNotice('Your reaction could not be saved.'); }
    void refresh(chatId);
  }

  function nameOfUid(uid: string) {
    if (uid === user?.id) return 'You';
    const person = social.people.find((p) => p.userId === uid);
    if (person) return personName(person);
    const fromGroup = group?.members[uid];
    return fromGroup ? `@${fromGroup}` : title;
  }
  function senderName(message: CommunityMessage & { author_name?: string | null }) {
    if (message.sender_id === user?.id) return 'You';
    const person = social.people.find((p) => p.userId === message.sender_id);
    return person ? personName(person) : message.author_name ? `@${message.author_name}` : nameOfUid(message.sender_id);
  }

  // ── Rendering ──
  return (
    <View style={styles.thread}>
      <View style={[styles.header, onBack && styles.headerPhone]}>
        {onBack ? (
          <Interactive onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to chats" style={styles.backButton}>
            <Icon name="chevronLeft" size={24} color={colors.text} strokeWidth={2.2} />
          </Interactive>
        ) : null}
        {isGroup ? <Avatar name={title} size={onBack ? 40 : 44} ring="gold" /> : <PersonAvatar uid={friendId} uri={friend?.avatarUrl ?? null} name={title} size={onBack ? 40 : 44} status={meta?.otherOnline ? 'online' : null} />}
        <View style={styles.headText}>
          <View style={styles.nameRow}>
            <Text style={styles.headName} numberOfLines={1}>{title}</Text>
            {isGroup ? null : <VerifiedBadge username={friend?.username} uid={friendId} size={15} />}
            {streak > 0 ? <Text style={styles.streak} accessibilityLabel={`${streak}-day friend streak`}>🔥 {streak}</Text> : null}
          </View>
          <Text style={[styles.presence, typing && styles.typing]} numberOfLines={1}>{presence}</Text>
        </View>
        <Interactive onPress={() => { setSearching((value) => !value); setSearch(''); }} accessibilityRole="button" accessibilityLabel="Search in this chat" style={styles.headButton}><Icon name="search" size={20} color={colors.text} /></Interactive>
        <Interactive onPress={() => (isGroup ? setGroupInfo(true) : openProfileCard(friendId))} accessibilityRole="button" accessibilityLabel={isGroup ? 'Group info' : `${title}'s profile`} style={styles.headButton}><Icon name="info" size={20} color={colors.text} /></Interactive>
      </View>
      {searching ? <TextInput value={search} onChangeText={setSearch} placeholder="Search messages" placeholderTextColor={colors.textTertiary} accessibilityLabel="Search messages" style={styles.search} autoFocus /> : null}
      {pinned ? (
        <Interactive onPress={() => togglePin(chatId!, pinned.id)} accessibilityLabel="Pinned message. Tap to unpin" style={styles.pinned}>
          <Icon name="pin" size={15} color={colors.accentText} filled />
          <Text style={styles.pinnedText} numberOfLines={1}>{previewOf(pinned)}</Text>
        </Interactive>
      ) : null}

      <ScrollView ref={scroll} style={styles.list} contentContainerStyle={styles.listContent} onContentSizeChange={() => { if (!search) scroll.current?.scrollToEnd({ animated: false }); }}>
        {loading ? <ActivityIndicator color={colors.primaryText} style={styles.loading} /> : null}
        {error ? <Text style={styles.empty}>{error} Messages work between friends who follow each other.</Text> : null}
        {!loading && !error && !visible.length ? (
          <View style={styles.hello}>
            {isGroup ? <Avatar name={title} size={88} ring="gold" /> : <PersonAvatar uid={friendId} uri={friend?.avatarUrl ?? null} name={title} size={88} ring="gold" />}
            <Text style={styles.helloName}>{title}</Text>
            <Text style={styles.empty}>Say hello or share what you’re studying.</Text>
          </View>
        ) : null}
        {search.trim() ? <Text style={styles.searchCount}>{shown.length} message{shown.length === 1 ? '' : 's'} found</Text> : null}
        {shown.map((message, index) => {
          const mine = message.sender_id === user?.id;
          const at = Date.parse(message.created_at);
          const prev = shown[index - 1];
          const next = shown[index + 1];
          const newDay = !prev || at - Date.parse(prev.created_at) > 60 * 60_000;
          const lastOfGroup = !next || next.sender_id !== message.sender_id;
          const replied = message.reply ? byId.get(message.reply.mid) : undefined;
          return (
            <View key={message.id}>
              {newDay ? <Text style={styles.day}>{dayLabel(at)}</Text> : null}
              <SwipeToReply onReply={() => startReply(message)} enabled={canSwipe}>
                <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
                  {!mine ? <View style={styles.avatarSlot}>{lastOfGroup ? <PersonAvatar uid={message.sender_id} uri={isGroup ? null : friend?.avatarUrl ?? null} name={senderName(message)} size={28} /> : null}</View> : null}
                  <View style={[styles.stack, mine && styles.stackMine]}>
                    {isGroup && !mine && (!prev || prev.sender_id !== message.sender_id) ? <Text style={styles.sender}>{senderName(message)}</Text> : null}
                    <Interactive
                      onLongPress={() => setMenu(message)}
                      onPress={canSwipe ? () => setMenu(message) : undefined}
                      accessibilityLabel={`${mine ? 'You' : title}: ${previewOf(message)}. Actions`}
                      style={({ hovered }) => [styles.bubbleWrap, hovered && styles.hovered]}
                    >
                      {({ hovered }) => (
                        <View style={[styles.bubbleLine, mine && styles.bubbleLineMine]}>
                          <View style={[styles.bubble, mine ? styles.mine : styles.theirs, (message.media?.length && !message.body) ? styles.mediaBubble : null]}>
                            {message.fwd ? <Text style={[styles.fwd, mine && styles.mineSoft]}>↪ Forwarded</Text> : null}
                            {message.reply ? (
                              <View style={[styles.quote, mine ? styles.quoteMine : styles.quoteTheirs]}>
                                <Text style={[styles.quoteWho, mine && styles.mineText]}>{message.reply.from === user?.id ? 'You' : nameOfUid(message.reply.from)}</Text>
                                <Text style={[styles.quoteText, mine && styles.mineSoft]} numberOfLines={2}>{replied ? previewOf(replied) : message.reply.text}</Text>
                              </View>
                            ) : null}
                            {message.media?.length ? (
                              <View style={styles.mediaGrid}>
                                {message.media.map((item) => (
                                  <Interactive key={item.url} onPress={() => void Linking.openURL(item.url)} accessibilityLabel={item.t === 'video' ? 'Open video' : 'Open photo'}>
                                    <Image source={{ uri: item.url }} style={[styles.media, message.media!.length > 1 && styles.mediaSmall]} contentFit="cover" />
                                    {item.t === 'video' ? <View style={styles.play}><Icon name="play" size={18} color="#FFFFFF" filled /></View> : null}
                                  </Interactive>
                                ))}
                              </View>
                            ) : null}
                            {message.doc ? (
                              <Interactive onPress={() => void Linking.openURL(message.doc!.url)} accessibilityRole="link" style={[styles.doc, mine && styles.docMine]}>
                                <Icon name="lesson" size={20} color={mine ? colors.onPrimary : colors.primaryText} />
                                <Text style={[styles.docName, mine && styles.mineText]} numberOfLines={2}>{message.doc.name}</Text>
                              </Interactive>
                            ) : null}
                            {message.audio ? <VoiceNotePlayer url={message.audio.url} seconds={message.audio.seconds} color={mine ? colors.onPrimary : colors.primaryText} trackColor={mine ? colors.onPrimaryMuted : colors.track} /> : null}
                            {message.body ? <Text style={[styles.text, mine && styles.mineText]} selectable>{message.body}</Text> : null}
                            <View style={styles.meta}>
                              {chatId && isStarred(prefs, chatId, message.id) ? <Icon name="star" size={11} color={mine ? colors.onPrimaryMuted : colors.accentText} filled /> : null}
                              <Text style={[styles.time, mine && styles.mineSoft]}>{new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text>
                              {mine && meta && !isGroup ? <Ticks status={messageStatus(message, meta)} color={colors.onPrimaryMuted} read={readBlue} /> : null}
                            </View>
                          </View>
                          {isWeb && hovered ? (
                            <View style={[styles.quick, mine && styles.quickMine]}>
                              <QuickButton icon="heart" label="React" onPress={() => setMenu(message)} />
                              <QuickButton icon="reply" label="Reply" onPress={() => startReply(message)} />
                              <QuickButton icon="more" label="More" onPress={() => setMenu(message)} />
                            </View>
                          ) : null}
                        </View>
                      )}
                    </Interactive>
                    <Reactions message={message} me={user?.id} onPress={() => setWho(message)} />
                  </View>
                </View>
              </SwipeToReply>
            </View>
          );
        })}
        {lastMine && meta && !search && !isGroup ? <Text style={styles.seen}>{STATUS_LABEL[messageStatus(lastMine, meta)]}{messageStatus(lastMine, meta) === 'read' && meta.otherSeenAt ? ` ${ago(meta.otherSeenAt)}` : ''}</Text> : null}
        {typing ? <View style={styles.typingBubble}><Text style={styles.typingDots}>• • •</Text></View> : null}
      </ScrollView>

      {notice ? <Text style={styles.notice} onPress={() => setNotice(null)}>{notice}</Text> : null}
      {reply ? (
        <View style={styles.replyBar}>
          <View style={styles.replyEdge} />
          <View style={styles.flex}>
            <Text style={styles.quoteWho}>Replying to {reply.from === user?.id ? 'You' : title}</Text>
            <Text style={styles.quoteText} numberOfLines={1}>{reply.text}</Text>
          </View>
          <Interactive onPress={() => setReply(null)} accessibilityLabel="Cancel reply" style={styles.headButton}><Icon name="close" size={16} color={colors.textSecondary} /></Interactive>
        </View>
      ) : null}
      {emojiOpen ? (
        <View style={styles.emojiPanel}>
          {EMOJI.map((emoji) => <Interactive key={emoji} onPress={() => setDraft((text) => `${text}${emoji}`)} accessibilityLabel={`Insert ${emoji}`} style={styles.emojiKey}><Text style={styles.emojiText}>{emoji}</Text></Interactive>)}
        </View>
      ) : null}
      {voice.recording ? (
        <View style={styles.composer}>
          <View style={styles.recDot} />
          <Text style={styles.recText}>Recording {clock(voice.seconds)} / {clock(VOICE_NOTE_MAX_SECONDS)}</Text>
          <Button label="Cancel" variant="ghost" size="sm" onPress={voice.cancel} />
          <Button label="Send" size="sm" icon={<Icon name="send" size={15} color={colors.onPrimary} />} onPress={() => void sendVoice()} />
        </View>
      ) : (
        <View style={styles.composer}>
          <Interactive onPress={() => setEmojiOpen((value) => !value)} accessibilityLabel="Emoji" style={styles.tool}><Text style={styles.emojiButton}>🙂</Text></Interactive>
          <TextInput
            ref={input}
            value={draft}
            onChangeText={(text) => { setDraft(text); if (chatId) void setTyping(chatId, text.length > 0); }}
            placeholder="Message…"
            placeholderTextColor={colors.textTertiary}
            accessibilityLabel="Write a message"
            maxLength={500}
            multiline
            onKeyPress={(event) => {
              const native = event.nativeEvent as unknown as { key: string; shiftKey?: boolean };
              if (isWeb && native.key === 'Enter' && !native.shiftKey) { (event as unknown as { preventDefault?: () => void }).preventDefault?.(); void send(); }
            }}
            style={styles.input}
          />
          {busy ? <ActivityIndicator color={colors.primaryText} /> : null}
          {draft.trim() ? (
            <Interactive onPress={() => void send()} accessibilityRole="button" accessibilityLabel="Send" style={styles.sendButton}><Icon name="send" size={18} color={colors.onPrimary} filled /></Interactive>
          ) : (
            <>
              {canRecord ? <Interactive onPress={() => void voice.start()} disabled={!chatId || busy} accessibilityLabel="Record a voice note" style={styles.tool}><Icon name="mic" size={21} color={colors.text} /></Interactive> : null}
              <Interactive onPress={() => void sendPhotos()} disabled={!chatId || busy} accessibilityLabel="Send photos or videos" style={styles.tool}><Icon name="image" size={21} color={colors.text} /></Interactive>
              <Interactive onPress={sendDocument} disabled={!chatId || busy} accessibilityLabel="Send a document" style={styles.tool}><Icon name="attach" size={21} color={colors.text} /></Interactive>
            </>
          )}
        </View>
      )}
      {voice.error ? <Text style={styles.notice}>{voice.error}</Text> : null}

      {/* Message actions (long-press, tap on phones, or the hover buttons) */}
      <Sheet visible={menu !== null} onClose={() => setMenu(null)} title="Message" width={420}>
        {menu ? (
          <View style={styles.menu}>
            <View style={styles.reactRow}>
              {REACTIONS.map((emoji) => (
                <Interactive key={emoji} onPress={() => void react(menu, emoji)} accessibilityLabel={`React ${emoji}`} style={[styles.reactKey, menu.reactions?.[user?.id ?? ''] === emoji && styles.reactKeyOn]}>
                  <Text style={styles.reactEmoji}>{emoji}</Text>
                </Interactive>
              ))}
            </View>
            <MenuRow icon="reply" label="Reply" onPress={() => startReply(menu)} />
            {isGroup && menu.sender_id !== user?.id ? <MenuRow icon="comment" label={`Reply privately to ${senderName(menu)}`} onPress={() => { setMenu(null); router.push({ pathname: '/social/message', params: { friend: menu.sender_id, name: senderName(menu) } } as never); }} /> : null}
            <MenuRow icon="forward" label="Forward" onPress={() => { setForward(menu); setMenu(null); }} />
            {menu.body && isWeb ? <MenuRow icon="copy" label="Copy" onPress={() => void copy(menu)} /> : null}
            <MenuRow icon="star" label={chatId && isStarred(prefs, chatId, menu.id) ? 'Unstar' : 'Star'} onPress={() => { toggleStar(chatId!, menu.id); setMenu(null); }} />
            <MenuRow icon="pin" label={pinnedId === menu.id ? 'Unpin' : 'Pin'} onPress={() => { togglePin(chatId!, menu.id); setMenu(null); }} />
            <MenuRow icon="trash" label="Delete for me" onPress={() => { hideMessage(chatId!, menu.id); setMenu(null); }} />
            {menu.sender_id === user?.id ? <MenuRow icon="trash" label="Delete for everyone" danger onPress={() => void deleteForEveryone(menu)} /> : (
              <MenuRow icon="warning" label="Report" danger onPress={() => { setReport({ type: 'user', id: menu.sender_id, label: `message from ${senderName(menu)}${isGroup ? ` in ${title}` : ''}: “${previewOf(menu).slice(0, 60)}”` }); setMenu(null); }} />
            )}
          </View>
        ) : null}
      </Sheet>

      {/* Who reacted */}
      <Sheet visible={who !== null} onClose={() => setWho(null)} title="Reactions" width={380}>
        {who ? Object.entries(who.reactions ?? {}).filter(([, emoji]) => emoji).map(([uid, emoji]) => {
          const person = social.people.find((p) => p.userId === uid);
          const label = uid === user?.id ? 'You' : person ? personName(person) : title;
          return (
            <Interactive key={uid} onPress={() => { if (uid === user?.id) void react(who, emoji); setWho(null); }} style={styles.whoRow} accessibilityLabel={`${label} reacted ${emoji}`}>
              <PersonAvatar uid={uid} name={label} size={36} />
              <Text style={styles.whoName}>{label}{uid === user?.id ? ' · tap to remove' : ''}</Text>
              <Text style={styles.reactEmoji}>{emoji}</Text>
            </Interactive>
          );
        }) : null}
      </Sheet>

      {/* Forward to a friend */}
      {isGroup && group ? <GroupInfoSheet visible={groupInfo} group={group} onClose={() => setGroupInfo(false)} onChanged={() => chatId && void refresh(chatId)} onReport={() => { setGroupInfo(false); setReport({ type: 'user', id: group.ownerUid, label: `group “${group.name}”` }); }} /> : null}
      <ForwardSheet message={forward} onClose={() => setForward(null)} onDone={(count) => { setForward(null); setNotice(`Forwarded to ${count} chat${count === 1 ? '' : 's'}.`); }} />
      <ReportSheet target={report} reporter={user?.profile?.username ?? null} onClose={() => setReport(null)} onHide={() => {}} onDone={() => { setReport(null); setNotice('Thanks — the team will review it.'); }} />
    </View>
  );
}

function ForwardSheet({ message, onClose, onDone }: { message: CommunityMessage | null; onClose: () => void; onDone: (count: number) => void }) {
  const styles = useThemedStyles(createStyles);
  const social = useSocial();
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const friends = social.people.filter((person) => person.relationship === 'friends');
  async function go() {
    if (!message || !picked.length) return;
    setBusy(true);
    let done = 0;
    for (const uid of picked) {
      try {
        const chat = await getOrCreateFriendConversation(uid);
        await sendChatMessage(chat, message.body, { fwd: true, media: message.media, doc: message.doc });
        void announceMessage(chat, uid);
        done++;
      } catch {
        // skip a chat that refused
      }
    }
    setBusy(false);
    setPicked([]);
    onDone(done);
  }
  return (
    <Sheet visible={message !== null} onClose={onClose} title="Forward to…" width={420} footer={<View style={styles.sheetActions}><Button label="Cancel" variant="ghost" onPress={onClose} /><Button label={`Send${picked.length ? ` (${picked.length})` : ''}`} onPress={() => void go()} loading={busy} disabled={!picked.length} /></View>}>
      {friends.map((person) => {
        const on = picked.includes(person.userId);
        return (
          <Interactive key={person.userId} onPress={() => setPicked((list) => (on ? list.filter((id) => id !== person.userId) : [...list, person.userId]))} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={styles.whoRow}>
            <PersonAvatar uid={person.userId} uri={person.avatarUrl} name={personName(person)} size={36} />
            <Text style={styles.whoName}>{personName(person)}</Text>
            <View style={[styles.check, on && styles.checkOn]} />
          </Interactive>
        );
      })}
      {!friends.length ? <Text style={styles.empty}>Make friends to forward messages.</Text> : null}
    </Sheet>
  );
}

function Reactions({ message, me, onPress }: { message: CommunityMessage; me?: string; onPress: () => void }) {
  const styles = useThemedStyles(createStyles);
  const counts = new Map<string, number>();
  for (const emoji of Object.values(message.reactions ?? {})) if (emoji) counts.set(emoji, (counts.get(emoji) ?? 0) + 1);
  if (!counts.size) return null;
  const mineOn = Boolean(me && message.reactions?.[me]);
  return (
    <Interactive onPress={onPress} accessibilityLabel="See who reacted" style={[styles.reactions, mineOn && styles.reactionsMine]}>
      {[...counts.entries()].map(([emoji, count]) => <Text key={emoji} style={styles.reactionText}>{emoji}{count > 1 ? ` ${count}` : ''}</Text>)}
    </Interactive>
  );
}

function QuickButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  return <Interactive onPress={onPress} accessibilityLabel={label} style={styles.quickButton}><Icon name={icon} size={15} color={colors.textSecondary} /></Interactive>;
}

function MenuRow({ icon, label, onPress, danger }: { icon: IconName; label: string; onPress: () => void; danger?: boolean }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  return (
    <Interactive onPress={onPress} accessibilityRole="button" style={({ hovered }) => [styles.menuRow, hovered && styles.menuHover]}>
      <Icon name={icon} size={18} color={danger ? colors.error : colors.text} />
      <Text style={[styles.menuLabel, danger && { color: colors.error }]}>{label}</Text>
    </Interactive>
  );
}

/** Swipe a message to the right to reply (phones and tablets): follows the finger, a reply arrow appears, let go past it to reply. */

function Ticks({ status, color, read }: { status: MessageStatus; color: string; read: string }) {
  const tint = status === 'read' ? read : color;
  return (
    <Svg width={status === 'sent' ? 13 : 18} height={12} viewBox={status === 'sent' ? '0 0 13 12' : '0 0 18 12'} accessibilityLabel={STATUS_LABEL[status]}>
      <Path d="M1.5 6.6 4.8 9.8 11.5 2.4" stroke={tint} strokeWidth={1.9} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {status === 'sent' ? null : <Path d="M8.2 9.3 8.7 9.8 15.6 2.4" stroke={tint} strokeWidth={1.9} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
    </Svg>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    thread: { flex: 1, minHeight: 0 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.divider },
    headText: { flex: 1, minWidth: 0 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    headName: { ...Type.headline, color: colors.text, flexShrink: 1 },
    streak: { fontSize: 13, fontWeight: '800', color: colors.accentText },
    presence: { fontSize: 12.5, color: colors.textSecondary },
    typing: { color: colors.successText, fontWeight: '700' },
    headButton: { padding: 8, borderRadius: 999 },
    headerPhone: { gap: 8, paddingHorizontal: 10 },
    backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 999, marginLeft: -6 },
    search: { marginHorizontal: 16, marginTop: 10, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, color: colors.text, backgroundColor: colors.surfaceSunken },
    searchCount: { fontSize: 12, color: colors.textTertiary, textAlign: 'center' },
    pinned: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.accentSubtle },
    pinnedText: { flex: 1, fontSize: 13, color: colors.text },
    list: { flex: 1 },
    listContent: { padding: 16, gap: 3, flexGrow: 1, justifyContent: 'flex-end' },
    loading: { marginTop: 30 },
    hello: { alignItems: 'center', gap: 8, marginBottom: 20 },
    helloName: { ...Type.title3, color: colors.text },
    empty: { fontSize: 13.5, color: colors.textTertiary, textAlign: 'center' },
    day: { fontSize: 11.5, color: colors.textTertiary, textAlign: 'center', marginVertical: 12 },
    row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
    rowMine: { justifyContent: 'flex-end' },
    rowTheirs: { justifyContent: 'flex-start' },
    avatarSlot: { width: 28 },
    sender: { fontSize: 12, fontWeight: '700', color: colors.primaryText, marginLeft: 10, marginBottom: 2 },
    stack: { maxWidth: '78%', alignItems: 'flex-start' },
    stackMine: { alignItems: 'flex-end' },
    bubbleWrap: { borderRadius: 20, maxWidth: '100%', minWidth: 0 },
    hovered: {},
    bubbleLine: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%', minWidth: 0 },
    bubbleLineMine: { flexDirection: 'row-reverse' },
    bubble: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20, gap: 4, maxWidth: 520, minWidth: 0, flexShrink: 1 },
    mine: { backgroundColor: colors.primary, borderBottomRightRadius: 6 },
    theirs: { backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 6 },
    mediaBubble: { padding: 4 },
    fwd: { fontSize: 11.5, fontStyle: 'italic', color: colors.textTertiary },
    quote: { borderLeftWidth: 3, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8, minWidth: 0, maxWidth: '100%' },
    quoteMine: { borderLeftColor: colors.onPrimary, backgroundColor: 'rgba(255,255,255,0.14)' },
    quoteTheirs: { borderLeftColor: colors.primary, backgroundColor: colors.surface },
    quoteWho: { fontSize: 12, fontWeight: '800', color: colors.primaryText },
    quoteText: { fontSize: 12.5, color: colors.textSecondary, ...(webStyle({ overflowWrap: 'anywhere', wordBreak: 'break-word' }) as object) },
    mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    media: { width: 240, height: 300, borderRadius: 16, backgroundColor: colors.surfaceSunken },
    mediaSmall: { width: 150, height: 150 },
    play: { position: 'absolute', left: 10, bottom: 10, width: 30, height: 30, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
    doc: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, backgroundColor: colors.surface, minWidth: 200 },
    docMine: { backgroundColor: 'rgba(255,255,255,0.16)' },
    docName: { flex: 1, fontSize: 13.5, fontWeight: '700', color: colors.text },
    text: { ...Type.callout, color: colors.text, flexShrink: 1, ...(webStyle({ overflowWrap: 'anywhere', wordBreak: 'break-word' }) as object) },
    mineText: { color: colors.onPrimary },
    mineSoft: { color: colors.onPrimaryMuted },
    meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5 },
    time: { fontSize: 10.5, color: colors.textTertiary },
    quick: { flexDirection: 'row', gap: 2 },
    quickMine: { flexDirection: 'row-reverse' },
    quickButton: { padding: 6, borderRadius: 999, backgroundColor: colors.surfaceMuted },
    reactions: { flexDirection: 'row', gap: 4, marginTop: -6, marginHorizontal: 8, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border },
    reactionsMine: { borderColor: colors.primaryBorder },
    reactionText: { fontSize: 13, color: colors.text },
    seen: { alignSelf: 'flex-end', fontSize: 11.5, color: colors.textTertiary, marginTop: 4 },
    typingBubble: { alignSelf: 'flex-start', marginLeft: 36, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: colors.surfaceMuted },
    typingDots: { fontSize: 14, letterSpacing: 2, color: colors.textSecondary },
    notice: { fontSize: 12.5, color: colors.textSecondary, textAlign: 'center', paddingVertical: 4 },
    replyBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, padding: 8, borderRadius: 14, backgroundColor: colors.surfaceMuted },
    replyEdge: { width: 3, alignSelf: 'stretch', borderRadius: 2, backgroundColor: colors.primary },
    emojiPanel: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginHorizontal: 16, padding: 8, borderRadius: 16, backgroundColor: colors.surfaceMuted },
    emojiKey: { padding: 6, borderRadius: 10 },
    emojiText: { fontSize: 22 },
    composer: { flexDirection: 'row', alignItems: 'center', gap: 6, margin: 12, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceSunken },
    tool: { padding: 8, borderRadius: 999 },
    emojiButton: { fontSize: 21 },
    input: { flex: 1, minHeight: 38, maxHeight: 120, paddingVertical: 8, paddingHorizontal: 6, color: colors.text, fontSize: 14.5, textAlignVertical: 'center', borderWidth: 0, ...(webStyle({ outlineStyle: 'none', outlineWidth: 0 }) as object) },
    sendButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
    recDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 8, backgroundColor: colors.error },
    recText: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
    menu: { gap: 2 },
    reactRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'center', paddingBottom: 10, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: colors.divider },
    reactKey: { padding: 6, borderRadius: 999 },
    reactKeyOn: { backgroundColor: colors.primarySubtle },
    reactEmoji: { fontSize: 24 },
    menuRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 11, paddingHorizontal: 8, borderRadius: Radius.md },
    menuHover: { backgroundColor: colors.surfaceMuted },
    menuLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
    whoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
    whoName: { flex: 1, fontSize: 14.5, color: colors.text },
    check: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.borderStrong },
    checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    sheetActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  });
}
