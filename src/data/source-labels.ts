import { getSourceFile } from '@/data/content-catalog';
import type { SourceFile, SourceReference } from '@/data/lesson-types';

function fileName(file: SourceFile) {
  return (file.member ?? file.path).split('/').pop() ?? file.path;
}

// "FATTY ACID BIOSYNTHESIS.pptx slides 6–8; FATTY ACID BIOSYNTHESIS (1).pptx slides 3, 6"
// Exact exports/copies (e.g. the PDF copy of a deck) are left out to keep
// it short. Reference textbooks are left out too — see describeTextbookRefs.
export function describeSourceRefs(refs: SourceReference[]) {
  const byFile = new Map<string, number[]>();

  for (const ref of refs) {
    const file = getSourceFile(ref.sourceId);
    if (!file || file.duplicateOf || file.role === 'reference') continue;
    const numbers = byFile.get(file.id) ?? [];
    const number = ref.slide ?? ref.page;
    if (number !== undefined && !numbers.includes(number)) numbers.push(number);
    byFile.set(file.id, numbers);
  }

  return Array.from(byFile, ([fileId, numbers]) => {
    const file = getSourceFile(fileId)!;
    const name = fileName(file);
    if (numbers.length === 0) return name;
    const unit = file.format === 'pdf' || file.format === 'docx' ? 'page' : 'slide';
    return `${name} ${unit}${numbers.length > 1 ? 's' : ''} ${formatRanges(numbers)}`;
  }).join('; ');
}

// "Lehninger p. 791" / "Guyton & Hall pp. 790–791, 795"
export function describeTextbookRefs(refs: SourceReference[]) {
  const byBook = new Map<string, number[]>();

  for (const ref of refs) {
    const file = getSourceFile(ref.sourceId);
    if (!file || file.role !== 'reference') continue;
    const name = file.shortName ?? file.title ?? fileName(file);
    const pages = byBook.get(name) ?? [];
    if (ref.page !== undefined && !pages.includes(ref.page)) pages.push(ref.page);
    byBook.set(name, pages);
  }

  return Array.from(byBook, ([name, pages]) =>
    pages.length === 0 ? name : `${name} ${pages.length > 1 ? 'pp.' : 'p.'} ${formatRanges(pages)}`
  ).join('; ');
}

// [2, 3, 4, 8] → "2–4, 8"
export function formatRanges(numbers: number[]) {
  const sorted = [...numbers].sort((a, b) => a - b);
  const parts: string[] = [];
  let start = sorted[0];
  let previous = sorted[0];

  for (const value of [...sorted.slice(1), Number.NaN]) {
    if (value === previous + 1) {
      previous = value;
      continue;
    }
    parts.push(start === previous ? `${start}` : `${start}–${previous}`);
    start = value;
    previous = value;
  }

  return parts.join(', ');
}
