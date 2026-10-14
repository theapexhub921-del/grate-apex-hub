import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Interactive } from '@/components/ui/interactive';
import { Text } from '@/components/ui/text';
import { type ThemeColors } from '@/constants/theme';
import { VOICE_NOTE_MAX_SECONDS } from '@/data/community';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

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

// ─── Waveform helpers ────────────────────────────────────────────────────────

const BAR_COUNT = 40;

/**
 * Generate a deterministic-looking waveform from the URL string.
 * Values are normalised to [0.15, 1.0] so every bar is visible.
 */
function seedWaveform(url: string): number[] {
  let h = 0x811c9dc5;
  for (let i = 0; i < url.length; i++) {
    h ^= url.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return Array.from({ length: BAR_COUNT }, (_, i) => {
    h ^= i * 7;
    h = Math.imul(h, 0x01000193) >>> 0;
    const raw = ((h >>> 0) % 1000) / 1000;
    // Envelope: quieter at start and end, louder in the middle
    const env = Math.sin((Math.PI * i) / (BAR_COUNT - 1)) * 0.5 + 0.5;
    return 0.15 + (raw * 0.6 + env * 0.3) * 0.85;
  });
}

const SPEEDS = [1, 1.5, 2] as const;

// ─── Player component ────────────────────────────────────────────────────────

/**
 * A WhatsApp-style voice note player:
 * • Play / pause
 * • Seekable waveform (tap or drag to jump)
 * • Playback-speed cycle (1× → 1.5× → 2×)
 * • Smooth progress via requestAnimationFrame
 */
export function VoiceNotePlayer({
  url,
  seconds,
  color,
  trackColor,
}: {
  url: string;
  seconds: number;
  color: string;
  trackColor: string;
}) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();

  const audio = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const waveformRef = useRef<View>(null);

  const [playing, setPlaying] = useState(false);
  const [at, setAt] = useState(0);
  const [speed, setSpeed] = useState<1 | 1.5 | 2>(1);
  const [waveform] = useState<number[]>(() => seedWaveform(url));

  // raf tick → smooth progress
  const tick = useCallback(() => {
    const el = audio.current;
    if (el) setAt(el.currentTime);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopRaf();
      audio.current?.pause();
    };
  }, [stopRaf]);

  function getOrCreateAudio(): HTMLAudioElement {
    if (!audio.current) {
      const el = new Audio(url);
      el.playbackRate = speed;
      el.onended = () => {
        setPlaying(false);
        setAt(0);
        stopRaf();
      };
      el.onpause = () => {
        setPlaying(false);
        stopRaf();
      };
      el.onplay = () => {
        setPlaying(true);
        rafRef.current = requestAnimationFrame(tick);
      };
      audio.current = el;
    }
    return audio.current;
  }

  function toggle() {
    if (Platform.OS !== 'web' || typeof Audio === 'undefined') return;
    const el = getOrCreateAudio();
    if (el.paused) void el.play().catch(() => setPlaying(false));
    else el.pause();
  }

  // Seek to a fraction [0, 1] of the total duration
  function seekTo(fraction: number) {
    if (Platform.OS !== 'web' || typeof Audio === 'undefined') return;
    const el = getOrCreateAudio();
    const duration = el.duration || seconds;
    const target = Math.max(0, Math.min(duration, fraction * duration));
    el.currentTime = target;
    setAt(target);
  }

  // Handle tap/click on the waveform bar area
  function onWaveformPress(evt: { nativeEvent: { locationX: number } }) {
    // On web `nativeEvent.locationX` is the x offset within the pressed element
    const el = waveformRef.current as unknown as HTMLElement | null;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (evt as unknown as React.MouseEvent).clientX - rect.left;
    seekTo(Math.max(0, Math.min(1, x / rect.width)));
  }

  // Cycle speed: 1 → 1.5 → 2 → 1
  function cycleSpeed() {
    const idx = SPEEDS.indexOf(speed);
    const next = SPEEDS[(idx + 1) % SPEEDS.length] as 1 | 1.5 | 2;
    setSpeed(next);
    if (audio.current) audio.current.playbackRate = next;
  }

  const duration = (audio.current?.duration) || seconds;
  const share = duration > 0 ? Math.min(1, at / duration) : 0;
  const filledBars = Math.round(share * BAR_COUNT);
  const displayTime = playing || at > 0 ? at : seconds;

  return (
    <View style={styles.player}>
      {/* Play / Pause button */}
      <Interactive
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={playing ? 'Pause voice note' : `Play voice note, ${clock(seconds)}`}
        style={[styles.playBtn, { borderColor: color }]}
      >
        <Icon name={playing ? 'pause' : 'play'} size={16} color={color} filled />
      </Interactive>

      {/* Waveform — tappable for seeking */}
      <Pressable
        ref={waveformRef as unknown as React.Ref<View>}
        onPress={onWaveformPress as unknown as () => void}
        accessibilityRole="adjustable"
        accessibilityLabel="Seek voice note"
        style={styles.waveformWrap}
      >
        {waveform.map((h, i) => {
          const filled = i < filledBars;
          const barColor = filled ? color : trackColor;
          return (
            <View
              key={i}
              style={[
                styles.bar,
                {
                  height: `${Math.round(h * 100)}%` as unknown as number,
                  backgroundColor: barColor,
                  opacity: filled ? 1 : 0.45,
                },
              ]}
            />
          );
        })}
      </Pressable>

      {/* Right column: speed pill + time */}
      <View style={styles.rightCol}>
        {/* Speed toggle pill */}
        <Pressable
          onPress={cycleSpeed}
          accessibilityRole="button"
          accessibilityLabel={`Playback speed ${speed}×, tap to change`}
          style={[styles.speedPill, { borderColor: color }]}
        >
          <Text style={[styles.speedText, { color }]}>{speed === 1 ? '1×' : `${speed}×`}</Text>
        </Pressable>

        {/* Elapsed / total time */}
        <Text style={[styles.timeText, { color }]}>{clock(displayTime)}</Text>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    player: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minWidth: 220,
      paddingVertical: 2,
    },
    playBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    waveformWrap: {
      flex: 1,
      height: 32,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      overflow: 'hidden',
      // Web: show pointer cursor
      ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : {}),
    },
    bar: {
      flex: 1,
      borderRadius: 2,
      minHeight: 3,
    },
    rightCol: {
      alignItems: 'center',
      gap: 3,
      flexShrink: 0,
      minWidth: 38,
    },
    speedPill: {
      borderRadius: 999,
      borderWidth: 1.5,
      paddingHorizontal: 5,
      paddingVertical: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    speedText: {
      fontSize: 10,
      fontWeight: '800',
      lineHeight: 14,
    },
    timeText: {
      fontSize: 11,
      fontWeight: '700',
    },
  });
}
