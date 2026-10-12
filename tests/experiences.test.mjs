// The three experiences: the original app's font rule, colours, unlock rules
// and background must be reproduced exactly (owner requirement).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const { experienceFont, hybridGlass, legacyFontFamily, legacyGradientAngle, legacyWeight, mixHex, withAlpha } = await import('@/data/experience-style');
const { legacyLevel, legacyLockText, legacyRank, legacyThemeById, legacyThemeColors, legacyThemeUnlock, originalsThemeColors } = await import('@/data/legacy-theme-colors');

const theme = (id) => legacyThemeById(id);

describe('original font rule (old-reference/src/Text.tsx)', () => {
  it('subtext (under 14, or a muted colour) is Montserrat', () => {
    assert.equal(legacyFontFamily({ fontSize: 13 }), 'Montserrat');
    assert.equal(legacyFontFamily({ fontSize: 16, color: '#999999' }), 'Montserrat');
    assert.equal(legacyFontFamily({ fontSize: 12, fontWeight: '800' }), 'Montserrat');
  });
  it('headers (bold 700+, or 24 and over) are Poppins', () => {
    assert.equal(legacyFontFamily({ fontSize: 16, fontWeight: '700' }), 'Poppins');
    assert.equal(legacyFontFamily({ fontSize: 30, fontWeight: '400' }), 'Poppins');
  });
  it('normal text is Roboto, and so is an unset size (treated as 16)', () => {
    assert.equal(legacyFontFamily({ fontSize: 15, fontWeight: '600' }), 'Roboto');
    assert.equal(legacyFontFamily({}), 'Roboto');
  });
  it('weights snap to the original font files', () => {
    assert.equal(legacyWeight('650', 'Poppins'), 600);
    assert.equal(legacyWeight('600', 'Roboto'), 700);
    assert.equal(legacyWeight('900', 'Montserrat'), 800);
  });
  it('Originate keeps its own fonts; Hybrid takes only the original headings; inputs are Roboto', () => {
    assert.equal(experienceFont('originate', { fontSize: 30, fontWeight: '800' }), null);
    assert.equal(experienceFont('hybrid', { fontSize: 15 }), null);
    assert.match(experienceFont('hybrid', { fontSize: 22, fontWeight: '800' }).fontFamily, /^Poppins/);
    assert.match(experienceFont('originals', { fontSize: 30, fontWeight: '700' }, true).fontFamily, /^Roboto/);
  });
});

describe('original colours as this app’s tokens', () => {
  it('Dark: the original values, untouched', () => {
    const c = legacyThemeColors(theme('dark'));
    assert.equal(c.background, '#000266');
    assert.equal(c.primary, '#8fb3ff');
    assert.equal(c.onPrimary, '#04123a');
    assert.equal(c.accent, '#ffd34d'); // the original "accent" is the theme's gold
    assert.equal(c.surface, 'rgba(255,255,255,0.06)');
    assert.equal(c.border, 'rgba(255,255,255,0.12)');
    assert.equal(c.textSecondary, '#c7cefa');
    assert.equal(c.textTertiary, '#93a4e8');
    assert.equal(c.tabBar, 'rgba(8,14,70,0.94)');
    assert.equal(c.navSurface, 'rgba(0,0,40,0.38)');
  });
  it('light themes use the original light shell colours', () => {
    const c = legacyThemeColors(theme('light'));
    assert.equal(c.tabBar, 'rgba(255,255,255,0.94)');
    assert.equal(c.error, '#dc2626');
  });
  it('The Originals draws no shadows; Hybrid keeps them', () => {
    assert.equal(originalsThemeColors(theme('dark')).shadow, 'transparent');
    assert.notEqual(legacyThemeColors(theme('dark')).shadow, 'transparent');
  });
  it('an unknown theme falls back to the original default (Dark)', () => {
    assert.equal(theme('nope').id, 'dark');
  });
});

describe('original theme unlock rules (screens/ThemePicker.tsx)', () => {
  const base = { xp: 0, achievementLevels: {}, isAdmin: false };
  it('level themes unlock at their original level (1 + every 150 XP)', () => {
    assert.equal(legacyLevel(0), 1);
    assert.equal(legacyLevel(599), 4);
    assert.equal(legacyLevel(600), 5);
    assert.deepEqual(legacyThemeUnlock(theme('matcha'), base), { unlocked: false, kind: 'level', level: 5 });
    assert.deepEqual(legacyThemeUnlock(theme('matcha'), { ...base, xp: 600 }), { unlocked: true });
    assert.deepEqual(legacyThemeUnlock(theme('dark'), base), { unlocked: true });
  });
  it('achievement themes need the achievement earned', () => {
    const locked = legacyThemeUnlock(theme('christmas'), { ...base, achievement: () => ({ name: 'Christmas cram', desc: 'Study on 25 December' }) });
    assert.equal(locked.unlocked, false);
    assert.equal(legacyLockText(locked), '🔒 Earn the "Christmas cram" achievement: Study on 25 December');
    assert.deepEqual(legacyThemeUnlock(theme('christmas'), { ...base, achievementLevels: { xmas: 1 } }), { unlocked: true });
  });
  it('admin-only themes are for admins', () => {
    assert.equal(legacyThemeUnlock(theme('brat'), base).unlocked, false);
    assert.equal(legacyThemeUnlock(theme('brat'), { ...base, isAdmin: true }).unlocked, true);
  });
  it('locked wording follows the original picker', () => {
    assert.equal(legacyLockText({ unlocked: false, kind: 'level', level: 8 }), '🔒 Unlocks at Level 8');
    assert.equal(legacyLockText({ unlocked: false, kind: 'level', level: 8 }, false), 'Unlocks at Level 8');
  });
  it('ranks: the original titles on one ladder, Fresher to Immortal over 10,000,000 XP', () => {
    assert.deepEqual(legacyRank(0), { level: 1, title: 'Fresher' });
    assert.deepEqual(legacyRank(300), { level: 3, title: 'Fresher' });
    assert.deepEqual(legacyRank(150 * 24), { level: 25, title: 'Sharp' });
    assert.equal(legacyRank(10_000_000).title, 'Immortal');
    assert.equal(legacyRank(9_999_999).title, 'Ultimate');
  });
});

