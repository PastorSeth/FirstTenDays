test('motion: velocityStep smooths and clamps', () => {
  assertClose(Motion.velocityStep(0, 40, 16), 0.4);
  assertClose(Motion.velocityStep(0.4, 40, 16), 0.64);
  assertClose(Motion.velocityStep(0, 400, 16), 1);
  assertClose(Motion.velocityStep(0, -400, 16), -1);
  assertClose(Motion.velocityStep(0, 40, 0), 0.8);
});
test('motion: decay eases to zero', () => {
  assertClose(Motion.decay(0.5), 0.43);
  assertClose(Motion.decay(-0.5), -0.43);
  assertEqual(Motion.decay(0.01), 0);
});
test('motion: progress across an element pass', () => {
  assertClose(Motion.progress(150, 80, 0, 812), 0);
  assertClose(Motion.progress(150, 80, 115, 812), 0.5);
  assertClose(Motion.progress(150, 80, 230, 812), 1);
  assertClose(Motion.progress(2000, 100, 1188, 812), 0);
  assertClose(Motion.progress(2000, 100, 1644, 812), 0.5);
  assertClose(Motion.progress(2000, 100, 5000, 812), 1);
});
test('motion: slideAmount for rows entering from the bottom', () => {
  assertClose(Motion.slideAmount(100, 812), 0);
  assertClose(Motion.slideAmount(600.88, 812), 0);
  assertClose(Motion.slideAmount(706.44, 812), 0.5);
  assertClose(Motion.slideAmount(900, 812), 1);
});
test('motion: scan writes --p on drift rows and reveals visible quotes', async () => {
  const root = document.createElement('div');
  root.innerHTML = '<div data-drift="left" style="height:50px">X</div><blockquote data-reveal>Q</blockquote>';
  document.body.prepend(root);
  Motion.init(); Motion.scan(root);
  assert(root.querySelector('[data-drift]').style.getPropertyValue('--p') !== '', 'drift row got --p');
  await new Promise(r => setTimeout(r, 200));
  assert(root.querySelector('[data-reveal]').classList.contains('is-revealed'), 'quote revealed');
  Motion.clear(); root.remove();
});
test('motion: reduced motion turns motion-on off', () => {
  const saved = Motion.reduced;
  Motion.reduced = () => true; Motion.init();
  assert(!document.documentElement.classList.contains('motion-on'));
  Motion.reduced = saved; Motion.init();
  assert(document.documentElement.classList.contains('motion-on'));
});
test('motion: home entrance animates marked elements, skipped under Reduce Motion', () => {
  const root = document.createElement('div');
  root.innerHTML = '<div class="masthead-rule"></div><div class="word-row-wrap"></div><h1 data-rise>T</h1><a class="day-row">1</a><a class="up-next">U</a>';
  document.body.appendChild(root);
  Motion.entrance('home', root);
  ['.masthead-rule', '.word-row-wrap', '[data-rise]', '.day-row', '.up-next'].forEach(s =>
    assertEqual(root.querySelector(s).getAnimations().length, 1, s));
  Motion.finishActive();
  const saved = Motion.reduced; Motion.reduced = () => true;
  Motion.entrance('home', root);
  assertEqual(root.querySelector('[data-rise]').getAnimations().length, 0);
  Motion.reduced = saved; root.remove();
});
test('motion: day entrance sweeps rows and raises content', () => {
  const root = document.createElement('div');
  root.innerHTML = '<div class="word-row-wrap"></div><div class="word-row-wrap"></div><h1 data-rise>T</h1>';
  document.body.appendChild(root);
  Motion.entrance('day', root);
  assertEqual(root.querySelectorAll('.word-row-wrap')[1].getAnimations().length, 1);
  assertEqual(root.querySelector('[data-rise]').getAnimations().length, 1);
  Motion.finishActive(); root.remove();
});
function twoViews() {
  const a = document.createElement('div'), b = document.createElement('div');
  a.innerHTML = '<span class="day-num" style="font-size:44px;line-height:.9">02</span>';
  b.innerHTML = '<span class="day-big-num" style="font-size:120px;line-height:.9">02</span>';
  document.body.prepend(b); document.body.prepend(a);
  return { a, b, from: a.firstChild, to: b.firstChild, done: () => { a.remove(); b.remove(); } };
}
test('motion: open flight hides the target number until it lands', async () => {
  const v = twoViews();
  const p = Motion.transition('open', v.a, v.b, { fromEl: v.from, toEl: v.to });
  assertEqual(v.to.style.visibility, 'hidden');
  assertEqual(document.querySelectorAll('.fly-num').length, 2);
  await p;
  assertEqual(v.to.style.visibility, '');
  assertEqual(document.querySelectorAll('.fly-num').length, 0);
  v.done();
});
test('motion: next transition resolves in time and leaves no running animations', async () => {
  const v = twoViews(); const t0 = performance.now();
  await Motion.transition('next', v.a, v.b, {});
  assert(performance.now() - t0 < 700, 'finished in time');
  assertEqual(v.b.getAnimations().length, 0);
  v.done();
});
test('motion: finishActive settles a running transition immediately', async () => {
  const v = twoViews();
  const p = Motion.transition('open', v.a, v.b, { fromEl: v.from, toEl: v.to });
  const t0 = performance.now(); Motion.finishActive(); await p;
  assert(performance.now() - t0 < 100, 'settled quickly');
  assertEqual(document.querySelectorAll('.fly-num').length, 0);
  v.done();
});
test('motion: Reduce Motion turns transitions into a short crossfade', async () => {
  const v = twoViews(); const saved = Motion.reduced; Motion.reduced = () => true;
  const t0 = performance.now();
  const p = Motion.transition('open', v.a, v.b, { fromEl: v.from, toEl: v.to });
  assertEqual(document.querySelectorAll('.fly-num').length, 0);
  await p;
  assert(performance.now() - t0 < 250, 'short crossfade');
  Motion.reduced = saved; v.done();
});
test('motion: the jump to a new page is not read as a flick', async () => {
  const frame = () => new Promise(r => requestAnimationFrame(() => r()));
  const speed = () => Math.abs(Number(document.documentElement.style.getPropertyValue('--v') || 0));
  const spacer = document.createElement('div');
  spacer.style.height = '6000px';
  document.body.appendChild(spacer);
  Motion.init();
  window.scrollTo(0, 3000);
  await frame(); await frame();
  // What the router does when a page changes: jump, then scan the new page.
  window.scrollTo(0, 0);
  Motion.scan(document.createElement('div'));
  let largest = 0;
  for (let i = 0; i < 4; i++) { await frame(); largest = Math.max(largest, speed()); }
  spacer.remove();
  assert(largest < 0.05, `the rows skewed as if flicked (speed ${largest.toFixed(3)})`);
});
test('motion: opening a day slides each word row in from its own side', async () => {
  const f = document.createElement('iframe'); f.src = 'word-rows.html';
  f.style.cssText = 'width:375px;height:812px;border:0';
  document.body.prepend(f);
  await new Promise(r => { f.onload = r; });
  const win = f.contentWindow, doc = f.contentDocument;
  await new Promise(r => setTimeout(r, 1300));   // let the first-load entrance finish
  const opened = new Promise(r => win.addEventListener('hashchange', r, { once: true }));
  win.location.hash = '#/day/1';
  await opened;
  await new Promise(r => win.requestAnimationFrame(() => r()));
  const width = doc.documentElement.clientWidth;
  const extent = (row) => { const range = doc.createRange(); range.selectNodeContents(row.firstChild); return range.getBoundingClientRect(); };
  const [outlined, red] = doc.querySelectorAll('.view--day:not(.view--leaving) .word-row');
  const outlinedLeft = Math.round(extent(outlined).left), redRight = Math.round(extent(red).right);
  f.remove();
  assert(outlinedLeft >= width, `the outlined row starts past the right edge (its left end was at ${outlinedLeft}px)`);
  assert(redRight <= 0, `the red row starts past the left edge (its right end was at ${redRight}px)`);
});
