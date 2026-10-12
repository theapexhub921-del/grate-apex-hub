// Media entries and Cloudinary addresses (pure; used by lib/media.ts and tests).
// See lib/media.ts for how uploads work.

export type Media = { t: 'image' | 'video'; url: string; w?: number; h?: number };
export type MediaFile = { uri: string; type: 'image' | 'video'; mimeType?: string; filename?: string; size?: number };

export const MAX_MEDIA = 3;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const CDN = 'https://res.cloudinary.com/';

export const safeUrl = (url?: unknown): url is string => typeof url === 'string' && url.startsWith(CDN);

/** Cloudinary resizes and compresses when asked in the URL. */
export function optimized(url: string, width = 800) {
  return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
}
/** A still frame for a video. */
export function poster(url: string, width = 800) {
  return url.replace('/upload/', `/upload/so_0,f_jpg,q_auto,w_${width}/`).replace(/\.[a-z0-9]+$/i, '.jpg');
}

/** Firestore rejects undefined, and the rules expect Cloudinary URLs only. */
export function cleanMedia(items?: readonly (Media | null | undefined)[]): Media[] {
  return (items ?? [])
    .filter((item): item is Media => Boolean(item) && safeUrl(item!.url))
    .slice(0, MAX_MEDIA)
    .map((item) => {
      const clean: Media = { t: item.t === 'video' ? 'video' : 'image', url: item.url };
      if (item.w) clean.w = item.w;
      if (item.h) clean.h = item.h;
      return clean;
    });
}
