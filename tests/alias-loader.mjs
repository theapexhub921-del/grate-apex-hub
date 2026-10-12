// Node module hook: resolves the app's "@/..." import alias (and
// extension-less relative imports) to the TypeScript files in src/, so
// the learning engine can be tested with Node's built-in test runner and
// type stripping — no extra test dependencies.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SRC = path.resolve(fileURLToPath(new URL('../src/', import.meta.url)));

function candidates(base) {
  return [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')];
}

export async function resolve(specifier, context, next) {
  // Pure modules may import theme constants: a tiny React Native stand-in, and no CSS.
  if (specifier === 'react-native') return { url: new URL('./stubs/react-native.mjs', import.meta.url).href, shortCircuit: true };
  if (specifier.endsWith('.css')) return { url: 'data:text/javascript,export default {}', shortCircuit: true };
  if (specifier.startsWith('@/')) {
    for (const file of candidates(path.join(SRC, specifier.slice(2)))) {
      if (existsSync(file) && !file.endsWith(path.sep) && path.extname(file)) {
        return next(pathToFileURL(file).href, context);
      }
    }
  }
  if (specifier.startsWith('.') && context.parentURL?.startsWith('file:') && !path.extname(specifier)) {
    const base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    for (const file of candidates(base)) {
      if (existsSync(file) && path.extname(file)) return next(pathToFileURL(file).href, context);
    }
  }
  return next(specifier, context);
}
