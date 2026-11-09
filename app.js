/* ==========================================================
   FIRST 10 DAYS — App logic
   Plain JS, hash-based routing, no build step required.
   ========================================================== */

const app = document.getElementById('app');

/* ---------- Text helpers ----------
   escapeHtml lives in format.js, which loads before this file. */

/* "4h ago" / "3d ago" — used on the leader's student list. */
function relativeTime(ms) {
  if (!ms) return 'never';
  const minutes = Math.floor((Date.now() - ms) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return shortDate(ms);
}

/* "Jul 12" */
function shortDate(ms) {
  if (!ms) return '&mdash;';
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/* ---------- localStorage helpers ---------- */

function saveReflection(dayNum, fieldId, value) {
  localStorage.setItem(`reflection:${dayNum}:${fieldId}`, value);
}

function loadReflection(dayNum, fieldId) {
  return localStorage.getItem(`reflection:${dayNum}:${fieldId}`) || '';
}

function isDayComplete(dayNum) {
  return localStorage.getItem(`complete:${dayNum}`) === 'true';
}

function setDayComplete(dayNum, value) {
  localStorage.setItem(`complete:${dayNum}`, value ? 'true' : 'false');
}

function getStudentName() {
  return localStorage.getItem('student-name') || '';
}

function setStudentName(name) {
  localStorage.setItem('student-name', name.trim());
}

/* The leader's dashboard password, once they've entered it correctly.
   Checking happens in the Apps Script — this is only so they aren't
   asked again on every visit. */

function getDashboardKey() {
  return localStorage.getItem('dashboard-key') || '';
}

function setDashboardKey(value) {
  if (value) localStorage.setItem('dashboard-key', value);
  else localStorage.removeItem('dashboard-key');
}

/* Remembered so a returning leader gets the password box straight away
   instead of a pointless round trip that we know will be refused. */

function dashboardRequiresKey() {
  return localStorage.getItem('dashboard-requires-key') === 'true';
}

function setDashboardRequiresKey(value) {
  localStorage.setItem('dashboard-requires-key', value ? 'true' : 'false');
}

/* ---------- Progress tracking (optional) ----------
   Only active if TRACKING_ENDPOINT is set in tracking-config.js.
   Sends just a name + day + complete/not-complete status —
   never the contents of any reflection box. */

function trackingEnabled() {
  return typeof TRACKING_ENDPOINT === 'string' && TRACKING_ENDPOINT.trim().length > 0;
}

function sendProgressUpdate(dayNum, complete) {
  if (!trackingEnabled()) return;
  const name = getStudentName();
  if (!name) return;

  fetch(TRACKING_ENDPOINT, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ name, day: dayNum, complete })
  }).catch(() => {
    /* if this fails (e.g. offline), the student's local progress is
       unaffected — it just won't show up in the tracking sheet yet */
  });
}

/* ---------- Icons (inline SVG, no external requests) ---------- */

const ICONS = {
  chevron: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>`,
  check: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`,
  film: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M7 3v18M17 3v18M2 8h5M2 16h5M17 8h5M17 16h5"/></svg>`,
  close: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
  play: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
  arrowRight: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
  arrowLeft: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>`,
  search: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></svg>`
};

function videoFrame(videoId) {
  return videoId
    ? `<div class="video-frame"><iframe src="https://www.youtube.com/embed/${videoId}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`
    : `<div class="video-frame"><div class="video-placeholder">${ICONS.film}<span>Video coming soon</span></div></div>`;
}

/* ---------- Router ----------
   Each page renders into its own .view element inside #app, so that
   during a page transition the old page and the new one can both be on
   screen. */

function parseRoute(hash) {
  const parts = String(hash).replace(/^#\/?/, '').split('/').filter(Boolean);

  if (parts[0] === 'day' && parts.length === 2 && /^\d+$/.test(parts[1])) {
    const day = parseInt(parts[1], 10);
    if (DAYS.some(d => d.day === day)) return { name: 'day', day };
  } else if (parts[0] === 'resources' && parts.length === 1) {
    return { name: 'resources' };
  } else if (parts[0] === 'resources' && parts.length === 2) {
    return { name: 'resource', slug: parts[1] };
  } else if (parts[0] === 'progress' && parts.length === 1) {
    return { name: 'progress' };
  } else if (parts[0] === 'progress' && parts.length === 2) {
    let student;
    try { student = decodeURIComponent(parts[1]); } catch (e) { student = parts[1]; }
    return { name: 'student', student };
  }
  return { name: 'home' };
}

/* Which page transition, if any, moving between two routes calls for. */
function transitionType(from, to) {
  if (!from) return 'none';
  if (from.name === 'home' && to.name === 'day') return 'open';
  if (from.name === 'day' && to.name === 'home') return 'close';
  if (from.name === 'day' && to.name === 'day' && to.day !== from.day) {
    return to.day > from.day ? 'next' : 'prev';
  }
  return 'none';
}

function renderRoute(route, view) {
  switch (route.name) {
    case 'day': renderDay(view, route.day); break;
    case 'resources': renderResourceList(view); break;
    case 'resource': renderResource(view, route.slug); break;
    case 'progress': renderProgressList(view); break;
    case 'student': renderProgressDetail(view, route.student); break;
    default: renderHome(view);
  }
}

let currentRoute = null;
let currentView = null;
let homeScrollY = 0;

function focusHeading(view) {
  const heading = view.querySelector('h1');
  if (!heading) return;
  heading.setAttribute('tabindex', '-1');
  heading.focus({ preventScroll: true });
}

/* Pin the outgoing page where it is on screen, so it can animate away
   while the new page takes its place underneath. */
function freezeView(view) {
  const rect = view.getBoundingClientRect();
  view.classList.add('view--leaving');
  Object.assign(view.style, { position: 'fixed', top: `${rect.top}px`, left: `${rect.left}px`, width: `${rect.width}px`, margin: '0' });
  // A fixed bar inside a moving page would jump, so the bar just leaves.
  view.querySelectorAll('.up-next').forEach(bar => { bar.style.visibility = 'hidden'; });
}

// What the student sees when data.js has a typo in it.
const CONTENT_ERROR = `<div class="content-error">The study couldn't load because the content file (data.js) has a typo. Check the most recent change to data.js.</div>`;

function router() {
  // Settle anything still animating from the last change before starting this one.
  Motion.finishActive();
  app.querySelectorAll('.view--leaving').forEach(v => v.remove());

  const route = parseRoute(window.location.hash);
  const from = currentRoute;
  const type = transitionType(from, route);
  const oldView = currentView;

  if (from && from.name === 'home') homeScrollY = window.scrollY;

  // The number that flies between the two pages, if this change has one.
  let fromEl = null;
  if (oldView && type === 'open') fromEl = oldView.querySelector(`[data-day-num="${route.day}"]`);
  if (oldView && type === 'close') fromEl = oldView.querySelector('.day-big-num');

  if (oldView) {
    if (type === 'none') oldView.remove();
    else freezeView(oldView);
  }

  Motion.clear();
  const view = document.createElement('div');
  view.className = `view view--${route.name}`;
  app.appendChild(view);
  try {
    renderRoute(route, view);
  } catch (e) {
    // Something in data.js isn't shaped the way this page expects. Say so
    // here, rather than leaving the last page frozen on screen.
    view.innerHTML = `<a href="#/" class="back-link">${ICONS.arrowLeft}<span>All days</span></a>${CONTENT_ERROR}`;
  }

  // Coming back to the home page puts you where you left the list.
  window.scrollTo(0, route.name === 'home' && from ? homeScrollY : 0);
  Motion.scan(view);
  if (from) focusHeading(view);
  else if (route.name === 'home' || route.name === 'day') Motion.entrance(route.name, view);   // first load only

  currentRoute = route;
  currentView = view;

  if (oldView && type !== 'none') {
    let toEl = null;
    if (type === 'open') toEl = view.querySelector('.day-big-num');
    if (type === 'close') toEl = view.querySelector(`[data-day-num="${from.day}"]`);
    Motion.transition(type, oldView, view, { fromEl, toEl }).then(() => oldView.remove());
  }
}

/* ---------- Start-up ---------- */

/* data.js can break two ways: a typo that stops it being read at all
   leaves its lists undefined, and one that stops it partway (a
   misspelled name) leaves every list after that point unreadable, so
   even looking at one throws. RESOURCES is the last list in the file,
   so if it can be read, everything before it loaded too. */
function contentReady() {
  try {
    return Array.isArray(DAYS) && Array.isArray(RESOURCES);
  } catch (e) {
    return false;
  }
}

function bootApp() {
  // Say so plainly instead of leaving a blank page.
  if (!contentReady()) {
    app.innerHTML = CONTENT_ERROR;
    return;
  }

  Motion.init();
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.addEventListener('hashchange', router);
  router();
  setupInstallPrompt();
  maybeShowNamePrompt();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js').catch(() => {
        /* offline support just won't be available; site still works online */
      });
    });
  }
}

