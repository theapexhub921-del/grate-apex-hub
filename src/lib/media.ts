// Photos and videos: uploaded to the original GRATEAPEX app's Cloudinary
// account, exactly as the original app does (src/media.ts there): an unsigned
// upload preset, files under https://res.cloudinary.com/…, at most 3 per post,
// 10 MB per image and 50 MB per video. The deployed Firestore rules accept
// media URLs from Cloudinary.
//
// The cloud name and preset are public (they are compiled into the original
// app's web bundle). They can be overridden with the same build settings the
// original app uses: EXPO_PUBLIC_CLOUDINARY_CLOUD and EXPO_PUBLIC_CLOUDINARY_PRESET.
//
// An unsigned preset can upload but not delete: removing a post or story removes
// it from the app, not the file from Cloudinary (the same as the original app).
import { Platform } from 'react-native';

import { type Media, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, type MediaFile, safeUrl } from '@/lib/media-urls';

export const CLOUDINARY = {
  cloudName: process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD || 'yfpth5xz',
  uploadPreset: process.env.EXPO_PUBLIC_CLOUDINARY_PRESET || 'mjucn0am',
};

export const uploadsReady = () => Boolean(CLOUDINARY.cloudName && CLOUDINARY.uploadPreset);

export * from '@/lib/media-urls';

/** Uploads one photo or video to Cloudinary and returns its media entry. Throws a plain-language error. */
export async function uploadMedia(file: MediaFile, onProgress?: (share: number) => void): Promise<Media> {
  if (!uploadsReady()) throw new Error('Uploads aren’t set up yet.');
  const isVideo = file.type === 'video';
  const limit = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  const tooBig = `That file is too big. Max ${isVideo ? '50' : '10'} MB.`;
  if (file.size && file.size > limit) throw new Error(tooBig);

  const form = new FormData();
  const name = file.filename || (isVideo ? 'video.mp4' : 'photo.jpg');
  if (Platform.OS === 'web') {
    const blob = await (await fetch(file.uri)).blob();
    if (blob.size > limit) throw new Error(tooBig);
    form.append('file', blob, name);
  } else {
    form.append('file', { uri: file.uri, name, type: file.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg') } as unknown as Blob);
  }
  form.append('upload_preset', CLOUDINARY.uploadPreset);

  const data = await new Promise<Record<string, any>>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/auto/upload`);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    request.onload = () => {
      try {
        const body = JSON.parse(request.responseText);
        if (request.status >= 200 && request.status < 300) resolve(body);
        else reject(new Error(body?.error?.message || 'Upload failed.'));
      } catch {
        reject(new Error('Upload failed.'));
      }
    };
    request.onerror = () => reject(new Error('Couldn’t reach the upload server. Check your connection.'));
    request.send(form);
  });
  if (!safeUrl(data.secure_url)) throw new Error('Upload failed.');
  return { t: data.resource_type === 'video' ? 'video' : 'image', url: data.secure_url, w: data.width, h: data.height };
}

/** Uploads a recorded voice note (web: a MediaRecorder blob) to Cloudinary and returns its URL. */
export async function uploadVoiceNote(blob: Blob): Promise<string> {
  if (!uploadsReady()) throw new Error('Uploads aren’t set up yet.');
  if (blob.size > MAX_VIDEO_BYTES) throw new Error('That voice note is too long.');
  const form = new FormData();
  const type = blob.type || 'audio/webm';
  form.append('file', blob, type.includes('mp4') ? 'voice-note.m4a' : type.includes('ogg') ? 'voice-note.ogg' : 'voice-note.webm');
  form.append('upload_preset', CLOUDINARY.uploadPreset);
  let response: Response;
  try {
    response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/auto/upload`, { method: 'POST', body: form });
  } catch {
    throw new Error('Couldn’t reach the upload server. Check your connection.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || 'Upload failed.');
  if (!safeUrl(data.secure_url)) throw new Error('Upload failed.');
  return data.secure_url as string;
}
