/* Service worker: najpierw sieć, w razie braku połączenia – pamięć podręczna (tryb lokalny działa offline). */
const CACHE = 'impostor-v2';
const ASSETS = ['/', '/index.html', '/css/style.css', '/css/fonts.css', '/vendor/socket.io.min.js', '/js/app.js', '/js/core.js', '/js/ui.js', '/js/sound.js', '/js/local.js', '/js/online.js', '/js/screens.js', '/js/fx.js', '/shared/words.js', '/shared/engine.js', '/icon.svg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/socket.io')) return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {}); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('/index.html'))));
});
