/* ==========================================================
   FIRST 10 DAYS — Service Worker
   Caches the app shell so it works offline once visited.
   Bump CACHE_NAME any time you change these files so old
   caches get cleared out.
   ========================================================== */

const CACHE_NAME = 'first-10-days-v2';

// Paths are relative to this file's own location, so this works
// whether the site is hosted at the root of a domain or in a
// GitHub Pages project subfolder (e.g. username.github.io/repo/).
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './data.js',
  './tracking-config.js',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Never intercept YouTube or other cross-origin requests.
  if (new URL(event.request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networked = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networked;
    })
  );
});
