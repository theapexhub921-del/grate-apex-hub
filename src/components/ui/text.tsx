import { forwardRef, useEffect } from 'react';
import {
  Platform,
  Text as RNText,
  TextInput as RNTextInput,
  type TextInputProps,
  type TextProps,
  StyleSheet,
} from 'react-native';

import { experienceFont } from '@/data/experience-style';
import { useExperience } from '@/hooks/use-experience';
import { loadLegacyWebFonts } from '@/lib/web-fonts';

// Text and TextInput for every screen. In Originate they are exactly React
// Native's. In The Originals they apply the original app's font rule
// (Poppins headers, Roboto text, Montserrat subtext, Roboto inputs); in Hybrid
// only the original headings. Web only: the fonts are loaded from Google Fonts
// when an experience needs them, and phones keep their system font.

const FONTS_APPLY = Platform.OS === 'web';

function useExperienceFont(style: TextProps['style'], input: boolean) {
  const experience = useExperience();
  const active = FONTS_APPLY && experience !== 'originate';
  useEffect(() => {
    if (active) loadLegacyWebFonts();
  }, [active]);
  if (!active) return null;
  const flat = (StyleSheet.flatten(style) ?? {}) as { fontSize?: number; fontWeight?: string | number; color?: unknown };
  return experienceFont(experience, flat, input);
}

export const Text = forwardRef<RNText, TextProps>(function Text({ style, ...rest }, ref) {
  const font = useExperienceFont(style, false);
  return <RNText ref={ref} {...rest} style={font ? [style, font] : style} />;
});
// eslint-disable-next-line @typescript-eslint/no-redeclare -- the type of a Text ref, as with React Native's own
export type Text = RNText;

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput({ style, ...rest }, ref) {
  const font = useExperienceFont(style, true);
  return <RNTextInput ref={ref} {...rest} style={font ? [style, font] : style} />;
});
// eslint-disable-next-line @typescript-eslint/no-redeclare -- the type of a TextInput ref (useRef<TextInput>)
export type TextInput = RNTextInput;
