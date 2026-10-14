import type { CSSProperties } from 'react';
import { useEffect, useRef } from 'react';

import { poster, safeUrl } from '@/lib/media-urls';

// Plays a post or story video inside the app (web): the browser's own player,
// with a still frame from Cloudinary until it starts. Never leaves the app.
//
// Story mode (`bare`): no controls and no rounded corners; the viewer pauses it,
// and `onProgress` reports how far through the video it is (0 to 1).
export function VideoPlayer({
  url,
  height = 320,
  autoPlay = false,
  label = 'Video',
  onEnded,
  bare = false,
  paused = false,
  onProgress,
}: {
  url: string;
  height?: number | `${number}%`;
  autoPlay?: boolean;
  label?: string;
  onEnded?: () => void;
  bare?: boolean;
  paused?: boolean;
  onProgress?: (share: number) => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const style: CSSProperties = { width: '100%', height, borderRadius: bare ? 0 : 14, backgroundColor: '#000', objectFit: 'contain', display: 'block' };

  useEffect(() => {
    const video = ref.current;
    if (!video || !bare) return;
    if (paused) {
      video.pause();
      return;
    }
    void video.play().catch(() => {
      // Some browsers only allow silent autoplay.
      video.muted = true;
      void video.play().catch(() => undefined);
    });
  }, [paused, bare, url]);

  return (
    <video
      ref={ref}
      src={url}
      poster={safeUrl(url) ? poster(url) : undefined}
      controls={!bare}
      playsInline
      autoPlay={autoPlay}
      preload={bare ? 'auto' : 'metadata'}
      aria-label={label}
      onEnded={onEnded}
      onTimeUpdate={onProgress ? (event) => {
        const video = event.currentTarget;
        if (video.duration > 0) onProgress(video.currentTime / video.duration);
      } : undefined}
      style={style}
    />
  );
}
