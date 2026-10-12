import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { uploadMedia } from '@/lib/media';

// The learner's own profile photo.
//
// The picked image is cropped to a centred square and shrunk to 256 px
// JPEG, then uploaded to the original app's Cloudinary account, as the
// original app does (lib/media.ts), so both apps show the same photo. If the
// upload can't be done (offline), it is kept as a small data URI instead.

const SIZE = 256;

export type AvatarUploadResult =
  | { status: 'ok'; uri: string }
  | { status: 'cancelled' }
  | { status: 'denied' }
  | { status: 'error'; message: string };

export async function pickAvatarPhoto(): Promise<AvatarUploadResult> {
  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return { status: 'denied' };

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, // native: let them frame the square themselves
      aspect: [1, 1],
      quality: 1,
    });
    if (picked.canceled || !picked.assets?.[0]) return { status: 'cancelled' };

    const asset = picked.assets[0];
    const context = ImageManipulator.manipulate(asset.uri);
    const width = asset.width || 0;
    const height = asset.height || 0;
    if (width > 0 && height > 0 && width !== height) {
      const side = Math.min(width, height);
      context.crop({
        originX: Math.round((width - side) / 2),
        originY: Math.round((height - side) / 2),
        width: side,
        height: side,
      });
    }
    context.resize({ width: SIZE, height: SIZE });
    const image = await context.renderAsync();
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.74, base64: true });
    if (!saved.base64) return { status: 'error', message: 'The photo could not be prepared.' };
    const dataUri = `data:image/jpeg;base64,${saved.base64}`;
    try {
      const uploaded = await uploadMedia({ uri: saved.uri || dataUri, type: 'image', mimeType: 'image/jpeg', filename: 'avatar.jpg' });
      return { status: 'ok', uri: uploaded.url };
    } catch (problem) {
      console.warn('Avatar upload failed; keeping the photo in the profile instead:', problem);
      return { status: 'ok', uri: dataUri };
    }
  } catch (problem) {
    console.warn('Avatar photo failed:', problem);
    return { status: 'error', message: 'That photo could not be used. Try a JPG or PNG image.' };
  }
}
