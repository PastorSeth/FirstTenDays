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
test('app: a new version taking over reloads the page once, but not on the very first visit', () => {
  const fakeSW = () => { const sw = new EventTarget(); return sw; };
  let reloads = 0;
  const updating = fakeSW(); updating.controller = {};
  reloadOnUpdate(updating, () => reloads++);
  updating.dispatchEvent(new Event('controllerchange'));
  updating.dispatchEvent(new Event('controllerchange'));
  assertEqual(reloads, 1, 'reloads once when a newer version takes over');
  const first = fakeSW(); first.controller = null;
  reloadOnUpdate(first, () => reloads++);
  first.dispatchEvent(new Event('controllerchange'));
  assertEqual(reloads, 1, 'no reload when the site is installing for the first time');
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
test('app: renderDay shows the Day 1 study and the Day 10 placeholder', () => {
  const v = document.createElement('div');
  renderDay(v, 1);
  assertEqual(v.querySelectorAll('.study .study-h').length, 2);
  assertEqual(v.querySelector('.day-big-num').textContent, '01');
  assertIncludes(v.querySelector('.read-callout').textContent, 'Open your Bible to 1 John 1:1–4 and read it through.');
  assertEqual(v.querySelectorAll('.word-row').length, 2);
  assertEqual(v.querySelector('.reflect .section-h').textContent, 'Context');
  renderDay(v, 10);
  assertEqual(v.querySelector('.study-placeholder').textContent.trim(), 'Study coming soon.');
  assertIncludes(v.querySelector('h1').textContent, 'Abiding in Christ');
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
test('app: tapping the flip card turns it over and back', () => {
  withDay5({ study: '::: flip\n+ Mine\nOld\n+ Theirs\nNew\n:::' }, v => {
    const card = v.querySelector('.fx-flip');
    const [front, back] = card.querySelectorAll('.flip-face');
    card.querySelector('.flip-body p').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    assert(card.classList.contains('is-flipped'), 'flipped');
    assertEqual([card.getAttribute('aria-pressed'), front.getAttribute('aria-hidden'), back.hasAttribute('aria-hidden')], ['true', 'true', false]);
    card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    assert(!card.classList.contains('is-flipped'), 'flipped back with Enter');
    assertEqual([front.hasAttribute('aria-hidden'), back.getAttribute('aria-hidden')], [false, 'true']);
  });
});
test('app: holding the light reveals the answer, and letting go early lets it fade', async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const day = DAYS.find(x => x.day === 5);
  const saved = day.study;
  day.study = '::: hold Embrace the light!\nOne | First.\nTwo | Second.\n:::';
  const v = document.createElement('div');
  document.body.prepend(v);
  try {
    renderDay(v, 5);
    const [a, b] = v.querySelectorAll('.hold-card');
    const press = (card, type) => card.querySelector('.hold-btn').dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 1 }));
    press(a, 'pointerdown'); await wait(500); press(a, 'pointerup');
    const partway = Number(a.style.getPropertyValue('--h'));
    await wait(1200);
    assert(partway > 0.1 && partway < 0.6, `partway after a short hold (${partway})`);
    assertEqual(Number(a.style.getPropertyValue('--h')), 0, 'faded back after letting go');
    assert(!a.classList.contains('is-on'));
    press(b, 'pointerdown'); await wait(2400); press(b, 'pointerup'); await wait(200);
    assert(b.classList.contains('is-on'), 'lit after a full hold');
    assert(!b.querySelector('.hold-answer').hasAttribute('aria-hidden'), 'screen readers hear the answer once it is revealed');
  } finally { day.study = saved; v.remove(); }
});
test('app: the together cards line up as they scroll into place', () => {
  withDay5({ study: '::: together United\nOne\nTwo\n:::' }, v => {
    const fx = v.querySelector('.fx-together');
    fx.__read(0, 800, 800, 300);              // just reaching the bottom of the screen
    assertEqual(fx.style.getPropertyValue('--t'), '0.000');
    fx.__read(0, 800 * 0.35, 800, 300);       // two-thirds of the way up
    assertEqual(fx.style.getPropertyValue('--t'), '1.000');
  });
});
test('app: pen marks are drawn over a highlighted verse once the highlighter is done', () => {
  withDay5({ study: '## Verse 6: ==[circle]No one[/circle] [underline]who lives[/underline] [squiggle]keeps on[/squiggle] [double]sinning[/double]==' }, v => {
    const hl = v.querySelector('.hl');
    const layer = hl.parentElement.querySelector('.pen-layer');
    assert(layer, 'pen layer beside the highlight');
    assertEqual(layer.getAttribute('aria-hidden'), 'true');
    const kinds = [...new Set([...layer.children].map(c => c.getAttribute('class')))];
    assertEqual(kinds, ['pen-circle', 'pen-line', 'pen-wave', 'pen-double']);
    // (The test page has no stylesheet, so this reads where the circle is placed.)
    const base = hl.parentElement.getBoundingClientRect();
    const cs = layer.querySelector('.pen-circle').style;
    const [left, width] = [parseFloat(cs.left), parseFloat(cs.width)];
    const words = [...hl.querySelectorAll('.pen-t[data-pen="0"]')].map(w => w.getBoundingClientRect());
    assert(left < words[0].left - base.left && left + width > words[1].right - base.left, 'the circle goes around "No one"');
    // 7 words share the highlighter's 1500ms, after its 200ms start, then a 250ms pause.
    assertEqual(layer.querySelector('.pen-circle').style.getPropertyValue('--delay'), '1950ms');
  });
});
test('app: the retype button backspaces to where the lines differ, then types the correction', async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const html = document.documentElement;
  const hadMotion = html.classList.contains('motion-on');
  html.classList.add('motion-on');
  const day = DAYS.find(x => x.day === 5);
  const saved = day.study;
  day.study = '::: retype\nGod put Christians here.\nActually.\nGod put **YOU** here!\n:::';
  const v = document.createElement('div');
  document.body.prepend(v);
  try {
    renderDay(v, 5);
    const fx = v.querySelector('.fx-retype');
    const chars = () => fx.querySelector('.type-chars').textContent;
    const btn = fx.querySelector('.retype-btn');
    btn.click();
    assert(!btn.hidden && btn.classList.contains('is-leaving'), 'the button animates away instead of vanishing');
    assert(btn.getAnimations().length > 0, 'the button is animating');
    await wait(600);
    const partway = chars();
    assert(partway.length < 'God put Christians here.'.length && partway.startsWith('God put '), `backspacing (${partway})`);
    await wait(1400);
    assertEqual(chars(), 'God put YOU here!');
    assertEqual(fx.querySelector('.type-chars strong').textContent, 'YOU');
    const all = [...fx.querySelectorAll('.type-chars .ch')];
    assert(all.slice(0, 8).every(c => parseFloat(c.style.getPropertyValue('--i')) < 0), 'the part that stays is already typed');
    assertEqual(all[8].style.getPropertyValue('--i'), '0', 'typing picks up where the lines differ');
    assertEqual(fx.querySelector('.sr-only').innerHTML, 'God put <strong>YOU</strong> here!');
    assert(fx.querySelector('.retype-btn').hidden, 'the button goes away');
  } finally { day.study = saved; v.remove(); if (!hadMotion) html.classList.remove('motion-on'); }
});
test('app: without motion, the retype button swaps the correction straight in', () => {
  const html = document.documentElement;
  const hadMotion = html.classList.contains('motion-on');
  html.classList.remove('motion-on');
  try {
    withDay5({ study: '::: retype\nGod put Christians here.\nActually.\nGod put **YOU** here!\n:::' }, v => {
      v.querySelector('.retype-btn').click();
      assertEqual(v.querySelector('.type-chars').textContent, 'God put YOU here!');
      assert(v.querySelector('.retype-btn').hidden);
    });
  } finally { if (hadMotion) html.classList.add('motion-on'); }
});
test('app: the first echo gathers as it rises up the screen', () => {
  withDay5({ study: '::: echo\nGOD\nANSWERS\nPRAYER\n:::' }, v => {
    const fx = v.querySelector('.fx-echo');
    const lt = () => [...fx.querySelectorAll('.echo-ln')].map(l => l.style.getPropertyValue('--lt'));
    fx.__read(0, 800 * 0.95, 800, 300);   // just up from the bottom of the screen
    assertEqual(lt(), ['0.000', '0.000', '0.000']);
    fx.__read(0, 800 * 0.4, 800, 300);    // 40% of the way down: all gathered
    assertEqual(lt(), ['1.000', '1.000', '1.000']);
    fx.__read(0, 800 * 0.7, 800, 300);    // partway, each line a little behind the one above
    const [g, a, p] = lt().map(Number);
    assert(g > a && a > p && p >= 0, `staggered (${lt()})`);
  });
});
test('app: an echo button pops away, the words open in, then they gather', async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const html = document.documentElement;
  const hadMotion = html.classList.contains('motion-on');
  html.classList.add('motion-on');
  const day = DAYS.find(x => x.day === 5);
  const saved = day.study;
  day.study = '::: echo\nGOD\n:::\n::: echo Again!\nGOD\nANSWERS\n:::';
  const v = document.createElement('div');
  document.body.prepend(v);
  try {
    renderDay(v, 5);
    const fx = v.querySelectorAll('.fx-echo')[1];
    const btn = fx.querySelector('.echo-btn');
    const reveal = fx.querySelector('.echo-reveal');
    btn.click();
    assert(btn.classList.contains('is-leaving') && !btn.hidden, 'the button animates away');
    assert(reveal.hidden && !fx.classList.contains('is-on'), 'the words wait for the button to go');
    await wait(1300);
    assert(btn.hidden, 'the button is gone');
    assert(!reveal.hidden, 'the words are there');
    assert(fx.classList.contains('is-on'), 'the words gather in');
    assertEqual(document.activeElement, reveal, 'focus moves to the words');
  } finally { day.study = saved; v.remove(); if (!hadMotion) html.classList.remove('motion-on'); }
});
test('app: without motion, an echo button shows the words straight away', () => {
  const html = document.documentElement;
  const hadMotion = html.classList.contains('motion-on');
  html.classList.remove('motion-on');
  try {
    withDay5({ study: '::: echo\nGOD\n:::\n::: echo Again!\nGOD\n:::' }, v => {
      const fx = v.querySelectorAll('.fx-echo')[1];
      fx.querySelector('.echo-btn').click();
      assert(fx.querySelector('.echo-btn').hidden);
      assert(!fx.querySelector('.echo-reveal').hidden);
      assert(fx.classList.contains('is-on'));
    });
  } finally { if (hadMotion) html.classList.add('motion-on'); }
});
test('app: each part of the bridge counts as its top slides up under the drawing', () => {
  // A part starts 10px in and is done 60% of the way through.
  assertEqual(bridgeProgress(100, [{ top: 95, height: 500 }, { top: 595, height: 500 }]), 0);
  assertEqual(bridgeProgress(100, [{ top: -60, height: 500 }, { top: 440, height: 500 }]), 0.5);
  assertEqual(bridgeProgress(100, [{ top: -210, height: 500 }, { top: 290, height: 500 }]), 1);
  assertEqual(bridgeProgress(100, [{ top: -800, height: 500 }, { top: -300, height: 500 }]), 2);
});
test('app: at each point in the scroll, the bridge shows just what has been reached', () => {
  withDay5({ study: '::: bridge\n+ GOD\nA\n+ MAN\nB\n+ JESUS\nC\n+ RESPONSE\nD\n:::' }, v => {
    const fx = v.querySelector('.fx-bridge');
    const art = fx.querySelector('svg');
    const text = name => [...art.querySelectorAll('text')].find(t => t.textContent === name);
    const cross = art.querySelector('path.thick');
    bridgeApply(fx, 0);
    assertEqual(text('GOD').style.getPropertyValue('--p'), '0.000');
    assertEqual(cross.style.opacity, '0', 'a line not yet started is hidden');
    bridgeApply(fx, 2.35);   // halfway through drawing the cross
    assertEqual(text('GOD').style.getPropertyValue('--p'), '1.000');
    assertEqual(text('SIN').style.getPropertyValue('--p'), '1.000');
    assertEqual(parseFloat(cross.style.strokeDashoffset), 0.5);
    assertEqual(text('JESUS').style.getPropertyValue('--p'), '0.000');
    assertEqual([...fx.querySelectorAll('.bridge-steps li')].map(li => li.className), ['done', 'done', 'now', '']);
    bridgeApply(fx, 4);
    assertEqual(art.querySelector('[data-who]').getAttribute('transform'), 'translate(218.0,0.0)', 'walked across to God');
    assert([...art.querySelectorAll('path[data-at]')].every(p => parseFloat(p.style.strokeDashoffset) === 0), 'every line drawn');
  });
});
test('app: without motion, the bridge drawing is simply complete', () => {
  const html = document.documentElement;
  const hadMotion = html.classList.contains('motion-on');
  html.classList.remove('motion-on');
  try {
    withDay5({ study: '::: bridge\n+ GOD\nA\n+ MAN\nB\n+ JESUS\nC\n+ RESPONSE\nD\n:::' }, v => {
      const art = v.querySelector('.fx-bridge svg');
      const faith = [...art.querySelectorAll('text')].find(t => t.textContent === 'in faith');
      assertEqual(faith.style.getPropertyValue('--p'), '1.000');
      assertEqual(art.querySelector('[data-who]').getAttribute('transform'), 'translate(218.0,0.0)');
    });
  } finally { if (hadMotion) html.classList.add('motion-on'); }
});
const TEMPT = { id: 'tempt', type: 'choices', label: 'What tempts you?', options: ['Comfort', 'Doubts, fears', 'Lust'], other: 'Other' };
test('app: a choices question is a cluster of bubbles to tap, and saves what is picked', () => {
  withStorage({ 'reflection:5:tempt': '' }, () => {
    withDay5({ questions: [TEMPT] }, v => {
      const group = v.querySelector('.bubbles[role="group"]');
      assert(group, 'a group of bubbles');
      assertEqual(group.getAttribute('aria-labelledby'), group.closest('.reflection').querySelector('label').id, 'the question names the group');
      const bubbles = [...group.querySelectorAll('button.bubble')];
      assertEqual(bubbles.map(b => b.textContent), ['Comfort', 'Doubts, fears', 'Lust', 'Other']);
      assert(bubbles.every(b => b.getAttribute('aria-pressed') === 'false'), 'nothing picked yet');
      assert(bubbles.some(b => b.style.getPropertyValue('--tilt') !== bubbles[0].style.getPropertyValue('--tilt')), 'they sit at different tilts, as a cluster');
      bubbles[1].click();
      bubbles[2].click();
      assertEqual(bubbles[1].getAttribute('aria-pressed'), 'true');
      assertEqual(localStorage.getItem('reflection:5:tempt'), 'Doubts, fears; Lust');
      bubbles[2].click();
      assertEqual(localStorage.getItem('reflection:5:tempt'), 'Doubts, fears', 'tapping again lets go of it');
    });
  });
});
test('app: Other opens a box to fill in, and it all comes back next visit', () => {
  withStorage({ 'reflection:5:tempt': '' }, () => {
    withDay5({ questions: [TEMPT] }, v => {
      const other = v.querySelector('.bubble--other');
      const box = v.querySelector('.bubble-other');
      assert(box.hidden, 'the box waits for Other');
      other.click();
      assert(!box.hidden, 'Other opens the box');
      assertEqual(other.getAttribute('aria-expanded'), 'true');
      box.value = 'my phone';
      box.dispatchEvent(new Event('input', { bubbles: true }));
      v.querySelector('.bubble').click();
      assertEqual(localStorage.getItem('reflection:5:tempt'), 'Comfort; Other: my phone');
    });
    withDay5({ questions: [TEMPT] }, v => {
      const pressed = [...v.querySelectorAll('.bubble[aria-pressed="true"]')].map(b => b.textContent);
      assertEqual(pressed, ['Comfort', 'Other']);
      assertEqual(v.querySelector('.bubble-other').value, 'my phone');
      assert(!v.querySelector('.bubble-other').hidden);
    });
  });
});