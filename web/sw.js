// Service Worker: macht Daruma offline-fähig.
// Strategie: erst Netzwerk (damit Updates sofort ankommen), ohne Netz aus dem Zwischenspeicher.
// Bei sehr schlechtem Netz wartet die App höchstens 3 Sekunden, dann startet sie aus dem Zwischenspeicher (v82).
const NET_TIMEOUT = 3000;
const CACHE = 'daruma-v88';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './sync.js',
  './push.js',
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

// Push-Mitteilungen (Stufe 2b): anzeigen und beim Antippen die App öffnen
self.addEventListener('push', (event) => {
  let msg = {};
  try { msg = event.data ? event.data.json() : {}; } catch (e) { msg = { body: event.data ? event.data.text() : '' }; }
  event.waitUntil(self.registration.showNotification(msg.title || 'Daruma', {
    body: msg.body || '',
    tag: msg.tag || 'daruma',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    data: { url: msg.url || './' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || './', self.registration.scope).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const open = list.find((c) => c.url.startsWith(self.registration.scope));
    return open ? open.focus() : self.clients.openWindow(url);
  }));
});
