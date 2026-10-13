import { Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Radius, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-theme';
import { type InlineSpan, latexToText, parseInline, parseMarkdown } from '@/lib/markdown';

// Shows an Apex reply with Markdown (headings, lists, tables, code) and
// maths written in LaTeX. Plain text stays plain.

const MONO = Platform.select({ web: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', default: 'monospace' });

export function MarkdownMessage({ text, selectable = true }: { text: string; selectable?: boolean }) {
  const styles = useThemedStyles(createStyles);
  const blocks = parseMarkdown(text);

  return (
    <View style={styles.stack}>
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'heading':
            return (
              <Text key={index} selectable={selectable} style={block.level <= 2 ? styles.h2 : styles.h3}>
                {renderSpans(parseInline(block.text), styles)}
              </Text>
            );
          case 'paragraph':
            return (
              <Text key={index} selectable={selectable} style={styles.body}>
                {renderSpans(parseInline(block.text), styles)}
              </Text>
            );
          case 'list':
            return (
              <View key={index} style={styles.list}>
                {block.items.map((item, itemIndex) => (
                  <View key={itemIndex} style={styles.listRow}>
                    <Text style={styles.marker}>{block.ordered ? `${itemIndex + 1}.` : '•'}</Text>
                    <Text selectable={selectable} style={[styles.body, styles.listText]}>
                      {renderSpans(parseInline(item), styles)}
                    </Text>
                  </View>
                ))}
              </View>
            );
          case 'code':
            return (
              <ScrollView key={index} horizontal style={styles.codeBox} contentContainerStyle={styles.codePad}>
                <Text selectable={selectable} style={styles.code}>{block.text}</Text>
              </ScrollView>
            );
          case 'math':
            return (
              <ScrollView key={index} horizontal style={styles.mathBox} contentContainerStyle={styles.mathPad}>
                <Text selectable={selectable} style={styles.mathDisplay}>{latexToText(block.text)}</Text>
              </ScrollView>
            );
          case 'table':
            return (
              <ScrollView key={index} horizontal style={styles.tableScroll}>
                <View style={styles.table}>
                  <View style={styles.tableRow}>
                    {block.header.map((cell, cellIndex) => (
                      <View key={cellIndex} style={[styles.cell, styles.headerCell]}>
                        <Text selectable={selectable} style={styles.headerText}>{renderSpans(parseInline(cell), styles)}</Text>
                      </View>
                    ))}
                  </View>
                  {block.rows.map((row, rowIndex) => (
                    <View key={rowIndex} style={styles.tableRow}>
                      {block.header.map((_, cellIndex) => (
                        <View key={cellIndex} style={styles.cell}>
                          <Text selectable={selectable} style={styles.body}>
                            {renderSpans(parseInline(row[cellIndex] ?? ''), styles)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>
            );
          case 'rule':
            return <View key={index} style={styles.rule} />;
        }
      })}
    </View>
  );
}

function renderSpans(spans: InlineSpan[], styles: ReturnType<typeof createStyles>) {
  return spans.map((span, index) => {
    switch (span.kind) {
      case 'bold':
        return <Text key={index} style={styles.bold}>{span.text}</Text>;
      case 'italic':
        return <Text key={index} style={styles.italic}>{span.text}</Text>;
      case 'code':
        return <Text key={index} style={styles.inlineCode}>{span.text}</Text>;
      case 'math':
        return <Text key={index} style={styles.inlineMath}>{span.text}</Text>;
      default:
        return span.text;
    }
  });
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    stack: { gap: 10 },
    body: { fontSize: 14.5, lineHeight: 22, color: colors.text },
    h2: { fontSize: 17, lineHeight: 24, fontWeight: '800', color: colors.text, marginTop: 4 },
    h3: { fontSize: 15.5, lineHeight: 22, fontWeight: '700', color: colors.text, marginTop: 2 },
    bold: { fontWeight: '800', color: colors.text },
    italic: { fontStyle: 'italic' },
    inlineCode: { fontFamily: MONO, fontSize: 13, color: colors.primaryText, backgroundColor: colors.surfaceSunken },
    inlineMath: { fontStyle: 'italic', color: colors.primaryText },
    list: { gap: 6 },
    listRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
    marker: { width: 22, fontSize: 14.5, lineHeight: 22, fontWeight: '700', color: colors.primaryText },
    listText: { flex: 1 },
    codeBox: { borderRadius: Radius.md, backgroundColor: colors.surfaceSunken, borderWidth: 1, borderColor: colors.border },
    codePad: { padding: 12 },
    code: { fontFamily: MONO, fontSize: 13, lineHeight: 19, color: colors.text },
    mathBox: { borderRadius: Radius.md, backgroundColor: colors.surfaceSunken },
    mathPad: { paddingVertical: 12, paddingHorizontal: 14 },
    mathDisplay: { fontSize: 16, lineHeight: 24, fontStyle: 'italic', color: colors.text },
    tableScroll: { borderRadius: Radius.md, borderWidth: 1, borderColor: colors.border },
    table: { minWidth: '100%' },
    tableRow: { flexDirection: 'row' },
    cell: { minWidth: 110, maxWidth: 240, paddingVertical: 8, paddingHorizontal: 10, borderRightWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
    headerCell: { backgroundColor: colors.surfaceSunken },
    headerText: { fontSize: 13.5, lineHeight: 20, fontWeight: '800', color: colors.text },
    rule: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 4 },
  });
}
