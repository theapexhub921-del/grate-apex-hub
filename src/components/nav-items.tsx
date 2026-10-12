import { Icon, type IconName } from '@/components/ui/icon';

// The five GRATEAPEX destinations, in one place.
//
// Mobile uses these for the floating bottom tab bar; desktop uses the same
// list for the left navigation rail. Keeping one source means the two
// navigations can never drift apart, and the five-tab identity stays fixed.
//
// Keep five stable top-level destinations; Study (/learn) contains the deeper course,
// review, quiz and progress routes.

export type NavItem = {
  /** Expo Router route name used by <Tabs.Screen name="…" />. */
  route: string;
  /** Public label shown to the learner. */
  label: string;
  /** Path used for navigation and for the active-route check. */
  path: string;
  icon: IconName;
  accessibilityLabel: string;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { route: 'index', label: 'Feed', path: '/', icon: 'home', accessibilityLabel: 'Feed — your command centre' },
  { route: 'learn/index', label: 'Study', path: '/learn', icon: 'learn', accessibilityLabel: 'Study — subjects and lectures' },
  { route: 'social/index', label: 'Connect', path: '/social', icon: 'social', accessibilityLabel: 'Connect — your people and social activity' },
  { route: 'explore', label: 'Explore', path: '/explore', icon: 'explore', accessibilityLabel: 'Explore — discovery and the GrAte Apex Hub journey' },
  { route: 'profile', label: 'You', path: '/profile', icon: 'profile', accessibilityLabel: 'You — your academic identity' },
];

/** Phone tab order, with Study as the raised center destination. */
export const MOBILE_NAV_ITEMS: readonly NavItem[] = [
  NAV_ITEMS[0], // Feed
  NAV_ITEMS[2], // Connect
  NAV_ITEMS[1], // Study
  NAV_ITEMS[3], // Explore
  NAV_ITEMS[4], // You
];

// Which destination owns a path: '/learn/lesson' belongs to Study,
// '/social/friends' to Connect. Settings and Progress belong to none.
export function activeNavPath(pathname: string): string | null {
  if (pathname === '/' || pathname === '') return '/';
  const match = NAV_ITEMS.find((item) => item.path !== '/' && (pathname === item.path || pathname.startsWith(`${item.path}/`)));
  return match ? match.path : null;
}

/** Renders a nav icon at the given size and tint. */
export function NavIconView({
  icon,
  color,
  size,
  active = false,
}: {
  icon: IconName;
  color: string;
  size: number;
  active?: boolean;
}) {
  return <Icon name={icon} color={color} size={size} filled={active} strokeWidth={active ? 2 : 1.8} />;
}