if (app) window.addEventListener('DOMContentLoaded', bootApp);

/* ---------- Name prompt modal ---------- */

function maybeShowNamePrompt() {
  if (!trackingEnabled()) return;
  if (getStudentName()) return;
  renderNamePrompt();
}

function renderNamePrompt() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-card">
      <h2>What's your name?</h2>
      <p class="prose">Your leader can see which days you've completed &mdash; not what you write in your reflections. Just your first and last name is enough.</p>
      <input type="text" id="name-input" placeholder="Your name" autocomplete="name">
      <button id="name-submit" class="btn-pill btn-wide">Continue</button>
    </div>
  `;
  document.body.appendChild(overlay);

  const input = overlay.querySelector('#name-input');
  input.focus();

  function submit() {
    const val = input.value.trim();
    if (!val) { input.focus(); return; }
    setStudentName(val);
    overlay.remove();
  }

  overlay.querySelector('#name-submit').addEventListener('click', submit);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
}

/* ---------- Welcome video modal ---------- */

function renderWelcomeVideoModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-card video-modal">
      <button class="modal-close" id="video-modal-close" aria-label="Close video">${ICONS.close}</button>
      ${videoFrame(WELCOME_VIDEO_ID)}
    </div>
  `;
  document.body.appendChild(overlay);

  function close() { overlay.remove(); }

  overlay.querySelector('#video-modal-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}

/* ---------- Giant words and day helpers ---------- */

/* "1" → "01" */
function pad2(n) {
  return String(n).padStart(2, '0');
}

function cleanWords(value) {
  const list = typeof value === 'string' ? [value] : Array.isArray(value) ? value : [];
  return list.filter(w => typeof w === 'string' && w.trim()).map(w => w.trim());
}

/* A day's giant words, or the home page's when the day has none of its
   own. A single word typed without the [ ] still counts as one word. */
function dayWords(day) {
  const own = cleanWords(day && day.words);
  if (own.length) return own;
  return cleanWords(typeof HOME_WORDS !== 'undefined' ? HOME_WORDS : []);
}

/* The first day that isn't marked complete, or null once all of them are. */
function upNextDay(days, isComplete) {
  const first = days.find(d => !isComplete(d.day));
  return first ? first.day : null;
}

/* The full-bleed rows of giant words. Rows alternate: outline sliding
   left, then solid vermilion sliding right. Each word repeats enough to
   overfill the screen while it slides, plus two faint copies for the
   smear on a fast scroll. */
function wordRowsHtml(words) {
  if (!words || !words.length) return '';
  const rows = words.map((word, i) => {
    const text = Array(6).fill(typeset(String(word).toUpperCase())).join(' ');
    const look = i % 2 === 0 ? 'outline' : 'solid';
    const drift = i % 2 === 0 ? 'left' : 'right';
    return `<div class="word-row-wrap"><div class="word-row t-giant word-row--${look}" data-drift="${drift}">${text}<span class="word-ghost word-ghost--1">${text}</span><span class="word-ghost word-ghost--2">${text}</span></div></div>`;
  }).join('');
  return `<div class="word-rows" aria-hidden="true">${rows}</div>`;
}

/* ---------- Home ---------- */

function renderHome(view) {
  const next = upNextDay(DAYS, isDayComplete);
  const book = typeof BOOK_NAME === 'string' ? BOOK_NAME : '';

  const rows = DAYS.map(d => {
    const state = isDayComplete(d.day) ? 'done' : d.day === next ? 'next' : 'later';
    const topic = typeset(d.topic);
    return `
      <a href="#/day/${d.day}" class="day-row" data-state="${state}" aria-label="Day ${d.day}: ${topic}${state === 'done' ? ' (complete)' : ''}">
        <span class="day-row-inner" data-slide-in>
          <span class="day-num t-giant" data-day-num="${d.day}">${pad2(d.day)}</span>
          <span class="day-topic">${topic}</span>
          <span class="day-mark">${state === 'done' ? ICONS.check : ICONS.chevron}</span>
        </span>
      </a>
    `;
  }).join('');

  const upNext = next
    ? `<a class="up-next" href="#/day/${next}">
         <span><span class="up-next-label">Up next</span> &middot; Day ${next}</span>
         <span class="up-next-go" aria-hidden="true">${ICONS.arrowRight}</span>
       </a>`
    : `<div class="up-next up-next--done">${ICONS.check}<span>All ${DAYS.length} days complete</span></div>`;

  view.innerHTML = `
    <div class="install-banner" id="install-banner">
      <span>Add this to your home screen for quick daily access.</span>
      <button id="install-btn" class="btn-pill btn-pill--accent">Install</button>
      <button id="install-dismiss" class="install-dismiss">Not now</button>
    </div>
    <div class="masthead label"><span>${typeset(book)}</span><span>${DAYS.length} days</span></div>
    <div class="masthead-rule"></div>
    ${wordRowsHtml(dayWords({}))}
    <div class="home-hero" data-rise>
      <div class="label home-eyebrow">Ten foundations for faith</div>
      <h1 class="home-title t-condensed">First <span class="ten">10</span> Days</h1>
    </div>
    <div class="home-welcome" data-rise>
      <button class="btn-pill welcome-pill" id="welcome-video-open">${ICONS.play} Welcome video</button>
    </div>
    <nav class="day-list" aria-label="The days">${rows}</nav>
    <a href="#/resources" class="signpost" data-rise>
      <span>
        <span class="label">Extra resources</span>
        <span class="signpost-title t-condensed">Go deeper</span>
      </span>
      <span class="signpost-mark">${ICONS.chevron}</span>
    </a>
    ${trackingEnabled() && getStudentName() ? `<button class="change-name" id="change-name-btn">Not ${escapeHtml(getStudentName())}? Change name</button>` : ''}
    ${upNext}
  `;

  view.querySelector('#install-btn')?.addEventListener('click', triggerInstall);
  view.querySelector('#install-dismiss')?.addEventListener('click', dismissInstallBanner);
  view.querySelector('#change-name-btn')?.addEventListener('click', renderNamePrompt);
  view.querySelector('#welcome-video-open')?.addEventListener('click', renderWelcomeVideoModal);
}

/* ---------- Day page ---------- */

/* The "Read" box: a day's own reading prompt, or the standard one. */
function readingText(day) {
  const own = typeof day.reading === 'string' ? day.reading.trim() : '';
  return own || `Open your Bible to ${day.passage} and read it through.`;
}

function completeLabel(done) {
  return done ? `${ICONS.check}<span>Day complete</span>` : '<span>Mark day complete</span>';
}

/* "1 of 10 days done. 9 to go." — said on screen and to screen readers. */
function completeMessage() {
  const done = DAYS.filter(x => isDayComplete(x.day)).length;
  const left = DAYS.length - done;
  return left ? `${done} of ${DAYS.length} days done. ${left} to go.` : `All ${DAYS.length} days done.`;
}

/* The finish line under a completed day: the day and DONE as giant rows
   (outline from the left, vermilion from the right, like the home page),
   a track of all the days, and a way on to the next unfinished one. */
/* A word with the same two trailing copies the top word rows smear with. */
function smearHtml(text) {
  return `<span class="celebrate-word">${text}<span class="celebrate-ghost celebrate-ghost--1">${text}</span><span class="celebrate-ghost celebrate-ghost--2">${text}</span></span>`;
}
function celebrationHtml(dayNum) {
  const next = upNextDay(DAYS, isDayComplete);
  const nextDay = next ? DAYS.find(x => x.day === next) : null;
  const track = DAYS.map(x => {
    const cls = [isDayComplete(x.day) ? 'is-done' : '', x.day === dayNum ? 'is-today' : ''].join(' ').trim();
    return `<li${cls ? ` class="${cls}"` : ''}>${pad2(x.day)}</li>`;
  }).join('');
  return `
    <div class="celebrate">
      <div class="word-rows celebrate-rows" aria-hidden="true">
        <div class="celebrate-row celebrate-row--outline t-giant">${smearHtml(`Day ${pad2(dayNum)}`)}</div>
        <div class="celebrate-row celebrate-row--solid t-giant">${smearHtml('Done')}</div>
      </div>
      <p class="celebrate-count">${completeMessage()}</p>
      <ol class="celebrate-track" aria-hidden="true">${track}</ol>
      ${nextDay ? `<a class="celebrate-next" href="#/day/${nextDay.day}">
        <span class="celebrate-next-text"><span class="up-next-label">Up next</span> &middot; Day ${nextDay.day}<span class="celebrate-next-topic">${typeset(nextDay.topic)}</span></span>
        <span class="up-next-go" aria-hidden="true">${ICONS.arrowRight}</span>
      </a>` : ''}
    </div>
  `;
}

/* Plays the finish line once, right after the tap, and brings it on screen. */
function playCelebration(el) {
  if (!el) return;
  el.classList.add('celebrate--play');
  const calm = typeof Motion !== 'undefined' && Motion.reduced();
  if (el.scrollIntoView) el.scrollIntoView({ block: 'nearest', behavior: calm ? 'auto' : 'smooth' });
}

/* A together block. motion.js passes where it is on screen; the cards are
   scattered (--t 0) as it comes up from the bottom of the screen and lined
   up (--t 1) by the time it's two-thirds of the way up. Without motion
   --t is never set, and the cards are simply lined up. */
function setUpTogether(el) {
  el.__read = (r, top, vh) => {
    const t = Math.min(1, Math.max(0, (vh - top) / (vh * 0.65)));
    el.style.setProperty('--t', t.toFixed(3));
  };
}

/* A hold-the-light card. While the button is held the light builds (about
   two seconds to full): the ring fills, the glow spreads, and the answer is
   drawn in. Let go early and it drains back; once full, it stays lit. All
   of it follows --h on the card, from 0 to 1. */
const HOLD_FILL_MS = 2000;
const HOLD_DRAIN_MS = 900;

function setUpHold(card) {
  const btn = card.querySelector('.hold-btn');
  const fill = card.querySelector('.hold-fill');
  const answer = card.querySelector('.hold-answer');
  let h = 0, holding = false, done = false, frame = 0, last = 0;

  function render() {
    card.style.setProperty('--h', h.toFixed(3));
    fill.style.strokeDashoffset = (157 * (1 - h)).toFixed(1);
    card.classList.toggle('is-bright', h >= 0.5);
  }

  function step(t) {
    const dt = Math.min(64, t - last);
    last = t;
    h = holding ? Math.min(1, h + dt / HOLD_FILL_MS) : Math.max(0, h - dt / HOLD_DRAIN_MS);
    render();
    if (h >= 1) {
      done = true;
      holding = false;
      frame = 0;
      card.classList.add('is-on');
      answer.removeAttribute('aria-hidden');
      return;
    }
    frame = (holding || h > 0) ? requestAnimationFrame(step) : 0;
  }

  function run() {
    if (!frame) { last = performance.now(); frame = requestAnimationFrame(step); }
  }
  function press(e) {
    if (e) e.preventDefault();
    if (done) return;
    holding = true;
    run();
  }
  function release() {
    holding = false;
    if (!done) run();
  }

  btn.addEventListener('pointerdown', press);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(type => btn.addEventListener(type, release));
  btn.addEventListener('contextmenu', e => e.preventDefault());
  // On a keyboard, holding Enter or Space works the same way.
  btn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') press(e); });
  btn.addEventListener('keyup', release);
}

/* A typewriter quote. The page tips up flat as it scrolls in, then the
   quote types out as it's read; motion.js calls __read with how much has
   passed the reading line, where it is, and how tall it is. Until then
   (or with Reduce Motion) the whole quote is there, signed and underlined. */
function setUpTypewriter(tw) {
  const page = tw.querySelector('.tw-page');
  const text = tw.querySelector('.tw-text');
  const full = text.dataset.text || '';
  const start = text.hasAttribute('data-mark-start') ? Number(text.dataset.markStart) : -1;
  const end = text.hasAttribute('data-mark-end') ? Number(text.dataset.markEnd) : -1;
  let shown = full.length;

  function show(k) {
    if (k === shown) return;
    shown = k;
    const done = k === full.length;
    text.innerHTML = typewriterHtml(full, start, end, k);
    // The words were just redrawn; let them take their un-underlined look
    // first, so the red pencil draws its line instead of popping in.
    if (done && !tw.classList.contains('is-done')) void text.offsetWidth;
    tw.classList.toggle('is-done', done);
  }

  tw.__read = (r, top, vh, height) => {
    // Flat once the top of the page is about 40% of the way down the screen.
    const tilt = 1 - Math.min(1, Math.max(0, (vh - top) / (vh * 0.6)));
    page.style.transform = tilt
      ? `translateY(${(tilt * 40).toFixed(1)}px) rotateX(${(tilt * 32).toFixed(2)}deg) rotate(${(tilt * -5).toFixed(2)}deg)`
      : '';
    // Then it types as the page rises past 40% of the way down the screen,
    // which is where the page lands flat, so it starts from the first letter
    // and finishes a little before the last line gets there.
    const typed = Math.min(1, Math.max(0, (vh * 0.4 - top) / height) * 1.3);
    show(tilt ? 0 : Math.round(typed * full.length));
  };
}

/* Red pen marks over a highlighted verse (Day 6): circles, underlines,
   squiggles and double underlines, drawn once the highlighter has swept
   across. They sit in a layer over the heading, placed over the words
   format.js marked, and are placed again if the words reflow. */
const SVG_NS = 'http://www.w3.org/2000/svg';
const PEN_CIRCLE = 'M10,52 C4,22 40,6 74,8 C104,10 118,30 112,54 C106,80 66,92 38,86 C12,80 2,58 14,34 C22,20 36,14 52,12';
const PEN_DOUBLE = ['M2,6 C28,2 70,9 98,4', 'M5,15 C34,11 66,17 95,12'];

function penSvg(cls, viewBox, paths, box, scale) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', cls);
  svg.setAttribute('viewBox', viewBox);
  if (scale) svg.setAttribute('preserveAspectRatio', 'none');
  Object.assign(svg.style, { left: box.left + 'px', top: box.top + 'px', width: box.width + 'px', height: box.height + 'px' });
  svg.innerHTML = paths.map(d => `<path pathLength="1" d="${d}"/>`).join('');
  return svg;
}

