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
