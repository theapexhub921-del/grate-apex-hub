import Svg, { Circle, Path } from 'react-native-svg';

// The original app's outline icons (old-reference/src/Icon.tsx), unchanged.
// `compass` is added in the same Feather style for Explore, which the original
// app did not have.
const P = {
  home: ['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10'],
  trophy: ['M8 21h8', 'M12 17v4', 'M7 4h10v5a5 5 0 0 1-10 0z', 'M7 6H4v1a3 3 0 0 0 3 3', 'M17 6h3v1a3 3 0 0 1-3 3'],
  book: ['M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z', 'M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z'],
  chat: ['M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z'],
  user: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'],
  bell: ['M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9', 'M13.73 21a2 2 0 0 1-3.46 0'],
  search: ['M21 21l-4.35-4.35'],
  compass: ['M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z'],
} as const;
const C: Partial<Record<keyof typeof P, readonly (readonly [number, number, number])[]>> = {
  user: [[12, 7, 4]],
  search: [[11, 11, 8]],
  compass: [[12, 12, 10]],
};

export type LegacyIconName = keyof typeof P;

export function LegacyIcon({ name, size = 22, color = '#fff', stroke = 2 }: { name: LegacyIconName; size?: number; color?: string; stroke?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      {P[name].map((d, i) => (
        <Path key={i} d={d} fill="none" />
      ))}
      {(C[name] ?? []).map(([cx, cy, r], i) => (
        <Circle key={`c${i}`} cx={cx} cy={cy} r={r} />
      ))}
    </Svg>
  );
}

/** The original app's icons and emoji for this app's five destinations. */
export const LEGACY_NAV: Record<string, { icon: LegacyIconName; emoji: string }> = {
  '/': { icon: 'home', emoji: '🏠' },
  '/social': { icon: 'chat', emoji: '💬' },
  '/learn': { icon: 'book', emoji: '📚' },
  '/explore': { icon: 'compass', emoji: '🧭' },
  '/profile': { icon: 'user', emoji: '👤' },
};
