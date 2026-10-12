import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';

import { AVATAR_PRESETS, AvatarPresetArt, getAvatarPreset, presetValue } from '@/components/avatar/presets';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Interactive } from '@/components/ui/interactive';
import { Sheet } from '@/components/ui/sheet';
import { InlineNotice } from '@/components/ui/state-views';
import { webStyle } from '@/components/ui/web';
import { cssTransition } from '@/constants/motion';
import { Radius, Type, type ThemeColors } from '@/constants/theme';
import { setAvatarUrl, useAvatarUrl, useDisplayName } from '@/data/user';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { pickAvatarPhoto } from '@/lib/avatar-upload';

// Choose how you appear: an illustrated male or female avatar, your own
// photo, or your initials. Saved to the profile immediately.
export function AvatarPicker({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const current = useAvatarUrl();
  const name = useDisplayName();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'error' | 'success' | 'info'; text: string } | null>(null);
  const hasPhoto = Boolean(current) && !getAvatarPreset(current);

  async function choose(value: string | null, message: string) {
    setNotice(null);
    await setAvatarUrl(value);
    setNotice({ tone: 'success', text: message });
  }

  async function upload() {
    setBusy(true);
    setNotice(null);
    const result = await pickAvatarPhoto();
    setBusy(false);
    if (result.status === 'ok') await choose(result.uri, 'Your photo is now your avatar.');
    else if (result.status === 'denied') setNotice({ tone: 'info', text: 'Allow photo access to choose your own picture.' });
    else if (result.status === 'error') setNotice({ tone: 'error', text: result.message });
  }

  const groups = [
    { key: 'male', title: 'Male' },
    { key: 'female', title: 'Female' },
  ] as const;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Your avatar"
      subtitle="How classmates will see you across GrAte Apex Hub."
      footer={<Button label="Done" onPress={onClose} fullWidth />}
    >
      <View style={styles.preview}>
        <Avatar uri={current} name={name} size={88} ring="gold" />
        <Text style={styles.previewName}>{name ? `Doc. ${name}` : 'Doc.'}</Text>
      </View>

      {groups.map((group) => (
        <View key={group.key} style={styles.group}>
          <Text style={styles.groupTitle}>{group.title.toUpperCase()}</Text>
          <View style={styles.grid}>
            {AVATAR_PRESETS.filter((preset) => preset.group === group.key).map((preset) => {
              const selected = current === presetValue(preset.id);
              return (
                <Interactive
                  key={preset.id}
                  onPress={() => void choose(presetValue(preset.id), 'Avatar updated.')}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={preset.label}
                  style={({ hovered, pressed }) => [styles.tile, hovered && styles.tileHover, selected && styles.tileSelected, pressed && styles.tilePressed]}
                >
                  <AvatarPresetArt preset={preset} size={64} />
                  {selected ? (
                    <View style={styles.check}>
                      <Icon name="check" size={12} color="#0A1F5C" strokeWidth={3} />
                    </View>
                  ) : null}
                </Interactive>
              );
            })}
          </View>
        </View>
      ))}

      <View style={styles.group}>
        <Text style={styles.groupTitle}>YOUR OWN PHOTO</Text>
        <View style={styles.uploadRow}>
          <Button
            label={hasPhoto ? 'Choose a different photo' : 'Upload a photo'}
            variant="secondary"
            icon={<Icon name="upload" size={18} color={colors.text} />}
            loading={busy}
            onPress={() => void upload()}
          />
          {current ? (
            <Button label="Use my initials" variant="ghost" onPress={() => void choose(null, 'Showing your initials.')} />
          ) : null}
        </View>
        <Text style={styles.hint}>JPG or PNG. It is cropped to a square and resized to keep your profile light.</Text>
      </View>

      {notice ? <InlineNotice tone={notice.tone} message={notice.text} /> : null}
    </Sheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    preview: { alignItems: 'center', gap: 8, paddingVertical: 6 },
    previewName: { ...Type.headline, color: colors.text },
    group: { gap: 10 },
    groupTitle: { ...Type.overline, color: colors.textTertiary },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    tile: {
      padding: 6,
      borderRadius: Radius.lg,
      borderWidth: 2,
      borderColor: 'transparent',
      backgroundColor: colors.surfaceMuted,
      ...webStyle(cssTransition('border-color, background-color, transform')),
    },
    tileHover: { borderColor: colors.primaryBorder },
    tileSelected: { borderColor: colors.accent },
    tilePressed: { transform: [{ scale: 0.96 }] },
    check: {
      position: 'absolute',
      right: 4,
      top: 4,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    uploadRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
    hint: { ...Type.caption, color: colors.textTertiary },
  });
}
