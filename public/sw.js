// RYVMO PWA: only cache public static assets. NEVER cache authenticated HTML or API responses.
const CACHE_NAME = 'ryvmo-static-v4';
const PUBLIC_ASSETS = ['/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png',
  '/exercises/ab-wheel.svg',
  '/exercises/abdominal-polia.svg',
  '/exercises/agachamento-bulgaro.svg',
  '/exercises/agachamento-livre.svg',
  '/exercises/cadeira-extensora.svg',
  '/exercises/cadeira-flexora.svg',
  '/exercises/corrida.svg',
  '/exercises/crucifixo-inverso-maquina.svg',
  '/exercises/crucifixo-inverso-polia.svg',
  '/exercises/crucifixo-maquina.svg',
  '/exercises/desenvolvimento-neutro.svg',
  '/exercises/elevacao-joelhos.svg',
  '/exercises/hip-thrust.svg',
  '/exercises/lateral-polia.svg',
  '/exercises/leg-press-45.svg',
  '/exercises/panturrilha-sentado.svg',
  '/exercises/panturrilha-unilateral.svg',
  '/exercises/puxada-neutra.svg',
  '/exercises/remada-baixa.svg',
  '/exercises/remada-unilateral-polia.svg',
  '/exercises/rosca-martelo.svg',
  '/exercises/rosca-scott-maquina.svg',
  '/exercises/supino-inclinado-halteres.svg',
  '/exercises/supino-inclinado-smith.svg',
  '/exercises/supino-reto-halteres.svg',
  '/exercises/terra-romeno.svg',
  '/exercises/triceps-frances-corda.svg',
  '/exercises/triceps-polia-barra.svg'
];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PUBLIC_ASSETS)));
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
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Do not intercept navigations, user-specific routes, RSC payloads or the data API.
  if (request.mode === 'navigate' || url.pathname.startsWith('/api/') || !url.pathname.startsWith('/_next/static/') && !url.pathname.startsWith('/exercises/')) return;
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok) event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone())));
    return response;
  })));
});
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CACHE_ASSETS' || !Array.isArray(event.data.assets)) return;
  const urls = event.data.assets.filter((url) => typeof url === 'string' && url.startsWith(`${self.location.origin}/_next/static/`)).slice(0, 200);
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => Promise.allSettled(urls.map((url) => cache.add(url)))));
});
