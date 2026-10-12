// Resolves the app's "@/..." alias against $GRATEAPEX_ROOT/src, swaps the
// React Native storage module for an in-memory stub, and resolves bare
// packages (firebase/...) from the app's own node_modules.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(process.env.GRATEAPEX_ROOT || fileURLToPath(new URL('../../', import.meta.url)));
const SRC = path.join(ROOT, 'src');
const STUB = pathToFileURL(path.join(path.dirname(fileURLToPath(import.meta.url)), 'async-storage-stub.mjs')).href;
const MEDIA_STUB = pathToFileURL(path.join(path.dirname(fileURLToPath(import.meta.url)), 'media-stub.mjs')).href;
const APP_PARENT = pathToFileURL(path.join(ROOT, 'package.json')).href;

const candidates = (base) => [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')];

export async function resolve(specifier, context, next) {
  if (specifier === '@react-native-async-storage/async-storage') return { url: STUB, shortCircuit: true };
  // Never upload to the real Cloudinary account from a check (the stub re-exports the rest).
  if (specifier === '@/lib/media' && !context.parentURL?.endsWith('media-stub.mjs')) return { url: MEDIA_STUB, shortCircuit: true };
  if (specifier.startsWith('@/')) {
    for (const file of candidates(path.join(SRC, specifier.slice(2)))) {
      if (existsSync(file) && path.extname(file)) return next(pathToFileURL(file).href, context);
    }
  }
  if (specifier.startsWith('.') && context.parentURL?.startsWith('file:') && !path.extname(specifier)) {
    const base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    for (const file of candidates(base)) {
      if (existsSync(file) && path.extname(file)) return next(pathToFileURL(file).href, context);
    }
  }
  if (!specifier.startsWith('.') && !specifier.startsWith('node:') && !specifier.startsWith('file:')) {
    return next(specifier, { ...context, parentURL: APP_PARENT });
  }
  return next(specifier, context);
}
