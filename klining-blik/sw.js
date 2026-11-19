const CACHE = 'blik-v1';
const CORE = ['./', './cabinet/', './assets/manrope-cyr.woff2', './manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin || request.url.includes('/api/')) return;
  if (request.mode === 'navigate') {
    e.respondWith(fetch(request).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(request, copy)); return r; }).catch(() => caches.match(request)));
    return;
  }
  e.respondWith(caches.match(request).then((hit) => hit || fetch(request).then((r) => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(request, copy)); }
    return r;
  })));
});
