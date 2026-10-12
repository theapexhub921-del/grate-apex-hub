import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Interactive } from '@/components/ui/interactive';
import { Text } from '@/components/ui/text';
import { type ThemeColors } from '@/constants/theme';
import { VOICE_NOTE_MAX_SECONDS } from '@/data/community';
import { useThemedStyles } from '@/hooks/use-theme';

// Voice notes in messages (like the original app): record with the
// microphone, then send; up to two minutes each. Recording uses the browser's
// MediaRecorder, so it works on the web app (phones and laptops).

export const voiceNotesSupported = () =>
  Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);

export const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

type Recording = { recorder: MediaRecorder; stream: MediaStream; chunks: Blob[]; startedAt: number };

/** Start, finish (→ the recorded blob and its length) or cancel a voice note; onLimit runs at the two-minute limit. */
export function useVoiceRecorder(onLimit?: () => void) {
  const current = useRef<Recording | null>(null);
  const limitRef = useRef(onLimit);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { limitRef.current = onLimit; }, [onLimit]);

  useEffect(() => {
    if (startedAt === null) return;
    let fired = false;
    const timer = setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      setSeconds(Math.min(VOICE_NOTE_MAX_SECONDS, elapsed));
      if (elapsed >= VOICE_NOTE_MAX_SECONDS && !fired) {
        fired = true;
        limitRef.current?.();
      }
    }, 250);
    return () => clearInterval(timer);
  }, [startedAt]);

  // Release the microphone if the screen closes mid-recording.
  useEffect(() => () => { current.current?.stream.getTracks().forEach((track) => track.stop()); }, []);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg'].find((candidate) => MediaRecorder.isTypeSupported?.(candidate));
      const recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.start(250);
      const at = Date.now();
      current.current = { recorder, stream, chunks, startedAt: at };
      setSeconds(0);
      setStartedAt(at);
    } catch {
      setError('Allow microphone access in your browser to record a voice note.');
    }
  }

  function finish(): Promise<{ blob: Blob; seconds: number } | null> {
    const recording = current.current;
    current.current = null;
    setStartedAt(null);
    if (!recording) return Promise.resolve(null);
    return new Promise((resolve) => {
      const length = Math.min(VOICE_NOTE_MAX_SECONDS, (Date.now() - recording.startedAt) / 1000);
      recording.recorder.onstop = () => {
        recording.stream.getTracks().forEach((track) => track.stop());
        resolve(length < 0.8 ? null : { blob: new Blob(recording.chunks, { type: recording.recorder.mimeType || 'audio/webm' }), seconds: length });
      };
      recording.recorder.stop();
    });
  }

  function cancel() {
    const recording = current.current;
    current.current = null;
    setStartedAt(null);
    if (!recording) return;
    recording.recorder.onstop = () => recording.stream.getTracks().forEach((track) => track.stop());
    recording.recorder.stop();
  }

  return { recording: startedAt !== null, seconds, error, start, finish, cancel };
}

/** A voice note in a chat bubble: play / pause, progress and length. */
export function VoiceNotePlayer({ url, seconds, color, trackColor }: { url: string; seconds: number; color: string; trackColor: string }) {
  const styles = useThemedStyles(createStyles);
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [at, setAt] = useState(0);

  useEffect(() => () => { audio.current?.pause(); }, []);

  function toggle() {
    if (Platform.OS !== 'web' || typeof Audio === 'undefined') return;
    if (!audio.current) {
      const element = new Audio(url);
      element.ontimeupdate = () => setAt(element.currentTime);
      element.onended = () => { setPlaying(false); setAt(0); };
      element.onpause = () => setPlaying(false);
      element.onplay = () => setPlaying(true);
      audio.current = element;
    }
    if (audio.current.paused) void audio.current.play().catch(() => setPlaying(false));
    else audio.current.pause();
  }

  const share = seconds > 0 ? Math.min(1, at / seconds) : 0;
  return (
    <View style={styles.player}>
      <Interactive onPress={toggle} accessibilityRole="button" accessibilityLabel={playing ? 'Pause voice note' : `Play voice note, ${clock(seconds)}`} style={styles.play}>
        <Icon name={playing ? 'pause' : 'play'} size={18} color={color} filled />
      </Interactive>
      <View style={[styles.track, { backgroundColor: trackColor }]}>
        <View style={[styles.fill, { width: `${share * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.length, { color }]}>{clock(playing || at ? at : seconds)}</Text>
    </View>
  );
}

function createStyles(_colors: ThemeColors) {
  return StyleSheet.create({
    player: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 200 },
    play: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
    track: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
    fill: { height: 4, borderRadius: 2 },
    length: { fontSize: 12, fontWeight: '700', minWidth: 34, textAlign: 'right' },
  });
}
