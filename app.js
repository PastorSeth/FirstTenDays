/* ==========================================================
   FIRST 10 DAYS — App logic
   Plain JS, hash-based routing, no build step required.
   ========================================================== */

const app = document.getElementById('app');

/* ---------- Text helpers ---------- */

/* Anything a student typed (their name) gets run through this before
   going into the page, so a stray < or & can't break the markup. */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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
  back: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>`,
  chevron: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>`,
  check: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`,
  compass: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"/></svg>`,
  film: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M7 3v18M17 3v18M2 8h5M2 16h5M17 8h5M17 16h5"/></svg>`,
  close: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
  play: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
  search: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></svg>`
};

function videoFrame(videoId) {
  return videoId
    ? `<div class="video-frame"><iframe src="https://www.youtube.com/embed/${videoId}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`
    : `<div class="video-frame"><div class="video-placeholder">${ICONS.film}<span>Video coming soon</span></div></div>`;
}

/* ---------- Router ---------- */

function router() {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const parts = hash.split('/').filter(Boolean);

  if (parts.length === 0) {
    renderHome();
  } else if (parts[0] === 'day' && parts[1]) {
    renderDay(parseInt(parts[1], 10));
  } else if (parts[0] === 'resources' && !parts[1]) {
    renderResourceList();
  } else if (parts[0] === 'resources' && parts[1]) {
    renderResource(parts[1]);
  } else if (parts[0] === 'progress' && !parts[1]) {
    renderProgressList();
  } else if (parts[0] === 'progress' && parts[1]) {
    renderProgressDetail(parts[1]);
  } else {
    renderHome();
  }

  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', () => {
  router();
  setupInstallPrompt();
  maybeShowNamePrompt();
});

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
      <button id="name-submit" class="complete-toggle is-complete">Continue</button>
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

/* ---------- Home ---------- */

function renderHome() {
  const nodes = DAYS.map(d => {
    const complete = isDayComplete(d.day);
    return `
      <a href="#/day/${d.day}" class="trail-node ${complete ? 'complete' : ''}">
        <span class="stone">
          <span class="num">${d.day}</span>
          <span class="check">${ICONS.check}</span>
        </span>
        <span class="info">
          <span class="day-label">Day ${d.day}</span>
          <span class="day-topic">${d.topic}</span>
        </span>
        <span class="chevron">${ICONS.chevron}</span>
      </a>
    `;
  }).join('');

  app.innerHTML = `
    <div class="install-banner" id="install-banner">
      <span>Add this to your home screen for quick daily access.</span>
      <button id="install-btn">Install</button>
      <button id="install-dismiss" class="install-dismiss">Not now</button>
    </div>
    <div class="hero">
      <div class="eyebrow">A 10-Day Bible Study</div>
      <h1>First 10 Days</h1>
    </div>
    <div class="welcome-video-banner">
      <button class="welcome-video-pill" id="welcome-video-open">
        <span class="icon">${ICONS.play}</span>
        Watch the welcome video
      </button>
    </div>
    <div class="trail">
      ${nodes}
    </div>
    <div class="signpost">
      <a href="#/resources" class="signpost-card">
        <span class="icon">${ICONS.compass}</span>
        <span>
          <span class="title">Extra Resources</span>
          <span class="sub">Study tools, guides, and deeper questions</span>
        </span>
        <span class="chevron">${ICONS.chevron}</span>
      </a>
    </div>
    ${trackingEnabled() && getStudentName() ? `<button class="change-name" id="change-name-btn">Not ${escapeHtml(getStudentName())}? Change name</button>` : ''}
  `;

  document.getElementById('install-btn')?.addEventListener('click', triggerInstall);
  document.getElementById('install-dismiss')?.addEventListener('click', dismissInstallBanner);
  document.getElementById('change-name-btn')?.addEventListener('click', renderNamePrompt);
  document.getElementById('welcome-video-open')?.addEventListener('click', renderWelcomeVideoModal);
}

/* ---------- Day page ---------- */

