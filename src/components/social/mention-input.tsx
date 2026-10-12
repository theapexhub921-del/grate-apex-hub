import { type Ref, useMemo } from 'react';
import { StyleSheet, type TextInput as RNTextInput, type TextInputProps, View } from 'react-native';
import { Text, TextInput } from '@/components/ui/text';

import { Avatar } from '@/components/ui/avatar';
import { Interactive } from '@/components/ui/interactive';
import { Radius, Type, type ThemeColors } from '@/constants/theme';
import { personName, type SocialPerson } from '@/data/social';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

type MentionInputProps = Omit<TextInputProps, 'value' | 'onChangeText'> & {
  value: string;
  onChangeText: (value: string) => void;
  people: readonly SocialPerson[];
  ref?: Ref<RNTextInput>;
  /** Hide the "@username mentions a friend" hint (compact comment bars). */
  compact?: boolean;
};

/** Text input with friend username suggestions when the learner types @. */
export function MentionInput({ value, onChangeText, people, ref, compact = false, ...inputProps }: MentionInputProps) {
  const colors = useTheme();
  const styles = useThemedStyles(createStyles);
  const query = value.match(/(?:^|\s)@([a-z0-9_]*)$/i)?.[1]?.toLowerCase();
  const suggestions = useMemo(() => {
    if (query === undefined) return [];
    return people
      .filter((person) => person.relationship === 'friends' && person.username?.toLowerCase().startsWith(query))
      .slice(0, 5);
  }, [people, query]);

  function insertMention(username: string) {
    const at = value.lastIndexOf('@');
    if (at < 0) return;
    onChangeText(`${value.slice(0, at)}@${username} `);
  }

  return (
    <View style={styles.wrap}>
      <TextInput ref={ref} {...inputProps} value={value} onChangeText={onChangeText} />
      {suggestions.length ? (
        <View style={styles.suggestions} accessibilityLabel="Mention a friend">
          {suggestions.map((person) => (
            <Interactive key={person.userId} onPress={() => insertMention(person.username!)} accessibilityRole="button" accessibilityLabel={`Mention ${personName(person)}`} style={styles.suggestion}>
              <Avatar uri={person.avatarUrl} name={personName(person)} size={28} />
              <Text style={styles.username}>@{person.username}</Text>
              <Text style={styles.displayName} numberOfLines={1}>{person.displayName ?? ''}</Text>
            </Interactive>
          ))}
        </View>
      ) : query !== undefined && !compact ? (
        <Text style={styles.noSuggestions}>{query ? 'No connected username matches that text.' : 'Type a username to mention a friend.'}</Text>
      ) : null}
      {!compact ? <Text style={styles.hint}><Text style={{ color: colors.primaryText }}>@username</Text> mentions a connected friend.</Text> : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { gap: 6, minWidth: 0 },
    suggestions: { borderWidth: 1, borderColor: colors.border, borderRadius: Radius.md, backgroundColor: colors.surface, overflow: 'hidden' },
    suggestion: { minHeight: 42, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: colors.divider },
    username: { ...Type.caption, fontWeight: '800', color: colors.text },
    displayName: { ...Type.caption, color: colors.textTertiary, flex: 1 },
    noSuggestions: { ...Type.caption, color: colors.textTertiary, paddingHorizontal: 4 },
    hint: { ...Type.caption, color: colors.textTertiary },
  });
}
