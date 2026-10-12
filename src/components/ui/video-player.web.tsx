import type { CSSProperties } from 'react';

import { poster, safeUrl } from '@/lib/media-urls';

// Plays a post or story video inside the app (web): the browser's own player,
// with a still frame from Cloudinary until it starts. Never leaves the app.
export function VideoPlayer({ url, height = 320, autoPlay = false, label = 'Video' }: { url: string; height?: number; autoPlay?: boolean; label?: string }) {
  const style: CSSProperties = { width: '100%', height, borderRadius: 14, backgroundColor: '#000', objectFit: 'contain', display: 'block' };
  return (
    <video
      src={url}
      poster={safeUrl(url) ? poster(url) : undefined}
      controls
      playsInline
      autoPlay={autoPlay}
      preload="metadata"
      aria-label={label}
      style={style}
    />
  );
}
