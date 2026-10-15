import { useEffect, useMemo, useRef } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { ATLAS_PAGE, atlasHash, atlasThemeVars } from '@/lib/atlas-theme';
import { useTheme } from '@/hooks/use-theme';

// The 3D skeleton atlas (web): the standalone viewer in public/atlas/skeleton.html, shown
// inside the page and painted with the app's current theme. When the theme changes the
// viewer is re-coloured in place, so what the learner is looking at is not reloaded.
export function SkeletonAtlas() {
  const colors = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const frame = useRef<HTMLIFrameElement>(null);
  const vars = useMemo(() => atlasThemeVars(colors), [colors]);

  // The address is fixed on first render: changing it later would reload the viewer.
  const firstVars = useRef(vars);
  const src = useMemo(() => `${ATLAS_PAGE}${atlasHash(firstVars.current)}`, []);

  const send = () => {
    frame.current?.contentWindow?.postMessage({ type: 'grateapex-theme', vars }, window.location.origin);
  };

  useEffect(send, [vars]); // eslint-disable-line react-hooks/exhaustive-deps

  const height = Math.max(520, Math.min(windowHeight - 180, 860));

  return (
    <View
      style={{
        height,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.background,
      }}
    >
      <iframe
        ref={frame}
        src={src}
        title="3D skeleton atlas"
        onLoad={send}
        allow="fullscreen"
        style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
      />
    </View>
  );
}
