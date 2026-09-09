/* v5.12.0: matching app shell and asset cache; game records remain in localStorage. */
const VERSION = 'seowoo-v5.12.0';
const CORE = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png',
  ...['/css/app.css','/css/v4.css','/css/v5.css','/css/v5-view.css','/data/content.js','/js/core.js','/js/games.js','/js/v5-panorama.js','/js/v5.js','/js/app-v4.js','/assets/elevator-city-tablet.avif','/assets/elevator-city-real.jpg', ...[0,1,2,3,4].map(i => `/assets/elevator-city-tile-${i}.avif`)].map(path => `${path}?v=5.12.0`)];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('seowoo-') && key !== VERSION).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request, {cache: 'no-store'}).then(response => {
      if (!response.ok) throw new Error('Navigation unavailable');
      const copy = response.clone();
      event.waitUntil(caches.open(VERSION).then(cache => cache.put('/index.html', copy)));
      return response;
    }).catch(() => caches.open(VERSION).then(cache => cache.match('/index.html'))));
    return;
  }
  event.respondWith(caches.open(VERSION).then(async cache => {
    const hit = await cache.match(request);
    if (hit) return hit;
    const response = await fetch(request);
    if (response.ok) event.waitUntil(cache.put(request, response.clone()));
    return response;
  }));
});
self.addEventListener('message', event => { if (event.data === 'SKIP_WAITING') self.skipWaiting(); });
