// Media entries and Cloudinary addresses (the original app's rules: Cloudinary URLs only).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const { cleanMedia, MAX_MEDIA, optimized, poster, safeUrl } = await import('@/lib/media-urls');
const url = 'https://res.cloudinary.com/demo/image/upload/v1/sample.jpg';

describe('media addresses', () => {
  it('accepts only Cloudinary addresses', () => {
    assert.equal(safeUrl(url), true);
    assert.equal(safeUrl('https://example.com/a.jpg'), false);
    assert.equal(safeUrl('file:///a.jpg'), false);
    assert.equal(safeUrl(undefined), false);
  });
  it('keeps at most 3 clean entries, dropping missing sizes and other hosts', () => {
    const items = [{ t: 'image', url, w: 10 }, { t: 'video', url: url.replace('image', 'video') }, { t: 'image', url: 'https://example.com/x.jpg' }, { t: 'image', url }, { t: 'image', url }];
    const clean = cleanMedia(items);
    assert.equal(clean.length, MAX_MEDIA);
    assert.deepEqual(clean[0], { t: 'image', url, w: 10 });
    assert.ok(!('h' in clean[0]));
    assert.ok(clean.every((item) => safeUrl(item.url)));
  });
  it('asks Cloudinary for resized images and video stills', () => {
    assert.equal(optimized(url, 400), 'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_400/v1/sample.jpg');
    assert.match(poster('https://res.cloudinary.com/demo/video/upload/v1/clip.mp4'), /\/upload\/so_0,f_jpg,q_auto,w_800\/v1\/clip\.jpg$/);
  });
});