function setUpPen(hl) {
  const box = hl.parentElement;
  const kinds = hl.dataset.pen.split(' ');
  const n = hl.querySelectorAll('.hl-w').length;
  // The highlighter takes min(220ms, 1500ms / n) a word after a 200ms start
  // (style.css); the pen waits a beat after that.
  const penStart = Math.round(200 + n * Math.min(220, 1500 / n) + 250);
  // Circles first, then the rest in reading order.
  const order = kinds.map((k, i) => i).sort((a, b) =>
    ((kinds[a] === 'circle') === (kinds[b] === 'circle') ? a - b : kinds[a] === 'circle' ? -1 : 1));
  const layer = document.createElement('span');
  layer.className = 'pen-layer';
  layer.setAttribute('aria-hidden', 'true');
  box.classList.add('has-pen');
  box.appendChild(layer);

  // One box per line that a mark's words sit on, relative to the heading.
  function lines(i, base) {
    const out = [];
    hl.querySelectorAll(`.pen-t[data-pen="${i}"]`).forEach(word => {
      [...word.getClientRects()].filter(r => r.width > 0).forEach(r => {
        const top = r.top - base.top;
        const line = out.find(l => Math.abs(l.top - top) < 6);
        if (line) {
          line.left = Math.min(line.left, r.left - base.left);
          line.right = Math.max(line.right, r.right - base.left);
          line.bottom = Math.max(line.bottom, r.bottom - base.top);
        } else {
          out.push({ left: r.left - base.left, right: r.right - base.left, top, bottom: r.bottom - base.top });
        }
      });
    });
    return out;
  }

  let drawn = '';
  function draw() {
    const base = box.getBoundingClientRect();
    const all = kinds.map((k, i) => lines(i, base));
    const shape = JSON.stringify(all.map(ls => ls.map(l => [l.left, l.top, l.right].map(Math.round))));
    if (shape === drawn) return;
    drawn = shape;
    layer.textContent = '';
    let t = penStart;
    const put = (el, delay) => { el.style.setProperty('--delay', delay + 'ms'); layer.appendChild(el); };
    // Whether another mark sits right up against this line on the left or right.
    const crowded = (i, l, side) => all.some((ls, j) => j !== i && ls.some(o => Math.abs(o.top - l.top) < 6 &&
      (side < 0 ? Math.abs(l.left - o.right) < 16 : Math.abs(o.left - l.right) < 16)));

    order.forEach(i => {
      const ls = all[i];
      if (!ls.length) return;
      const kind = kinds[i];
      if (kind === 'circle') {
        const b = ls[0];
        put(penSvg('pen-circle', '0 0 120 92', [PEN_CIRCLE],
          { left: b.left - 8, top: b.top - 4, width: b.right - b.left + 16, height: b.bottom - b.top + 8 }, true), t);
        t += 700;
      } else if (kind === 'double') {
        // Runs past the ends of the words, unless that would hit another
        // mark or the edge where the phrase wraps.
        ls.forEach((b, li) => {
          const overL = li === 0 && !crowded(i, b, -1) ? 10 : 2;
          const overR = li === ls.length - 1 && !crowded(i, b, 1) ? 10 : 2;
          put(penSvg('pen-double', '0 0 100 20', PEN_DOUBLE,
            { left: b.left - overL, top: b.bottom - 6, width: b.right - b.left + overL + overR, height: 16 }, true), t);
          t += 760;
        });
      } else if (kind === 'squiggle') {
        ls.forEach(b => {
          const width = Math.round(b.right - b.left + 4);
          const waves = Math.max(2, Math.round(width / 6));
          const dx = width / waves;
          let d = 'M0,5';
          for (let w = 0; w < waves; w++) d += ` Q${((w + 0.5) * dx).toFixed(1)},${w % 2 ? 11.4 : -1.4} ${((w + 1) * dx).toFixed(1)},5`;
          const dur = Math.max(320, Math.round(width * 3));
          const svg = penSvg('pen-wave', `0 0 ${width} 10`, [d], { left: b.left - 2, top: b.bottom - 3, width, height: 10 });
          svg.style.setProperty('--dur', dur + 'ms');
          put(svg, t);
          t += dur;
        });
      } else {
        ls.forEach(b => {
          const width = b.right - b.left;
          const dur = Math.max(160, Math.round(width * 2.2));
          const line = document.createElement('span');
          line.className = 'pen-line';
          Object.assign(line.style, { left: b.left + 'px', top: (b.bottom - 2) + 'px', width: width + 'px' });
          line.style.setProperty('--dur', dur + 'ms');
          put(line, t);
          t += dur;
        });
      }
    });
  }

  draw();
  // Placed again if the words move: a new font, a turned phone. Marks
  // placed after the pen has been through appear already drawn.
  if ('ResizeObserver' in window) new ResizeObserver(draw).observe(box);
  if (document.fonts) document.fonts.ready.then(draw);
}

