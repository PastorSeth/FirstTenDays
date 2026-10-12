/* ==========================================================
   FIRST 10 DAYS — Motion
   Everything that moves lives here. A small scroll engine hands the
   stylesheet a few numbers once per frame, and the stylesheet does
   the actual moving with transform and opacity only — the two things
   phones can animate without redrawing the page.

     --v / --va    on <html>: scroll speed, -1..1, and its size 0..1
     --p           on each [data-drift] word row: 0..1 through its pass
     --k           on each [data-slide-in] row: 0 = in place, 1 = still entering
     .is-active    on a registered element while it's on screen
     .is-revealed  on a [data-reveal] pull quote once it has been seen
     .motion-on    on <html> whenever motion is allowed (not Reduce Motion)

   Nothing here runs while the page sits still: a frame is only
   scheduled on scroll, and the loop stops once the speed settles.
   ========================================================== */

const Motion = (() => {
  const VELOCITY_PX = 40;   // px of scroll per 16ms frame that counts as full speed

  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

  /* ---------- The math (pure, so it can be tested on its own) ---------- */

  function velocityStep(prev, deltaPx, dtMs) {
    const inst = (deltaPx / Math.max(dtMs, 8)) * 16 / VELOCITY_PX;
    return clamp(prev * 0.6 + inst * 0.4, -1, 1);
  }

  function decay(v) {
    const next = v * 0.86;
    return Math.abs(next) < 0.01 ? 0 : next;
  }

  /* 0 when the element first scrolls into view (or at the top of the page,
     for things that start on screen), 1 once it has scrolled off the top. */
  function progress(top, height, scrollY, viewportH) {
    const start = Math.max(0, top - viewportH);
    const end = top + height;
    if (end <= start) return 1;
    return clamp((scrollY - start) / (end - start), 0, 1);
  }

  /* Rows ease in across the bottom quarter of the screen. */
  function slideAmount(centerY, viewportH) {
    return clamp((centerY - 0.74 * viewportH) / (0.26 * viewportH), 0, 1);
  }

  const reducedQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  function reduced() {
    return !!(reducedQuery && reducedQuery.matches);
  }

  /* ---------- The scroll engine ---------- */

  const drifting = new Set();
  const sliding = new Set();
  const geometry = new Map();   // element -> { top, height } in page coordinates
  const onScreen = new Set();
  let viewObserver = null;
  let revealObserver = null;

  let allowed = false;
  let listening = false;
  let frame = 0;
  let velocity = 0;
  let lastY = 0;
  let lastTime = 0;

  function measure(el) {
    const r = el.getBoundingClientRect();
    geometry.set(el, { top: r.top + window.scrollY, height: r.height });
  }

  function measureAll() {
    drifting.forEach(measure);
    sliding.forEach(measure);
  }

  function update(el, scrollY, vh) {
    const g = geometry.get(el);
    if (!g) return;
    if (drifting.has(el)) el.style.setProperty('--p', progress(g.top, g.height, scrollY, vh).toFixed(4));
    if (sliding.has(el)) el.style.setProperty('--k', slideAmount(g.top + g.height / 2 - scrollY, vh).toFixed(4));
  }

  function updateAll(elements) {
    if (!allowed) return;
    const y = window.scrollY;
    const vh = window.innerHeight;
    elements.forEach(el => update(el, y, vh));
  }

  function writeVelocity() {
    const style = document.documentElement.style;
    style.setProperty('--v', velocity.toFixed(3));
    style.setProperty('--va', Math.abs(velocity).toFixed(3));
  }

  function tick(now) {
    frame = 0;
    if (!allowed) return;
    const y = window.scrollY;
    const delta = y - lastY;
    velocity = delta !== 0 ? velocityStep(velocity, delta, now - lastTime) : decay(velocity);
    lastY = y;
    lastTime = now;
    writeVelocity();
    updateAll(onScreen);
    if (velocity !== 0) frame = requestAnimationFrame(tick);
  }

  function schedule() {
    if (allowed && !frame) frame = requestAnimationFrame(tick);
  }

  function viewWatcher() {
    if (!viewObserver) {
      viewObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          const el = entry.target;
          if (entry.isIntersecting) {
            onScreen.add(el);
            el.classList.add('is-active');
            updateAll([el]);
          } else {
            onScreen.delete(el);
            el.classList.remove('is-active');
          }
        });
      }, { rootMargin: '10%' });
    }
    return viewObserver;
  }

  function register(el, group) {
    group.add(el);
    measure(el);
    if ('IntersectionObserver' in window) viewWatcher().observe(el);
    else onScreen.add(el);
  }

  function watchReveal(el) {
    if (!allowed || !('IntersectionObserver' in window)) {
      el.classList.add('is-revealed');
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          // 30% visible — or, for something taller than the screen, enough of it.
          const seen = entry.intersectionRatio >= 0.3 || entry.intersectionRect.height >= window.innerHeight * 0.3;
          if (entry.isIntersecting && seen) {
            entry.target.classList.add('is-revealed');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: [0, 0.3] });
    }
    revealObserver.observe(el);
  }

  /* ---------- Public ---------- */

  function init() {
    allowed = !api.reduced();
    document.documentElement.classList.toggle('motion-on', allowed);
    if (!allowed) {
      velocity = 0;
      document.documentElement.style.removeProperty('--v');
      document.documentElement.style.removeProperty('--va');
    }
    if (listening) return;
    listening = true;

    lastY = window.scrollY;
    lastTime = performance.now();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', () => { measureAll(); updateAll(onScreen); }, { passive: true });
    if (reducedQuery) {
      const onChange = () => init();
      if (reducedQuery.addEventListener) reducedQuery.addEventListener('change', onChange);
      else if (reducedQuery.addListener) reducedQuery.addListener(onChange);
    }
    // Text reflows when the web font arrives, which moves everything.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { measureAll(); updateAll([...drifting, ...sliding]); });
    }
  }

  function scan(root) {
    root.querySelectorAll('[data-reveal]').forEach(watchReveal);
    if (!allowed) return;
    root.querySelectorAll('[data-drift]').forEach(el => register(el, drifting));
    root.querySelectorAll('[data-slide-in]').forEach(el => register(el, sliding));
    updateAll([...drifting, ...sliding]);
  }

  function clear() {
    if (viewObserver) viewObserver.disconnect();
    if (revealObserver) revealObserver.disconnect();
    viewObserver = null;
    revealObserver = null;
    drifting.clear();
    sliding.clear();
    geometry.clear();
    onScreen.clear();
  }

  const api = { VELOCITY_PX, velocityStep, decay, progress, slideAmount, reduced, init, scan, clear };
  return api;
})();
