import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { clock, useVoiceRecorder, VoiceNotePlayer, voiceNotesSupported } from '@/components/social/voice-note';
import { Icon } from '@/components/ui/icon';
import { Interactive } from '@/components/ui/interactive';
import { Text } from '@/components/ui/text';
import { type ThemeColors } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

// A voice note being recorded for a post or a reply: record, stop, listen, remove.
// `compact` is the small round button used in the reply bar; otherwise a labelled button.

export type VoiceClip = { blob: Blob; seconds: number; previewUrl: string };

/** Frees the preview of a clip that is no longer needed. */
export function discardVoiceClip(clip: VoiceClip) {
  if (typeof URL !== 'undefined' && URL.revokeObjectURL) URL.revokeObjectURL(clip.previewUrl);
}

export function VoiceClipRecorder({ clip, onClip, compact = false }: { clip: VoiceClip | null; onClip: (clip: VoiceClip | null) => void; compact?: boolean }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const stopRef = useRef<() => void>(() => {});
  const recorder = useVoiceRecorder(() => stopRef.current());
  if (!voiceNotesSupported()) return null;

  // Two minutes is the most a note can be; reaching it stops the recording and keeps it.
  async function stop() {
    const result = await recorder.finish();
    if (result) onClip({ blob: result.blob, seconds: result.seconds, previewUrl: URL.createObjectURL(result.blob) });
  }
  stopRef.current = () => { void stop(); };

  function remove() {
    if (clip) discardVoiceClip(clip);
    onClip(null);
  }

  const error = recorder.error ? <Text style={styles.error}>{recorder.error}</Text> : null;

  if (clip) {
    return (
      <View style={styles.wrap}>
        <View style={styles.row}>
          <VoiceNotePlayer url={clip.previewUrl} seconds={clip.seconds} color={colors.primaryText} trackColor={colors.border} />
          <Interactive onPress={remove} accessibilityRole="button" accessibilityLabel="Remove voice note" style={styles.iconButton}>
            <Icon name="close" size={16} color={colors.textSecondary} />
          </Interactive>
        </View>
      </View>
    );
  }

  if (recorder.recording) {
    return (
      <View style={styles.wrap}>
        <View style={styles.row}>
          <View style={styles.dot} />
          <Text style={styles.clock}>{clock(recorder.seconds)}</Text>
          <Interactive onPress={() => void stop()} accessibilityRole="button" accessibilityLabel="Stop and keep voice note" style={styles.iconButton}>
            <View style={styles.square} />
          </Interactive>
          <Interactive onPress={recorder.cancel} accessibilityRole="button" accessibilityLabel="Cancel voice note" style={styles.iconButton}>
            <Icon name="close" size={16} color={colors.textSecondary} />
          </Interactive>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Interactive
        onPress={() => void recorder.start()}
        accessibilityRole="button"
        accessibilityLabel="Record a voice note"
        style={compact ? styles.iconButton : styles.recordButton}
      >
        <Icon name="mic" size={compact ? 18 : 17} color={colors.primaryText} />
        {compact ? null : <Text style={styles.recordText}>Record a voice note</Text>}
      </Interactive>
      {error}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { gap: 6 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    iconButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    recordButton: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingVertical: 9, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.border },
    recordText: { fontSize: 13.5, fontWeight: '700', color: colors.text },
    dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.error },
    square: { width: 12, height: 12, borderRadius: 2, backgroundColor: colors.error },
    clock: { fontSize: 13, fontWeight: '700', color: colors.text, minWidth: 40 },
    error: { fontSize: 12, lineHeight: 17, color: colors.error },
  });
}
