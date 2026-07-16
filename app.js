/* ==========================================================
   FIRST 10 DAYS — App logic
   Plain JS, hash-based routing, no build step required.
   ========================================================== */

const app = document.getElementById('app');

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
  film: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M7 3v18M17 3v18M2 8h5M2 16h5M17 8h5M17 16h5"/></svg>`
};

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
      <p>Ten days walking through 1 John &mdash; a short passage, a few honest questions, and space to write down what you're actually thinking.</p>
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
    ${trackingEnabled() && getStudentName() ? `<button class="change-name" id="change-name-btn">Not ${getStudentName()}? Change name</button>` : ''}
  `;

  document.getElementById('install-btn')?.addEventListener('click', triggerInstall);
  document.getElementById('install-dismiss')?.addEventListener('click', dismissInstallBanner);
  document.getElementById('change-name-btn')?.addEventListener('click', renderNamePrompt);
}

/* ---------- Day page ---------- */

function renderDay(dayNum) {
  const d = DAYS.find(x => x.day === dayNum);
  if (!d) { renderHome(); return; }

  const videoBlock = d.videoId
    ? `<div class="video-frame"><iframe src="https://www.youtube.com/embed/${d.videoId}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`
    : `<div class="video-frame"><div class="video-placeholder">${ICONS.film}<span>Video coming soon</span></div></div>`;

  const reflections = d.reflections.map(r => {
    const val = loadReflection(dayNum, r.id);
    return `
      <div class="reflection">
        <label for="r-${r.id}">${r.label}</label>
        ${r.prompt ? `<div class="prompt">${r.prompt}</div>` : ''}
        <textarea id="r-${r.id}" data-field="${r.id}" placeholder="Write your answer here&hellip;">${val}</textarea>
        <div class="save-status" data-status-for="${r.id}">Saved</div>
      </div>
    `;
  }).join('');

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

    <div class="video-wrap">${videoBlock}</div>

    <div class="section">
      <div class="prose">${d.intro}</div>
    </div>

    <div class="section">
      <h2><span class="num">Reflect</span></h2>
      ${reflections}
    </div>

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
  `;
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

/* ---------- PWA install prompt ---------- */

let deferredInstallPrompt = null;

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
