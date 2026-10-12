// Readability (owner requirement): every text colour of every theme, in every
// experience, must reach WCAG contrast on every surface it can sit on.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const { pageBackdrops, rawThemeColors, surfacesFor, themeColorsFor } = await import('@/data/theme-colors');
const { worstContrast } = await import('@/data/contrast');
const { THEME_CATALOG } = await import('@/data/theme-catalog');

const EXPERIENCES = ['originals', 'originate', 'hybrid'];
const CHECKS = [
  ['text', 'content', 4.5], ['textSecondary', 'content', 4.5], ['textTertiary', 'content', 3], ['primaryText', 'content', 3],
  ['accentText', 'content', 3], ['error', 'content', 3], ['onPrimary', 'primary', 4.5], ['tabActive', 'nav', 3], ['navInactive', 'nav', 3],
];

function cases() {
  const out = [];
  for (const experience of EXPERIENCES) {
    for (const entry of THEME_CATALOG) {
      const schemes = entry.family === 'newer' ? (entry.id === 'system' ? ['light', 'dark'] : [entry.id]) : ['dark'];
      for (const scheme of schemes) out.push({ experience, entry, scheme, legacy: entry.family === 'legacy' ? entry.id : 'dark' });
    }
  }
  return out;
}

function failures(colors, page) {
  const surfaces = surfacesFor(colors, page);
  return CHECKS.flatMap(([token, on, min]) => {
    const ratio = worstContrast(colors[token], surfaces[on]);
    return ratio < min ? [`${token} ${ratio.toFixed(2)} < ${min}`] : [];
  });
}

describe('every theme is readable in every experience', () => {
  it('reports what the raw theme colours got wrong (fixed by the readability pass)', () => {
    const before = [];
    for (const c of cases()) {
      const page = pageBackdrops(c.experience, c.scheme, c.legacy, c.entry.family);
      const bad = failures(rawThemeColors(c.experience, c.scheme, c.legacy, c.entry.family), page);
      if (bad.length) before.push(`${c.experience} · ${c.entry.name}: ${bad.join(', ')}`);
    }
    console.log(`raw colours needing a fix: ${before.length}\n  ${before.join('\n  ')}`);
  });
  for (const c of cases()) {
    it(`${c.experience} · ${c.entry.name}${c.entry.id === 'system' ? ` (${c.scheme})` : ''}`, () => {
      const page = pageBackdrops(c.experience, c.scheme, c.legacy, c.entry.family);
      assert.deepEqual(failures(themeColorsFor(c.experience, c.scheme, c.legacy, c.entry.family), page), []);
    });
  }
});
