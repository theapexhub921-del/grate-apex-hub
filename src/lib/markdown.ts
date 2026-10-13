// A small, dependency-free Markdown reader for Apex's replies.
// Supports: headings, paragraphs, bullet and numbered lists, fenced code,
// pipe tables, horizontal rules, **bold**, *italic*, `code`, and maths:
// $inline$ and $$display$$ written in LaTeX. Maths is shown as readable
// text (fractions, powers, subscripts, Greek letters), not typeset.

export type MarkdownBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'code'; text: string; lang: string }
  | { type: 'table'; header: string[]; rows: string[][] }
  | { type: 'math'; text: string }
  | { type: 'rule' };

export type InlineSpan = { kind: 'text' | 'bold' | 'italic' | 'code' | 'math'; text: string };

const FENCE = /^```\s*([\w+-]*)\s*$/;
const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const RULE = /^\s*([-*_])(\s*\1){2,}\s*$/;
const BULLET = /^\s*[-*+]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;
const SEPARATOR = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;

/** Splits one pipe-table row into trimmed cells. */
export function splitRow(line: string): string[] {
  let t = line.trim();
  if (t.startsWith('|')) t = t.slice(1);
  if (t.endsWith('|') && !t.endsWith('\\|')) t = t.slice(0, -1);
  return t.split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, '|'));
}

function isTableStart(lines: string[], i: number): boolean {
  return lines[i].includes('|') && i + 1 < lines.length && lines[i + 1].includes('-') && SEPARATOR.test(lines[i + 1]);
}

function startsBlock(lines: string[], i: number): boolean {
  const line = lines[i];
  return FENCE.test(line) || HEADING.test(line) || RULE.test(line) || BULLET.test(line) || NUMBERED.test(line)
    || line.trim().startsWith('$$') || isTableStart(lines, i);
}

export function parseMarkdown(source: string): MarkdownBlock[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i += 1; continue; }

    const fence = FENCE.exec(line.trim());
    if (fence) {
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) { body.push(lines[i]); i += 1; }
      i += 1; // skip the closing fence (or the end of the text)
      blocks.push({ type: 'code', text: body.join('\n'), lang: fence[1] });
      continue;
    }

    if (line.trim().startsWith('$$')) {
      const trimmed = line.trim();
      if (trimmed.length > 4 && trimmed.endsWith('$$')) {
        blocks.push({ type: 'math', text: trimmed.slice(2, -2).trim() });
        i += 1;
        continue;
      }
      const body: string[] = [trimmed.slice(2)];
      i += 1;
      while (i < lines.length && !lines[i].trim().endsWith('$$')) { body.push(lines[i]); i += 1; }
      if (i < lines.length) body.push(lines[i].trim().slice(0, -2));
      i += 1;
      blocks.push({ type: 'math', text: body.join(' ').trim() });
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] });
      i += 1;
      continue;
    }

    if (RULE.test(line)) {
      blocks.push({ type: 'rule' });
      i += 1;
      continue;
    }

    if (isTableStart(lines, i)) {
      const header = splitRow(lines[i]);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim() && lines[i].includes('|')) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      blocks.push({ type: 'table', header, rows });
      continue;
    }

    const bullet = BULLET.exec(line);
    const numbered = NUMBERED.exec(line);
    if (bullet || numbered) {
      const ordered = !bullet;
      const pattern = ordered ? NUMBERED : BULLET;
      const items: string[] = [];
      while (i < lines.length) {
        const match = pattern.exec(lines[i]);
        if (!match) break;
        items.push(match[1].trim());
        i += 1;
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim() && !startsBlock(lines, i)) {
      paragraph.push(lines[i].replace(/^\s*>\s?/, '').trim());
      i += 1;
    }
    if (paragraph.length) blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
    else i += 1; // safety: never loop on an unrecognised line
  }

  return blocks;
}

// Bold, italic, code and inline maths. Italic uses only single *, so words like
// snake_case are left alone. Maths needs non-space text next to each $.
const INLINE = /((?:`[^`\n]+`)|(?:\*\*[^*\n]+\*\*)|(?:\*[^*\s][^*\n]*\*)|(?:\$(?!\s)[^$\n]*?\S\$))/;

export function parseInline(text: string): InlineSpan[] {
  const parts = text.split(INLINE);
  const spans: InlineSpan[] = [];
  parts.forEach((part, index) => {
    if (!part) return;
    if (index % 2 === 0) { spans.push({ kind: 'text', text: part }); return; }
    if (part.startsWith('`')) spans.push({ kind: 'code', text: part.slice(1, -1) });
    else if (part.startsWith('**')) spans.push({ kind: 'bold', text: part.slice(2, -2) });
    else if (part.startsWith('$')) spans.push({ kind: 'math', text: latexToText(part.slice(1, -1)) });
    else spans.push({ kind: 'italic', text: part.slice(1, -1) });
  });
  return spans;
}

