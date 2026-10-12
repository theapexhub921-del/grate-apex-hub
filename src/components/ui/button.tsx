import type { ReactNode } from 'react';
import { ActivityIndicator, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { Text } from '@/components/ui/text';

import { Icon, type IconName } from '@/components/ui/icon';
import { Interactive } from '@/components/ui/interactive';
import { webStyle } from '@/components/ui/web';
import { cssTransition, MOTION } from '@/constants/motion';
import type { ThemeColors } from '@/constants/theme';
import { useExperience } from '@/hooks/use-experience';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'gold' | 'danger' | 'apex';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  // Trailing glyph: an icon name, or the legacy strings '→' / '⚡'
  // (rendered as the matching GRATEAPEX icon).
  trailing?: string;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  shortcut?: string; // keyboard hint shown on web, e.g. "Enter"
};

const TRAILING_ICONS: Record<string, IconName> = { '→': 'arrowRight', '⚡': 'challenge', '›': 'chevronRight' };

// Tactile buttons: a soft top sheen and inner highlight on filled
// variants, a small lift on hover, and a press that settles in.
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  icon,
  trailing,
  fullWidth,
  style,
  accessibilityLabel,
  accessibilityHint,
  shortcut,
}: ButtonProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const textColor =
    variant === 'primary'
      ? colors.onPrimary
      : variant === 'gold' || variant === 'apex'
        ? '#0A1F5C'
        : variant === 'danger'
          ? '#FFFFFF'
          : colors.text;
  const trailingIcon = trailing ? (TRAILING_ICONS[trailing] ?? (trailing as IconName)) : null;
  const iconSize = size === 'sm' ? 15 : size === 'lg' ? 19 : 17;
  const filled = variant === 'primary' || variant === 'gold' || variant === 'apex' || variant === 'danger';
  const inactive = Boolean(disabled) && !loading;
  const labelColor = inactive ? colors.textTertiary : textColor;

  // The original app's pill buttons (ui.tsx): a soft gradient of the button's
  // colour, fully rounded. The Originals uses them for every button; Hybrid for
  // the filled (main) actions only, keeping this app's lift and shadow.
  const experience = useExperience();
  const originals = experience === 'originals';
  const pill = originals || (experience === 'hybrid' && filled);
  const pillColor = variant === 'primary' ? colors.primary : variant === 'gold' || variant === 'apex' ? colors.accent : variant === 'danger' ? colors.error : null;
  const pillStyle = pill
    ? [
        styles.pill,
        originals && styles[`pill_${size}` as const],
        pillColor && !inactive ? { backgroundColor: pillColor, ...webStyle({ backgroundImage: `linear-gradient(90deg, ${pillColor}, ${softEnd(pillColor)})` }) } : null,
        originals && !filled && (variant === 'secondary' ? styles.pillSecondary : styles.pillGhost),
        originals && styles.pillFlat,
        originals && inactive && styles.pillOff,
      ]
    : null;
  const legacyLabel = originals && !filled ? { color: inactive ? colors.textTertiary : colors.textSecondary } : null;

  return (
    <Interactive
      onPress={onPress}
      disabled={disabled || loading}
      dimDisabled={false}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      style={({ hovered, pressed }) => [
        styles.base,
        styles[size],
        styles[variant],
        filled && !inactive && styles.filled,
        inactive && !originals && (filled ? styles.disabledFilled : styles.disabledPlain),
        fullWidth && styles.fullWidth,
        hovered && !inactive && !originals && styles[`${variant}Hover` as const],
        hovered && filled && !inactive && !originals && styles.lift,
        pillStyle,
        // The original's TouchableOpacity: a press only dims the button.
        pressed && (originals ? styles.pillPressed : styles.pressed),
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? <ActivityIndicator size="small" color={textColor} /> : icon}
        <Text style={[styles.label, styles[`${size}Label` as const], { color: labelColor }, originals && styles.pillLabel, legacyLabel]} numberOfLines={2}>
          {label}
        </Text>
        {trailingIcon && !loading ? <Icon name={trailingIcon} size={iconSize} color={labelColor} strokeWidth={2.1} /> : null}
        {shortcut ? (
          <View style={[styles.kbd, { borderColor: textColor }]}>
            <Text style={[styles.kbdText, { color: textColor }]}>{shortcut}</Text>
          </View>
        ) : null}
      </View>
    </Interactive>
  );
}

