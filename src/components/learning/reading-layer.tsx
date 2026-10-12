import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';

import { FigureExplorer } from '@/components/learning/figure-view';
import { PathwaySteps } from '@/components/pathway-steps';
import { Icon, type IconName } from '@/components/ui/icon';
import { Card } from '@/components/ui/interactive';
import type { ThemeColors } from '@/constants/theme';
import type { Lesson, LessonChunk, LessonChunkKind, LessonNote } from '@/data/lesson-types';
import { describeSourceRefs, describeTextbookRefs } from '@/data/source-labels';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

// Layer 2 of a lesson: the structured reading / revision summary, built
// from the lecture material. Useful on its own when a learner comes back
// to revise: key ideas, definitions, pathways, comparisons, high-yield
// points, common confusions — and where each statement comes from.

const NOTE_TITLES: Record<LessonNote['kind'], string> = {
  check: 'CHECK WITH YOUR LECTURER',
  clarified: 'CLARIFIED — THE SLIDES DISAGREE',
  textbook: 'TEXTBOOK EXPLANATION',
  annotation: 'ADDED TO THE SLIDES LATER — NOT LECTURE TEXT',
  supplementary: 'SUPPLEMENTARY — NOT IN THE LECTURE',
  lecturer: 'LECTURER EMPHASIS',
};

const KIND_ICON: Record<LessonChunkKind, IconName> = {
  overview: 'explore',
  definitions: 'book',
  pathway: 'reinforce',
  mechanism: 'settings',
  structure: 'grid',
  regulation: 'filter',
  comparison: 'chart',
  clinical: 'physiology',
  classification: 'course',
};

