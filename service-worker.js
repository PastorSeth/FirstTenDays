/* ==========================================================
   FIRST 10 DAYS — Service Worker
   Caches the app shell so it works offline once visited, and keeps
   a copy of the web font so the Poster type still shows offline.
   Bump CACHE_NAME any time you change the app's files so old
   caches get cleared out.
   ========================================================== */

const CACHE_NAME = 'first-10-days-v19';

// The web font lives in its own cache, so bumping CACHE_NAME for an app
// change doesn't throw away the font and make everyone download it again.
const FONT_CACHE = 'first-10-days-fonts-v1';

// Paths are relative to this file's own location, so this works
// whether the site is hosted at the root of a domain or in a
// GitHub Pages project subfolder (e.g. username.github.io/repo/).
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './data.js',
  './tracking-config.js',
  './format.js',
  './motion.js',
  './app.js',
  './manifest.json'
];

/* Where a request is going decides how it's handled: the app's own
   files, Google's font stylesheet, Google's font files, or anything
   else (YouTube, the progress sheet), which is left alone. */
function requestKind(url, ownOrigin) {
  const target = new URL(url);
  if (target.origin === ownOrigin) return 'app';
  if (target.hostname === 'fonts.googleapis.com') return 'font-css';
  if (target.hostname === 'fonts.gstatic.com') return 'font-file';
  return 'other';
}

/* Font responses can be "opaque" (cross-origin, unreadable to the page)
   and are still worth keeping. */
function isCacheable(response) {
  return !!response && (response.ok || response.type === 'opaque');
}

function cachesToDelete(keys) {
  return keys.filter(key => key !== CACHE_NAME && key !== FONT_CACHE);
}

/* The app's own files: answer from the cache straight away, and refresh
   the cached copy from the network in the background. */
function fromAppCache(request) {
  return caches.match(request).then((cached) => {
    const networked = fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => cached);
    return cached || networked;
  });
}

/* The font stylesheet: use the saved copy if there is one, and fetch a
   fresh one for next time. */
function staleWhileRevalidate(request) {
  return caches.open(FONT_CACHE).then(cache => cache.match(request).then((cached) => {
    const fresh = fetch(request)
      .then(response => (isCacheable(response)
        ? cache.put(request, response.clone()).then(() => response)
        : response))
      .catch(() => cached);
    return cached || fresh;
  }));
}

/* The font files themselves never change at a given address, so once
   one is saved there's no need to ask the network again. */
function cacheFirst(request) {
  return caches.open(FONT_CACHE).then(cache => cache.match(request).then(cached => cached ||
    fetch(request).then(response => (isCacheable(response)
      ? cache.put(request, response.clone()).then(() => response)
      : response))));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(cachesToDelete(names).map((n) => caches.delete(n))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const kind = requestKind(event.request.url, self.location.origin);
  if (kind === 'app') event.respondWith(fromAppCache(event.request));
  else if (kind === 'font-css') event.respondWith(staleWhileRevalidate(event.request));
  else if (kind === 'font-file') event.respondWith(cacheFirst(event.request));
  // Everything else (YouTube, the progress sheet) goes to the network untouched.
});