/* Day 7's correction. The button backspaces the big typed line back to
   where it and the correction differ, then the correction types on from
   there (style.css types each letter by its --i; the letters that stay
   get a --i far in the past so they're already there). With Reduce
   Motion it simply swaps in. */
const RETYPE_BACKSPACE_MS = 28;

function setUpRetype(fx) {
  const typed = fx.querySelector('.fx-type');
  const chars = typed.querySelector('.type-chars');
  const reader = typed.querySelector('.sr-only');
  const btn = fx.querySelector('.retype-btn');
  const next = fx.querySelector('.retype-next').innerHTML;

  btn.addEventListener('click', () => {
    btn.hidden = true;
    typed.setAttribute('tabindex', '-1');
    typed.focus({ preventScroll: true });

    const fresh = document.createElement('span');
    fresh.innerHTML = wrapChars(next).html;
    const oldChars = [...chars.querySelectorAll('.ch')];
    const newChars = [...fresh.querySelectorAll('.ch')];
    let keep = 0;
    while (keep < oldChars.length && keep < newChars.length && oldChars[keep].textContent === newChars[keep].textContent) keep++;
    newChars.forEach((c, i) => c.style.setProperty('--i', i < keep ? -1000 : i - keep));

    const finish = () => {
      chars.innerHTML = fresh.innerHTML;
      typed.style.setProperty('--n', newChars.length);
      reader.innerHTML = next;
    };
    if (!document.documentElement.classList.contains('motion-on')) { finish(); return; }

    typed.classList.add('is-revealed');
    // Holds its height while it backspaces, so the page doesn't jump.
    typed.style.minHeight = typed.offsetHeight + 'px';
    let left = oldChars.length;
    const backspace = () => {
      if (left > keep) {
        oldChars[--left].remove();
        setTimeout(backspace, RETYPE_BACKSPACE_MS);
      } else {
        setTimeout(finish, 300);
      }
    };
    setTimeout(backspace, 250);
  });
}