export function ReadingLayer({ lesson }: { lesson: Lesson }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();

  return (
    <View style={styles.reading}>
      {lesson.chunks.map((chunk, index) => (
        <ReadingSection key={`${chunk.title}-${index}`} chunk={chunk} index={index} total={lesson.chunks.length} />
      ))}

      {lesson.highYield && lesson.highYield.length > 0 ? (
        <Card style={styles.highYield}>
          <View style={styles.kickerRow}>
            <Icon name="xp" size={14} color={colors.accentText} filled />
            <Text style={styles.highYieldTitle}>HIGH-YIELD</Text>
          </View>
          {lesson.highYield.map((point, index) => (
            <View key={index} style={styles.bulletRow}>
              <View style={[styles.bulletDot, styles.goldDot]} />
              <Text style={styles.bulletText}>{point}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      {lesson.confusions && lesson.confusions.length > 0 ? (
        <Card style={styles.confusions}>
          <Text style={styles.sectionKicker}>COMMON CONFUSIONS</Text>
          {lesson.confusions.map((item, index) => (
            <View key={index} style={styles.confusion}>
              <Text style={styles.confusionWrong}>✗ {item.confusion}</Text>
              <Text style={styles.confusionRight}>✓ {item.clarification}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      {lesson.summary && lesson.summary.length > 0 ? (
        <Card tone="primary" style={styles.summary}>
          <Text style={styles.summaryTitle}>KEY POINTS TO REMEMBER</Text>
          {lesson.summary.map((point, index) => (
            <View key={index} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>{point}</Text>
            </View>
          ))}
        </Card>
      ) : null}
    </View>
  );
}

function ReadingSection({ chunk, index, total }: { chunk: LessonChunk; index: number; total: number }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const lectureSource = chunk.sourceRefs ? describeSourceRefs(chunk.sourceRefs) : '';
  const textbookSource = chunk.sourceRefs ? describeTextbookRefs(chunk.sourceRefs) : '';

  return (
    <Card style={styles.section}>
      <View style={styles.kickerRow}>
        {chunk.kind ? <Icon name={KIND_ICON[chunk.kind]} size={14} color={colors.textTertiary} /> : null}
        <Text style={styles.sectionKicker}>
          PART {index + 1} OF {total}
          {chunk.origin === 'textbook' ? ' · TEXTBOOK EXPLANATION' : ''}
        </Text>
      </View>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {chunk.title}
      </Text>

      {chunk.paragraphs?.map((paragraph, i) => (
        <Text key={i} style={styles.paragraph}>
          {paragraph}
        </Text>
      ))}

      {chunk.steps ? <PathwaySteps steps={chunk.steps} /> : null}

      {chunk.figure ? <FigureExplorer figureId={chunk.figure} /> : null}

      {chunk.terms ? (
        <View style={styles.terms}>
          {chunk.terms.map((term) => (
            <View key={term.term} style={styles.term}>
              <Text style={styles.termName}>{term.term}</Text>
              <Text style={styles.termMeaning}>{term.meaning}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {chunk.table ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tableScroll}>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHead]}>
              {chunk.table.columns.map((column, i) => (
                <Text key={i} style={[styles.tableCell, styles.tableHeadText, i === 0 && styles.tableFirst]}>
                  {column}
                </Text>
              ))}
            </View>
            {chunk.table.rows.map((row, r) => (
              <View key={r} style={[styles.tableRow, r % 2 === 1 && styles.tableStripe]}>
                {row.map((cell, i) => (
                  <Text key={i} style={[styles.tableCell, i === 0 && styles.tableFirst]}>
                    {cell}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      ) : null}

      {chunk.keyPoints ? (
        <View style={styles.keyPoints}>
          <Text style={styles.keyPointsTitle}>REMEMBER</Text>
          {chunk.keyPoints.map((point, i) => (
            <View key={i} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>{point}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {chunk.notes?.map((note, i) => (
        <View
          key={i}
          style={[
            styles.note,
            note.kind === 'check' ? styles.noteCheck : note.kind === 'lecturer' ? styles.noteLecturer : styles.noteNeutral,
          ]}
        >
          <Text
            style={[
              styles.noteTitle,
              note.kind === 'check' ? styles.noteTitleCheck : note.kind === 'lecturer' ? styles.noteTitleLecturer : styles.noteTitleNeutral,
            ]}
          >
            {NOTE_TITLES[note.kind]}
          </Text>
          <Text style={styles.noteText}>{note.text}</Text>
        </View>
      ))}

      {lectureSource || textbookSource ? (
        <Text style={styles.sourceLine}>
          Source: {[lectureSource, textbookSource].filter(Boolean).join(' · ')}
        </Text>
      ) : null}
    </Card>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    reading: { gap: 14 },
    section: { gap: 4 },
    kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    sectionKicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.1, color: colors.textTertiary },
    sectionTitle: { fontSize: 21, fontWeight: '800', lineHeight: 28, color: colors.text, marginBottom: 10 },
    paragraph: { fontSize: 16, lineHeight: 26, color: colors.textSecondary, marginBottom: 12 },
    terms: { gap: 10, marginBottom: 10 },
    term: { borderLeftWidth: 3, borderLeftColor: colors.primary, paddingLeft: 12 },
    termName: { fontSize: 15, fontWeight: '800', color: colors.text },
    termMeaning: { fontSize: 15, lineHeight: 22, color: colors.textSecondary, marginTop: 1 },
    tableScroll: { flexGrow: 1 },
    table: {
      minWidth: '100%',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      marginBottom: 12,
    },
    tableRow: { flexDirection: 'row' },
    tableHead: { backgroundColor: colors.surfaceMuted },
    tableStripe: { backgroundColor: colors.background },
    tableCell: {
      flex: 1,
      minWidth: 130,
      paddingVertical: 9,
      paddingHorizontal: 10,
      fontSize: 13,
      lineHeight: 19,
      color: colors.textSecondary,
      borderRightWidth: 1,
      borderRightColor: colors.divider,
    },
    tableFirst: { fontWeight: '700', color: colors.text },
    tableHeadText: { fontWeight: '800', color: colors.text },
    keyPoints: { backgroundColor: colors.primarySubtle, borderRadius: 14, padding: 14, marginTop: 2, marginBottom: 8 },
    keyPointsTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: colors.primaryText, marginBottom: 8 },
    bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
    bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primaryText, marginTop: 9, marginRight: 10 },
    goldDot: { backgroundColor: colors.accent },
    bulletText: { flex: 1, fontSize: 15, lineHeight: 23, color: colors.text },
    note: { borderRadius: 14, borderWidth: 1, padding: 14, marginTop: 8 },
    noteCheck: { backgroundColor: colors.warningSubtle, borderColor: colors.warningBorder },
    noteLecturer: { backgroundColor: colors.accentSubtle, borderColor: colors.accent },
    noteNeutral: { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
    noteTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
    noteTitleCheck: { color: colors.warningStrong },
    noteTitleLecturer: { color: colors.accentText },
    noteTitleNeutral: { color: colors.textTertiary },
    noteText: { fontSize: 13, lineHeight: 20, color: colors.textSecondary },
    sourceLine: { fontSize: 11, lineHeight: 16, color: colors.textTertiary, marginTop: 10 },
    highYield: { borderColor: colors.accent, gap: 2 },
    highYieldTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1.1, color: colors.accentText },
    confusions: { gap: 8 },
    confusion: { gap: 3, paddingVertical: 4 },
    confusionWrong: { fontSize: 14, lineHeight: 20, color: colors.error, fontWeight: '600' },
    confusionRight: { fontSize: 14, lineHeight: 21, color: colors.text },
    summary: { gap: 2 },
    summaryTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1.1, color: colors.primaryText, marginBottom: 8 },
  });
}
