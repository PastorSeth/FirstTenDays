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

  /* ---------- One-off animations: entrances (and, later, transitions) ----------
     These use the Web Animations API with fill: 'backwards', so an element
     waits in its starting pose through its delay and hands back to the
     stylesheet the moment it finishes. Every animation started here is
     tracked, so finishActive() can settle them all at once. */

  const EASE_OUT = 'cubic-bezier(.2,.8,.2,1)';
  const RISE = [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }];
  const running = new Set();

  function canAnimate() {
    return typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function';
  }

  function play(el, keyframes, options) {
    const animation = el.animate(keyframes, Object.assign({ easing: EASE_OUT, fill: 'backwards' }, options));
    running.add(animation);
    const done = () => running.delete(animation);
    animation.finished.then(done, done);
    return animation;
  }

  /* Word rows sweep in from alternate edges: the first row (which drifts
     left) arrives from the right, the next from the left, and so on. */
  function sweepRows(root, baseDelay) {
    root.querySelectorAll('.word-row-wrap').forEach((el, i) => {
      const from = i % 2 === 0 ? '110%' : '-110%';
      play(el, [{ transform: `translateX(${from})` }, { transform: 'none' }], { duration: 640, delay: baseDelay + i * 60 });
    });
  }

  /* The first-load entrance. Both pages sweep their word rows in and raise
     their content; home also draws its masthead rule, cascades the day
     rows, and slides the Up next bar up. */
  function entrance(kind, root) {
    if (api.reduced() || !canAnimate() || !root) return;
    if (kind !== 'home' && kind !== 'day') return;

    if (kind === 'home') {
      root.querySelectorAll('.masthead-rule').forEach(el =>
        play(el, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 500 }));
    }
    sweepRows(root, 80);
    root.querySelectorAll('[data-rise]').forEach((el, i) =>
      play(el, RISE, { duration: 420, delay: 220 + i * 60 }));
    if (kind === 'home') {
      root.querySelectorAll('.day-row').forEach((el, i) =>
        play(el, [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 360, delay: 300 + i * 40 }));
      root.querySelectorAll('.up-next').forEach(el =>
        play(el, [{ transform: 'translateY(140%)' }, { transform: 'none' }], { duration: 420, delay: 600 }));
    }
  }

  /* ---------- Page transitions ---------- */

  const EASE_INOUT = 'cubic-bezier(.7,0,.2,1)';
  let settlePending = null;   // tidies up the transition that's still running, if any

  /* Resolve once every animation has finished (or been finished early),
     after running the cleanup. */
  function settle(animations, cleanup) {
    return new Promise(resolve => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        if (settlePending === done) settlePending = null;
        if (cleanup) cleanup();
        resolve();
      };
      settlePending = done;
      Promise.all(animations.map(a => a.finished.catch(() => {}))).then(done);
    });
  }

  function isOnScreen(rect) {
    return rect.width > 0 && rect.bottom > 0 && rect.top < window.innerHeight &&
      rect.right > 0 && rect.left < window.innerWidth;
  }

  /* The tapped day's number flies to where the new page's big number sits
     (or back again). Two stacked copies crossfade so the color changes
     without ever animating `color`. */
  function flyNumber(fromEl, toEl) {
    if (!fromEl || !toEl) return null;
    const from = fromEl.getBoundingClientRect();
    if (!isOnScreen(from)) return null;
    const to = toEl.getBoundingClientRect();
    const fromSize = parseFloat(getComputedStyle(fromEl).fontSize) || 1;
    const toSize = parseFloat(getComputedStyle(toEl).fontSize) || fromSize;
    const scale = toSize / fromSize;
    const dx = to.left - from.left;
    const dy = to.top - from.top;

    function copy(color, opacity) {
      const el = fromEl.cloneNode(true);
      el.removeAttribute('data-day-num');
      el.classList.add('fly-num');
      Object.assign(el.style, {
        position: 'fixed', left: `${from.left}px`, top: `${from.top}px`, margin: '0',
        transformOrigin: '0 0', zIndex: '1000', pointerEvents: 'none',
        color, opacity: String(opacity), visibility: 'visible'
      });
      document.body.appendChild(el);
      return el;
    }
    const a = copy(getComputedStyle(fromEl).color, 1);
    const b = copy(getComputedStyle(toEl).color, 0);
    fromEl.style.visibility = 'hidden';
    toEl.style.visibility = 'hidden';

    const start = 'translate(0px, 0px) scale(1)';
    const end = `translate(${dx}px, ${dy}px) scale(${scale})`;
    const options = { duration: 560, easing: EASE_INOUT, fill: 'forwards' };
    const animations = [
      play(a, [{ transform: start, opacity: 1 }, { transform: end, opacity: 0 }], options),
      play(b, [{ transform: start, opacity: 0 }, { transform: end, opacity: 1 }], options)
    ];
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      fromEl.style.visibility = '';
      toEl.style.visibility = '';
      a.remove();
      b.remove();
    };
    // Show the real number the moment the flight lands, not when the rest
    // of the page has finished arriving.
    Promise.all(animations.map(x => x.finished.catch(() => {}))).then(cleanup);
    return { animations, cleanup };
  }

  const FADE_UP = [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }];

  function transition(type, oldView, newView, opts) {
    const options = opts || {};
    if (!canAnimate()) return Promise.resolve();

    // Reduce Motion: a plain, short crossfade — nothing slides or flies.
    if (api.reduced()) {
      return settle([
        play(oldView, [{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: 'linear', fill: 'forwards' }),
        play(newView, [{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: 'linear' })
      ]);
    }

    const animations = [];
    let cleanup = null;

    if (type === 'open' || type === 'close') {
      const flight = flyNumber(options.fromEl, options.toEl);
      if (flight) {
        animations.push(...flight.animations);
        cleanup = flight.cleanup;
      }
    }

    if (type === 'open') {
      animations.push(play(oldView, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(14px)' }],
        { duration: 260, easing: 'ease-in', fill: 'forwards' }));
      // Tighter than the first-load entrance, so the whole change settles in
      // about 0.7s while the number is still in flight for most of it.
      newView.querySelectorAll('.word-row-wrap').forEach((el, i) => {
        const from = i % 2 === 0 ? '110%' : '-110%';
        animations.push(play(el, [{ transform: `translateX(${from})` }, { transform: 'none' }], { duration: 520, delay: 120 + i * 40 }));
      });
      newView.querySelectorAll('[data-rise]').forEach((el, i) =>
        animations.push(play(el, RISE, { duration: 380, delay: 160 + i * 40 })));
    } else if (type === 'close') {
      animations.push(play(oldView, [{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: 'ease-in', fill: 'forwards' }));
      newView.querySelectorAll('.masthead, .masthead-rule, .word-rows, [data-rise], .day-row, .up-next').forEach((el, i) =>
        animations.push(play(el, FADE_UP, { duration: 300, delay: 120 + i * 14 })));
    } else if (type === 'next' || type === 'prev') {
      // On Next the old page leaves to the left and the new one arrives from the right.
      const out = type === 'next' ? '-100%' : '100%';
      const inFrom = type === 'next' ? '100%' : '-100%';
      animations.push(play(oldView, [{ transform: 'none' }, { transform: `translateX(${out})` }],
        { duration: 400, easing: EASE_INOUT, fill: 'forwards' }));
      animations.push(play(newView, [{ transform: `translateX(${inFrom})` }, { transform: 'none' }],
        { duration: 400, easing: EASE_INOUT }));
    }

    return settle(animations, cleanup);
  }

  /* Jump every animation Motion started straight to its end, and tidy up a
     transition still in progress — used when the page changes again before
     the last change finished animating. */
  function finishActive() {
    running.forEach(animation => {
      try { animation.finish(); } catch (e) { animation.cancel(); }
    });
    running.clear();
    if (settlePending) settlePending();
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
    // A new page has just gone up, after a jump to its top (or back to
    // where the list was). Measure scrolling from here, so the jump itself
    // doesn't read as a flick.
    velocity = 0;
    lastY = window.scrollY;
    lastTime = performance.now();
    writeVelocity();
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

  const api = { VELOCITY_PX, velocityStep, decay, progress, slideAmount, reduced, init, scan, clear, entrance, transition, finishActive };
  return api;
})();
