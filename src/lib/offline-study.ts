// Offline study storage (no data needed to revise).
//
// On the web, saved study material lives in the browser's Cache API under
// OFFLINE_CACHE. public/sw.js uses the SAME name: it keeps what is saved here
// when the app updates, and it serves the question banks (/curriculum/*.json)
// and lecture pictures (/figures/*) from it when the phone has no connection.
// Lesson lists, lesson text and lesson pictures are stored here as small JSON
// entries under /offline-data/… (never fetched from the network).
//
// On phones (no Cache API) only small things go to AsyncStorage; the question
// banks are still downloaded on demand there.
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Keep in step with OFFLINE_CACHE in public/sw.js. */
export const OFFLINE_CACHE = 'grateapex-offline-v1';
const DATA_PREFIX = '/offline-data/';

const hasCache = () => typeof caches !== 'undefined';

/** True when the browser can keep study material for offline use (a normal web browser, not a phone app build). */
export const offlineSupported = () => hasCache();

/** True when the device says it has no connection. (An unknown state counts as online.) */
export const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

async function open() {
  return hasCache() ? caches.open(OFFLINE_CACHE) : null;
}

/** Something saved with writeOffline, or null. */
export async function readOffline<T>(key: string): Promise<T | null> {
  try {
    const cache = await open();
    if (cache) {
      const hit = await cache.match(DATA_PREFIX + key);
      return hit ? ((await hit.json()) as T) : null;
    }
    const saved = await AsyncStorage.getItem(`grateapex_offline_${key}`);
    return saved ? (JSON.parse(saved) as T) : null;
  } catch {
    return null;
  }
}

/** Saves one JSON value for offline reading. Never throws: a full disk just means it is not saved. */
export async function writeOffline(key: string, value: unknown): Promise<boolean> {
  try {
    const cache = await open();
    if (cache) {
      await cache.put(DATA_PREFIX + key, new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } }));
      return true;
    }
    await AsyncStorage.setItem(`grateapex_offline_${key}`, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** A question bank or other site file that was saved earlier, as JSON, or null. */
export async function readSavedFile<T>(path: string): Promise<T | null> {
  try {
    const cache = await open();
    const hit = cache ? await cache.match(path) : null;
    return hit ? ((await hit.json()) as T) : null;
  } catch {
    return null;
  }
}

/** Downloads site files (like /curriculum/biochemistry.json) fresh from the network and keeps them. Returns the bytes saved and which paths failed. */
export async function saveFiles(paths: string[], onStep?: (done: number, total: number) => void): Promise<{ bytes: number; failed: string[] }> {
  const cache = await open();
  const failed: string[] = [];
  let bytes = 0;
  if (!cache) return { bytes, failed: [...paths] };
  let done = 0;
  for (const path of paths) {
    try {
      const response = await fetch(path, { cache: 'reload' });
      if (response.status === 404) continue; // this course simply has no such file: nothing to save, nothing wrong
      if (!response.ok) throw new Error(String(response.status));
      bytes += (await response.clone().blob()).size;
      await cache.put(path, response);
    } catch {
      failed.push(path);
    } finally {
      onStep?.(++done, paths.length);
    }
  }
  return { bytes, failed };
}

export type OfflineManifest = { savedAt: number; classKey: string; bytes: number; courses: number; lessons: number };
const MANIFEST = 'manifest';

export const readManifest = () => readOffline<OfflineManifest>(MANIFEST);
export const writeManifest = (manifest: OfflineManifest) => writeOffline(MANIFEST, manifest);

/** Removes everything saved for offline use. */
export async function clearOffline(): Promise<void> {
  try {
    if (hasCache()) await caches.delete(OFFLINE_CACHE);
    else await AsyncStorage.removeItem(`grateapex_offline_${MANIFEST}`);
  } catch {
    // nothing to remove
  }
}

export const formatMegabytes = (bytes: number) => `${Math.max(0.1, bytes / 1_048_576).toFixed(1)} MB`;