describe('background and glass', () => {
  it('the gradient angle matches expo-linear-gradient on the web for {0.1,0} → {0.9,1}', () => {
    assert.ok(Math.abs(legacyGradientAngle(800, 800) - (90 + (Math.atan2(800, 640) * 180) / Math.PI)) < 1e-9);
    assert.ok(Math.abs(legacyGradientAngle(400, 900) - (90 + (Math.atan2(900, 320) * 180) / Math.PI)) < 1e-9);
  });
  it('colour helpers', () => {
    assert.equal(withAlpha('#ffffff', 0.5), 'rgba(255,255,255,0.5)');
    assert.equal(withAlpha('rgba(1,2,3,0.4)', 0.5), 'rgba(1,2,3,0.4)');
    assert.equal(mixHex('#ffffff', '#000000', 0.5), '#808080');
  });
  it('Hybrid glass makes resting surfaces translucent and keeps raised ones solid', () => {
    const solid = { surface: '#ffffff', surfaceMuted: '#eeeeee', border: '#cccccc', surfaceElevated: '#ffffff' };
    const glass = hybridGlass(solid);
    assert.match(glass.surface, /^rgba\(255,255,255,0\.62\)$/);
    assert.equal(glass.surfaceElevated, '#ffffff');
  });
});


describe('every theme in every experience, drawn the experience’s way', async () => {
  const { effectiveThemeFamily, legacyAtmosphere, originalsFromNewer, originateFromLegacy } = await import('@/data/theme-portrayal');
  it('without a choice, The Originals uses the legacy theme and the others the newer one', () => {
    assert.equal(effectiveThemeFamily('originals', null), 'legacy');
    assert.equal(effectiveThemeFamily('originate', null), 'newer');
    assert.equal(effectiveThemeFamily('hybrid', null), 'newer');
    assert.equal(effectiveThemeFamily('originals', 'newer'), 'newer');
    assert.equal(effectiveThemeFamily('originate', 'legacy'), 'legacy');
  });
  it('Originate draws a legacy theme with solid cards in that theme’s colours', () => {
    const lavender = theme('lavender');
    const c = originateFromLegacy(lavender);
    assert.match(c.surface, /^#[0-9a-f]{6}$/);
    assert.match(c.surfaceElevated, /^#[0-9a-f]{6}$/);
    assert.equal(c.primary, legacyThemeColors(lavender).primary);
    assert.notEqual(c.shadow, 'transparent');
    // Originate pages are one colour: a light theme starts from its lightest stop (readable with dark text).
    assert.equal(legacyAtmosphere(lavender).base, c.background);
    assert.equal(c.background, '#e8e0fc');
  });
  it('The Originals draws a newer theme flat, with glass panels', () => {
    const colors = { primary: '#1677F2', accent: '#FDC00A', background: '#132A9B', surface: '#ffffff', border: '#cccccc' };
    const c = originalsFromNewer(colors, false);
    assert.equal(c.surface, 'rgba(255,255,255,0.06)');
    assert.equal(c.shadow, 'transparent');
    assert.equal(c.tabBar, 'rgba(19,42,155,0.94)');
    assert.equal(c.navActive, '#FDC00A');
  });
});

describe('Appearance: one list of themes (owner rules, 2026-10-10)', async () => {
  const { THEME_CATALOG, themeLock, themeLockText } = await import('@/data/theme-catalog');
  const base = { xp: 0, achievementLevels: {}, isAdmin: false };
  it('only Apex Legacy, System, Dark and Light are free', () => {
    const free = THEME_CATALOG.filter((entry) => themeLock(entry, base).unlocked).map((entry) => entry.name).sort();
    assert.deepEqual(free, ['Apex Legacy', 'Dark', 'Light', 'System']);
  });
  it('every name is different (look-alikes renamed)', () => {
    const names = THEME_CATALOG.map((entry) => entry.name);
    assert.equal(new Set(names).size, names.length);
    for (const name of ['Apex Legacy', 'Apex Redefined', 'Blossom', 'Rosewood', 'Blackout', 'Obsidian']) assert.ok(names.includes(name), name);
  });
  it('every other theme unlocks with XP (and Christmas/Valentine need their achievement; brat is admins-only)', () => {
    for (const entry of THEME_CATALOG) {
      if (themeLock(entry, base).unlocked) continue;
      const rich = themeLock(entry, { xp: 1_000_000, achievementLevels: { xmas: 1, val: 1 }, isAdmin: true });
      assert.equal(rich.unlocked, true, entry.name);
    }
    const apex = THEME_CATALOG.find((entry) => entry.key === 'newer:apex');
    assert.equal(themeLockText(themeLock(apex, base)), 'Unlocks at Level 2 (150 XP)');
    assert.equal(themeLock(apex, { ...base, xp: 150 }).unlocked, true);
    assert.equal(themeLock(THEME_CATALOG.find((entry) => entry.id === 'brat'), { ...base, xp: 1_000_000 }).unlocked, false);
  });
  it('the free themes come first, Apex Legacy at the top', () => {
    assert.equal(THEME_CATALOG[0].name, 'Apex Legacy');
    assert.deepEqual(THEME_CATALOG.slice(0, 4).map((entry) => entry.level), [1, 1, 1, 1]);
  });
});
