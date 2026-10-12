import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text } from '@/components/ui/text';

import { BackLink } from '@/components/learning/nav-bits';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/interactive';
import { Icon } from '@/components/ui/icon';
import { Interactive } from '@/components/ui/interactive';
import { Sheet } from '@/components/ui/sheet';
import { PageHeader, Screen } from '@/components/ui/screen';
import { InlineNotice, LoadingState } from '@/components/ui/state-views';
import { MentionInput } from '@/components/social/mention-input';
import { clock, useVoiceRecorder, voiceNotesSupported, VoiceNotePlayer } from '@/components/social/voice-note';
import { uploadVoiceNote } from '@/lib/media';
import { Radius, ReadReceiptBlues, Type, type ThemeColors } from '@/constants/theme';
import { contrastRatio } from '@/data/contrast';
import { deleteCommunityMessage, getOrCreateFriendConversation, listConversationMessages, loadConversationMeta, markConversationSeen, messageStatus, sendCommunityMessage, sendVoiceNote, VOICE_NOTE_MAX_SECONDS, type CommunityMessage, type ConversationMeta, type MessageStatus } from '@/data/community';
import { usePrivacyPreferences } from '@/data/settings';
import { useSocial } from '@/data/social';
import { useAuth } from '@/hooks/use-auth';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

