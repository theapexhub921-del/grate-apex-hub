import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useWindowDimensions } from 'react-native';

import { ATLAS_PAGE, atlasHash, atlasThemeVars } from '@/lib/atlas-theme';
import { useTheme } from '@/hooks/use-theme';

// The 3D skeleton atlas (web): the standalone viewer in public/atlas/skeleton.html, shown
// inside the page and painted with the app's current theme. When the theme changes the
// viewer is re-coloured in place, so what the learner is looking at is not reloaded.
//
// Full screen: the bar above the viewer has a Full screen button. It asks the browser for real
// full screen and, where the browser won't (iPhone Safari), falls back to covering the whole
// page. Esc, or the same button, comes back. The viewer is never reloaded when switching.
export function SkeletonAtlas() {
  const colors = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const frame = useRef<HTMLIFrameElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);
  const vars = useMemo(() => atlasThemeVars(colors), [colors]);

  // The address is fixed on first render: changing it later would reload the viewer.
  const [src] = useState(() => `${ATLAS_PAGE}${atlasHash(vars)}`);

  // Send the current colours to the viewer (when it has loaded, and whenever the theme changes).
  const send = useCallback(() => {
    frame.current?.contentWindow?.postMessage({ type: 'grateapex-theme', vars }, window.location.origin);
  }, [vars]);

  useEffect(() => {
    send();
  }, [send]);

  const enterFull = () => {
    setFull(true);
    void shell.current?.requestFullscreen?.()?.catch(() => {});
  };
  const exitFull = useCallback(() => {
    setFull(false);
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  }, []);

  // While full screen: Esc leaves, the page behind stops scrolling, and leaving real full
  // screen some other way (the browser's own Esc) is noticed.
  useEffect(() => {
    if (!full) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') exitFull();
    };
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) setFull(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [full, exitFull]);

  const height = Math.max(520, Math.min(windowHeight - 180, 860));

  const shellStyle: CSSProperties = full
    ? {
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        background: colors.background,
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }
    : {
        display: 'flex',
        flexDirection: 'column',
        height,
        borderRadius: 20,
        overflow: 'hidden',
        border: `1px solid ${colors.border}`,
        background: colors.background,
      };

  const bar: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '6px 10px 6px 14px',
    background: colors.surface,
    borderBottom: `1px solid ${colors.border}`,
    flex: 'none',
  };

  const button: CSSProperties = {
    minHeight: 36,
    padding: '0 14px',
    borderRadius: 10,
    border: `1px solid ${colors.border}`,
    background: colors.surfaceElevated,
    color: colors.text,
    font: 'inherit',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  };

  return (
    <div ref={shell} style={shellStyle}>
      <div style={bar}>
        <span style={{ color: colors.text, fontSize: 14, fontWeight: 700 }}>Skeleton atlas</span>
        <button
          type="button"
          style={button}
          onClick={full ? exitFull : enterFull}
          aria-label={full ? 'Exit full screen' : 'View atlas full screen'}
        >
          {full ? 'Exit full screen' : 'Full screen'}
        </button>
      </div>
      <iframe
        ref={frame}
        src={src}
        title="3D skeleton atlas"
        onLoad={send}
        allow="fullscreen"
        style={{ flex: 1, minHeight: 0, width: '100%', border: 0, display: 'block' }}
      />
    </div>
  );
}
