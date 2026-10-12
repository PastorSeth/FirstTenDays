test('app: parseRoute', () => {
  assertEqual(parseRoute(''), { name: 'home' });
  assertEqual(parseRoute('#/'), { name: 'home' });
  assertEqual(parseRoute('#/day/3'), { name: 'day', day: 3 });
  assertEqual(parseRoute('#/day/11'), { name: 'home' });
  assertEqual(parseRoute('#/day/abc'), { name: 'home' });
  assertEqual(parseRoute('#/resources'), { name: 'resources' });
  assertEqual(parseRoute('#/resources/what-is-the-gospel'), { name: 'resource', slug: 'what-is-the-gospel' });
  assertEqual(parseRoute('#/progress'), { name: 'progress' });
  assertEqual(parseRoute("#/progress/Ann%20O'Brien%20%2F%20Jr"), { name: 'student', student: "Ann O'Brien / Jr" });
  assertEqual(parseRoute('#/progress/%E0%A4%A'), { name: 'student', student: '%E0%A4%A' });
  assertEqual(parseRoute('#/nowhere'), { name: 'home' });
});
test('app: transitionType', () => {
  const home = { name: 'home' }, d2 = { name: 'day', day: 2 }, d3 = { name: 'day', day: 3 };
  assertEqual(transitionType(home, d2), 'open');
  assertEqual(transitionType(d2, home), 'close');
  assertEqual(transitionType(d2, d3), 'next');
  assertEqual(transitionType(d3, d2), 'prev');
  assertEqual(transitionType(d2, d2), 'none');
  assertEqual(transitionType(null, d2), 'none');
  assertEqual(transitionType(home, { name: 'resources' }), 'none');
});
test('app: registers the service worker once the page loads', async () => {
  const f = document.createElement('iframe'); f.src = 'boot-sw.html';
  document.body.appendChild(f);
  await new Promise(r => { f.onload = r; });
  await new Promise(r => setTimeout(r, 50));
  assertEqual(f.contentWindow.__swCalls, ['service-worker.js']);
  f.remove();
});
test('app: shows a content error when data.js fails to load', async () => {
  const f = document.createElement('iframe'); f.src = 'broken-data.html';
  document.body.appendChild(f);
  await new Promise(r => { f.onload = r; });
  await new Promise(r => setTimeout(r, 50));
  assertIncludes(f.contentDocument.querySelector('.content-error').textContent, 'data.js');
  f.remove();
});
