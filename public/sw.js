const CACHE_NAME = 'grateapex-pwa-v6';
const CACHE_PREFIX = 'grateapex-pwa-';
const APP_SHELL = ['/', '/manifest.webmanifest', '/icons/grateapex-192.png', '/icons/grateapex-512.png'];
const CACHEABLE_DESTINATIONS = new Set(['font', 'image', 'script', 'style']);

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames
      .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    // Always the newest page from the network (bypassing the HTTP cache); the
    // saved copy is only for offline use.
    event.respondWith(fetch(request.url, { cache: 'no-store', credentials: 'same-origin' }).catch(async () => (await caches.match(request)) || (await caches.match('/'))));
    return;
  }

  // Only cache static, fingerprinted assets. App data and other requests must
  // always reach the network so an installed shortcut cannot pin stale content.
  if (!CACHEABLE_DESTINATIONS.has(request.destination)) return;

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  })());
});

// Push from the server (api/push.mjs): new messages while the app is closed or in the background.
// When the app is open on screen it shows its own toast, so no system alert then.
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data ? event.data.text() : '' }; }
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // Apple's push service (iPhone and iPad) cancels a site's alerts after a few pushes
    // that show nothing, so there every push is shown, even with the app on screen.
    let apple = false;
    try {
      const subscription = await self.registration.pushManager.getSubscription();
      apple = Boolean(subscription && new URL(subscription.endpoint).hostname.endsWith('apple.com'));
    } catch { /* treat as not Apple */ }
    if (!apple && windows.some((client) => client.visibilityState === 'visible' && client.focused)) return;
    await self.registration.showNotification(data.title || 'GrAte Apex Hub', {
      body: data.body || '',
      icon: '/icons/grateapex-192.png',
      badge: '/icons/grateapex-192.png',
      tag: data.tag || undefined,
      renotify: Boolean(data.tag),
      data: { href: data.href || '/' },
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const href = event.notification.data?.href || '/';
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows[0];
    if (existing) {
      try {
        await existing.focus();
        if ('navigate' in existing) await existing.navigate(href);
        return;
      } catch { /* some phones refuse: open the page in a new window instead */ }
    }
    await self.clients.openWindow(href);
  })());
});
