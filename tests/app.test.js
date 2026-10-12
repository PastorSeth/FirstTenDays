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
test('app: readingText default and custom', () => {
  assertEqual(readingText({ passage: '1 John 2:7-11' }), 'Open your Bible to 1 John 2:7-11 and read it through.');
  assertEqual(readingText({ passage: 'x', reading: '  Custom.  ' }), 'Custom.');
  assertEqual(readingText({ passage: 'x', reading: '   ' }), 'Open your Bible to x and read it through.');
});
test('app: renderDay shows the Day 1 study and the Day 2 placeholder', () => {
  const v = document.createElement('div');
  renderDay(v, 1);
  assertEqual(v.querySelectorAll('.study .study-h').length, 2);
  assertEqual(v.querySelector('.day-big-num').textContent, '01');
  assertIncludes(v.querySelector('.read-callout').textContent, 'hit the brakes');
  assertEqual(v.querySelectorAll('.word-row').length, 2);
  renderDay(v, 2);
  assertEqual(v.querySelector('.study-placeholder').textContent.trim(), 'Study coming soon.');
  assertIncludes(v.querySelector('.read-callout').textContent, 'Open your Bible to 1 John 1:5–2:6 and read it through.');
  assertIncludes(v.querySelector('h1').textContent, 'What’s the Point');
});
test('app: saved answers from the current version still load', () => {
  withStorage({ 'reflection:1:author': 'An answer I wrote last week' }, () => {
    const v = document.createElement('div'); renderDay(v, 1);
    assertEqual(v.querySelector('#r-author').value, 'An answer I wrote last week');
  });
});
test('app: tapping the check icon toggles the complete button correctly', () => {
  withStorage({ 'complete:1': 'true' }, () => {
    const v = document.createElement('div'); document.body.appendChild(v); renderDay(v, 1);
    const btn = v.querySelector('.complete-btn');
    assert(btn.classList.contains('is-complete'));
    btn.querySelector('svg').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    assert(!btn.classList.contains('is-complete'), 'button no longer complete');
    assertIncludes(btn.textContent, 'Mark day complete');
    assertEqual(localStorage.getItem('complete:1'), 'false');
    v.remove();
  });
});
test('app: day nav links', () => {
  const v = document.createElement('div');
  renderDay(v, 1);
  assert(!v.querySelector('.day-nav [data-dir="prev"]'));
  assertEqual(v.querySelector('.day-nav [data-dir="next"]').getAttribute('href'), '#/day/2');
  renderDay(v, 10);
  assert(!v.querySelector('.day-nav [data-dir="next"]'));
});
test('app: shows a content error when data.js throws while loading', async () => {
  const f = document.createElement('iframe'); f.src = 'runtime-typo.html';
  document.body.appendChild(f);
  await new Promise(r => { f.onload = r; });
  await new Promise(r => setTimeout(r, 50));
  const message = f.contentDocument.querySelector('.content-error');
  assert(message, 'a content error is shown instead of a blank page');
  assertIncludes(message.textContent, 'data.js');
  f.remove();
});
test('app: shows a content error when data.js throws after the days', async () => {
  const f = document.createElement('iframe'); f.src = 'runtime-typo-resources.html';
  document.body.appendChild(f);
  await new Promise(r => { f.onload = r; });
  await new Promise(r => setTimeout(r, 50));
  const message = f.contentDocument.querySelector('.content-error');
  assert(message, 'a content error is shown instead of a half-working site');
  assertIncludes(message.textContent, 'data.js');
  f.remove();
});
test('app: a reading written over several lines keeps its lines and marks', () => {
  const day = DAYS.find(x => x.day === 2);
  const saved = day.reading;
  day.reading = `
    First, read 1 John 1:5-10.
    Then read it again, **slowly**.
    * Circle every "light"
  `;
  const v = document.createElement('div');
  try { renderDay(v, 2); } finally { day.reading = saved; }
  const callout = v.querySelector('.read-callout');
  assertEqual(callout.querySelectorAll('p').length, 2);
  assertIncludes(callout.querySelectorAll('p')[1].innerHTML, '<strong>slowly</strong>');
  assertEqual(callout.querySelectorAll('.study-ul li').length, 1);
});
test('app: a day without reflections still opens, with no Reflect section', () => {
  const day = DAYS.find(x => x.day === 2);
  const saved = day.reflections;
  delete day.reflections;
  const v = document.createElement('div');
  try { renderDay(v, 2); } finally { day.reflections = saved; }
  assert(!v.querySelector('.reflect'), 'no empty Reflect section');
  assert(v.querySelector('#complete-btn'), 'the rest of the day is there');
});
test('app: a page that fails to draw says so instead of freezing the screen', async () => {
  const f = document.createElement('iframe'); f.src = 'day-gap.html';
  document.body.appendChild(f);
  await new Promise(r => { f.onload = r; });
  await new Promise(r => setTimeout(r, 100));
  f.contentWindow.location.hash = '#/day/3';
  await new Promise(r => setTimeout(r, 1200));
  const doc = f.contentDocument;
  assertEqual(doc.querySelectorAll('.view--leaving').length, 0, 'the old page is gone');
  assert(doc.querySelector('.view .content-error'), 'the new page says what went wrong');
  assertEqual(doc.querySelector('.view .back-link').getAttribute('href'), '#/');
  f.remove();
});
