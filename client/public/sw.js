const VERSION = 'v1.0.0';
const APP_SHELL = [
  '/',                 // SPA entry
  '/offline.html',
  '/manifest.webmanifest',
  // You can add more static assets if you like: fonts, CSS, etc.
];

// Install: cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(`app-shell-${VERSION}`).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => !k.includes(VERSION))
        .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

// Helper: network-first for API GET; cache-first for static & uploads; offline fallback
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET. For POST/PUT we handle queue in the page.
  if (req.method !== 'GET') return;

  // Same-origin only for now
  const sameOrigin = url.origin === self.location.origin;

  // 1) API GET requests: network-first, fallback to cache, then offline page JSON
  if (sameOrigin && url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(req, `api-cache-${VERSION}`));
    return;
  }

  // 2) Uploaded media: cache-first with revalidate
  if (sameOrigin && url.pathname.startsWith('/uploads/')) {
    event.respondWith(staleWhileRevalidate(req, `uploads-cache-${VERSION}`));
    return;
  }

  // 3) App shell & static: cache-first
  if (sameOrigin) {
    event.respondWith(cacheFirst(req, `static-cache-${VERSION}`));
    return;
  }
});

// Strategies
async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(req);
    cache.put(req, fresh.clone());
    return fresh;
  } catch (e) {
    const cached = await cache.match(req);
    if (cached) return cached;
    if (req.headers.get('accept')?.includes('text/html')) {
      return caches.match('/offline.html');
    }
    return new Response(JSON.stringify({ error: 'offline' }), { status: 503 });
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const networkPromise = fetch(req).then((res) => {
    cache.put(req, res.clone());
    return res;
  }).catch(() => null);
  return cached || networkPromise || caches.match('/offline.html');
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const fresh = await fetch(req);
    cache.put(req, fresh.clone());
    return fresh;
  } catch {
    if (req.headers.get('accept')?.includes('text/html')) {
      return caches.match('/offline.html');
    }
    return new Response('offline', { status: 503 });
  }
}
