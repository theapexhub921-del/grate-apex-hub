import Svg, { Path } from 'react-native-svg';

import { useVerifiedTier, verifiedTierOf } from '@/data/verified';

// The verified tick (X-style scalloped badge with a check): gold or blue.
// These are badge colours, the same on every theme (like X).
const TIER_COLORS = {
  gold: { fill: '#F4B400', stroke: '#C98A00' },
  blue: { fill: '#1D9BF0', stroke: '#1A7FC4' },
} as const;

export function VerifiedBadge({ username, uid, size = 16 }: { username?: string | null; uid?: string | null; size?: number }) {
  const byList = verifiedTierOf(username);
  const byUid = useVerifiedTier(byList === 'gold' ? null : uid);
  const tier = byList === 'gold' ? 'gold' : byUid === 'gold' ? 'gold' : byList ?? byUid;
  if (!tier) return null;
  const colors = TIER_COLORS[tier];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityLabel={tier === 'gold' ? 'Verified (gold)' : 'Verified'} accessibilityRole="image">
      <Path
        d="M12 1.6l2.3 1.7 2.8-.3 1.1 2.6 2.6 1.1-.3 2.8 1.7 2.3-1.7 2.3.3 2.8-2.6 1.1-1.1 2.6-2.8-.3L12 22.4l-2.3-1.7-2.8.3-1.1-2.6-2.6-1.1.3-2.8L1.6 12l1.7-2.3-.3-2.8 2.6-1.1L6.7 3.2l2.8.3z"
        fill={colors.fill}
        stroke={colors.stroke}
        strokeWidth={0.6}
      />
      <Path d="m7.6 12.2 3 3 5.8-6" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