// ---- LaTeX to readable text -------------------------------------------------

const SYMBOLS: Record<string, string> = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', theta: 'θ', lambda: 'λ', mu: 'μ', pi: 'π',
  sigma: 'σ', tau: 'τ', phi: 'φ', omega: 'ω', rho: 'ρ', eta: 'η', kappa: 'κ', nu: 'ν', chi: 'χ', psi: 'ψ',
  Delta: 'Δ', Sigma: 'Σ', Omega: 'Ω', Gamma: 'Γ', Lambda: 'Λ', Pi: 'Π', Theta: 'Θ', Phi: 'Φ', Psi: 'Ψ',
  times: '×', cdot: '·', div: '÷', pm: '±', mp: '∓', le: '≤', leq: '≤', ge: '≥', geq: '≥', neq: '≠',
  approx: '≈', equiv: '≡', sim: '∼', infty: '∞', circ: '°', degree: '°', partial: '∂', nabla: '∇',
  rightarrow: '→', to: '→', leftarrow: '←', gets: '←', Rightarrow: '⇒', Leftarrow: '⇐', leftrightarrow: '↔',
  uparrow: '↑', downarrow: '↓', sum: 'Σ', prod: 'Π', int: '∫', in: '∈', notin: '∉', subset: '⊂', cup: '∪', cap: '∩',
  ldots: '…', cdots: '⋯', dots: '…', hbar: 'ħ', ell: 'ℓ', prime: '′',
};

const SUPERSCRIPT: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾', n: 'ⁿ', i: 'ⁱ',
};

const SUBSCRIPT: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎', a: 'ₐ', e: 'ₑ', o: 'ₒ', x: 'ₓ', h: 'ₕ', k: 'ₖ',
  l: 'ₗ', m: 'ₘ', n: 'ₙ', p: 'ₚ', s: 'ₛ', t: 'ₜ',
};

function script(text: string, map: Record<string, string>, marker: string): string {
  const chars = [...text.replace(/\s/g, '')];
  if (chars.length && chars.every((ch) => ch in map)) return chars.map((ch) => map[ch]).join('');
  return text.length > 1 ? `${marker}(${text})` : `${marker}${text}`;
}

/** Reads one {group} or one character (or one \command) starting at index i. */
function readArgument(src: string, i: number): [string, number] {
  if (src[i] === '{') {
    let depth = 0;
    for (let j = i; j < src.length; j += 1) {
      if (src[j] === '{') depth += 1;
      else if (src[j] === '}') {
        depth -= 1;
        if (depth === 0) return [src.slice(i + 1, j), j + 1];
      }
    }
    return [src.slice(i + 1), src.length];
  }
  const command = /^\\[a-zA-Z]+/.exec(src.slice(i));
  if (command) return [command[0], i + command[0].length];
  return [src[i] ?? '', i + 1];
}

export function latexToText(source: string): string {
  let out = '';
  let i = 0;
  const src = source;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '\\') {
      const command = /^\\([a-zA-Z]+)/.exec(src.slice(i));
      if (!command) {
        const next = src[i + 1] ?? '';
        out += ',;!:'.includes(next) ? ' ' : next;
        i += 2;
        continue;
      }
      const name = command[1];
      i += command[0].length;
      if (name === 'left' || name === 'right') continue;
      if (name === 'frac' || name === 'dfrac') {
        const [top, afterTop] = readArgument(src, i);
        const [bottom, afterBottom] = readArgument(src, afterTop);
        i = afterBottom;
        const t = latexToText(top);
        const b = latexToText(bottom);
        out += `${t.length > 1 ? `(${t})` : t}/${b.length > 1 ? `(${b})` : b}`;
        continue;
      }
      if (name === 'sqrt') {
        const [body, after] = readArgument(src, i);
        i = after;
        out += `√(${latexToText(body)})`;
        continue;
      }
      if (['text', 'mathrm', 'mathbf', 'mathit', 'textbf', 'operatorname', 'mathsf'].includes(name)) {
        const [body, after] = readArgument(src, i);
        i = after;
        out += latexToText(body);
        continue;
      }
      out += SYMBOLS[name] ?? name;
      continue;
    }
    if (ch === '^' || ch === '_') {
      const [body, after] = readArgument(src, i + 1);
      i = after;
      const inner = latexToText(body);
      // Degree and prime marks are written as they are, not as powers.
      out += ch === '^' && (inner === '°' || inner === '′') ? inner : script(inner, ch === '^' ? SUPERSCRIPT : SUBSCRIPT, ch);
      continue;
    }
    if (ch === '{' || ch === '}') { i += 1; continue; }
    if (ch === '~') { out += ' '; i += 1; continue; }
    out += ch;
    i += 1;
  }
  return out.replace(/\s+/g, ' ').trim();
}
