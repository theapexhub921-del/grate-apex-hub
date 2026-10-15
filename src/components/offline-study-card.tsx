import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Type, type ThemeColors } from '@/constants/theme';
import { readClassSelection } from '@/data/class-curriculum';
import { type OfflineProgress, removeOfflineCopy, saveClassForOffline, savedForClass } from '@/data/offline-study';
import { useAuth } from '@/hooks/use-auth';
import { useThemedStyles } from '@/hooks/use-theme';
import { formatMegabytes, isOffline, type OfflineManifest, offlineSupported } from '@/lib/offline-study';

// Settings → Offline study. The learner chooses when to download (it uses data),
// sees what is saved, and can remove it. Question banks and lecture diagrams are
// also kept automatically the first time they are opened (public/sw.js).
export function OfflineStudyCard() {
  const styles = useThemedStyles(createStyles);
  const { user } = useAuth();
  const selection = readClassSelection(user?.user_metadata);
  const [saved, setSaved] = useState<OfflineManifest | null>(null);
  const [progress, setProgress] = useState<OfflineProgress | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const classId = selection?.classId;
  const semester = selection?.semester;

  const refresh = useCallback(async () => {
    setSaved(await savedForClass(selection));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, semester]);
  useEffect(() => { void refresh(); }, [refresh]);

  if (!offlineSupported()) {
    return <Text style={styles.description}>Saving study material for offline use works in the web app. Open GrAte Apex Hub in your browser, or install it from the browser menu, to use it.</Text>;
  }
  if (!selection) {
    return <Text style={styles.description}>Choose your class first (Learn → class selection). Offline study saves the lessons and question banks for your class.</Text>;
  }

  async function save() {
    if (!selection) return;
    if (isOffline()) { setNotice('You need a connection to save study material. Try again when you are online.'); return; }
    setNotice(null);
    setProgress({ done: 0, total: 1, label: 'Starting' });
    try {
      const result = await saveClassForOffline(selection, setProgress);
      setSaved(result.manifest);
      setNotice(result.ok ? 'Saved. You can revise this class without data.' : `Saved, but ${result.problems} item${result.problems === 1 ? '' : 's'} could not be downloaded. Run it again when your connection is steady.`);
    } catch {
      setNotice('Could not save your study material. Check your connection and try again.');
    } finally {
      setProgress(null);
    }
  }

  async function remove() {
    await removeOfflineCopy();
    setSaved(null);
    setNotice('Removed from this device.');
  }

  const busy = progress !== null;
  return (
    <>
      <Text style={styles.description}>
        Save your class’s lessons, question banks and lecture diagrams on this device to revise without data. This downloads a few megabytes, so do it on Wi-Fi if you can. Anything you open is also kept automatically for next time.
      </Text>
      <View style={styles.status}>
        <Text style={styles.label}>
          {saved ? `Saved on this device · ${formatMegabytes(saved.bytes)}` : 'Not saved yet'}
        </Text>
        <Text style={styles.description}>
          {saved
            ? `${saved.courses} course${saved.courses === 1 ? '' : 's'}${saved.lessons ? `, ${saved.lessons} lesson${saved.lessons === 1 ? '' : 's'}` : ''} · saved ${new Date(saved.savedAt).toLocaleDateString()}`
            : 'Nothing has been downloaded for offline study.'}
        </Text>
        {busy ? <Text style={styles.description}>{`${progress.label}… ${progress.done} of ${progress.total}`}</Text> : null}
        {notice ? <Text style={styles.description} accessibilityRole="alert">{notice}</Text> : null}
      </View>
      <View style={styles.buttons}>
        <Button label={saved ? 'Update saved material' : 'Save for offline'} size="sm" loading={busy} disabled={busy} onPress={() => void save()} />
        {saved && !busy ? <Button label="Remove" variant="ghost" size="sm" onPress={() => void remove()} /> : null}
      </View>
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    description: { ...Type.callout, color: colors.textSecondary },
    label: { ...Type.headline, color: colors.text },
    status: { gap: 4 },
    buttons: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  });
}
