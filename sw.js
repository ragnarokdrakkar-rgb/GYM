/* Workout Tracker service worker v5.0.0 */
const CACHE_NAME = 'workout-tracker-v5.0.0';
const CORE_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

const restTimers = new Map();

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(CORE_FILES.map(async path => {
      try {
        const response = await fetch(path, { cache: 'reload' });
        if (response.ok) await cache.put(path, response.clone());
      } catch (_) {
        // Posamezna manjkajoča datoteka ne sme preprečiti namestitve SW.
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      // Network-first prepreči, da bi GitHub Pages predolgo kazal star index.html.
      const response = await fetch(request, { cache: 'no-store' });
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    } catch (_) {
      const cached = await caches.match(request);
      if (cached) return cached;

      if (request.mode === 'navigate') {
        const fallback = await caches.match('./index.html');
        if (fallback) return fallback;
      }

      return new Response('Aplikacija trenutno ni dosegljiva brez povezave.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  })());
});

self.addEventListener('message', event => {
  const msg = event.data || {};

  if (msg.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (msg.type === 'CANCEL_REST_END' && msg.id) {
    const timer = restTimers.get(msg.id);
    if (timer) clearTimeout(timer);
    restTimers.delete(msg.id);
    return;
  }

  if (msg.type === 'SCHEDULE_REST_END' && msg.id) {
    const previous = restTimers.get(msg.id);
    if (previous) clearTimeout(previous);

    const delayMs = Math.max(0, Math.min(Number(msg.delayMs) || 0, 60 * 60 * 1000));
    const timer = setTimeout(async () => {
      restTimers.delete(msg.id);
      try {
        await self.registration.showNotification('⏰ Konec odmora!', {
          body: String(msg.label || 'Naslednja serija — gremo!'),
          tag: 'workout-rest',
          renotify: true,
          vibrate: [400, 150, 400, 150, 600],
          requireInteraction: true,
          icon: './icon-192.png',
          badge: './icon-192.png',
          data: { url: './' }
        });
      } catch (_) {}
    }, delayMs);

    restTimers.set(msg.id, timer);
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('focus' in client) {
        await client.focus();
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow('./');
  })());
});