const SHEEN = 'linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 55%)';

// The original gradient ends on the same colour at 80% ('cc'), when the colour is '#rrggbb'.
const softEnd = (color: string) => (/^#[0-9a-f]{6}$/i.test(color) ? `${color}cc` : color);

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    base: {
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'transparent',
      ...webStyle(cssTransition('transform, background-color, border-color, box-shadow, filter', MOTION.micro)),
    },
    filled: {
      boxShadow: `inset 0px 1px 0px rgba(255, 255, 255, 0.22), 0px 1px 2px ${colors.shadow}, 0px 6px 16px ${colors.shadow}`,
      ...webStyle({ backgroundImage: SHEEN }),
    } as ViewStyle,
    lift: { transform: [{ translateY: -1 }], ...webStyle({ filter: 'brightness(1.04)' }) },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    fullWidth: { alignSelf: 'stretch' },
    sm: { minHeight: 36, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 11 },
    md: { minHeight: 46, paddingHorizontal: 18, paddingVertical: 11 },
    lg: { minHeight: 54, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16 },
    label: { fontWeight: '700', textAlign: 'center', letterSpacing: 0.1 },
    smLabel: { fontSize: 13 },
    mdLabel: { fontSize: 15 },
    lgLabel: { fontSize: 16 },

    primary: { backgroundColor: colors.primary },
    primaryHover: { backgroundColor: colors.primaryPressed },
    secondary: { backgroundColor: colors.surface, borderColor: colors.border, boxShadow: `0px 1px 2px ${colors.shadow}` } as ViewStyle,
    secondaryHover: { borderColor: colors.primaryBorder, backgroundColor: colors.surfaceMuted },
    ghost: { backgroundColor: 'transparent' },
    ghostHover: { backgroundColor: colors.surfaceMuted },
    gold: { backgroundColor: colors.accent },
    goldHover: { boxShadow: 'inset 0px 1px 0px rgba(255,255,255,0.3), 0px 8px 22px rgba(253, 192, 10, 0.35)' } as ViewStyle,
    danger: { backgroundColor: colors.error },
    dangerHover: { opacity: 0.94 },
    apex: { backgroundColor: '#FDC00A' },
    apexHover: { boxShadow: '0px 0px 0px 3px rgba(253, 192, 10, 0.25), 0px 10px 30px rgba(253, 192, 10, 0.4)' } as ViewStyle,
    pressed: { transform: [{ translateY: 0 }, { scale: 0.975 }] },
    // Disabled: a calm neutral surface (never a washed-out brand colour).
    disabledFilled: { backgroundColor: colors.surfaceMuted, borderColor: colors.border, boxShadow: 'none', ...webStyle({ backgroundImage: 'none', cursor: 'not-allowed' }) } as ViewStyle,
    disabledPlain: { opacity: 0.55, ...webStyle({ cursor: 'not-allowed' }) },

    kbd: {
      borderWidth: 1,
      borderRadius: 6,
      paddingHorizontal: 5,
      paddingVertical: 1,
      opacity: 0.6,
      ...webStyle({ display: 'flex' }),
    },
    kbdText: { fontSize: 10, fontWeight: '700' },

    pill: { borderRadius: 999 },
    pill_sm: { minHeight: 0, paddingVertical: 9, paddingHorizontal: 16 },
    pill_md: { minHeight: 0, paddingVertical: 15, paddingHorizontal: 22 },
    pill_lg: { minHeight: 0, paddingVertical: 15, paddingHorizontal: 22 },
    pillFlat: { boxShadow: 'none', borderColor: 'transparent' } as ViewStyle,
    pillGhost: { backgroundColor: 'transparent', ...webStyle({ backgroundImage: 'none' }) } as ViewStyle,
    pillSecondary: { backgroundColor: colors.surface, borderColor: colors.border, ...webStyle({ backgroundImage: 'none' }) } as ViewStyle,
    pillOff: { opacity: 0.5, ...webStyle({ cursor: 'not-allowed' }) } as ViewStyle,
    pillPressed: { opacity: 0.85 },
    pillLabel: { fontWeight: '700', letterSpacing: 0 },
  });
}
