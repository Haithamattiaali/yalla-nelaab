// Offline: keep a copy of the game; when online, always fetch the newest version first.
const CACHE = 'yalla-v1';
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'src/ui/styles.css',
  'src/ui/app.js',
  'src/ui/audio.js',
  'src/ui/mic.js',
  'src/ui/store.js',
  'src/ui/garden.js',
  'src/ui/balloons.js',
  'src/ui/picture.js',
  'src/ui/review.js',
  'src/core/words.js',
  'src/core/lines.js',
  'src/core/progress.js',
  'src/core/weights.js',
  'src/core/sitting.js',
  'src/core/blow.js',
  'src/core/today.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || (req.mode === 'navigate' ? caches.match('index.html') : undefined)))
  );
});
