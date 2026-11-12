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
test('sw: installing a new version fetches the app files fresh, not from the browser\'s own cache', () => {
  const reqs = shellRequests();
  assertEqual(reqs.length, APP_SHELL.length);
  assert(reqs.every(r => r.cache === 'reload'), 'every shell file is fetched with cache: reload');
});
test('sw: refreshing an app file checks with the server instead of the browser\'s own cache', async () => {
  const realFetch = window.fetch; let seen = null;
  const url = location.origin + '/sw-refresh-test-' + Date.now() + '.js';
  try {
    window.fetch = async (req, init) => { seen = init; return new Response('x', { status: 200 }); };
    await fromAppCache(new Request(url));
    assertEqual(seen && seen.cache, 'no-cache');
  } finally {
    window.fetch = realFetch;
    await new Promise(r => setTimeout(r, 50));
    await (await caches.open(CACHE_NAME)).delete(url);
  }
});
// What Cloudflare (firstten.faith) sends for /index.html: a redirect to /.
const redirectedPage = body => ({
  redirected: true, ok: true, status: 200, statusText: 'OK',
  headers: new Headers({ 'content-type': 'text/html' }),
  blob: async () => new Blob([body]),
  clone() { return this; }
});
test('sw: a page that came by way of a redirect is kept as a plain copy', async () => {
  const clean = await cleanResponse(redirectedPage('<p>hi</p>'));
  assert(!clean.redirected, 'no longer marked as redirected');
  assertEqual(clean.status, 200);
  assertEqual(clean.headers.get('content-type'), 'text/html');
  assertEqual(await clean.text(), '<p>hi</p>');
  const plain = new Response('x');
  assertEqual(await cleanResponse(plain), plain, 'a normal response is kept as it is');
});
test('sw: installing saves plain copies, even of files the host redirects', async () => {
  const realFetch = window.fetch;
  const name = 'sw-install-test-' + Date.now();
  try {
    window.fetch = async () => redirectedPage('file');
    await precache(name);
    const saved = await (await caches.open(name)).match(shellRequests()[1]);
    assert(saved && !saved.redirected, 'index.html saved without the redirect');
    assertEqual(await saved.text(), 'file');
  } finally {
    window.fetch = realFetch;
    await caches.delete(name);
  }
});
test('sw: refreshing a file the host redirects saves a plain copy', async () => {
  const realFetch = window.fetch;
  const url = location.origin + '/sw-redirect-test-' + Date.now() + '.html';
  try {
    window.fetch = async () => redirectedPage('page');
    await fromAppCache(new Request(url));
    await new Promise(r => setTimeout(r, 150));
    const saved = await (await caches.open(CACHE_NAME)).match(url);
    assert(saved && !saved.redirected, 'saved without the redirect');
    assertEqual(await saved.text(), 'page');
  } finally {
    window.fetch = realFetch;
    await (await caches.open(CACHE_NAME)).delete(url);
  }
});
test('sw: the installed app opens at the top of the site, which every host serves as is', async () => {
  const manifest = await (await fetch('../manifest.json', { cache: 'no-store' })).json();
  assertEqual(manifest.start_url, './');
});