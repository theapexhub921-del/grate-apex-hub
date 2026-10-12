import { type ReactNode, useState } from 'react';
import {
  type AccessibilityRole,
  type AccessibilityState,
  Pressable,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

import { useKeyboardModality, webStyle } from '@/components/ui/web';
import { cssTransition, MOTION } from '@/constants/motion';
import { elevation, Radius, type ThemeColors } from '@/constants/theme';
import { type ExperienceId } from '@/data/experience';
import { useExperience } from '@/hooks/use-experience';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

// The GRATEAPEX interaction language, shared by every clickable surface:
//   hover    — slight lift + stronger border (pointer devices only)
//   pressed  — settles back down (touch gets the same feedback)
//   focus    — visible ring for keyboard users
//   cursor   — pointer on web; disabled surfaces are dimmed
// Screens use <PressableCard> / <Button> instead of styling their own.

export type InteractiveState = { hovered: boolean; pressed: boolean; focused: boolean };

type InteractiveProps = {
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;
  style?: StyleProp<ViewStyle> | ((state: InteractiveState) => StyleProp<ViewStyle>);
  children: ReactNode | ((state: InteractiveState) => ReactNode);
  testID?: string;
  nativeID?: string;
  // false: the caller draws its own disabled look (e.g. Button).
  dimDisabled?: boolean;
};

export function Interactive({
  onPress,
  onLongPress,
  disabled,
  accessibilityLabel,
  accessibilityRole = 'button',
  accessibilityHint,
  accessibilityState,
  style,
  children,
  testID,
  nativeID,
  dimDisabled = true,
}: InteractiveProps) {
  const colors = useTheme();
  const keyboard = useKeyboardModality();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onLongPress={disabled ? undefined : onLongPress}
      disabled={disabled}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(disabled), ...accessibilityState }}
      testID={testID}
      nativeID={nativeID}
      style={({ pressed }) => {
        const state = { hovered: hovered && !disabled, pressed: pressed && !disabled, focused: focused && keyboard };
        const custom = typeof style === 'function' ? style(state) : style;
        return [
          webStyle({ cursor: disabled ? 'default' : 'pointer', outlineStyle: 'none', WebkitTapHighlightColor: 'transparent' }),
          custom,
          state.focused && {
            ...webStyle({
              outlineStyle: 'solid',
              outlineWidth: 2,
              outlineColor: colors.focusRing,
              outlineOffset: 2,
            }),
          },
          disabled && dimDisabled && { opacity: 0.45 },
        ];
      }}
    >
      {({ pressed }) => {
        const state = { hovered: hovered && !disabled, pressed: pressed && !disabled, focused: focused && keyboard };
        return typeof children === 'function' ? children(state) : children;
      }}
    </Pressable>
  );
}

// Card tones — one family, different jobs:
//   surface   resting content card (default)
//   elevated  heroes and anything that should float above its neighbours
//   muted     quiet grouping inside a page section
//   primary   selected / informational (brand-tinted)
//   insight   learning insight or tip (info-tinted)
//   reward    XP, rank, achievements (gold-tinted)
//   outline   placeholder or "coming soon"
export type CardTone = 'surface' | 'elevated' | 'muted' | 'primary' | 'insight' | 'reward' | 'outline';

// A static card surface.
export function Card({
  children,
  style,
  tone = 'surface',
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: CardTone;
}) {
  const styles = useThemedStyles(createStyles);
  const experience = useExperience();
  return <View style={[styles.card, styles[tone], experienceCard(styles, experience, tone), style]}>{children}</View>;
}

// A card that is one tap target (navigation cards, lesson rows…).
export function PressableCard({
  children,
  onPress,
  style,
  disabled,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
  tone = 'surface',
  lift = true,
}: {
  children: ReactNode | ((state: InteractiveState) => ReactNode);
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  tone?: CardTone;
  lift?: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const experience = useExperience();
  const originals = experience === 'originals';
  return (
    <Interactive
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole={accessibilityRole}
      style={({ hovered, pressed }) => [
        styles.card,
        styles[tone],
        styles.pressable,
        experienceCard(styles, experience, tone),
        // The original app's Hover: gold border and a 1px lift; a press dims it.
        hovered && (originals ? styles.legacyHovered : styles.hovered),
        hovered && lift && !originals && styles.lifted,
        pressed && (originals ? styles.legacyPressed : styles.pressed),
        style,
      ]}
    >
      {children}
    </Interactive>
  );
}

type CardStyles = ReturnType<typeof createStyles>;

// The Originals: every card is the original app's frosted "glass" Panel
// (ui.tsx: card colour, 1px border, radius 22, no shadow); tones keep their
// meaning through the border only. Hybrid: the same glass, blurred, on this
// app's elevation.
function experienceCard(styles: CardStyles, experience: ExperienceId, tone: CardTone) {
  if (experience === 'originate') return null;
  if (experience === 'hybrid') return styles.hybridGlass;
  return [styles.legacyPanel, tone === 'primary' || tone === 'insight' ? styles.legacyPrimary : tone === 'reward' ? styles.legacyReward : tone === 'outline' ? styles.legacyOutline : null];
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.hairline,
    },
    surface: { ...elevation(colors, 1) },
    elevated: { backgroundColor: colors.surfaceElevated, ...elevation(colors, 2) },
    muted: { backgroundColor: colors.surfaceMuted, borderColor: 'transparent' },
    primary: { backgroundColor: colors.primarySubtle, borderColor: colors.primaryBorder },
    insight: { backgroundColor: colors.infoSubtle, borderColor: colors.primaryBorder },
    reward: { backgroundColor: colors.accentSubtle, borderColor: colors.accent + '55', ...elevation(colors, 1) },
    outline: { backgroundColor: 'transparent', borderColor: colors.border, borderStyle: 'dashed' },
    pressable: {
      ...webStyle(cssTransition('transform, box-shadow, border-color, background-color', MOTION.standard)),
    },
    hovered: { borderColor: colors.primaryBorder },
    lifted: { transform: [{ translateY: -2 }], ...elevation(colors, 2) },
    pressed: { transform: [{ translateY: 0 }, { scale: 0.99 }] },

    legacyPanel: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 22, boxShadow: 'none' } as ViewStyle,
    legacyPrimary: { borderColor: colors.primary },
    legacyReward: { borderColor: colors.accent },
    legacyOutline: { backgroundColor: 'transparent', borderStyle: 'dashed' },
    legacyHovered: { borderColor: colors.accent, transform: [{ translateY: -1 }] },
    legacyPressed: { opacity: 0.85 },
    hybridGlass: {
      borderRadius: 22,
      ...webStyle({ backdropFilter: 'blur(16px) saturate(140%)', WebkitBackdropFilter: 'blur(16px) saturate(140%)' }),
    } as ViewStyle,
  });
}
