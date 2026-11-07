/* IMPOSTOR – praca offline (wersja 1.0.0-mw6zk5h4) */
const CACHE = 'impostor-1.0.0-mw6zk5h4';
const FILES = ["./","index.html","manifest.webmanifest","icon.svg","icon-192.png","icon-512.png","icon-maskable-512.png","fonts/manrope-latin-ext-wght-normal.woff2","fonts/manrope-latin-wght-normal.woff2","fonts/unbounded-latin-ext-wght-normal.woff2","fonts/unbounded-latin-wght-normal.woff2"];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match('index.html'))));
});
