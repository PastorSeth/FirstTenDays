test('sw: requests are routed by where they go', () => {
  const own = 'http://localhost:8777';
  assertEqual(requestKind('http://localhost:8777/app.js', own), 'app');
  assertEqual(requestKind('https://fonts.googleapis.com/css2?family=Archivo', own), 'font-css');
  assertEqual(requestKind('https://fonts.gstatic.com/s/archivo/v1/a.woff2', own), 'font-file');
  assertEqual(requestKind('https://www.youtube.com/embed/x', own), 'other');
  assertEqual(requestKind('https://script.google.com/macros/s/abc/exec', own), 'other');
});
test('sw: ok and opaque responses are cacheable, failures are not', () => {
  assert(isCacheable({ ok: true, type: 'basic' }), 'ok');
  assert(isCacheable({ ok: false, type: 'opaque' }), 'opaque');
  assert(!isCacheable({ ok: false, type: 'basic' }), 'error');
  assert(!isCacheable(null), 'missing');
});
test('sw: activating keeps only the current app cache and the font cache', () => {
  assertEqual(cachesToDelete(['first-10-days-v13', CACHE_NAME, FONT_CACHE, 'something-else']), ['first-10-days-v13', 'something-else']);
});
test('sw: the app shell includes every script the app loads', () => {
  ['./index.html', './style.css', './data.js', './tracking-config.js', './format.js', './motion.js', './app.js', './manifest.json']
    .forEach(f => assert(APP_SHELL.includes(f), f));
});
test('sw: font files come from the cache once fetched, even offline', async () => {
  const realFetch = window.fetch; let calls = 0;
  try {
    await caches.delete(FONT_CACHE);
    const url = 'https://fonts.gstatic.com/s/archivo/test-font.woff2';
    window.fetch = async () => { calls++; return new Response('font-bytes', { status: 200 }); };
    assertEqual(await (await cacheFirst(new Request(url))).text(), 'font-bytes');
    window.fetch = async () => { calls++; throw new Error('offline'); };
    assertEqual(await (await cacheFirst(new Request(url))).text(), 'font-bytes');
    assertEqual(calls, 1);
  } finally {
    window.fetch = realFetch;
    await caches.delete(FONT_CACHE);
  }
});
test('sw: the font stylesheet falls back to the cached copy offline', async () => {
  const realFetch = window.fetch;
  try {
    await caches.delete(FONT_CACHE);
    const url = 'https://fonts.googleapis.com/css2?family=Archivo-test';
    window.fetch = async () => new Response('@font-face {}', { status: 200 });
    assertEqual(await (await staleWhileRevalidate(new Request(url))).text(), '@font-face {}');
    window.fetch = async () => { throw new Error('offline'); };
    assertEqual(await (await staleWhileRevalidate(new Request(url))).text(), '@font-face {}');
  } finally {
    window.fetch = realFetch;
    await caches.delete(FONT_CACHE);
  }
});