/* The taps that make a study's effects work: swap tabs, hint buttons,
   church-vocab words, and the Trinity shield. */
function wireStudyEffects(view) {
  view.querySelectorAll('.fx-typewriter').forEach(setUpTypewriter);
  view.querySelectorAll('.hold-card').forEach(setUpHold);
  view.querySelectorAll('.fx-together').forEach(setUpTogether);
  view.querySelectorAll('.hl[data-pen]').forEach(setUpPen);
  view.querySelectorAll('.fx-retype').forEach(setUpRetype);
  let sheet = null;
  if (view.querySelector('.vocab')) {
    sheet = document.createElement('div');
    sheet.className = 'vocab-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-label', 'Church vocab');
    sheet.innerHTML = '<div class="label">Church vocab</div><p class="vocab-term"></p><p class="vocab-def"></p>' +
      '<button type="button" class="vocab-close btn-pill">Got it</button>';
    view.appendChild(sheet);
  }

  // Turns the flip card over; screen readers hear only the side showing.
  function flip(card) {
    const over = !card.classList.contains('is-flipped');
    card.classList.toggle('is-flipped', over);
    card.setAttribute('aria-pressed', String(over));
    card.querySelectorAll('.flip-face').forEach((face, i) => {
      if ((i === 1) === over) face.removeAttribute('aria-hidden');
      else face.setAttribute('aria-hidden', 'true');
    });
  }

  function swapTo(tab) {
    const box = tab.closest('.fx-swap');
    box.querySelectorAll('.swap-tab').forEach(t => t.setAttribute('aria-pressed', String(t === tab)));
    box.querySelectorAll('.swap-panel').forEach(panel => {
      const on = panel.dataset.panel === tab.dataset.panel;
      panel.classList.toggle('is-on', on);
      if (on) panel.removeAttribute('aria-hidden');
      else panel.setAttribute('aria-hidden', 'true');
    });
  }

  function toggleHint(button) {
    const hint = view.querySelector(`#${button.getAttribute('aria-controls')}`);
    const show = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(show));
    if (hint) hint.hidden = !show;
  }

  function define(word) {
    sheet.querySelector('.vocab-term').textContent = word.textContent;
    sheet.querySelector('.vocab-def').textContent = word.dataset.def;
    sheet.classList.add('is-open');
    sheet.querySelector('.vocab-close').focus({ preventScroll: true });
  }

  // Tapping a person again, or God in the middle, lets go of them.
  function focusPerson(node) {
    const shield = node.closest('.fx-trinity');
    const chosen = node.dataset.person || '';
    const person = shield.dataset.focus === chosen ? '' : chosen;
    shield.dataset.focus = person;
    shield.querySelector('.tri-caption').textContent = person ? node.dataset.caption : 'Tap Father, Son, or Holy Spirit.';
  }

  view.addEventListener('click', (e) => {
    const target = e.target;
    let el;
    if ((el = target.closest('.swap-tab'))) swapTo(el);
    else if ((el = target.closest('.hint-btn'))) toggleHint(el);
    else if ((el = target.closest('.vocab')) && sheet) define(el);
    else if (target.closest('.vocab-close') && sheet) sheet.classList.remove('is-open');
    else if ((el = target.closest('.tri-node, .tri-god'))) focusPerson(el);
    else if ((el = target.closest('.fx-flip'))) flip(el);
  });

  view.addEventListener('keydown', (e) => {
    const node = e.target.closest && e.target.closest('.tri-node, .tri-god');
    if (node && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      focusPerson(node);
    }
    if (e.target.classList && e.target.classList.contains('fx-flip') && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      flip(e.target);
    }
    if (e.key === 'Escape' && sheet) sheet.classList.remove('is-open');
  });
}