function renderDay(dayNum) {
  const d = DAYS.find(x => x.day === dayNum);
  if (!d) { renderHome(); return; }

  function reflectionCard(r) {
    const val = loadReflection(dayNum, r.id);
    return `
      <div class="reflection">
        <label for="r-${r.id}">${r.label}</label>
        ${r.prompt ? `<div class="prompt">${r.prompt}</div>` : ''}
        <textarea id="r-${r.id}" data-field="${r.id}" placeholder="Write your answer here&hellip;">${val}</textarea>
        <div class="save-status" data-status-for="${r.id}">Saved</div>
      </div>
    `;
  }

  const reflections = d.reflections.map(reflectionCard).join('');
  const reflectionQuestionBlock = d.reflectionQuestion ? reflectionCard(d.reflectionQuestion) : '';

  // Normally: Bible Passage -> MAPS -> Video -> Reflection Question.
  // A day can override this with the "flow" field:
  //   "video-first"        -> Video -> MAPS -> Reflection Question (no passage section)
  //   "video-passage-video" -> Video #1 -> Bible Passage -> Video #2 -> MAPS -> Reflection Question
  //                            (uses videoId as Video #1 and videoId2 as Video #2)
  const passageBlock = `
    <div class="section">
      <div class="prose">${d.intro}</div>
    </div>
  `;
  const reflectBlock = `
    <div class="section">
      <h2><span class="num">Reflect</span></h2>
      ${reflections}
    </div>
  `;
  const videoWrap = `<div class="video-wrap">${videoFrame(d.videoId)}</div>`;

  let mainFlow;
  if (d.flow === 'video-passage-video') {
    const videoWrap2 = `<div class="video-wrap">${videoFrame(d.videoId2)}</div>`;
    mainFlow = `${videoWrap}${passageBlock}${videoWrap2}${reflectBlock}`;
  } else if (d.flow === 'video-first') {
    mainFlow = `${videoWrap}${reflectBlock}`;
  } else {
    mainFlow = `${passageBlock}${reflectBlock}${videoWrap}`;
  }

  const complete = isDayComplete(dayNum);
  const prev = DAYS.find(x => x.day === dayNum - 1);
  const next = DAYS.find(x => x.day === dayNum + 1);

  app.innerHTML = `
    <div class="topbar">
      <a href="#/" class="back-link">${ICONS.back} All Days</a>
    </div>
    <div class="day-header">
      <div class="day-eyebrow">Day ${d.day} of 10</div>
      <h1>${d.topic}</h1>
      <span class="passage-pill">${d.passage}</span>
    </div>

    ${mainFlow}

    ${reflectionQuestionBlock ? `
      <div class="section">
        ${reflectionQuestionBlock}
      </div>
    ` : ''}

    <button class="complete-toggle ${complete ? 'is-complete' : ''}" id="complete-btn">
      ${complete ? ICONS.check + ' Day Complete' : 'Mark Day Complete'}
    </button>

    <div class="day-nav">
      ${prev ? `<a href="#/day/${prev.day}">&larr; Day ${prev.day}</a>` : '<span></span>'}
      ${next ? `<a href="#/day/${next.day}">Day ${next.day} &rarr;</a>` : '<span></span>'}
    </div>
  `;

  // Wire up auto-saving textareas
  app.querySelectorAll('textarea[data-field]').forEach(ta => {
    let saveTimer;
    ta.addEventListener('input', () => {
      const field = ta.getAttribute('data-field');
      saveReflection(dayNum, field, ta.value);
      const status = app.querySelector(`.save-status[data-status-for="${field}"]`);
      if (status) {
        status.classList.add('show');
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => status.classList.remove('show'), 1200);
      }
    });
  });

  document.getElementById('complete-btn').addEventListener('click', (e) => {
    const nowComplete = !isDayComplete(dayNum);
    setDayComplete(dayNum, nowComplete);
    e.target.classList.toggle('is-complete', nowComplete);
    e.target.innerHTML = nowComplete ? ICONS.check + ' Day Complete' : 'Mark Day Complete';
    if (trackingEnabled() && !getStudentName()) {
      renderNamePrompt();
    }
    sendProgressUpdate(dayNum, nowComplete);
  });
}

/* ---------- Resource list ---------- */

function renderResourceList() {
  const items = RESOURCES.map(r => `
    <a href="#/resources/${r.slug}" class="resource-item">
      <span class="title">${r.title}</span>
      <span class="chevron">${ICONS.chevron}</span>
    </a>
  `).join('');

  app.innerHTML = `
    <div class="topbar">
      <a href="#/" class="back-link">${ICONS.back} All Days</a>
    </div>
    <div class="day-header">
      <div class="day-eyebrow">Extra Resources</div>
      <h1>Go Deeper</h1>
    </div>
    ${items}
    ${isAppInstalled() ? '' : `
      <div class="section install-section">
        <h2><span class="num">Install</span></h2>
        <p class="prose">Skip past the prompt on the main page? You can still add First 10 Days to your home screen any time.</p>
        <button class="complete-toggle is-complete" id="resource-install-btn">Install App</button>
        <p class="prose install-fallback hidden" id="install-fallback">
          Your browser doesn't support one-tap install here &mdash; add it manually instead:<br>
          <strong>Android (Chrome):</strong> tap the &#8942; menu &rarr; "Add to Home screen".<br>
          <strong>iPhone (Safari):</strong> tap the Share icon &rarr; "Add to Home Screen".
        </p>
      </div>
    `}
  `;

  document.getElementById('resource-install-btn')?.addEventListener('click', () => {
    if (deferredInstallPrompt) {
      triggerInstall();
    } else {
      document.getElementById('install-fallback')?.classList.remove('hidden');
    }
  });
}

