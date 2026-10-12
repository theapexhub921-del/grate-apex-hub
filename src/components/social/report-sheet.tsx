import { useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Interactive } from '@/components/ui/interactive';
import { Sheet } from '@/components/ui/sheet';
import { Text, TextInput } from '@/components/ui/text';
import { Type, type ThemeColors } from '@/constants/theme';
import { reportCommunityContent } from '@/data/community';
import { CONTACT_EMAIL } from '@/lib/contact';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

// Report a post, comment or person: the usual reasons, or the learner's own
// words. The report is saved privately for the team (supportTickets, which
// admins read) and a ready-to-send email to the team opens with it.
// "Not interested" only hides the post for this learner.

export type ReportTarget = { type: 'post' | 'comment' | 'user'; id: string; label: string };

export const REPORT_REASONS = [
  { id: 'not-interested', label: 'Not interested', detail: 'Hide this from my feed' },
  { id: 'spam', label: 'Spam', detail: 'Repeated, misleading or unwanted content' },
  { id: 'harassment', label: 'Harassment or bullying', detail: 'Targets or insults someone' },
  { id: 'hate', label: 'Hate speech or symbols', detail: 'Attacks people for who they are' },
  { id: 'sexual', label: 'Nudity or sexual content', detail: '' },
  { id: 'violence', label: 'Violence or dangerous acts', detail: '' },
  { id: 'self-harm', label: 'Self-harm or suicide', detail: 'Someone may need help' },
  { id: 'false-info', label: 'False information', detail: 'Wrong medical or study information' },
  { id: 'scam', label: 'Scam or fraud', detail: '' },
  { id: 'ip', label: 'Copyright or someone else’s work', detail: '' },
  { id: 'other', label: 'Something else', detail: 'Tell us in your own words' },
] as const;

export type ReportReasonId = (typeof REPORT_REASONS)[number]['id'];

/** The email the team receives (subject and body), as plain text. */
export function reportEmail(target: ReportTarget, reason: string, details: string, reporter: string) {
  const subject = `GrAte Apex Hub report: ${reason}`;
  const body = [`Reported ${target.type}: ${target.label}`, `Reference: ${target.type} ${target.id}`, `Reason: ${reason}`, details ? `Details: ${details}` : '', `Reported by: ${reporter}`, `When: ${new Date().toISOString()}`]
    .filter(Boolean)
    .join('\n');
  return { subject, body, mailto: `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` };
}

function openEmail(mailto: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.location.href = mailto;
    return;
  }
  void Linking.openURL(mailto).catch(() => {});
}

export function ReportSheet({
  target,
  reporter,
  onClose,
  onHide,
  onDone,
}: {
  target: ReportTarget | null;
  reporter: string;
  onClose: () => void;
  /** "Not interested": hide the post for this learner. */
  onHide?: (target: ReportTarget) => void;
  onDone: (message: string) => void;
}) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const [reason, setReason] = useState<ReportReasonId | null>(null);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setReason(null);
    setDetails('');
    setError(null);
  };
  const close = () => {
    if (busy) return;
    reset();
    onClose();
  };

  async function submit() {
    if (!target || !reason) return;
    const chosen = REPORT_REASONS.find((item) => item.id === reason)!;
    if (reason === 'not-interested') {
      onHide?.(target);
      reset();
      onDone('Hidden. You won’t see this post in your feed.');
      return;
    }
    const text = details.trim();
    if (reason === 'other' && text.length < 5) {
      setError('Please describe the problem in a few words.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await reportCommunityContent(target.type, target.id, `${chosen.label}${text ? ` — ${text}` : ''}`);
      const email = reportEmail(target, chosen.label, text, reporter);
      reset();
      onDone('Thanks. Your report was sent privately to the team. Your email app opens with a copy to send to the team.');
      openEmail(email.mailto);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The report could not be sent. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      visible={Boolean(target)}
      onClose={close}
      title="Report"
      subtitle={target ? `Why are you reporting this ${target.type}?` : undefined}
      footer={
        <View style={styles.actions}>
          <Button label="Cancel" variant="ghost" onPress={close} disabled={busy} />
          <Button label={reason === 'not-interested' ? 'Hide' : 'Send report'} onPress={() => void submit()} loading={busy} disabled={!reason} />
        </View>
      }
    >
      <View style={styles.list} accessibilityRole="radiogroup">
        {REPORT_REASONS.filter((item) => item.id !== 'not-interested' || target?.type === 'post').map((item) => {
          const selected = reason === item.id;
          return (
            <Interactive
              key={item.id}
              onPress={() => setReason(item.id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              style={[styles.reason, selected && styles.reasonOn]}
            >
              <View style={styles.flex}>
                <Text style={styles.reasonLabel}>{item.label}</Text>
                {item.detail ? <Text style={styles.reasonDetail}>{item.detail}</Text> : null}
              </View>
              <View style={[styles.radio, selected && { borderColor: colors.primary }]}>{selected ? <View style={[styles.dot, { backgroundColor: colors.primary }]} /> : null}</View>
            </Interactive>
          );
        })}
      </View>
      {reason && reason !== 'not-interested' ? (
        <View style={styles.writeWrap}>
          <Text style={styles.writeLabel}>{reason === 'other' ? 'Your report' : 'Anything else? (optional)'}</Text>
          <TextInput
            value={details}
            onChangeText={setDetails}
            placeholder="Write what happened, in your own words."
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={600}
            style={styles.input}
            accessibilityLabel="Your report"
          />
        </View>
      ) : null}
      {error ? (
        <View style={styles.errorRow}>
          <Icon name="warning" size={14} color={colors.error} />
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}
    </Sheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    list: { gap: 6 },
    reason: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    reasonOn: { borderColor: colors.primary, backgroundColor: colors.primarySubtle },
    reasonLabel: { ...Type.headline, fontSize: 14.5, color: colors.text },
    reasonDetail: { fontSize: 12.5, color: colors.textSecondary, marginTop: 1 },
    radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
    dot: { width: 10, height: 10, borderRadius: 5 },
    writeWrap: { gap: 6, marginTop: 12 },
    writeLabel: { fontSize: 13, fontWeight: '700', color: colors.text },
    input: { minHeight: 90, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, color: colors.text, padding: 12, fontSize: 15, textAlignVertical: 'top' },
    errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
    error: { fontSize: 13, color: colors.error },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  });
}
