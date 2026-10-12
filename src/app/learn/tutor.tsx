import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Card } from '@/components/ui/interactive';
import { PageHeader, Screen, SectionHeader } from '@/components/ui/screen';
import { Type, type ThemeColors } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { createRealtimeTutorSession } from '@/data/ai-tutor';

type TranscriptLine = { id: string; speaker: 'You' | 'GrAte Apex Hub'; text: string };

export default function TutorScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const [status, setStatus] = useState('Ready when you are');
  const [busy, setBusy] = useState(false);
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [error, setError] = useState('');
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lineCounter = useRef(0);

  const addTranscript = useCallback((speaker: TranscriptLine['speaker'], text: unknown) => {
    if (typeof text !== 'string' || !text.trim()) return;
    lineCounter.current += 1;
    const id = `${Date.now()}-${lineCounter.current}`;
    setLines((current) => [...current.slice(-19), { id, speaker, text: text.trim() }]);
  }, []);

  const endSession = useCallback(() => {
    const peer = peerRef.current;
    peerRef.current = null;
    if (peer) {
      peer.ontrack = null;
      peer.onconnectionstatechange = null;
      peer.close();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    audioRef.current?.pause();
    audioRef.current?.remove();
    audioRef.current = null;
    setBusy(false);
    setStatus('Call ended');
  }, []);

  useEffect(() => () => {
    const peer = peerRef.current;
    if (peer) peer.close();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    audioRef.current?.pause();
    audioRef.current?.remove();
  }, []);

  async function startSession() {
    if (Platform.OS !== 'web') {
      setError('Voice tutor is ready for the web app. Native iOS/Android audio needs the separate device audio integration.');
      return;
    }

    setBusy(true);
    setError('');
    setLines([]);
    setStatus('Requesting microphone permission…');
    let stream: MediaStream | null = null;
    let peer: RTCPeerConnection | null = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === 'undefined') {
        throw new Error('This browser does not support microphone voice calls. Try the current version of Chrome, Edge or Safari.');
      }
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setStatus('Connecting to your tutor…');

      const session = await createRealtimeTutorSession();
      peer = new RTCPeerConnection();
      peerRef.current = peer;
      stream.getTracks().forEach((track) => peer!.addTrack(track, stream!));

      const remoteAudio = document.createElement('audio');
      remoteAudio.autoplay = true;
      remoteAudio.setAttribute('playsinline', 'true');
      remoteAudio.style.display = 'none';
      document.body.appendChild(remoteAudio);
      audioRef.current = remoteAudio;
      peer.ontrack = (event) => {
        remoteAudio.srcObject = event.streams[0] ?? null;
        void remoteAudio.play().catch(() => setError('Your browser blocked audio playback. Use the page controls to allow sound, then try again.'));
      };

      const events = peer.createDataChannel('oai-events');
      events.onopen = () => {
        setStatus('Connected · speak naturally');
        events.send(JSON.stringify({ type: 'response.create' }));
      };
      events.onmessage = (message) => {
        try {
          const event = JSON.parse(String(message.data)) as { type?: string; transcript?: unknown };
          if (event.type === 'conversation.item.input_audio_transcription.completed') addTranscript('You', event.transcript);
          if (event.type === 'response.audio_transcript.done' || event.type === 'response.output_audio_transcript.done') {
            addTranscript('GrAte Apex Hub', event.transcript);
          }
        } catch {
          // Ignore non-JSON transport messages; connection status remains useful.
        }
      };
      peer.onconnectionstatechange = () => {
        if (peer?.connectionState === 'failed' || peer?.connectionState === 'disconnected') {
          setStatus('Connection interrupted');
        }
      };

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      const response = await fetch('https://api.openai.com/v1/realtime/calls', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.client_secret.value}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as {
          error?: { code?: unknown; message?: unknown; param?: unknown; type?: unknown };
        } | null;
        const providerError = payload?.error;
        const code = typeof providerError?.code === 'string' ? providerError.code : null;
        const param = typeof providerError?.param === 'string' ? providerError.param : null;
        const detail = typeof providerError?.message === 'string'
          ? providerError.message.slice(0, 240)
          : 'No additional error details were returned.';
        const requestId = response.headers.get('x-request-id');
        const context = [code, param ? `field ${param}` : null, requestId ? `request ${requestId}` : null]
          .filter(Boolean)
          .join(', ');
        throw new Error(
          `OpenAI rejected the voice call (HTTP ${response.status}${context ? `; ${context}` : ''}): ${detail}`,
        );
      }
      await peer.setRemoteDescription({ type: 'answer', sdp: await response.text() });
    } catch (caught) {
      if (peer) peer.close();
      peerRef.current = null;
      stream?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      audioRef.current?.remove();
      audioRef.current = null;
      setBusy(false);
      setStatus('Ready when you are');
      setError(caught instanceof Error ? caught.message : 'The tutor could not start. Please try again.');
    }
  }

  return (
    <Screen width="content">
      <PageHeader eyebrow="Learn together" title="AI voice tutor" subtitle="Talk through a topic, practise recall and ask follow-up questions out loud." />

      <Card style={styles.hero} tone="primary">
        <View style={styles.heroIcon}><Icon name="sparkle" size={27} color={colors.primaryText} /></View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>A calm voice for your next study session</Text>
          <Text style={styles.body}>This first voice preview can explain general biomedical topics and guide active recall. It is not connected to your private lecture files yet, so check course-specific details against your materials.</Text>
        </View>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, busy && styles.statusDotLive]} />
          <Text style={styles.statusText}>{status}</Text>
        </View>
        <View style={styles.controls}>
          <Button
            label={busy ? 'Connecting…' : 'Start voice session'}
            icon={<Icon name="sparkle" size={17} color={colors.onPrimary} />}
            onPress={() => void startSession()}
            loading={busy}
            disabled={busy}
            accessibilityHint="Requests microphone access and starts a private voice study session with the AI tutor."
          />
          {busy ? <Button label="End session" variant="secondary" onPress={endSession} /> : null}
        </View>
        {error ? <Text style={styles.errorText} accessibilityRole="alert">{error}</Text> : null}
        {Platform.OS !== 'web' ? <Text style={styles.note}>The web voice preview is ready. Native phone audio support will be added with the device call integration.</Text> : null}
      </Card>

      <SectionHeader title="Conversation notes" subtitle="Transcripts appear here while you speak. They stay on this screen and are not saved to your profile." style={styles.section} />
      {lines.length ? (
        <View style={styles.transcriptList}>
          {lines.map((line) => (
            <Card key={line.id} style={styles.transcriptLine} tone={line.speaker === 'You' ? 'surface' : 'insight'}>
              <Text style={styles.speaker}>{line.speaker}</Text>
              <Text style={styles.body}>{line.text}</Text>
            </Card>
          ))}
        </View>
      ) : (
        <Card style={styles.emptyTranscript} tone="muted">
          <Text style={styles.body}>Start a session and your speech and the tutor’s replies will appear here when transcription is available.</Text>
        </Card>
      )}
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    hero: { gap: 14, padding: 22 },
    heroIcon: { width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
    heroCopy: { gap: 6, maxWidth: 720 },
    heroTitle: { ...Type.title2, color: colors.text },
    body: { fontSize: 14, lineHeight: 21, color: colors.textSecondary },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
    statusDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.textTertiary },
    statusDotLive: { backgroundColor: colors.success },
    statusText: { fontSize: 13, fontWeight: '700', color: colors.text },
    controls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 2 },
    errorText: { fontSize: 13, lineHeight: 19, color: colors.error },
    note: { fontSize: 12, lineHeight: 18, color: colors.textTertiary },
    section: { marginTop: 30 },
    transcriptList: { gap: 9 },
    transcriptLine: { gap: 5, padding: 15 },
    speaker: { fontSize: 12, fontWeight: '800', color: colors.primaryText },
    emptyTranscript: { padding: 18 },
  });
}
