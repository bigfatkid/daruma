// Service Worker: macht Daruma offline-fähig.
// Strategie: erst Netzwerk (damit Updates sofort ankommen), ohne Netz aus dem Zwischenspeicher.
// Bei sehr schlechtem Netz wartet die App höchstens 3 Sekunden, dann startet sie aus dem Zwischenspeicher (v82).
const NET_TIMEOUT = 3000;
const CACHE = 'daruma-v86';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './sync.js',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/favicon.png',
  './apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  const fromCache = () => caches.match(request, { ignoreSearch: true }).then((cached) => cached || caches.match('./index.html'));
  const network = fetch(request, { cache: 'no-cache' }).then((response) => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(request, copy));
    }
    return response;
  });
  event.respondWith(new Promise((resolve) => {
    let done = false;
    const finish = (r) => { if (!done && r) { done = true; resolve(r); } };
    // Nach 3 s: gespeicherte Version nehmen, falls vorhanden (das Netz lädt im Hintergrund weiter)
    const timer = setTimeout(() => fromCache().then((c) => { if (c) finish(c); }), NET_TIMEOUT);
    network.then((r) => { clearTimeout(timer); finish(r); })
      .catch(() => { clearTimeout(timer); fromCache().then((c) => finish(c || Response.error())); });
  }));
});