function renderDay(view, dayNum) {
  const d = DAYS.find(x => x.day === dayNum);
  if (!d) { renderHome(view); return; }

  // A 1-10 slider for "on a scale from one to ten" questions.
  function scaleInput(r, val) {
    const value = /^(10|[1-9])$/.test(val) ? val : '5';
    return `
        <div class="scale">
          <input type="range" id="r-${r.id}" data-field="${r.id}" min="1" max="10" step="1" value="${value}">
          <div class="scale-ends"><span>${typeset(r.low || '1')}</span><span class="scale-value" data-value-for="${r.id}">${value}</span><span>${typeset(r.high || '10')}</span></div>
        </div>`;
  }

  function reflectionCard(r) {
    const val = loadReflection(dayNum, r.id);
    const hint = r.hint ? `
        <button type="button" class="hint-btn" aria-expanded="false" aria-controls="hint-${r.id}">Need a hint?</button>
        <div class="hint" id="hint-${r.id}" hidden>${typeset(r.hint)}</div>` : '';
    const input = r.type === 'scale'
      ? scaleInput(r, val)
      : `<textarea id="r-${r.id}" data-field="${r.id}"${r.size === 'large' ? ' class="is-large"' : ''} placeholder="Write your answer here&hellip;">${escapeHtml(val)}</textarea>`;
    return `
      <div class="reflection">
        <label for="r-${r.id}">${typeset(r.label)}</label>
        ${r.prompt ? `<div class="prompt">${typeset(r.prompt)}</div>` : ''}
        ${r.question ? `<div class="prompt-question">${typeset(r.question)}</div>` : ''}
        ${hint}
        ${input}
        <div class="save-status" data-status-for="${r.id}">Saved</div>
      </div>
    `;
  }

  function section(cls, title, items) {
    return items.length ? `<section class="${cls}">
        <h2 class="section-h t-condensed">${typeset(title)}</h2>
        ${items.map(reflectionCard).join('')}
      </section>` : '';
  }

  // A day can leave out its reflection boxes or its questions; then that
  // section isn't there at all.
  const reflections = Array.isArray(d.reflections) ? d.reflections : [];
  const questions = Array.isArray(d.questions) ? d.questions : [];
  const reflectHtml = section('reflect', d.reflectTitle || 'Reflect', reflections);
  const questionHtml = section('reflect reflect--questions',
    questions.length > 1 ? 'Application Questions' : 'Application Question', questions);

  const study = `<div class="study-label label">Bible Study</div>` + (typeof d.study === 'string' && d.study.trim()
    ? `<div class="study">${formatStudy(d.study)}</div>`
    : '<div class="study-placeholder">Study coming soon.</div>');

  // Days 3-10 put MAPS first; Days 1 and 2 teach before they ask.
  const body = d.reflectFirst ? reflectHtml + study + questionHtml : study + reflectHtml + questionHtml;

  const complete = isDayComplete(dayNum);
  const prev = DAYS.find(x => x.day === dayNum - 1);
  const next = DAYS.find(x => x.day === dayNum + 1);

  view.innerHTML = `
    <a href="#/" class="back-link" data-rise>${ICONS.arrowLeft}<span>All days</span></a>
    <div class="day-masthead" data-rise>
      <div class="masthead label"><span>Day ${d.day} of ${DAYS.length}</span><span>${typeset(d.passage)}</span></div>
      <div class="masthead-rule"></div>
    </div>
    <header class="day-header">
      ${wordRowsHtml(dayWords(d))}
      <span class="day-big-num t-giant" aria-hidden="true">${pad2(d.day)}</span>
    </header>
    <h1 class="day-title t-condensed" data-rise>${typeset(d.topic)}</h1>
    <section class="read-callout" data-rise>
      <div class="label">Read</div>
      ${formatStudy(readingText(d))}
    </section>
    <div class="day-body" data-rise>
      ${body}
      <button class="complete-btn btn-pill ${complete ? 'is-complete' : ''}" id="complete-btn" aria-pressed="${complete}">${completeLabel(complete)}</button>
      <p class="sr-only" role="status" id="complete-status"></p>
      <div class="celebrate-slot">${complete ? celebrationHtml(dayNum) : ''}</div>
      <nav class="day-nav" aria-label="Other days">
        ${prev ? `<a data-dir="prev" href="#/day/${prev.day}">${ICONS.arrowLeft}<span>Day ${prev.day}</span></a>` : '<span></span>'}
        ${next ? `<a data-dir="next" href="#/day/${next.day}"><span>Day ${next.day}</span>${ICONS.arrowRight}</a>` : '<span></span>'}
      </nav>
    </div>
  `;

  wireStudyEffects(view);

  // Wire up auto-saving answers (text boxes and sliders)
  view.querySelectorAll('[data-field]').forEach(ta => {
    let saveTimer;
    ta.addEventListener('input', () => {
      const field = ta.getAttribute('data-field');
      saveReflection(dayNum, field, ta.value);
      const shown = view.querySelector(`.scale-value[data-value-for="${field}"]`);
      if (shown) shown.textContent = ta.value;
      const status = view.querySelector(`.save-status[data-status-for="${field}"]`);
      if (status) {
        status.classList.add('show');
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => status.classList.remove('show'), 1200);
      }
    });
  });

  // currentTarget, not target: a tap can land on the check icon inside the button.
  view.querySelector('#complete-btn').addEventListener('click', (e) => {
    const button = e.currentTarget;
    const nowComplete = !isDayComplete(dayNum);
    setDayComplete(dayNum, nowComplete);
    button.classList.toggle('is-complete', nowComplete);
    button.setAttribute('aria-pressed', String(nowComplete));
    button.innerHTML = completeLabel(nowComplete);
    const slot = view.querySelector('.celebrate-slot');
    slot.innerHTML = nowComplete ? celebrationHtml(dayNum) : '';
    view.querySelector('#complete-status').textContent = nowComplete
      ? `Day ${dayNum} complete. ${completeMessage()}`
      : `Day ${dayNum} marked not complete.`;
    if (nowComplete) playCelebration(slot.querySelector('.celebrate'));
    if (trackingEnabled() && !getStudentName()) {
      renderNamePrompt();
    }
    sendProgressUpdate(dayNum, nowComplete);
  });
}

/* ---------- Resource list ---------- */

function renderResourceList(view) {
  const items = RESOURCES.map(r => `
    <a href="#/resources/${r.slug}" class="resource-item">
      <span class="title">${r.title}</span>
      <span class="chevron">${ICONS.chevron}</span>
    </a>
  `).join('');

  view.innerHTML = `
    <div class="topbar">
      <a href="#/" class="back-link">${ICONS.arrowLeft}<span>All days</span></a>
    </div>
    <div class="page-header">
      <div class="label page-eyebrow">Extra Resources</div>
      <h1>Go Deeper</h1>
    </div>
    ${items}
    ${isAppInstalled() ? '' : `
      <div class="section install-section">
        <h2 class="section-h t-condensed">Install</h2>
        <p class="prose">Skip past the prompt on the main page? You can still add First 10 Days to your home screen any time.</p>
        <button class="btn-pill btn-wide" id="resource-install-btn">Install App</button>
        <p class="prose install-fallback hidden" id="install-fallback">
          Your browser doesn't support one-tap install here &mdash; add it manually instead:<br>
          <strong>Android (Chrome):</strong> tap the &#8942; menu &rarr; "Add to Home screen".<br>
          <strong>iPhone (Safari):</strong> tap the Share icon &rarr; "Add to Home Screen".
        </p>
      </div>
    `}
  `;

  view.querySelector('#resource-install-btn')?.addEventListener('click', () => {
    if (deferredInstallPrompt) {
      triggerInstall();
    } else {
      view.querySelector('#install-fallback')?.classList.remove('hidden');
    }
  });
}

function renderResource(view, slug) {
  const r = RESOURCES.find(x => x.slug === slug);
  if (!r) { renderResourceList(view); return; }

  view.innerHTML = `
    <div class="topbar">
      <a href="#/resources" class="back-link">${ICONS.arrowLeft}<span>Extra resources</span></a>
    </div>
    <div class="page-header">
      <h1>${r.title}</h1>
    </div>
    <div class="prose">${r.body}</div>
    ${r.pdf ? `<a class="pdf-link" href="${r.pdf}" target="_blank" rel="noopener">Open PDF Guide</a>` : ''}
  `;
}

/* ---------- Leader dashboard: student progress ----------
   Reads the same Google Sheet the app writes to, via the doGet in
   sheet-setup/apps-script-code.gs. Nothing here is student-facing
   beyond the link on the Leader Dashboard resource page. */

