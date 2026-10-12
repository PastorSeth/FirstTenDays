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
      <div class="label home-eyebrow">${DAYS.length}-day Bible study</div>
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

function renderDay(view, dayNum) {
  const d = DAYS.find(x => x.day === dayNum);
  if (!d) { renderHome(view); return; }

  function reflectionCard(r) {
    const val = loadReflection(dayNum, r.id);
    return `
      <div class="reflection">
        <label for="r-${r.id}">${typeset(r.label)}</label>
        ${r.prompt ? `<div class="prompt">${typeset(r.prompt)}</div>` : ''}
        <textarea id="r-${r.id}" data-field="${r.id}" placeholder="Write your answer here&hellip;">${escapeHtml(val)}</textarea>
        <div class="save-status" data-status-for="${r.id}">Saved</div>
      </div>
    `;
  }

  // A day can leave out its reflection boxes; then it has no Reflect section.
  const reflections = Array.isArray(d.reflections) ? d.reflections : [];

  const study = typeof d.study === 'string' && d.study.trim()
    ? `<div class="study">${formatStudy(d.study)}</div>`
    : '<div class="study-placeholder">Study coming soon.</div>';

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
      ${study}
      ${reflections.length ? `<section class="reflect">
        <h2 class="section-h t-condensed">Reflect</h2>
        ${reflections.map(reflectionCard).join('')}
      </section>` : ''}
      ${d.reflectionQuestion ? `<section class="reflect reflect--question">${reflectionCard(d.reflectionQuestion)}</section>` : ''}
      <button class="complete-btn btn-pill ${complete ? 'is-complete' : ''}" id="complete-btn">${completeLabel(complete)}</button>
      <nav class="day-nav" aria-label="Other days">
        ${prev ? `<a data-dir="prev" href="#/day/${prev.day}">${ICONS.arrowLeft}<span>Day ${prev.day}</span></a>` : '<span></span>'}
        ${next ? `<a data-dir="next" href="#/day/${next.day}"><span>Day ${next.day}</span>${ICONS.arrowRight}</a>` : '<span></span>'}
      </nav>
    </div>
  `;

  // Wire up auto-saving textareas
  view.querySelectorAll('textarea[data-field]').forEach(ta => {
    let saveTimer;
    ta.addEventListener('input', () => {
      const field = ta.getAttribute('data-field');
      saveReflection(dayNum, field, ta.value);
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
    button.innerHTML = completeLabel(nowComplete);
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
