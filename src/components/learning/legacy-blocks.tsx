import { Image } from 'expo-image';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { Icon } from '@/components/ui/icon';
import { Interactive } from '@/components/ui/interactive';
import { Text } from '@/components/ui/text';
import { Type, type ThemeColors } from '@/constants/theme';
import { type Block, loadLegacyImage, parseRich, type Run } from '@/data/legacy-study';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

// The original app's lesson blocks (old-reference/src/screens/LessonBlocks.tsx),
// drawn with this app's colours and type: paragraphs, headings, lists, tables,
// key terms, coloured boxes, steps, cards, figures and video links. Underlined
// words show their meaning when tapped.

export const TermContext = createContext<(word: string, meaning: string) => void>(() => {});

const SUB: Record<string, string> = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉', '+': '₊', '-': '₋', '−': '₋', '=': '₌', '(': '₍', ')': '₎', a: 'ₐ', e: 'ₑ', o: 'ₒ', x: 'ₓ', h: 'ₕ', k: 'ₖ', l: 'ₗ', m: 'ₘ', n: 'ₙ', p: 'ₚ', s: 'ₛ', t: 'ₜ' };
const SUP: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻', '−': '⁻', '=': '⁼', '(': '⁽', ')': '⁾', n: 'ⁿ', i: 'ⁱ' };
const script = (text: string, map: Record<string, string>) => {
  const out = Array.from(text).map((c) => map[c]);
  return out.every(Boolean) ? out.join('') : null;
};

export function Rich({ x, style }: { x: string; style?: object | object[] }) {
  const colors = useTheme();
  const tip = useContext(TermContext);
  const runs = useMemo(() => parseRich(x), [x]);
  return (
    <Text style={style}>
      {runs.map((run: Run, i) => {
        let text = run.t;
        const st: Record<string, unknown> = {};
        if (run.sub || run.sup) {
          const mapped = script(text, run.sub ? SUB : SUP);
          if (mapped) text = mapped;
          else st.fontSize = 11;
        }
        if (run.b) st.fontWeight = '700';
        if (run.i) st.fontStyle = 'italic';
        if (run.term) {
          return (
            <Text key={i} style={[st, { color: colors.primaryText, textDecorationLine: 'underline', textDecorationStyle: 'dotted' }]} onPress={() => tip(run.t, run.term!)} accessibilityRole="button" accessibilityHint="Shows the meaning">
              {text}
            </Text>
          );
        }
        return (
          <Text key={i} style={st}>
            {text}
          </Text>
        );
      })}
    </Text>
  );
}

function Figure({ block }: { block: Extract<Block, { k: 'fig' }> }) {
  const styles = useThemedStyles(createStyles);
  const [uri, setUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    if (block.img) {
      void loadLegacyImage(block.img).then((value) => {
        if (!live) return;
        if (value) setUri(value);
        else setFailed(true);
      });
    }
    return () => { live = false; };
  }, [block.img]);
  let ratio = block.w && block.h ? block.w / block.h : 1.5;
  if (block.svg) {
    const m = /viewBox="([\d.\s-]+)"/.exec(block.svg);
    if (m) {
      const v = m[1].trim().split(/\s+/).map(Number);
      if (v[2] && v[3]) ratio = v[2] / v[3];
    }
  }
  if (block.svg && failed) return null;
  return (
    <View style={styles.fig}>
      <View style={[styles.figBox, { aspectRatio: ratio, maxHeight: 520 }]}>
        {block.svg ? (
          <SvgXml xml={block.svg} width="100%" height="100%" onError={() => setFailed(true)} />
        ) : uri ? (
          <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="contain" accessibilityLabel={block.alt || block.cap || 'Lesson figure'} />
        ) : (
          <Text style={styles.muted}>{failed ? 'Picture not available' : 'Loading picture…'}</Text>
        )}
      </View>
      {block.cap || block.alt ? <Rich x={block.cap || block.alt || ''} style={styles.cap} /> : null}
    </View>
  );
}

function tone(colors: ThemeColors, name?: string) {
  if (name === 'red' || name === 'trap') return colors.error;
  if (name === 'life') return colors.success;
  if (name === 'gold' || name === 'sign' || name === 'recall' || name === 'formula' || name === 'mnemonic') return colors.accentText;
  return colors.primaryText;
}