const PROGRESS_PAGE_SIZE = 25;
const PROGRESS_CACHE_MS = 60000; // re-use loaded students for a minute

const progressState = {
  students: [],
  total: 0,
  query: '',
  loading: false,
  locked: false,
  error: '',
  fetchedAt: 0
};

function progressSheetUrl() {
  return typeof PROGRESS_SHEET_URL === 'string' && PROGRESS_SHEET_URL.trim() ? PROGRESS_SHEET_URL : '';
}

function progressUrl(params) {
  const query = Object.keys(params)
    .filter(k => params[k] !== '' && params[k] !== null && params[k] !== undefined)
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&');
  return TRACKING_ENDPOINT + (TRACKING_ENDPOINT.indexOf('?') === -1 ? '?' : '&') + query;
}

function fetchJson(url) {
  return fetch(url)
    .then(res => {
      if (!res.ok) throw new Error('bad status');
      return res.json();
    })
    .catch(() => jsonpRequest(url));
}

function fetchProgress(params) {
  return fetchJson(progressUrl(Object.assign({}, params, { key: getDashboardKey() })));
}

function isUnauthorized(data) {
  return !!(data && data.ok === false && data.error === 'unauthorized');
}

/* Tries one small request with the typed password to see if it's right. */
function verifyDashboardKey(value) {
  return fetchJson(progressUrl({ limit: 1, offset: 0, key: value }))
    .then(data => !!(data && data.ok));
}

function lockDashboard() {
  setDashboardKey('');
  progressState.locked = true;
  progressState.students = [];
  progressState.total = 0;
  progressState.fetchedAt = 0;
}

/* ---------- Dashboard password prompt ---------- */

function renderDashboardPasswordPrompt() {
  if (document.getElementById('dashboard-password-modal')) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'dashboard-password-modal';
  overlay.innerHTML = `
    <div class="modal-card">
      <h2>Leader access</h2>
      <p class="prose">Enter the dashboard password to see student progress.</p>
      <input type="password" id="dashboard-password-input" placeholder="Password" autocomplete="current-password">
      <p class="modal-error hidden" id="dashboard-password-error"></p>
      <button id="dashboard-password-submit" class="btn-pill btn-wide">Continue</button>
      <button id="dashboard-password-cancel" class="change-name">Cancel</button>
    </div>
  `;
  document.body.appendChild(overlay);

  const input = overlay.querySelector('#dashboard-password-input');
  const submitBtn = overlay.querySelector('#dashboard-password-submit');
  const error = overlay.querySelector('#dashboard-password-error');
  input.focus();

  function showError(message) {
    error.textContent = message;
    error.classList.remove('hidden');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Continue';
    input.select();
  }

  function submit() {
    const value = input.value.trim();
    if (!value) { input.focus(); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Checking…';
    error.classList.add('hidden');

    verifyDashboardKey(value)
      .then(good => {
        if (!good) { showError("That password didn't work. Try again."); return; }
        setDashboardKey(value);
        setDashboardRequiresKey(true);
        progressState.locked = false;
        progressState.students = [];
        progressState.fetchedAt = 0;
        overlay.remove();
        router();
      })
      .catch(() => showError("Couldn't reach the sheet. Check your connection and try again."));
  }

  function cancel() {
    overlay.remove();
    window.location.hash = '#/resources/leader-dashboard';
  }

  submitBtn.addEventListener('click', submit);
  overlay.querySelector('#dashboard-password-cancel').addEventListener('click', cancel);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) cancel(); });
}

/* Fallback for browsers/setups where reading the Apps Script response
   directly is blocked. The script answers with ?callback=... too. */
let jsonpCounter = 0;

function jsonpRequest(url) {
  return new Promise((resolve, reject) => {
    const name = `f10dProgress${++jsonpCounter}`;
    const script = document.createElement('script');

    const timer = setTimeout(() => { cleanup(); reject(new Error('timeout')); }, 15000);

    function cleanup() {
      clearTimeout(timer);
      delete window[name];
      script.remove();
    }

    window[name] = (data) => { cleanup(); resolve(data); };
    script.onerror = () => { cleanup(); reject(new Error('network')); };
    script.src = `${url}&callback=${name}`;
    document.body.appendChild(script);
  });
}

function progressShell(inner) {
  return `
    <div class="topbar">
      <a href="#/resources/leader-dashboard" class="back-link">${ICONS.arrowLeft}<span>Leader Dashboard</span></a>
    </div>
    <div class="page-header">
      <div class="label page-eyebrow">For leaders</div>
      <h1>Student Progress</h1>
    </div>
    ${inner}
  `;
}

function renderProgressList(view) {
  if (!trackingEnabled()) {
    view.innerHTML = progressShell(`
      <div class="progress-empty">
        <p class="prose">Progress tracking isn't connected yet. See "Student progress tracking" in the README for the one-time setup.</p>
      </div>
    `);
    return;
  }

  const needsPassword = dashboardRequiresKey() && !getDashboardKey();
  progressState.locked = needsPassword;

  view.innerHTML = progressShell(`
    ${needsPassword ? '' : `
      <div class="progress-search">
        <span class="icon">${ICONS.search}</span>
        <input type="search" id="progress-search-input" placeholder="Search students" autocomplete="off" value="${escapeHtml(progressState.query)}">
      </div>
    `}
    <div id="progress-list"></div>
    ${getDashboardKey() ? `<button class="change-name" id="dashboard-lock">Lock dashboard</button>` : ''}
  `);

  view.querySelector('#progress-search-input')?.addEventListener('input', (e) => {
    progressState.query = e.target.value;
    paintProgressList();
  });

  view.querySelector('#dashboard-lock')?.addEventListener('click', () => {
    lockDashboard();
    router();
  });

  // Known to need a password and we don't have one — ask before fetching.
  if (needsPassword) {
    paintProgressList();
    renderDashboardPasswordPrompt();
    return;
  }

  const stillFresh = progressState.students.length > 0 &&
    (Date.now() - progressState.fetchedAt) < PROGRESS_CACHE_MS;

  if (stillFresh) {
    paintProgressList();
  } else {
    loadProgressPage(true);
  }
}

function loadProgressPage(reset) {
  if (progressState.loading) return;

  if (reset) {
    progressState.students = [];
    progressState.total = 0;
  }

  progressState.loading = true;
  progressState.error = '';
  paintProgressList();

  fetchProgress({ limit: PROGRESS_PAGE_SIZE, offset: progressState.students.length })
    .then(data => {
      if (isUnauthorized(data)) {
        setDashboardRequiresKey(true);
        lockDashboard();
        return;
      }
      if (!data || !data.ok) throw new Error('bad response');
      progressState.students = progressState.students.concat(data.students || []);
      progressState.total = typeof data.total === 'number' ? data.total : progressState.students.length;
      progressState.fetchedAt = Date.now();
    })
    .catch(() => {
      progressState.error = "Couldn't load student progress.";
    })
    .then(() => {
      progressState.loading = false;
      if (progressState.locked) {
        router();  // rebuild without the search box, then prompt
      } else {
        paintProgressList();
      }
    });
}

