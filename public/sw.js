const CACHE_NAME = 'ritmo-offline-v2';
const APP_SHELL = ['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
    self.clients.claim(),
  ]));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)));
      }
      return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match('/'))));
    return;
  }

  if (new URL(request.url).pathname.startsWith('/_next/static/')) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)));
      }
      return response;
    })));
  }
});

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CACHE_ASSETS' || !Array.isArray(event.data.assets)) return;
  const urls = event.data.assets.filter((url) =>
    typeof url === 'string' && url.startsWith(`${self.location.origin}/_next/static/`)
  ).slice(0, 200);
  event.waitUntil(caches.open(CACHE_NAME).then((cache) =>
    Promise.allSettled(urls.map((url) => cache.add(url)))
  ));
});
