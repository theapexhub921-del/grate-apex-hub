// Apex replies: Markdown (headings, lists, tables, code) and maths in LaTeX.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const { parseMarkdown, parseInline, latexToText, splitRow } = await import('@/lib/markdown');

describe('Markdown blocks', () => {
  it('reads headings, paragraphs and rules', () => {
    const blocks = parseMarkdown('## Glycolysis\n\nFirst line\nsecond line\n\n---');
    assert.deepEqual(blocks[0], { type: 'heading', level: 2, text: 'Glycolysis' });
    assert.deepEqual(blocks[1], { type: 'paragraph', text: 'First line second line' });
    assert.deepEqual(blocks[2], { type: 'rule' });
  });

  it('reads bullet and numbered lists', () => {
    const blocks = parseMarkdown('- one\n- two\n\n1. first\n2) second');
    assert.deepEqual(blocks[0], { type: 'list', ordered: false, items: ['one', 'two'] });
    assert.deepEqual(blocks[1], { type: 'list', ordered: true, items: ['first', 'second'] });
  });

  it('reads pipe tables, including escaped pipes and empty cells', () => {
    const blocks = parseMarkdown('| Enzyme | Role |\n|---|:---:|\n| Hexokinase | Traps glucose |\n| PFK-1 | \\| rate \\| |');
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].type, 'table');
    assert.deepEqual(blocks[0].header, ['Enzyme', 'Role']);
    assert.deepEqual(blocks[0].rows, [['Hexokinase', 'Traps glucose'], ['PFK-1', '| rate |']]);
  });

  it('keeps fenced code exactly as written', () => {
    const blocks = parseMarkdown('```js\nconst x = 1 * 2;\n  indented\n```');
    assert.deepEqual(blocks[0], { type: 'code', lang: 'js', text: 'const x = 1 * 2;\n  indented' });
  });

  it('reads display maths on one line and across lines', () => {
    assert.deepEqual(parseMarkdown('$$E = mc^2$$')[0], { type: 'math', text: 'E = mc^2' });
    const multi = parseMarkdown('$$\n\\frac{a}{b}\n$$');
    assert.deepEqual(multi[0], { type: 'math', text: '\\frac{a}{b}' });
  });

  it('never loops on unusual input', () => {
    assert.doesNotThrow(() => parseMarkdown('|\n|\n```\n$$\n# \n> \n\n'));
  });

  it('splits table rows with or without outer pipes', () => {
    assert.deepEqual(splitRow('a | b'), ['a', 'b']);
    assert.deepEqual(splitRow('| a | b |'), ['a', 'b']);
  });
});

describe('Inline text', () => {
  it('finds bold, italic, code and maths without touching snake_case words', () => {
    const spans = parseInline('Use **ATP**, *fast*, `NADH` and $x^2$ in snake_case_name.');
    const kinds = spans.filter((s) => s.kind !== 'text' || s.bold || s.italic).map((s) => [s.kind, s.text, Boolean(s.bold), Boolean(s.italic)]);
    assert.deepEqual(kinds, [['text', 'ATP', true, false], ['text', 'fast', false, true], ['code', 'NADH', false, false], ['math', 'x²', false, false]]);
  });

  it('converts maths inside bold and italic text', () => {
    const spans = parseInline('**$\\gamma$** and *$\\alpha$*');
    assert.deepEqual(spans.map((s) => [s.kind, s.text, Boolean(s.bold), Boolean(s.italic)]), [
      ['math', 'γ', true, false],
      ['text', ' and ', false, false],
      ['math', 'α', false, true],
    ]);
  });

  it('does not treat prices as maths', () => {
    const spans = parseInline('It costs $5 and $10 today');
    assert.ok(spans.every((s) => s.kind !== 'math'));
  });
});

describe('LaTeX to readable text', () => {
  it('writes fractions, roots and powers', () => {
    assert.equal(latexToText('\\frac{a+b}{2}'), '(a+b)/2');
    assert.equal(latexToText('\\sqrt{x}'), '√(x)');
    assert.equal(latexToText('x^2'), 'x²');
    assert.equal(latexToText('10^{-3}'), '10⁻³');
    assert.equal(latexToText('e^{x+1}'), 'e^(x+1)');
  });

  it('writes subscripts and Greek letters', () => {
    assert.equal(latexToText('H_2O'), 'H₂O');
    assert.equal(latexToText('\\Delta G = -\\Delta G^\\circ'), 'Δ G = -Δ G°');
    assert.equal(latexToText('\\alpha \\times \\beta'), 'α × β');
  });

  it('drops layout commands and keeps text', () => {
    assert.equal(latexToText('\\text{rate} = k[S]'), 'rate = k[S]');
    assert.equal(latexToText('a\\,b'), 'a b');
  });
});