export function LegacyBlocks({ blocks }: { blocks: readonly Block[] }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.k) {
          case 'p':
            return <Rich key={i} x={b.x} style={b.lede ? styles.lede : styles.p} />;
          case 'h':
            return <Rich key={i} x={b.x} style={b.l === 3 ? styles.h3 : styles.h4} />;
          case 'ul':
            return (
              <View key={i} style={styles.list}>
                {b.items.map((item, j) => (
                  <View key={j} style={styles.li}>
                    <Text style={styles.bullet}>{b.ol ? `${j + 1}.` : item.startsWith('– ') ? '' : '•'}</Text>
                    <Rich x={item} style={[styles.p, styles.liText]} />
                  </View>
                ))}
              </View>
            );
          case 'table':
            return (
              <ScrollView key={i} horizontal style={styles.tableWrap} showsHorizontalScrollIndicator>
                <View style={styles.table}>
                  {b.head.length ? (
                    <View style={[styles.tr, styles.thRow]}>
                      {b.head.map((h, j) => (
                        <View key={j} style={styles.cell}>
                          <Rich x={h} style={styles.th} />
                        </View>
                      ))}
                    </View>
                  ) : null}
                  {b.rows.map((row, j) => (
                    <View key={j} style={[styles.tr, j % 2 === 1 && styles.trAlt]}>
                      {row.c.map((c, k) => (
                        <View key={k} style={styles.cell}>
                          <Rich x={c} style={styles.td} />
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>
            );
          case 'term':
            return (
              <View key={i} style={styles.term}>
                <Rich x={b.name} style={styles.termName} />
                <Rich x={b.def} style={styles.termDef} />
              </View>
            );
          case 'box': {
            const color = tone(colors, b.tone);
            return (
              <View key={i} style={[styles.box, { borderLeftColor: color }]}>
                {b.title ? <Rich x={b.title} style={[styles.boxTitle, { color }]} /> : null}
                <LegacyBlocks blocks={b.blocks} />
              </View>
            );
          }
          case 'step':
            return (
              <View key={i} style={styles.step}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{b.n}</Text>
                </View>
                <View style={styles.flex}>
                  <Rich x={b.title} style={styles.stepTitle} />
                  {b.blocks ? <LegacyBlocks blocks={b.blocks} /> : null}
                  {b.tags?.length ? (
                    <View style={styles.tags}>
                      {b.tags.map((tag, j) => (
                        <View key={j} style={styles.pill}>
                          <Text style={styles.pillText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              </View>
            );
          case 'cards':
            return (
              <View key={i}>
                {b.items.map((card, j) => (
                  <View key={j} style={styles.card}>
                    {card.title ? <Rich x={card.title} style={styles.cardTitle} /> : null}
                    <LegacyBlocks blocks={card.blocks} />
                  </View>
                ))}
              </View>
            );
          case 'video':
            return (
              <Interactive key={i} onPress={() => void Linking.openURL(b.url).catch(() => {})} accessibilityRole="link" style={styles.video}>
                <View style={styles.videoIcon}>
                  <Icon name="play" size={18} color={colors.onPrimary} filled />
                </View>
                <View style={styles.flex}>
                  {b.tag ? <Text style={styles.muted}>{b.tag}</Text> : null}
                  <Rich x={b.title} style={styles.cardTitle} />
                  <Rich x={b.desc} style={[styles.p, styles.videoDesc]} />
                </View>
              </Interactive>
            );
          case 'fig':
            return <Figure key={i} block={b} />;
          default:
            return null;
        }
      })}
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    p: { ...Type.body, fontSize: 15.5, lineHeight: 25, color: colors.text, marginBottom: 12 },
    lede: { fontSize: 17, lineHeight: 27, color: colors.text, marginBottom: 14, fontWeight: '600' },
    h3: { ...Type.title3, color: colors.text, marginTop: 8, marginBottom: 8 },
    h4: { fontSize: 15.5, fontWeight: '700', color: colors.primaryText, marginTop: 6, marginBottom: 6 },
    muted: { fontSize: 12, color: colors.textTertiary },
    list: { marginBottom: 12 },
    li: { flexDirection: 'row', marginBottom: 6 },
    liText: { flex: 1, marginBottom: 0 },
    bullet: { width: 22, fontSize: 15.5, lineHeight: 25, fontWeight: '700', color: colors.primaryText },
    tableWrap: { marginBottom: 14 },
    table: { borderColor: colors.border, borderWidth: 1, borderRadius: 10, overflow: 'hidden', minWidth: 320 },
    tr: { flexDirection: 'row' },
    thRow: { backgroundColor: colors.primary },
    trAlt: { backgroundColor: colors.surfaceMuted },
    cell: { width: 160, padding: 10, borderColor: colors.border, borderRightWidth: StyleSheet.hairlineWidth },
    th: { fontSize: 13, fontWeight: '700', color: colors.onPrimary },
    td: { fontSize: 13.5, lineHeight: 20, color: colors.text },
    term: { backgroundColor: colors.surfaceMuted, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
    termName: { fontSize: 15, fontWeight: '700', color: colors.primaryText, marginBottom: 4 },
    termDef: { fontSize: 14.5, lineHeight: 22, color: colors.text },
    box: { backgroundColor: colors.surfaceMuted, borderColor: colors.border, borderWidth: 1, borderLeftWidth: 4, borderRadius: 14, padding: 14, marginBottom: 14 },
    boxTitle: { fontSize: 12.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
    step: { flexDirection: 'row', backgroundColor: colors.surfaceMuted, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 12, gap: 12 },
    stepNum: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    stepNumText: { fontSize: 14, fontWeight: '800', color: colors.onPrimary },
    stepTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    pill: { backgroundColor: colors.primarySubtle, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10 },
    pillText: { fontSize: 12, fontWeight: '600', color: colors.primaryText },
    card: { backgroundColor: colors.surfaceMuted, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
    cardTitle: { fontSize: 15.5, fontWeight: '700', color: colors.text, marginBottom: 6 },
    video: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surfaceMuted, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
    videoIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    videoDesc: { marginBottom: 0, fontSize: 13 },
    fig: { marginBottom: 14 },
    figBox: { backgroundColor: '#ffffff', borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', width: '100%' },
    cap: { fontSize: 12.5, lineHeight: 18, color: colors.textTertiary, marginTop: 6, textAlign: 'center' },
  });
}
