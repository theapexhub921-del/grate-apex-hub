// The original app's themes must stay exactly as they were (owner requirement).
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const { LEGACY_THEMES, legacyColorsOf } = await import('@/data/legacy-themes');
const ORIGINAL = 'old-reference/src/theme.tsx';

describe('original app themes', () => {
  it('all 15 are kept, with unique ids', () => {
    assert.equal(LEGACY_THEMES.length, 15);
    assert.equal(new Set(LEGACY_THEMES.map((theme) => theme.id)).size, 15);
  });

  it('every colour, unlock and flag matches the original file exactly', { skip: !existsSync(ORIGINAL) && 'original app not present' }, () => {
    const source = readFileSync(ORIGINAL, 'utf8');
    for (const theme of LEGACY_THEMES) {
      const block = source.slice(source.indexOf(`id: "${theme.id}"`), source.indexOf('}', source.indexOf(`id: "${theme.id}"`)));
      for (const key of ['bg1', 'bg2', 'bg3', 'ink', 'silver', 'dim', 'panel', 'panelBrd', 'accent', 'gold', 'name']) {
        assert.ok(block.includes(`${key}: "${theme[key]}"`), `${theme.id}.${key} differs from the original`);
      }
      assert.ok(block.includes(`unlock: ${theme.unlock}`), `${theme.id}.unlock differs`);
      assert.ok(block.includes(`light: ${theme.light}`), `${theme.id}.light differs`);
      if (theme.ach) assert.ok(block.includes(`ach: "${theme.ach}"`), `${theme.id}.ach differs`);
    }
  });

  it('derived colours follow the original rules (contrast of button text, light/dark states)', () => {
    const dark = legacyColorsOf(LEGACY_THEMES.find((theme) => theme.id === 'dark'));
    assert.equal(dark.bg, '#000266');
    assert.equal(dark.primary, '#8fb3ff');
    assert.equal(dark.onPrimary, '#04123a'); // bright accent → dark text, as in the original
    assert.equal(dark.danger, '#ff7b7b');
    const light = legacyColorsOf(LEGACY_THEMES.find((theme) => theme.id === 'light'));
    assert.equal(light.onPrimary, '#ffffff');
    assert.equal(light.danger, '#dc2626');
    assert.deepEqual(legacyColorsOf(LEGACY_THEMES.find((theme) => theme.id === 'rainbow')).gradient.length, 6);
  });
});
