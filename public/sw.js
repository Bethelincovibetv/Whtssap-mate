// WhatsApp Growth & Automation Engine - Production Service Worker
const CACHE_NAME = 'whatsapp-engine-v3';

self.addEventListener('install', (event) => {
  // Activate immediately without waiting for old worker to exit
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Purge any older cached versions so new deployments load instantly
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Never intercept backend API routes, SSE logs streams, or non-GET requests
  if (
    url.pathname.startsWith('/api/') || 
    url.pathname.includes('/stream') || 
    event.request.method !== 'GET'
  ) {
    return; // Pass through directly to native network
  }

  // 2. HTML navigation requests: ALWAYS Network-First to guarantee fresh index.html
  // This prevents stale bundled asset hash mismatches that cause blank screens!
  if (
    event.request.mode === 'navigate' || 
    (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'))
  ) {
    event.respondWith(
      fetch(event.request)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkRes;
        })
        .catch(async () => {
          // If offline, attempt cached app shell
          const cached = await caches.match(event.request);
          if (cached) return cached;
          const fallback = await caches.match('/');
          if (fallback) return fallback;
          return new Response('Offline - please reconnect to internet', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        })
    );
    return;
  }

  // 3. Static assets: Stale-while-revalidate with guaranteed valid Response return
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => null);

      if (cachedResponse) {
        return cachedResponse;
      }

      return fetchPromise.then((res) => {
        if (res) return res;
        // Return 404 response instead of undefined so browser fetch doesn't throw a fatal exception
        return new Response('Asset not found', { status: 404, statusText: 'Not Found' });
      });
    })
  );
});
