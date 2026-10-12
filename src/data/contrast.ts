// Text contrast (WCAG 2.1): measuring it, and nudging a text colour until it is
// readable on every background it sits on. Pure, for tests.

type RGBA = { r: number; g: number; b: number; a: number };

export function parseColor(color: string): RGBA | null {
  const value = color.trim();
  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h.slice(0, 6), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1 };
  }
  const rgb = value.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i);
  if (rgb) return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]), a: rgb[4] === undefined ? 1 : Number(rgb[4]) };
  return null;
}

const toHex = ({ r, g, b }: { r: number; g: number; b: number }) =>
  `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;

/** A (possibly translucent) colour painted over an opaque one, as '#rrggbb'. */
export function composite(top: string, base: string): string {
  const t = parseColor(top);
  const b = parseColor(base);
  if (!t || !b) return base;
  return toHex({ r: b.r + (t.r - b.r) * t.a, g: b.g + (t.g - b.g) * t.a, b: b.b + (t.b - b.b) * t.a });
}

export function luminance(color: string) {
  const c = parseColor(color);
  if (!c) return 0;
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
}

/** Contrast ratio of two colours (1–21). A translucent foreground is first painted over the background. */
export function contrastRatio(foreground: string, background: string) {
  const fg = composite(foreground, background);
  const [a, b] = [luminance(fg), luminance(background)];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function worstContrast(foreground: string, backgrounds: readonly string[]) {
  return Math.min(...backgrounds.map((bg) => contrastRatio(foreground, bg)));
}

function mixToward(color: string, target: string, amount: number) {
  const c = parseColor(color)!;
  const t = parseColor(target)!;
  return toHex({ r: c.r + (t.r - c.r) * amount, g: c.g + (t.g - c.g) * amount, b: c.b + (t.b - c.b) * amount });
}

/**
 * The colour, or the nearest version of it (moved step by step towards white
 * or black, whichever reads better) that reaches `min` on every background.
 */
export function ensureContrast(color: string, backgrounds: readonly string[], min: number): string {
  if (!parseColor(color) || backgrounds.length === 0) return color;
  if (worstContrast(color, backgrounds) >= min) return color;
  const opaque = backgrounds.length ? composite(color, backgrounds[0]) : color;
  const target = worstContrast('#ffffff', backgrounds) >= worstContrast('#000000', backgrounds) ? '#ffffff' : '#000000';
  for (let step = 1; step <= 20; step++) {
    const candidate = mixToward(opaque, target, step / 20);
    if (worstContrast(candidate, backgrounds) >= min) return candidate;
  }
  return target;
}