export default function DirectMessageScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const { user } = useAuth();
  const social = useSocial();
  const privacy = usePrivacyPreferences();
  const [meta, setMeta] = useState<ConversationMeta | null>(null);
  const params = useLocalSearchParams<{ friend?: string | string[]; name?: string | string[] }>();
  const friendId = Array.isArray(params.friend) ? params.friend[0] : params.friend;
  const name = Array.isArray(params.name) ? params.name[0] : params.name;
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CommunityMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesRef = useRef<ScrollView>(null);

  const refresh = useCallback(async (id: string) => {
    setError(null);
    try {
      const [list, info] = await Promise.all([listConversationMessages(id), loadConversationMeta(id, privacy).catch(() => null)]);
      setMessages(list);
      setMeta(info);
      if (list.some((message) => message.sender_id !== user?.id)) void markConversationSeen(id, privacy.readReceipts);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load messages.');
    } finally {
      setLoading(false);
    }
  }, [privacy, user?.id]);

  useEffect(() => {
    let active = true;
    if (!friendId) {
      queueMicrotask(() => { if (active) { setLoading(false); setError('Choose a friend to start messaging.'); } });
      return () => { active = false; };
    }
    getOrCreateFriendConversation(friendId).then(async (id) => {
      if (!active) return;
      setConversationId(id);
      await refresh(id);
    }).catch((caught) => {
      if (!active) return;
      setError(caught instanceof Error ? caught.message : 'Could not open this conversation.');
      setLoading(false);
    });
    return () => { active = false; };
  }, [friendId, refresh]);

  // New messages, ticks and online status refresh every few seconds while the chat is open.
  useEffect(() => {
    if (!conversationId) return;
    const timer = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') void refresh(conversationId);
    }, 6000);
    return () => clearInterval(timer);
  }, [conversationId, refresh]);

  const readBlue = [...ReadReceiptBlues].sort((a, b) => contrastRatio(b, colors.primary) - contrastRatio(a, colors.primary))[0];
  // Sent / Delivered / Read under the last message, when it is mine (like other messaging apps).
  const lastMessage = messages[messages.length - 1];
  const lastMine = lastMessage && lastMessage.sender_id === user?.id && !lastMessage.deleted_at ? lastMessage : null;
  const presence = meta ? (meta.otherOnline ? 'Online' : meta.otherLastSeen ? lastSeenText(meta.otherLastSeen) : null) : null;

  // At the two-minute limit the voice note is sent automatically.
  const voice = useVoiceRecorder(() => void sendVoice());
  const [canRecord] = useState(voiceNotesSupported);
  const [sendingVoice, setSendingVoice] = useState(false);

  async function sendVoice() {
    if (!conversationId || sendingVoice) return;
    const note = await voice.finish();
    if (!note) return;
    setSendingVoice(true);
    setError(null);
    try {
      const url = await uploadVoiceNote(note.blob);
      await sendVoiceNote(conversationId, url, note.seconds);
      await refresh(conversationId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not send this voice note.');
    } finally {
      setSendingVoice(false);
    }
  }

  async function send() {
    if (!conversationId || !draft.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await sendCommunityMessage(conversationId, draft);
      setDraft('');
      await refresh(conversationId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not send this message.');
    } finally {
      setBusy(false);
    }
  }

  async function removeMessage() {
    if (!deleteTarget || !conversationId || busy) return;
    setBusy(true);
    setError(null);
    try {
      await deleteCommunityMessage(conversationId, deleteTarget.id);
      setDeleteTarget(null);
      await refresh(conversationId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not delete this message.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen width="prose">
      <BackLink fallback={'/social/messages' as never} />
      <PageHeader title={name ? `Chat with ${name}` : 'Direct message'} subtitle={presence ?? 'Messages with your friend.'} />
      {error ? <InlineNotice tone="warning" title="Conversation unavailable" message={`${error} Direct messages work between friends who follow each other.`} /> : null}
      {loading ? <LoadingState label="Loading conversation" /> : null}
      <ScrollView ref={messagesRef} style={styles.messages} contentContainerStyle={styles.messageList} onContentSizeChange={() => messagesRef.current?.scrollToEnd({ animated: true })}>
        {messages.map((message) => {
          const mine = message.sender_id === user?.id;
          return (
            <View key={message.id} style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
              {message.audio && !message.deleted_at ? (
                <VoiceNotePlayer url={message.audio.url} seconds={message.audio.seconds} color={mine ? colors.onPrimary : colors.primaryText} trackColor={mine ? colors.onPrimaryMuted : colors.track} />
              ) : (
                <Text style={[styles.messageText, mine && styles.mineText]}>{message.deleted_at ? 'This message was deleted.' : message.body}</Text>
              )}
              <View style={styles.messageFooter}>
                <Text style={[styles.time, mine && styles.mineTime]}>{new Date(message.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text>
                {mine && !message.deleted_at && meta ? <MessageTicks status={messageStatus(message, meta)} color={colors.onPrimaryMuted} readColor={readBlue} /> : null}
                {mine && !message.deleted_at ? <Interactive onPress={() => setDeleteTarget(message)} accessibilityLabel="Delete this message" style={styles.deleteButton}><Icon name="trash" size={14} color={mine ? colors.onPrimaryMuted : colors.error} /></Interactive> : null}
              </View>
            </View>
          );
        })}
        {lastMine && meta ? <Text style={styles.receipt}>{STATUS_LABEL[messageStatus(lastMine, meta)]}</Text> : null}
        {!messages.length && !loading && !error ? <Text style={styles.empty}>Say hello or share what you’re studying.</Text> : null}
      </ScrollView>
      <Card style={styles.composer}>
        {voice.recording ? (
          <View style={styles.recordingRow} accessibilityLiveRegion="polite">
            <View style={styles.recDot} />
            <Text style={styles.recText}>Recording {clock(voice.seconds)} / {clock(VOICE_NOTE_MAX_SECONDS)}</Text>
            <Button label="Cancel" variant="ghost" size="sm" onPress={voice.cancel} />
            <Button label="Send" size="sm" icon={<Icon name="send" size={15} color={colors.onPrimary} />} onPress={() => void sendVoice()} accessibilityLabel="Send recording" />
          </View>
        ) : (
          <>
            <MentionInput people={social.people} value={draft} onChangeText={setDraft} maxLength={500} multiline placeholder="Write a message…" placeholderTextColor={colors.textTertiary} accessibilityLabel="Write a message" style={styles.input} />
            <View style={styles.composerActions}>
              {canRecord ? (
                <Interactive onPress={() => void voice.start()} disabled={!conversationId || sendingVoice} accessibilityRole="button" accessibilityLabel="Record a voice note" style={[styles.micButton, sendingVoice && styles.micBusy]}>
                  {sendingVoice ? <ActivityIndicator size="small" color={colors.primaryText} /> : <Icon name="mic" size={20} color={colors.text} />}
                </Interactive>
              ) : null}
              <Button label="Send" icon={<Icon name="send" size={15} color={colors.onPrimary} />} onPress={() => void send()} loading={busy} disabled={!draft.trim() || busy || !conversationId} />
            </View>
          </>
        )}
        {voice.error ? <Text style={styles.recError}>{voice.error}</Text> : null}
      </Card>
      <Sheet visible={deleteTarget !== null} onClose={() => { if (!busy) setDeleteTarget(null); }} title="Delete this message?" subtitle="The message will be marked as deleted for everyone in this conversation." footer={<View style={styles.confirmActions}><Button label="Cancel" variant="secondary" onPress={() => setDeleteTarget(null)} disabled={busy} /><Button label="Delete message" variant="danger" onPress={() => void removeMessage()} loading={busy} /></View>}>
        <Text style={styles.empty}>You can’t undo this action.</Text>
      </Sheet>
    </Screen>
  );
}

const STATUS_LABEL: Record<MessageStatus, string> = { sent: 'Sent', delivered: 'Delivered', read: 'Read' };

function lastSeenText(at: number) {
  const date = new Date(at);
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86_400_000);
  if (date.toDateString() === today.toDateString()) return `Last seen today at ${time}`;
  if (date.toDateString() === yesterday.toDateString()) return `Last seen yesterday at ${time}`;
  return `Last seen ${date.toLocaleDateString([], { day: 'numeric', month: 'short' })} at ${time}`;
}

/** ✓ sent · ✓✓ delivered · blue ✓✓ read (like other messaging apps). */
function MessageTicks({ status, color, readColor }: { status: MessageStatus; color: string; readColor: string }) {
  const tint = status === 'read' ? readColor : color;
  return (
    <View accessible accessibilityLabel={STATUS_LABEL[status]}>
      <Svg width={status === 'sent' ? 13 : 18} height={12} viewBox={status === 'sent' ? '0 0 13 12' : '0 0 18 12'}>
        <Path d="M1.5 6.6 4.8 9.8 11.5 2.4" stroke={tint} strokeWidth={1.9} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {status === 'sent' ? null : <Path d="M8.2 9.3 8.7 9.8 15.6 2.4" stroke={tint} strokeWidth={1.9} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
      </Svg>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    messages: { maxHeight: 470, minHeight: 180, marginBottom: 12 },
    messageList: { gap: 8, justifyContent: 'flex-end', paddingVertical: 6 },
    bubble: { maxWidth: '86%', paddingHorizontal: 13, paddingVertical: 9, borderRadius: Radius.lg, gap: 4 },
    mine: { alignSelf: 'flex-end', backgroundColor: colors.primary },
    theirs: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    messageText: { ...Type.callout, color: colors.text },
    mineText: { color: colors.onPrimary },
    time: { fontSize: 10, color: colors.textTertiary, alignSelf: 'flex-end' },
    messageFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 9 },
    deleteButton: { padding: 4 },
    confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
    mineTime: { color: colors.onPrimaryMuted },
    receipt: { alignSelf: 'flex-end', fontSize: 11, fontWeight: '700', color: colors.textTertiary, marginTop: -4, marginRight: 4 },
    empty: { ...Type.callout, color: colors.textTertiary, textAlign: 'center', marginTop: 30 },
    composer: { gap: 10 },
    composerActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10 },
    micButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceMuted },
    micBusy: { opacity: 0.7 },
    recordingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
    recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.error },
    recText: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
    recError: { fontSize: 13, color: colors.error },
    input: { minHeight: 52, maxHeight: 140, textAlignVertical: 'top', borderWidth: 1, borderColor: colors.borderStrong, borderRadius: Radius.md, backgroundColor: colors.surfaceSunken, padding: 12, color: colors.text, fontSize: 14 },
  });
}
