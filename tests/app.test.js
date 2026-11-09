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
test('app: renderDay shows the Day 1 study and the Day 5 placeholder', () => {
  const v = document.createElement('div');
  renderDay(v, 1);
  assertEqual(v.querySelectorAll('.study .study-h').length, 2);
  assertEqual(v.querySelector('.day-big-num').textContent, '01');
  assertIncludes(v.querySelector('.read-callout').textContent, 'Open your Bible to 1 John 1:1–4 and read it through.');
  assertEqual(v.querySelectorAll('.word-row').length, 2);
  assertEqual(v.querySelector('.reflect .section-h').textContent, 'Context');
  renderDay(v, 5);
  assertEqual(v.querySelector('.study-placeholder').textContent.trim(), 'Study coming soon.');
  assertIncludes(v.querySelector('h1').textContent, 'Why Is Life Still Hard');
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
test('app: marking a day complete shows the finish line, unmarking clears it', () => {
  const keys = {}; DAYS.forEach(d => { keys['complete:' + d.day] = d.day === 2 ? 'true' : 'false'; });
  withStorage(keys, () => {
    const v = document.createElement('div'); document.body.appendChild(v); renderDay(v, 1);
    const btn = v.querySelector('.complete-btn');
    assertEqual(btn.getAttribute('aria-pressed'), 'false');
    assert(!v.querySelector('.celebrate'), 'no finish line before the tap');
    btn.click();
    assertEqual(btn.getAttribute('aria-pressed'), 'true');
    assert(v.querySelector('.celebrate--play'), 'the finish line plays');
    assertIncludes(v.querySelector('.celebrate-row--outline').textContent, 'Day 01');
    assertEqual(v.querySelector('.celebrate-count').textContent, '2 of 10 days done. 8 to go.');
    assertEqual(v.querySelectorAll('.celebrate-track .is-done').length, 2);
    assertEqual(v.querySelector('.celebrate-next').getAttribute('href'), '#/day/3');
    assertIncludes(v.querySelector('#complete-status').textContent, 'Day 1 complete.');
    btn.click();
    assert(!v.querySelector('.celebrate'), 'finish line gone after unmarking');
    assertIncludes(v.querySelector('#complete-status').textContent, 'not complete');
    v.remove();
  });
  const all = {}; DAYS.forEach(d => { all['complete:' + d.day] = 'true'; });
  withStorage(all, () => {
    const v = document.createElement('div'); renderDay(v, 10);
    assert(v.querySelector('.celebrate'), 'a finished day keeps its finish line, without replaying it');
    assert(!v.querySelector('.celebrate--play'));
    assertEqual(v.querySelector('.celebrate-count').textContent, 'All 10 days done.');
    assert(!v.querySelector('.celebrate-next'), 'nothing left to go to');
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
/* Renders Day 5 (a placeholder day) with some fields swapped in, then puts it back. */
function withDay5(fields, fn) {
  const day = DAYS.find(x => x.day === 5);
  const saved = Object.assign({}, day);
  Object.assign(day, fields);
  const v = document.createElement('div');
  document.body.appendChild(v);
  try { renderDay(v, 5); fn(v); } finally {
    Object.keys(day).forEach(k => delete day[k]);
    Object.assign(day, saved);
    v.remove();
  }
}
test('app: MAPS can come before the study, with application questions after', () => {
  withDay5({ reflectFirst: true, reflectTitle: 'MAPS', study: 'Lesson text',
    questions: [{ id: 'q1', label: 'First?' }, { id: 'q2', label: 'Second?' }] }, v => {
    const order = [...v.querySelectorAll('.day-body > *')].map(el => el.className.split(' ')[0]);
    assertEqual(order.slice(0, 4), ['reflect', 'study-label', 'study', 'reflect']);
    assertEqual(v.querySelector('.reflect .section-h').textContent, 'MAPS');
    const questions = v.querySelectorAll('.reflect')[1];
    assertEqual(questions.querySelector('.section-h').textContent, 'Application Questions');
    assertEqual([...questions.querySelectorAll('textarea')].map(t => t.dataset.field), ['q1', 'q2']);
  });
  withDay5({ questions: [{ id: 'q1', label: 'Only one?' }] }, v => {
    assertEqual(v.querySelectorAll('.reflect')[1].querySelector('.section-h').textContent, 'Application Question');
  });
});
test('app: a reflection can carry its own question and a hint behind a button', () => {
  withDay5({ reflections: [{ id: 'author', label: 'Who wrote it?', prompt: 'What do we know?', question: 'Day question', hint: 'Check the first 40 seconds.' }] }, v => {
    assertEqual(v.querySelector('.prompt-question').textContent, 'Day question');
    const btn = v.querySelector('.hint-btn'), hint = v.querySelector('.hint');
    assert(hint.hidden, 'hint starts hidden');
    btn.click();
    assert(!hint.hidden && btn.getAttribute('aria-expanded') === 'true', 'hint shown');
    btn.click();
    assert(hint.hidden, 'hint hidden again');
  });
});
test('app: a scale question is a 1-10 slider that saves where it is', () => {
  withStorage({ 'reflection:5:confidence': '7' }, () => {
    withDay5({ questions: [{ id: 'confidence', type: 'scale', label: 'How confident?', low: 'Not at all', high: 'Totally' }] }, v => {
      const slider = v.querySelector('input[type="range"][data-field="confidence"]');
      assertEqual([slider.min, slider.max, slider.value], ['1', '10', '7']);
      assertEqual(v.querySelector('.scale-value').textContent, '7');
      slider.value = '3';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      assertEqual(localStorage.getItem('reflection:5:confidence'), '3');
      assertEqual(v.querySelector('.scale-value').textContent, '3');
    });
  });
});
test('app: study effects respond to taps', () => {
  withDay5({ study: '::: swap\n+ Mine\nOld\n+ Theirs\nNew\n:::\nA {{word|its meaning}} here.\n::: trinity' }, v => {
    const tabs = v.querySelectorAll('.swap-tab'), panels = v.querySelectorAll('.swap-panel');
    tabs[1].click();
    assert(panels[1].classList.contains('is-on') && !panels[0].classList.contains('is-on'), 'second panel showing');
    assertEqual([tabs[0].getAttribute('aria-pressed'), tabs[1].getAttribute('aria-pressed')], ['false', 'true']);
    assertEqual(panels[0].getAttribute('aria-hidden'), 'true');

    v.querySelector('.vocab').click();
    const sheet = v.querySelector('.vocab-sheet');
    assert(sheet.classList.contains('is-open'), 'definition open');
    assertEqual(sheet.querySelector('.vocab-term').textContent, 'word');
    assertEqual(sheet.querySelector('.vocab-def').textContent, 'its meaning');
    sheet.querySelector('.vocab-close').click();
    assert(!sheet.classList.contains('is-open'), 'definition closed');

    v.querySelector('.tri-node[data-person="son"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    assertEqual(v.querySelector('.fx-trinity').dataset.focus, 'son');
    assertIncludes(v.querySelector('.tri-caption').textContent, 'The Son is God.');
  });
});
test('app: a question can ask for a large answer box', () => {
  withDay5({ questions: [{ id: 'story', label: 'Write out your story.', size: 'large' }, { id: 'short', label: 'Quick one?' }] }, v => {
    assert(v.querySelector('textarea[data-field="story"]').classList.contains('is-large'), 'story box is large');
    assert(!v.querySelector('textarea[data-field="short"]').classList.contains('is-large'), 'other boxes stay normal');
  });
});
test('app: tapping God in the middle of the shield un-fades everything', () => {
  withDay5({ study: '::: trinity' }, v => {
    const shield = v.querySelector('.fx-trinity'), god = v.querySelector('.tri-god');
    assertEqual(god.getAttribute('role'), 'button');
    v.querySelector('.tri-node[data-person="spirit"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    assertEqual(shield.dataset.focus, 'spirit');
    god.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    assertEqual(shield.dataset.focus, '');
    assertEqual(v.querySelector('.tri-caption').textContent, 'Tap Father, Son, or Holy Spirit.');
    v.querySelector('.tri-node[data-person="son"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    god.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    assertEqual(shield.dataset.focus, '', 'Enter on God works too');
  });
});
test('app: the typewriter types as it is read, then signs and underlines', () => {
  withDay5({ study: '::: typewriter C.S. Lewis\nNot fit to ==clean those boots== at all\n:::' }, v => {
    const tw = v.querySelector('.fx-typewriter');
    const typed = () => tw.querySelector('.tw-typed').textContent;
    // Without scrolling (no motion), the whole quote is there, signed and underlined.
    assertEqual(typed(), 'Not fit to clean those boots at all');
    assert(tw.classList.contains('is-done'), 'starts finished');
    assertEqual(tw.querySelectorAll('.pw').length, 3);
    tw.__read(0, 330, 800, 600);   // flat, but the reading hasn't reached it
    assertEqual(typed(), '', 'nothing typed yet');
    assert(!tw.classList.contains('is-done'));
    tw.__read(0.4, 100, 800, 600);
    assert(typed().length > 0 && typed().length < 35, `part typed (${typed().length})`);
    tw.__read(1, -400, 800, 600);
    assertEqual(typed(), 'Not fit to clean those boots at all');
    assert(tw.classList.contains('is-done'), 'finished again');
  });
});
test('app: the typewriter starts typing from the first letter when the page lands flat', () => {
  withDay5({ study: '::: typewriter\nA quote long enough to notice a jump in typing\n:::' }, v => {
    const tw = v.querySelector('.fx-typewriter');
    tw.__read(0.4, 0.4 * 800, 800, 1500);   // the moment it lies flat
    assertEqual(tw.querySelector('.tw-typed').textContent, '');
  });
});