function renderResource(slug) {
  const r = RESOURCES.find(x => x.slug === slug);
  if (!r) { renderResourceList(); return; }

  app.innerHTML = `
    <div class="topbar">
      <a href="#/resources" class="back-link">${ICONS.back} Extra Resources</a>
    </div>
    <div class="day-header">
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
  error: '',
  fetchedAt: 0
};

function progressSheetUrl() {
  return typeof PROGRESS_SHEET_URL === 'string' && PROGRESS_SHEET_URL.trim() ? PROGRESS_SHEET_URL : '';
}

function fetchProgress(params) {
  const query = Object.keys(params)
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&');
  const url = TRACKING_ENDPOINT + (TRACKING_ENDPOINT.indexOf('?') === -1 ? '?' : '&') + query;

  return fetch(url)
    .then(res => {
      if (!res.ok) throw new Error('bad status');
      return res.json();
    })
    .catch(() => jsonpRequest(url));
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
      <a href="#/resources/leader-dashboard" class="back-link">${ICONS.back} Leader Dashboard</a>
    </div>
    <div class="day-header">
      <div class="day-eyebrow">For leaders</div>
      <h1>Student Progress</h1>
    </div>
    ${inner}
  `;
}

function renderProgressList() {
  if (!trackingEnabled()) {
    app.innerHTML = progressShell(`
      <div class="progress-empty">
        <p class="prose">Progress tracking isn't connected yet. See "Student progress tracking" in the README for the one-time setup.</p>
      </div>
    `);
    return;
  }

  app.innerHTML = progressShell(`
    <div class="progress-search">
      <span class="icon">${ICONS.search}</span>
      <input type="search" id="progress-search-input" placeholder="Search students" autocomplete="off" value="${escapeHtml(progressState.query)}">
    </div>
    <div id="progress-list"></div>
  `);

  const input = document.getElementById('progress-search-input');
  input.addEventListener('input', () => {
    progressState.query = input.value;
    paintProgressList();
  });

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
      paintProgressList();
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
          <button class="complete-toggle is-complete" id="progress-retry">Try again</button>
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
      <a href="#/progress" class="back-link">${ICONS.back} All Students</a>
    </div>
    <div class="day-header">
      <h1>${safeName}</h1>
    </div>
    ${inner}
  `;
}

function renderProgressDetail(rawName) {
  if (!trackingEnabled()) { renderProgressList(); return; }

  let name;
  try { name = decodeURIComponent(rawName); } catch (e) { name = rawName; }

  const cached = progressState.students.find(s => s.name.toLowerCase() === name.toLowerCase());
  if (cached) { paintProgressDetail(cached); return; }

  // Opened directly, or after a refresh — pull just this student.
  app.innerHTML = progressDetailShell(escapeHtml(name), `<div class="progress-empty"><p class="prose">Loading&hellip;</p></div>`);

  fetchProgress({ name })
    .then(data => {
      if (!data || !data.ok || !(data.students || []).length) throw new Error('not found');
      paintProgressDetail(data.students[0]);
    })
    .catch(() => {
      app.innerHTML = progressDetailShell(escapeHtml(name), `
        <div class="progress-empty"><p class="prose">Couldn't load this student's progress.</p></div>
      `);
    });
}

function paintProgressDetail(student) {
  const byDay = {};
  (student.days || []).forEach(d => { byDay[d.day] = d; });

  const rows = DAYS.map(d => {
    const record = byDay[d.day];
    const done = !!(record && record.complete);
    return `
      <div class="progress-day ${done ? 'done' : ''}">
        <span class="num">${d.day}</span>
        <span class="label">Day ${d.day}</span>
        <span class="when">${done ? shortDate(record.updated) : '&mdash;'}</span>
      </div>
    `;
  }).join('');

  const count = DAYS.filter(d => byDay[d.day] && byDay[d.day].complete).length;

  app.innerHTML = progressDetailShell(escapeHtml(student.name), `
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

/* ---------- Service worker registration ---------- */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {
      /* offline support just won't be available; site still works online */
    });
  });
}