function progressCard(student) {
  const done = {};
  (student.days || []).forEach(d => { if (d.complete) done[d.day] = true; });

  const dots = DAYS.map(d => `<span class="dot ${done[d.day] ? 'done' : ''}"></span>`).join('');
  const count = DAYS.filter(d => done[d.day]).length;

  return `
    <a href="#/progress/${encodeURIComponent(student.name)}" class="progress-card">
      <span class="progress-card-top">
        <span class="name">${escapeHtml(student.name)}</span>
        <span class="when">${relativeTime(student.lastActive)}</span>
      </span>
      <span class="progress-dots">
        ${dots}
        <span class="count">${count}/${DAYS.length}</span>
      </span>
    </a>
  `;
}

function paintProgressList() {
  const host = document.getElementById('progress-list');
  if (!host) return; // navigated away mid-load

  if (progressState.locked) {
    host.innerHTML = `
      <div class="progress-empty">
        <p class="prose">This dashboard is password protected.</p>
        <button class="btn-pill btn-wide" id="progress-unlock">Enter password</button>
      </div>
    `;
    document.getElementById('progress-unlock')
      .addEventListener('click', () => renderDashboardPasswordPrompt());
    return;
  }

  const loaded = progressState.students;
  const query = progressState.query.trim();
  const shown = query
    ? loaded.filter(s => s.name.toLowerCase().includes(query.toLowerCase()))
    : loaded;
  const remaining = Math.max(progressState.total - loaded.length, 0);

  const moreButton = `<button class="load-more" id="progress-more">Load ${Math.min(remaining, PROGRESS_PAGE_SIZE)} more</button>`;

  function wire() {
    document.getElementById('progress-more')?.addEventListener('click', () => loadProgressPage(false));
    document.getElementById('progress-retry')?.addEventListener('click', () => loadProgressPage(true));
  }

  if (loaded.length === 0) {
    if (progressState.loading) {
      host.innerHTML = `<div class="progress-empty"><p class="prose">Loading student progress&hellip;</p></div>`;
    } else if (progressState.error) {
      const sheet = progressSheetUrl();
      host.innerHTML = `
        <div class="progress-empty">
          <p class="prose">${progressState.error}</p>
          <button class="btn-pill btn-wide" id="progress-retry">Try again</button>
          ${sheet ? `<a class="progress-sheet-link" href="${sheet}" target="_blank" rel="noopener">Open the Google Sheet instead</a>` : ''}
        </div>
      `;
      wire();
    } else {
      host.innerHTML = `<div class="progress-empty"><p class="prose">No one has marked a day complete yet.</p></div>`;
    }
    return;
  }

  // Searching only looks at students already pulled down, so say so
  // rather than implying the person doesn't exist.
  if (shown.length === 0) {
    host.innerHTML = `
      <div class="progress-empty">
        <p class="prose">None of the ${loaded.length} students loaded match &ldquo;${escapeHtml(query)}&rdquo;.</p>
        ${remaining > 0 ? `<p class="prose">${remaining} more haven't been loaded yet.</p>${progressState.loading ? '' : moreButton}` : ''}
      </div>
    `;
    wire();
    return;
  }

  let footer;
  if (progressState.loading) {
    footer = `<p class="progress-note">Loading&hellip;</p>`;
  } else if (remaining > 0) {
    footer = `${moreButton}<p class="progress-note">Showing ${loaded.length} of ${progressState.total}${query ? ` loaded &middot; ${shown.length} match` : ''}</p>`;
  } else if (query) {
    footer = `<p class="progress-note">${shown.length} of ${loaded.length} students match</p>`;
  } else {
    footer = `<p class="progress-note">Showing all ${loaded.length} student${loaded.length === 1 ? '' : 's'}</p>`;
  }

  host.innerHTML = shown.map(progressCard).join('') + footer;
  wire();
}

/* ---------- Leader dashboard: one student ---------- */

function progressDetailShell(safeName, inner) {
  return `
    <div class="topbar">
      <a href="#/progress" class="back-link">${ICONS.arrowLeft}<span>All students</span></a>
    </div>
    <div class="page-header">
      <h1>${safeName}</h1>
    </div>
    ${inner}
  `;
}

/* `name` arrives already decoded from the URL by parseRoute. */
function renderProgressDetail(view, name) {
  if (!trackingEnabled()) { renderProgressList(view); return; }

  // Deep link into a student without the password — bounce to the list,
  // which does the asking.
  if (dashboardRequiresKey() && !getDashboardKey()) {
    window.location.hash = '#/progress';
    return;
  }

  const cached = progressState.students.find(s => s.name.toLowerCase() === name.toLowerCase());
  if (cached) { paintProgressDetail(view, cached); return; }

  // Opened directly, or after a refresh — pull just this student.
  view.innerHTML = progressDetailShell(escapeHtml(name), `<div class="progress-empty"><p class="prose">Loading&hellip;</p></div>`);

  fetchProgress({ name })
    .then(data => {
      if (isUnauthorized(data)) {
        setDashboardRequiresKey(true);
        lockDashboard();
        window.location.hash = '#/progress';
        return;
      }
      if (!data || !data.ok || !(data.students || []).length) throw new Error('not found');
      paintProgressDetail(view, data.students[0]);
    })
    .catch(() => {
      view.innerHTML = progressDetailShell(escapeHtml(name), `
        <div class="progress-empty"><p class="prose">Couldn't load this student's progress.</p></div>
      `);
    });
}

function paintProgressDetail(view, student) {
  const byDay = {};
  (student.days || []).forEach(d => { byDay[d.day] = d; });

  const rows = DAYS.map(d => {
    const record = byDay[d.day];
    const done = !!(record && record.complete);
    return `
      <div class="progress-day ${done ? 'done' : ''}">
        <span class="num">${d.day}</span>
        <span class="progress-day-label">Day ${d.day}</span>
        <span class="when">${done ? shortDate(record.updated) : '&mdash;'}</span>
      </div>
    `;
  }).join('');

  const count = DAYS.filter(d => byDay[d.day] && byDay[d.day].complete).length;

  view.innerHTML = progressDetailShell(escapeHtml(student.name), `
    <p class="progress-sub">${count} of ${DAYS.length} days &middot; last active ${relativeTime(student.lastActive)}</p>
    <div class="progress-days">${rows}</div>
    <p class="progress-note">Dates show when a day was last marked &mdash; not necessarily the first time.</p>
  `);
}

/* ---------- PWA install prompt ---------- */

let deferredInstallPrompt = null;

function isAppInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (localStorage.getItem('install-dismissed') !== 'true') {
      document.getElementById('install-banner')?.classList.add('show');
    }
  });
}

function triggerInstall() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  deferredInstallPrompt.userChoice.finally(() => {
    deferredInstallPrompt = null;
    document.getElementById('install-banner')?.classList.remove('show');
  });
}

function dismissInstallBanner() {
  localStorage.setItem('install-dismissed', 'true');
  document.getElementById('install-banner')?.classList.remove('show');
}
