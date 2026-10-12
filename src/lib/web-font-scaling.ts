const FONT_SCALE: Record<string, string> = { small: '0.9', default: '1', large: '1.15', extra_large: '1.3' };

/** Scale actual React Native Web typography while preserving each text style's hierarchy. */
export function applyWebFontScale(size: string) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--grateapex-font-scale', FONT_SCALE[size] ?? '1');
  const mark = (node: Element) => {
    if (!(node instanceof HTMLElement)) return;
    const style = node.getAttribute('style') ?? '';
    const font = style.match(/(?:^|;)\s*font-size\s*:\s*([\d.]+px)/i)?.[1];
    const line = style.match(/(?:^|;)\s*line-height\s*:\s*([\d.]+px)/i)?.[1];
    if (font && node.style.getPropertyValue('--grateapex-font-base') !== font) node.style.setProperty('--grateapex-font-base', font);
    if (line && node.style.getPropertyValue('--grateapex-line-base') !== line) node.style.setProperty('--grateapex-line-base', line);
    if ((font || line) && !node.hasAttribute('data-grateapex-scaled')) node.setAttribute('data-grateapex-scaled', '');
  };
  root.querySelectorAll('[style]').forEach(mark);
  const observer = (window as Window & { __grateapexFontObserver?: MutationObserver }).__grateapexFontObserver;
  observer?.disconnect();
  const next = new MutationObserver((records) => records.forEach((record) => {
    if (record.type === 'attributes') mark(record.target as Element);
    record.addedNodes.forEach((node) => {
      if (node instanceof Element) { mark(node); node.querySelectorAll('[style]').forEach(mark); }
    });
  }));
  next.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['style'] });
  (window as Window & { __grateapexFontObserver?: MutationObserver }).__grateapexFontObserver = next;
}
