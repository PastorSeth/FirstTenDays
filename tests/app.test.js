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
test('app: pad2', () => { assertEqual(pad2(1), '01'); assertEqual(pad2(10), '10'); });
test('app: dayWords falls back and accepts a single string', () => {
  assertEqual(dayWords({ words: ['Light', 'Walk'] }), ['Light', 'Walk']);
  assertEqual(dayWords({}), HOME_WORDS);
  assertEqual(dayWords({ words: [] }), HOME_WORDS);
  assertEqual(dayWords({ words: 'Abide' }), ['Abide']);
  assertEqual(dayWords({ words: ['  ', 'Hope'] }), ['Hope']);
});
test('app: upNextDay is the first incomplete day', () => {
  const days = [{ day: 1 }, { day: 2 }, { day: 3 }];
  assertEqual(upNextDay(days, n => n === 2), 1);
  assertEqual(upNextDay(days, n => n <= 2), 3);
  assertEqual(upNextDay(days, () => true), null);
});
test('app: wordRowsHtml alternates outline-left and solid-right rows', () => {
  const box = document.createElement('div'); box.innerHTML = wordRowsHtml(['Light', 'Love', 'Hope']);
  const rows = [...box.querySelectorAll('.word-row')];
  assertEqual(rows.map(r => r.dataset.drift), ['left', 'right', 'left']);
  assertEqual(rows.map(r => r.classList.contains('word-row--outline')), [true, false, true]);
  assertEqual(box.firstElementChild.getAttribute('aria-hidden'), 'true');
  assertEqual(rows[0].firstChild.textContent.trim().split(/\s+/).length, 6);
  assertEqual(rows[0].querySelectorAll('.word-ghost').length, 2);
  assertIncludes(rows[1].textContent, 'LOVE');
});
test('app: wordRowsHtml escapes words and returns nothing for no words', () => {
  assertIncludes(wordRowsHtml(['<b>']), '&lt;B&gt;');
  assertEqual(wordRowsHtml([]), '');
});
test('app: renderHome marks done, next and later rows and the up-next bar', () => {
  const keys = {}; DAYS.forEach(d => { keys['complete:' + d.day] = d.day === 1 ? 'true' : 'false'; });
  withStorage(keys, () => {
    const v = document.createElement('div'); renderHome(v);
    assertEqual([...v.querySelectorAll('.day-row')].slice(0, 3).map(r => r.dataset.state), ['done', 'next', 'later']);
    assertIncludes(v.querySelector('.up-next').textContent, 'Day 2');
    assertEqual(v.querySelector('[data-day-num="1"]').textContent, '01');
  });
  const all = {}; DAYS.forEach(d => { all['complete:' + d.day] = 'true'; });
  withStorage(all, () => {
    const v = document.createElement('div'); renderHome(v);
    assertIncludes(v.querySelector('.up-next--done').textContent, 'All 10 days complete');
  });
});
