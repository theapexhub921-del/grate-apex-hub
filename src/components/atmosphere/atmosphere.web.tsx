import type { CSSProperties } from 'react';

import { type AtmosphereMood, MOODS, rgba, useAtmospherePalette } from '@/components/atmosphere/config';
import { PageMotifs } from '@/components/atmosphere/page-motifs';

import classes from './atmosphere.module.css';

// The background DNA: two strands that cross every half turn, with base-pair
// rungs drawn only where the strands are apart (never at a crossing), so it
// reads as a double helix rather than a ladder.
const DNA = (() => {
  const mid = 56;
  const amplitude = 40;
  const turn = 96; // one full twist
  const length = 192; // two twists
  const x = (y: number, side: 1 | -1) => mid + side * amplitude * Math.sin((2 * Math.PI * y) / turn);
  const strand = (side: 1 | -1) =>
    Array.from({ length: 49 }, (_, i) => {
      const y = (i * length) / 48;
      return `${i ? 'L' : 'M'}${x(y, side).toFixed(1)} ${(y + 4).toFixed(1)}`;
    }).join('');
  const rungs: string[] = [];
  for (let y = 8; y < length; y += 12) {
    const a = x(y, 1);
    const b = x(y, -1);
    if (Math.abs(a - b) > 24) rungs.push(`M${a.toFixed(1)} ${y + 4}H${b.toFixed(1)}`);
  }
  return { strands: strand(1) + strand(-1), rungs: rungs.join('') };
})();

// Web atmosphere: pure CSS layers (no WebGL, no canvas), so it costs
// almost nothing and never blocks input. Decorative only — hidden from
// assistive technology.
export function Atmosphere({ mood }: { mood: AtmosphereMood }) {
  const { palette, light, key: scheme } = useAtmospherePalette();
  const levels = MOODS[mood];

  const vars = {
    '--atm-base': palette.base,
    '--atm-field-a': rgba(palette.fieldA),
    '--atm-field-b': rgba(palette.fieldB),
    '--atm-field-c': rgba(palette.fieldC),
    '--atm-aurora-a': rgba(palette.auroraA),
    '--atm-aurora-b': rgba(palette.auroraB),
    '--atm-aurora-c': rgba(palette.auroraC),
    '--atm-grid': rgba(palette.grid),
    '--atm-ray': rgba(palette.ray),
    '--atm-gold': rgba(palette.gold),
    '--atm-vignette': rgba(palette.vignette),
    '--atm-grain-blend': palette.grainBlend,
    '--o-fields': levels.fields,
    '--o-aurora': levels.aurora,
    '--o-rays': levels.rays,
    '--o-grid': levels.grid,
    '--o-gold': levels.gold,
    '--o-grain': palette.grain * levels.grain,
    '--o-vignette': levels.vignette,
  } as CSSProperties;

  return (
    <div
      aria-hidden="true"
      className={`${classes.root} ${levels.animate ? classes.animate : ''}`}
      style={vars}
      data-mood={mood}
      data-scheme={scheme}
    >
      <div className={`${classes.layer} ${classes.fields}`} />
      <div className={`${classes.layer} ${classes.aurora}`}>
        <div className={`${classes.blob} ${classes.blobA}`} />
        <div className={`${classes.blob} ${classes.blobB}`} />
        <div className={`${classes.blob} ${classes.blobC}`} />
      </div>
      <div className={`${classes.layer} ${classes.rays}`} />
      <div className={`${classes.layer} ${classes.grid}`} />
      <svg className={classes.doodles} viewBox="0 0 1440 1000" preserveAspectRatio="xMidYMid slice" focusable="false">
          <g fill="none" stroke={light ? '#274BA8' : '#C9D9FF'} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" opacity={0.68}>
            <g transform="translate(92 188) rotate(-12)">
              <circle cx="52" cy="42" r="8" /><circle cx="103" cy="72" r="6" /><circle cx="22" cy="105" r="5" />
              <path d="m58 46 39 23M48 50l-23 49m30-50 14-39m-8 4 12-5" />
              <circle cx="70" cy="8" r="3" /><circle cx="118" cy="92" r="3" />
            </g>
            {/* DNA: a double helix whose rungs always join the two strands. */}
            <g transform="translate(1160 130) rotate(10)">
              <path d={DNA.strands} />
              <path d={DNA.rungs} strokeWidth={2} />
            </g>
            <g transform="translate(260 728) rotate(-8)">
              <path d="M14 18h82l-8 21-9 89a15 15 0 0 1-15 13H46a15 15 0 0 1-15-13l-9-89z" />
              <path d="M30 83c16 9 33-9 56 1m-61-46h58M6 18h98" />
              <circle cx="48" cy="97" r="3" /><circle cx="69" cy="111" r="3" />
            </g>
            {/* Stethoscope: earpieces, the Y-shaped headset, one tube and the chest piece. */}
            <g transform="translate(1000 672) rotate(9)">
              <path d="M22 14c0 30 10 52 34 64M90 14c0 30-10 52-34 64" />
              <path d="M22 14l-6-8M90 14l6-8" />
              <circle cx="14" cy="4" r="3.5" /><circle cx="98" cy="4" r="3.5" />
              <path d="M56 78v24c0 26 22 40 44 34 18-5 24-20 24-36" />
              <circle cx="124" cy="84" r="16" /><circle cx="124" cy="84" r="7" />
            </g>
            <g transform="translate(752 340) rotate(8)">
              <path d="M12 22h94v66H12zM59 22v66M24 39h24m-24 14h24m24-14h18m-18 14h18M20 98h78" />
            </g>
          </g>
          <g fill="#FFD46B" opacity={0.76}>
            <circle cx="252" cy="148" r="5" /><circle cx="1288" cy="332" r="5" />
            <path d="m905 192 4 12 12 4-12 4-4 12-4-12-12-4 12-4z" />
            <path d="m126 596 3 9 9 3-9 3-3 9-3-9-9-3 9-3z" />
            <path d="m1072 882 3 9 9 3-9 3-3 9-3-9-9-3 9-3z" />
          </g>
      </svg>
      <div className={`${classes.layer} ${classes.gold}`} />
      <div className={`${classes.layer} ${classes.grain}`} />
      <div className={`${classes.layer} ${classes.vignette}`} />
      <PageMotifs lively={mood === 'lively' || mood === 'expressive' || mood === 'auth'} />
    </div>
  );
}
