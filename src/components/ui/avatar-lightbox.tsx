import { type ComponentProps, useState } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { IconButton } from '@/components/ui/icon-button';
import { Interactive } from '@/components/ui/interactive';
import { Text } from '@/components/ui/text';

type AvatarProps = ComponentProps<typeof Avatar>;

/** A profile picture shown large on a dark backdrop. Tap anywhere, press Close or Escape to dismiss. */
export function AvatarLightbox({ visible, onClose, uri, name }: { visible: boolean; onClose: () => void; uri?: string | null; name?: string | null }) {
  const { width, height } = useWindowDimensions();
  const size = Math.round(Math.min(width - 48, height - 160, 480));
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close picture" />
        <View style={styles.close}>
          <IconButton icon="close" label="Close" onPress={onClose} size={40} />
        </View>
        <View pointerEvents="none" style={styles.center}>
          <Avatar uri={uri} name={name} size={Math.max(size, 120)} ring="gold" />
          {name ? <Text style={styles.name}>{name}</Text> : null}
        </View>
      </View>
    </Modal>
  );
}

/** A profile picture that opens the large view when tapped. */
export function EnlargeableAvatar(props: AvatarProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Interactive onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={`Enlarge ${props.name ?? 'profile'} picture`} style={styles.press}>
        <Avatar {...props} />
      </Interactive>
      <AvatarLightbox visible={open} onClose={() => setOpen(false)} uri={props.uri} name={props.name} />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgba(5,10,25,0.92)', alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', gap: 16 },
  close: { position: 'absolute', top: 40, right: 20, zIndex: 2 },
  name: { color: '#fff', fontSize: 18, fontWeight: '800' },
  press: { borderRadius: 999 },
});
