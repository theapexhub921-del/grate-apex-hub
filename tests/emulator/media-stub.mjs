// Stand-in for src/lib/media.ts in the emulator checks: NEVER uploads to the
// real Cloudinary account. Uploads return a fake res.cloudinary.com address and
// are counted, so the checks can see that an upload would have happened.
export * from '../../src/lib/media-urls.ts';
export const uploads = [];
export const uploadsReady = () => true;
export async function uploadMedia(file) {
  uploads.push(file);
  return { t: file.type === 'video' ? 'video' : 'image', url: `https://res.cloudinary.com/test/${file.type}/upload/v1/emulator-${uploads.length}.jpg`, w: 10, h: 10 };
}
