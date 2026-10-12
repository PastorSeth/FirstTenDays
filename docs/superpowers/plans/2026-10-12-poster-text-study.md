# Poster Redesign and Text-Based Study Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the per-day videos with a text-based study the pastor writes in `data.js`, and rebuild the app in the approved kinetic "Poster" style with scroll-linked motion and page transitions.

**Architecture:** Still a no-build static PWA. Two new classic scripts sit between `data.js` and `app.js`:
- `format.js` turns the pastor's plain-text study marks into HTML.
- `motion.js` owns all movement: the scroll engine, entrances, and page transitions.

`app.js` keeps routing and features, but every page now renders into its own `.view` element, so two views can coexist during a transition. `style.css` is replaced with the Poster system.

**Tech Stack:** Vanilla JS (classic scripts, ES2017), CSS custom properties, the Web Animations API, IntersectionObserver, a service worker, and Google Fonts (Archivo variable). Tests run in a tiny in-browser harness (no Node or Python on this machine). A PowerShell TCP static server is used for local and on-phone testing.

**Spec:** `docs/superpowers/specs/2026-10-12-poster-text-study-design.md`. Read it alongside this plan; section references (§) point there.

## Global Constraints

- No build step. Plain classic `<script>` files, loaded in this order: `data.js` → `tracking-config.js` → `format.js` → `motion.js` → `app.js`.
- `data.js` stays the only file the pastor edits. All content lives there.
- Only `transform` and `opacity` animate. Never animate `filter` or `backdrop-filter`. No `background-attachment: fixed`.
- Colors:
  - `--paper #F4F1EA`, `--paper-raised #FBF9F4`, `--ink #0A0A14`
  - `--ink-60` / `--ink-30` (ink at 60% / 30%), `--rule` (ink at 20%)
  - `--vermilion #FF4A1C`, for display size or decoration only
  - `--vermilion-text #C2310E`, for small text and links
  - Text on a vermilion fill is ink.
- Type: Archivo variable (width 62–125, weight 100–900) from Google Fonts with `display=swap`; fallback `system-ui, sans-serif`. Giant words width 62/weight 900; titles and headings width 75/900; body width 100. Study body is 18px with a 1.65 line height.
- Layout:
  - Phone-first at 375px.
  - Content max-width 640px, with 20px gutters.
  - Safe-area insets and dynamic viewport units.
  - Tap targets at least 44px.
- Motion timings: home entrance about 1s; number flight about 560ms; day ↔ day about 400ms.
- Reduce Motion: no scroll-linked movement, no smear, and no load entrance. Page transitions become a 150ms crossfade.
- Unchanged:
  - localStorage keys `reflection:<day>:<fieldId>`, `complete:<day>`, `student-name`, `install-dismissed`, `dashboard-key`, `dashboard-requires-key`
  - Routes `#/`, `#/day/N`, `#/resources`, `#/resources/<slug>`, `#/progress`, `#/progress/<name>`
  - The tracking payload and the Apps Script
- Plan rules:
  - All work happens on `Text-No-Videos`, with a commit after each task. Never push, and never touch `main`.
  - Commit messages are sentence-case imperative and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  - Form fields use a 16px or larger font so iOS doesn't zoom on focus.

## Review Focus

1. **Indented or CRLF study text.** The pastor pastes `study` text that's indented inside the backticks, or has Windows line endings. Expected: headings, bullets, numbers, and quotes are still recognized. Pinned by Task 2, `format: indented and CRLF study text still finds marks`.
2. **Link URLs with digit-hyphen-digit.** A URL like Day 1's `…/1-3-john/` must never be typeset into an en dash. Pinned by Task 2, `format: link URLs are never typeset`.
3. **Malformed `words`.** `words` written as a single string, as an empty list, or with blank entries. Expected: a string counts as one word, blanks are dropped, empty falls back to `HOME_WORDS`, and nothing ever splits into letters. Pinned by Task 7, `app: dayWords falls back and accepts a single string`.
4. **Existing student data.** Saved answers and completed days written by the current version still show after the rebuild. Pinned by Task 8, `app: saved answers from the current version still load` and `app: tapping the check icon toggles the complete button correctly`.
5. **Navigating mid-transition.** A double tap or a quick Back while a transition is running. Expected: exactly one view remains, with no leftover number clones and nothing stuck half-faded. Pinned by the Task 9 step "mid-transition navigation".

---

## How to run things (used by every task)

**Unit tests:**
1. Start the test server in the background (once per session):
   `powershell -NoProfile -ExecutionPolicy Bypass -File tools/serve.ps1 -Port 8778`
2. Navigate the Browser pane to `http://localhost:8778/tests/`, or reload if it's already open.
3. Read the results with `javascript_tool`: `await window.__testsDone; JSON.stringify(window.__testResults)`
4. "PASS" means `"failed":0`. A failing run lists `failures[].name` and `failures[].message`.

**App checks:**
1. Start the app server in the background:
   `powershell -NoProfile -ExecutionPolicy Bypass -File tools/serve.ps1 -Port 8777`
2. Open `http://localhost:8777/`.
3. Never open the app on port 8778, because its service worker would start caching the test files.

**Fresh load.** The service worker serves cached files first, so run this before every app check:
```js
(async () => { for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); for (const k of await caches.keys()) await caches.delete(k); location.reload(); return 'reloading'; })()
```

**Overflow check.** Expected `"count":0`. It measures bounding boxes, because `overflow-x: hidden` masks `scrollWidth`. The decorative `aria-hidden` rows are excluded, since they're clipped on purpose.
```js
(() => { const vw = document.documentElement.clientWidth; const bad = [...document.querySelectorAll('#app *')].filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && !el.closest('[aria-hidden="true"]') && (r.right > vw + 0.5 || r.left < -0.5); }).map(el => String(el.className || el.tagName)); return JSON.stringify({ vw, count: bad.length, bad: bad.slice(0, 10) }); })()
```

**Viewports:** use `resize_window` at 375×812 (the `mobile` preset), 360×740, 768×1024 (the `tablet` preset), and the `desktop` preset. Reset to `desktop` when finished.

## File structure

| File | Responsibility |
|---|---|
| `tools/serve.ps1` | **New.** Static server. Loopback by default; `-Lan` serves the phone test |
| `tests/index.html`, `tests/harness.js`, `tests/*.test.js`, `tests/broken-data.html` | **New.** In-browser unit tests |
| `format.js` | **New.** `escapeHtml`, `typeset`, `formatInline`, `formatStudy` |
| `motion.js` | **New.** The `Motion` object: scroll engine, entrances, transitions |
| `data.js` | New content shape and Day 1 script (spec §3) |
| `app.js` | Routing into `.view` elements, page renderers, and existing features |
| `style.css` | Replaced with the Poster system |
| `index.html`, `manifest.json` | Script order, font, theme and status-bar meta, colors |
| `service-worker.js` | Cache bump, new shell files, offline fonts |
| `README.md` | Pastor-facing docs for the new content format |

---

### Task 1: Test harness and dev server

**Files:**
- Create: `tools/serve.ps1`, `tests/harness.js`, `tests/index.html`, `tests/smoke.test.js`

**Interfaces:**
- Produces these globals in the test page:
  - `test(name: string, fn: () => void | Promise<void>)`
  - `assert(cond: any, message?: string)`
  - `assertEqual(actual, expected, message?)`: primitives compare with `===`. Objects and arrays compare by a stable JSON stringify with sorted keys, so key order never matters.
  - `assertClose(actual: number, expected: number, tol = 1e-6, message?)`
  - `assertIncludes(haystack: string, needle: string, message?)`
  - `withStorage(entries: Record<string,string>, fn: () => void)`: saves the current values of those localStorage keys, sets the entries, runs `fn`, then restores the old values (removing keys that didn't exist), even if `fn` throws.
  - `window.__testsDone: Promise<Results>` and `window.__testResults: { passed: number, failed: number, failures: {name: string, message: string}[] }`
- Produces `tools/serve.ps1 [-Port 8777] [-Lan]`

- [ ] **Step 1: Write the smoke test** (`tests/smoke.test.js`)

```js
test('harness: equal numbers pass', () => { assertEqual(1 + 1, 2); });
test('harness: objects compare by value, any key order', () => { assertEqual({ b: 2, a: [1] }, { a: [1], b: 2 }); });
test('harness: async tests are awaited', async () => {
  const v = await new Promise(r => setTimeout(() => r(7), 10));
  assertEqual(v, 7);
});
test('harness: withStorage restores keys', () => {
  localStorage.removeItem('t:k');
  withStorage({ 't:k': 'x' }, () => assertEqual(localStorage.getItem('t:k'), 'x'));
  assertEqual(localStorage.getItem('t:k'), null);
});
```

- [ ] **Step 2: Create `tests/index.html`.** It needs a `<pre id="results">`, then `<script src="harness.js">`, then `<script src="smoke.test.js">`. Later tasks add their source and test scripts here, with source files before test files and in global load order.

- [ ] **Step 3: Implement `tools/serve.ps1`.**
  - Use `System.Net.Sockets.TcpListener`, not `HttpListener`, so it needs no admin rights or URL ACL.
  - Bind `[Net.IPAddress]::Loopback`, or `[Net.IPAddress]::Any` with `-Lan`.
  - The root is the repo (`Split-Path -Parent $PSScriptRoot`).
  - Handle `GET` and `HEAD`. Strip the query string, URL-decode the path, and serve `index.html` for `/` and for directory paths.
  - Reject any resolved path outside the root with a 404.
  - Send `Content-Type` by extension (.html .js .css .json .png .svg .pdf .md), `Cache-Control: no-store`, and `Connection: close`.
  - Catch errors per request.
  - On start, print `http://localhost:<port>/`. With `-Lan`, also print `http://<ipv4>:<port>/` for each non-loopback IPv4 address.

- [ ] **Step 4: Run the tests before the harness exists.** Run them per "How to run things". Expected: `window.__testResults` is undefined, because `test` isn't defined and the page shows script errors.

- [ ] **Step 5: Implement `tests/harness.js`.**
  - Register tests in order, and run them sequentially on `window.load`, awaiting promises with a 5s timeout per test.
  - Catch each test's error into `failures`.
  - Render `PASS name` or `FAIL name — message` lines, then `N passed, M failed`, into `#results`.
  - Resolve `__testsDone`.

- [ ] **Step 6: Run the tests.** Expected: `{"passed":4,"failed":0,…}`. Then temporarily add `test('harness: temporary failure', () => assertEqual(1, 2))` and run again. Expected: `failed: 1`, and the message contains `expected 2`. Remove that test.

- [ ] **Step 7: Commit.** Commit `tools/` and `tests/` with the message "Add an in-browser test harness and a local static server".

---

### Task 2: Study formatter (`format.js`)

**Files:**
- Create: `format.js`, `tests/format.test.js`
- Modify: `app.js` (delete its `escapeHtml`, which moves here), `index.html` (add `<script src="format.js">` after `tracking-config.js`), `tests/index.html` (add `../format.js` and `format.test.js`)

**Interfaces:**
- Produces these globals:
  - `escapeHtml(value: any) -> string`: escapes `& < > " '`. Same output as the old app.js version.
  - `typeset(text: string) -> string`, in this order:
    1. A hyphen between two digits becomes `–`.
    2. Straight quotes become curly. A quote is opening when it's at the start or follows whitespace or one of `([{—–-`; otherwise it's closing (`’` for apostrophes).
    3. Escape the HTML.
  - `formatInline(text: string) -> string`: first split out links matching `/\[([^\]\n]+)\]\(([^)\s]+)\)/`.
    - URLs matching `/^(https?:\/\/|#\/)/i` become links. `https?` links get `target="_blank" rel="noopener"`. The `href` is `escapeHtml(url)` and is **never typeset**.
    - Any other link-shaped text stays literal.
    - Labels and non-link text get `typeset`, then `**x**` → `<strong>x</strong>`. An unclosed `**` stays literal.
  - `formatStudy(text: any) -> string`: non-strings return `''`.
    - Split on `\r?\n`, trim each line, and skip blank lines.
    - Lines starting `#`/`##` plus a space become `<h2 class="study-h">`.
    - `* ` and `- ` lines become `<ul class="study-ul"><li>`.
    - `N. ` lines become `<ol class="study-ol">`, with `start="N"` only when the first number isn't 1.
    - `> ` lines become `<blockquote class="pull" data-reveal><p>`, with consecutive quote lines joined by `<br>`.
    - Any other line becomes `<p>`.
    - Consecutive same-type list or quote lines group together. All content goes through `formatInline`. It never throws.

- [ ] **Step 1: Write the failing tests** (`tests/format.test.js`)

```js
test('format: escapeHtml escapes markup characters', () => {
  assertEqual(escapeHtml(`<b>&"'`), '&lt;b&gt;&amp;&quot;&#39;');
});
test('format: typeset curls quotes and apostrophes', () => {
  assertEqual(typeset(`"Hi," she said. Don't stop.`), '“Hi,” she said. Don’t stop.');
  assertEqual(typeset(`students' notes`), 'students’ notes');
  assertEqual(typeset(`'quoted'`), '‘quoted’');
});
test('format: typeset turns digit-hyphen-digit into an en dash only', () => {
  assertEqual(typeset('1 John 1:1-4'), '1 John 1:1–4');
  assertEqual(typeset('well-known'), 'well-known');
});
test('format: typeset escapes HTML', () => { assertEqual(typeset('<script>'), '&lt;script&gt;'); });
test('format: inline bold, and unclosed bold stays literal', () => {
  assertEqual(formatInline('a **big** deal'), 'a <strong>big</strong> deal');
  assertEqual(formatInline('a **big deal'), 'a **big deal');
});
test('format: external link opens in a new tab', () => {
  assertEqual(formatInline('[The Bible Project](https://bibleproject.com/videos/1-3-john/)'),
    '<a href="https://bibleproject.com/videos/1-3-john/" target="_blank" rel="noopener">The Bible Project</a>');
});
test('format: internal link stays in the app', () => {
  assertEqual(formatInline('[Resources](#/resources)'), '<a href="#/resources">Resources</a>');
});
test('format: unsafe link scheme renders as text', () => {
  const out = formatInline('[x](javascript:alert(1))');
  assert(!out.includes('<a'), out);
  assertIncludes(out, '[x](javascript:alert(1))');
});
test('format: study headings, paragraphs, lists, pull quote', () => {
  assertEqual(formatStudy('## Making Sense of It\nFirst line.\nSecond line.\n* one\n* two\n1. a\n2. b\n> CONTEXT IS KEY.'),
    '<h2 class="study-h">Making Sense of It</h2><p>First line.</p><p>Second line.</p>' +
    '<ul class="study-ul"><li>one</li><li>two</li></ul><ol class="study-ol"><li>a</li><li>b</li></ol>' +
    '<blockquote class="pull" data-reveal><p>CONTEXT IS KEY.</p></blockquote>');
});
test('format: dash bullets, numbered start, inline marks in items', () => {
  assertEqual(formatStudy('- a\n3. c\n4. d'), '<ul class="study-ul"><li>a</li></ul><ol class="study-ol" start="3"><li>c</li><li>d</li></ol>');
  assertEqual(formatStudy('* **Today:** good'), '<ul class="study-ul"><li><strong>Today:</strong> good</li></ul>');
});
test('format: consecutive quote lines join with a line break', () => {
  assertEqual(formatStudy('> CONTEXT\n> IS KEY.'), '<blockquote class="pull" data-reveal><p>CONTEXT<br>IS KEY.</p></blockquote>');
});
test('format: blank lines collapse and non-strings give empty output', () => {
  assertEqual(formatStudy('A\n\n\nB'), '<p>A</p><p>B</p>');
  assertEqual(formatStudy(undefined), '');
  assertEqual(formatStudy(null), '');
});
test('format: never throws on broken marks', () => {
  ['**', '[unclosed(link', '> ', '##', '* ', '1.'].forEach(s => formatStudy(s));
});
test('format: indented and CRLF study text still finds marks', () => {
  assertEqual(formatStudy('    ## Title\r\n    * item\r\n    Text'),
    '<h2 class="study-h">Title</h2><ul class="study-ul"><li>item</li></ul><p>Text</p>');
});
test('format: link URLs are never typeset', () => {
  assertIncludes(formatInline('[Video](https://example.com/a-1-3-b?q="x")'), 'href="https://example.com/a-1-3-b?q=&quot;x&quot;"');
});
```

- [ ] **Step 2: Run the tests.** Expected: every `format:` test fails with `ReferenceError` (`escapeHtml`/`typeset`/… is not defined).
- [ ] **Step 3: Implement `format.js`** with the four functions above. Delete `escapeHtml` from `app.js` and add the `format.js` script tags to `index.html` and `tests/index.html`.
- [ ] **Step 4: Run the tests.** Expected: PASS (`failed: 0`).
- [ ] **Step 5: Commit** with the message "Add the study formatter for plain-text day scripts".

---

### Task 3: Reshape `data.js` and add Day 1

**Files:**
- Modify: `data.js`, `tests/index.html` (add `../data.js` first among sources, then `data.test.js`)
- Create: `tests/data.test.js`

**Interfaces:**
- Produces globals:
  - `BOOK_NAME: string`
  - `HOME_WORDS: string[]`
  - `WELCOME_VIDEO_ID`, `PROGRESS_SHEET_URL`, `MAPS_PROMPTS`, `RESOURCES`: unchanged
  - `DAYS[]`, with the fields in spec §3.2
- Interim state: until Task 8, the old day page reads removed fields and shows "undefined". That's expected for now.

- [ ] **Step 1: Write the failing tests** (`tests/data.test.js`)

```js
test('data: ten days in order', () => { assertEqual(DAYS.map(d => d.day), [1,2,3,4,5,6,7,8,9,10]); });
test('data: video and flow fields are gone', () => {
  DAYS.forEach(d => ['videoId','videoId2','flow','intro'].forEach(k => assert(!(k in d), `day ${d.day} still has ${k}`)));
});
test('data: book name and home words', () => {
  assertEqual(BOOK_NAME, '1 John');
  assertEqual(HOME_WORDS, ['Light', 'Love']);
});
test('data: Day 1 content', () => {
  const d1 = DAYS[0];
  assertEqual(d1.words, ['Context', 'Is key']);
  assert(d1.reading.startsWith("If you haven't done today's reading yet, hit the brakes!"));
  assertIncludes(d1.study, '> CONTEXT IS KEY.');
  assertIncludes(d1.study, '[The Bible Project](https://bibleproject.com/videos/1-3-john/)');
  assertIncludes(d1.study, 'overview video for 1-3 John');
  assertEqual(d1.reflections.map(r => r.id), ['author', 'audience', 'purpose']);
  assertEqual(d1.reflectionQuestion, null);
  assertEqual(d1.speaker, 'Seth Peacock');
});
test('data: Day 1 study formats into the expected blocks', () => {
  const html = formatStudy(DAYS[0].study);
  const count = re => (html.match(re) || []).length;
  assertEqual(count(/<h2 class="study-h">/g), 2);
  assertEqual(count(/<blockquote/g), 1);
  assertEqual(count(/<ul class="study-ul">/g), 1);
  assertEqual(count(/<ol class="study-ol">/g), 1);
  assertEqual(count(/<li>/g), 5);
});
test('data: Days 2-10 have empty studies, MAPS prompts, and fall back for words and reading', () => {
  DAYS.slice(1).forEach(d => {
    assertEqual(d.study, '', `day ${d.day} study`);
    assert(d.reflections === MAPS_PROMPTS, `day ${d.day} reflections`);
    assert(!('words' in d) && !('reading' in d), `day ${d.day} fallback`);
  });
});
test('data: Days 3-10 reflection question points at the reading', () => {
  DAYS.slice(2).forEach(d => assertEqual(d.reflectionQuestion.prompt,
    "Now that you've read today's study, what's one specific way you'll put this into practice this week?"));
  assertEqual(DAYS[1].reflectionQuestion, null);
});
test('data: MAPS prompt ids unchanged (saved answers depend on them)', () => {
  assertEqual(MAPS_PROMPTS.map(p => p.id), ['meditate', 'apply', 'pray', 'share']);
});
```

- [ ] **Step 2: Run the tests.** Expected: every `data:` test fails, either `BOOK_NAME is not defined` or a field assertion.
- [ ] **Step 3: Rewrite `data.js`.**
  - Add `const BOOK_NAME = "1 John";` and `const HOME_WORDS = ["Light", "Love"];` next to `WELCOME_VIDEO_ID`.
  - In every day, remove `videoId`, `videoId2`, `flow`, and `intro`.
  - Days 2–10 keep `day`, `passage`, `topic`, `speaker`, `reflections`, and `reflectionQuestion`, and gain `study: \`\``. The Days 3–10 prompt becomes the exact string in the test.
  - Rewrite the header comment for the pastor. It should cover:
    - the study marks table (spec §3.3), with the warning to avoid a backtick or `${`
    - `HOME_WORDS` and `words`, typed in normal case, with a missing `words` falling back
    - `reading` and its default
    - `BOOK_NAME`
    - the welcome video (now the only video)
    - the existing `speaker` note
  - Replace Day 1 with this copy, which is fixed by spec §3.4:

````js
  {
    day: 1,
    passage: "1 John 1:1-4",
    topic: "How to Study the Bible",
    speaker: "Seth Peacock",
    words: ["Context", "Is key"],
    reading: `If you haven't done today's reading yet, hit the brakes! Go read 1 John 1:1-4 before you go any further. You wouldn't try to make a proper three-bean chili without the beans, and you shouldn't start a Bible study without the Scripture!`,
    study: `
## Making Sense of It
If you finished those first four verses and your brain feels a bit like a can of mashed refried beans, congratulations—you are completely normal. When I first became a Christian, I had no idea what John was talking about either.
The Bible was written a long, long time ago. Sometimes, things the original audience understood perfectly can seem totally foreign to us. But we can figure it out! Today, we are learning a super important step in Bible study: Whenever you start a new book of the Bible, always do a little background research.
Why? Because
> CONTEXT IS KEY.
Think about it like reading a random letter you found on the street. If you don't know who wrote it or who they were writing to, it's easy to misunderstand it. For example, imagine you see a note left on the floor between classes: "She completely ate, and left no crumbs."
* Today: That is a high compliment! I have no idea what she was doing, but whatever it was, she sure did an incredible job!
* Back in my teenage years: It meant someone literally devoured all the snacks. This was an insult.
The time frame, the author, and the audience totally change how we understand the message. So before we dive deeper into 1 John, we need to gather our context.
## Finding the Right Tools
It's easy to get overwhelmed trying to find reliable historical background, but we aren't going to give up. To keep things simple, I want to point you to one fantastic, reliable place to look: The Bible Project.
They are basically the magical beanstalk of biblical context. They have an app, a website, and a YouTube channel, and they produce incredible overview videos for every single book of the Bible.
Your Assignment For Today: Head over to [The Bible Project](https://bibleproject.com/videos/1-3-john/) and watch their overview video for 1-3 John. As you watch, take some notes and answer these three crucial questions:
1. Who wrote the book?
2. Who was the original audience?
3. What was the purpose for writing the book?
Figure those out, write down your answers, and we'll see you tomorrow for the next step, Big Dog!
`,
    reflections: [
      { id: "author", label: "Who wrote the book?", prompt: "" },
      { id: "audience", label: "Who was the original audience?", prompt: "" },
      { id: "purpose", label: "What was the purpose for writing the book?", prompt: "" }
    ],
    reflectionQuestion: null
  },
````

- [ ] **Step 4: Run the tests.** Expected: PASS.
- [ ] **Step 5: Commit** with the message "Reshape day content for text studies and add the Day 1 script".

---

### Task 4: Motion engine core (`motion.js`)

**Files:**
- Create: `motion.js`, `tests/motion.test.js`
- Modify: `index.html` (add `<script src="motion.js">` after `format.js`), `tests/index.html` (add `../motion.js` and `motion.test.js`)

**Interfaces:**
- Produces the global `Motion`:
  - `Motion.VELOCITY_PX = 40`: px of scroll per 16ms frame that counts as full speed.
  - `Motion.velocityStep(prev: number, deltaPx: number, dtMs: number) -> number`: `inst = (deltaPx / max(dtMs, 8)) * 16 / VELOCITY_PX`, then `clamp(prev*0.6 + inst*0.4, -1, 1)`.
  - `Motion.decay(v: number) -> number`: `v*0.86`, or 0 once its absolute value drops below 0.01.
  - `Motion.progress(top, height, scrollY, viewportH) -> number`: `start = max(0, top - viewportH)`, `end = top + height`, then `clamp((scrollY - start)/(end - start), 0, 1)`. Returns 1 when `end <= start`.
  - `Motion.slideAmount(centerY, viewportH) -> number`: `clamp((centerY - 0.74*vh) / (0.26*vh), 0, 1)`.
  - `Motion.reduced() -> boolean`: `matchMedia('(prefers-reduced-motion: reduce)').matches`. Always call it dynamically, so tests can override it.
  - `Motion.init() -> void`: idempotent. Re-evaluates `reduced()` and toggles `motion-on` on `<html>` (present means motion is allowed). Attaches one passive `scroll` listener, a `resize` listener that re-caches rects, and a reduced-motion change listener, once each.
  - `Motion.scan(root: Element) -> void`: registers `[data-drift]` and `[data-slide-in]` elements (caching their absolute top and height) and `[data-reveal]` elements. Writes initial values immediately.
  - `Motion.clear() -> void`: unregisters everything and disconnects observers.
- CSS variable contract, consumed by Tasks 6–8:
  - `--v` (−1…1) and `--va` (0…1) on `<html>`
  - `--p` (0…1) on each `[data-drift]`
  - `--k` (0…1) on each `[data-slide-in]`, using `slideAmount` of the element's viewport center
  - Class `is-active` on registered elements while an IntersectionObserver (rootMargin `10%`) sees them in view. Only those elements are updated.
  - Class `is-revealed` added once to a `[data-reveal]` element when it's at least 30% visible, after which it's unobserved. Under reduced motion it's added immediately.
- Loop: a frame is scheduled on scroll. Each frame computes velocity from the scroll delta (or applies `decay` when the delta is 0) and updates elements in view. The loop stops when velocity reaches 0 with no new scroll. Under reduced motion, `--v`, `--va`, and `--p` are never written.

- [ ] **Step 1: Write the failing tests** (`tests/motion.test.js`)

```js
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
```

- [ ] **Step 2: Run the tests.** Expected: the `motion:` tests fail with `Motion is not defined`.
- [ ] **Step 3: Implement `motion.js`** per the interfaces above, and add the script tags.
- [ ] **Step 4: Run the tests.** Expected: PASS.
- [ ] **Step 5: Commit** with the message "Add the scroll engine that drives the kinetic type".

---

### Task 5: Router and view model

**Files:**
- Modify: `app.js`, `tests/index.html` (add `../app.js` last among sources, then `app.test.js`)
- Create: `tests/app.test.js`, `tests/broken-data.html`

**Interfaces:**
- Consumes `Motion.init/scan/clear` from Task 4.
- Produces these globals:
  - `parseRoute(hash: string) -> Route`. A `Route` is one of:
    - `{name:'home'}`
    - `{name:'day', day:number}`, only when a matching `DAYS` entry exists
    - `{name:'resources'}`
    - `{name:'resource', slug}`
    - `{name:'progress'}`
    - `{name:'student', student}`, URL-decoded; a malformed escape returns the raw text
    - Anything else is home.
  - `transitionType(from: Route|null, to: Route) -> 'open'|'close'|'next'|'prev'|'none'`:
    - home→day is `open`
    - day→home is `close`
    - day→a higher day is `next`, and to a lower day is `prev`
    - everything else, including a `null` from-route or the same route, is `none`
  - `renderRoute(route: Route, view: Element) -> void`
  - Renderers that write into `view`: `renderHome(view)`, `renderDay(view, dayNum)`, `renderResourceList(view)`, `renderResource(view, slug)`, `renderProgressList(view)`, `renderProgressDetail(view, rawName)`
  - `router() -> void`: in this task it swaps views instantly.
    1. Save `homeScrollY` when leaving home.
    2. Remove the old view and create `<div class="view view--{route.name}">` inside `#app`.
    3. `Motion.clear()`, render, then scroll to `homeScrollY` when arriving at home from another route, or to 0 otherwise.
    4. `Motion.scan(view)`.
    5. On every route change after the first, focus the view's `h1` with `tabindex="-1"` and `{preventScroll: true}`.
  - `bootApp()`: runs on `DOMContentLoaded` only when `#app` exists.
    - If `DAYS` is missing, render `<div class="content-error">The study couldn't load because the content file (data.js) has a typo. Check the most recent change to data.js.</div>` and stop. Skip SW registration and everything else.
    - Otherwise: `Motion.init()`, `history.scrollRestoration = 'manual'`, the hashchange listener, `router()`, the install prompt, the name prompt, and SW registration on `load`.
  - `app.js` must not reference `DAYS` at the top level, so the error path can run.
- Inside renderers, use view-scoped queries (`view.querySelector`), never `document.getElementById`, because two views coexist during transitions. Async writes in `renderProgressDetail` target the captured `view`.

- [ ] **Step 1: Write the failing tests** (`tests/app.test.js`). Also write `tests/broken-data.html`, which has `<div id="app">` plus `../format.js`, `../motion.js`, and `../app.js`, with no `data.js`.

```js
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
test('app: shows a content error when data.js fails to load', async () => {
  const f = document.createElement('iframe'); f.src = 'broken-data.html';
  document.body.appendChild(f);
  await new Promise(r => { f.onload = r; });
  await new Promise(r => setTimeout(r, 50));
  assertIncludes(f.contentDocument.querySelector('.content-error').textContent, 'data.js');
  f.remove();
});
```

- [ ] **Step 2: Run the tests.** Expected: the `app:` tests fail (`parseRoute is not defined`, and no `.content-error`).
- [ ] **Step 3: Implement the above in `app.js`.** Each existing renderer keeps its current markup; it just writes into `view`.
- [ ] **Step 4: Run the tests.** Expected: PASS.
- [ ] **Step 5: App check.** Fresh load at 375×812, then:
  - Visit `#/`, `#/day/1`, `#/resources`, `#/resources/maps-bible-study-method`, and `#/progress`. Each renders exactly one `.view`.
  - On home, `window.scrollTo(0, 400)`, go to `#/day/2`, then back to `#/`. Expected: `window.scrollY` is 400 (±1).
  - After a route change, expected: `document.activeElement.tagName === 'H1'`.
- [ ] **Step 6: Commit** with the message "Render each page into its own view, and keep home's scroll position".

---

### Task 6: Poster foundation

**Files:**
- Modify: `style.css` (full replacement), `index.html`, `manifest.json`

**Interfaces:**
- Produces:
  - CSS tokens per the Global Constraints, plus `--ease-out: cubic-bezier(.2,.8,.2,1)` and `--ease-inout: cubic-bezier(.7,0,.2,1)`
  - Utility classes:
    - `.t-giant` (stretch 62%, weight 900, line-height .9)
    - `.t-condensed` (stretch 75%, 900, .95)
    - `.label` (700, 11px, letter-spacing .14em, uppercase)
    - `.btn-pill` (min-height 44px, pill radius, ink background, paper text, 14–15px/700)
    - `.btn-pill--accent` (vermilion background, ink text)
  - `.masthead` with its `.masthead-rule` (1.5px ink, `transform-origin: left`)
  - The giant word rows, per spec §4.4 and Task 7's markup:
    - `.word-rows`: full-bleed, `width: 100vw; margin-left: calc(50% - 50vw); overflow: hidden`
    - `.word-row--outline`: transparent fill with `-webkit-text-stroke: 1.5px rgba(10,10,20,.32)`
    - `.word-row--solid`: vermilion
    - `[data-drift="left"]`: `transform: translateX(calc(var(--p,0) * -150px)) skewX(calc(var(--v,0) * -12deg)); --dir: 1`
    - `[data-drift="right"]`: `transform: translateX(calc(-190px + var(--p,0) * 150px)) skewX(calc(var(--v,0) * 12deg)); --dir: -1`
    - `.word-ghost--1`: `opacity: calc(var(--va,0) * .5)`, `translateX(calc(var(--v,0) * var(--dir) * 14px))`
    - `.word-ghost--2`: `.25` and `28px`
    - Ghosts are `position:absolute; left:0; top:0`.
  - `.motion-on [data-reveal]:not(.is-revealed)`: `translateX(46px)`, opacity `.25`, with a 700ms `var(--ease-out)` transition on both properties. Without `motion-on`, reveals are always fully visible.
  - `.motion-on [data-drift].is-active, .motion-on [data-slide-in].is-active { will-change: transform }`, so only on-screen moving layers are promoted (spec §5.6).
  - Base styles:
    - `#app` keeps `max-width: 640px`, with gutters and top/bottom padding that include `env(safe-area-inset-*)`
    - `body` gets paper and ink, and `min-height: 100dvh`
    - `:focus-visible` gets a 2px `--vermilion-text` outline
    - `.content-error`
  - In `index.html`:
    - The font link becomes `https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&display=swap` (keep the preconnects)
    - `theme-color` becomes `#F4F1EA`
    - `apple-mobile-web-app-status-bar-style` becomes `default`
  - In `manifest.json`: `background_color` and `theme_color` become `#F4F1EA`.

- [ ] **Step 1: Write the check** (run it with `javascript_tool` in the app after a fresh load)

```js
(async () => { await document.fonts.ready; const cs = getComputedStyle(document.body); const m = await fetch('manifest.json').then(r => r.json()); return JSON.stringify({ bg: cs.backgroundColor, color: cs.color, font: cs.fontFamily.split(',')[0].replace(/"/g, '').trim(), archivo: document.fonts.check('900 40px Archivo'), theme: document.querySelector('meta[name="theme-color"]').content, status: document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]').content, manifest: [m.background_color, m.theme_color] }); })()
```

- [ ] **Step 2: Run the check.** Expected to fail: `bg` is `rgb(245, 240, 230)` (the old parchment), `font` is `Inter`, and `status` is `black-translucent`.
- [ ] **Step 3: Replace `style.css`** and update `index.html` and `manifest.json` per the interfaces above. The page-specific sections come in Tasks 7, 8, and 10.
- [ ] **Step 4: Run the check.** Expected: `{"bg":"rgb(244, 241, 234)","color":"rgb(10, 10, 20)","font":"Archivo","archivo":true,"theme":"#F4F1EA","status":"default","manifest":["#F4F1EA","#F4F1EA"]}`. Unit tests are still PASS.
- [ ] **Step 5: Commit** with the message "Lay the Poster foundation: tokens, Archivo, and the word-row styles".

---

### Task 7: Home page

**Files:**
- Modify: `app.js` (`renderHome` and new helpers), `motion.js` (`Motion.entrance`, `Motion.finishActive`), `style.css` (home section), `tests/app.test.js`, `tests/motion.test.js`

**Interfaces:**
- Consumes `typeset` (Task 2), `BOOK_NAME`, `HOME_WORDS`, and `DAYS` (Task 3), and the router from Task 5.
- Produces these globals:
  - `pad2(n: number) -> string`
  - `dayWords(day: object) -> string[]`:
    - A string `words` becomes `[words]`.
    - An array is trimmed, with blanks dropped.
    - If nothing is left, it falls back to `HOME_WORDS` when that's an array, or `[]` otherwise.
  - `upNextDay(days: object[], isComplete: (n: number) => boolean) -> number|null`
  - `wordRowsHtml(words: string[]) -> string`:
    - An empty list returns `''`.
    - Otherwise it returns `<div class="word-rows" aria-hidden="true">` containing, for each word *i*, `<div class="word-row-wrap"><div class="word-row t-giant word-row--{outline|solid}" data-drift="{left|right}">TEXT<span class="word-ghost word-ghost--1">TEXT</span><span class="word-ghost word-ghost--2">TEXT</span></div></div>`.
    - Even *i* is outline/left; odd *i* is solid/right.
    - `TEXT` is `typeset(word.toUpperCase())` repeated 6 times, separated by spaces.
  - `Motion.entrance(kind: 'home'|'day', root: Element) -> void`. It's a no-op when `Motion.reduced()`. All animations use `fill: 'backwards'` and easing `--ease-out`. For `'home'`:
    - `.masthead-rule`: scaleX 0→1, 500ms
    - each `.word-row-wrap`: from translateX(110%) for even rows or −110% for odd rows, to 0, 640ms, delay 80ms + 60ms per row
    - each `[data-rise]`: opacity 0 and translateY(18px) to the rest state, 420ms, delay 220ms + 60ms each
    - each `.day-row`: opacity 0 and translateY(14px) to the rest state, 360ms, delay 300ms + 40ms each
    - `.up-next`: from translateY(140%), 420ms, delay 600ms
  - `Motion.finishActive() -> void`: calls `finish()` on every animation Motion has started that's still running, and settles any pending transition promise (used from Task 9 on).
- Home markup, inside `.view--home`, which has `padding-bottom: 96px` so the bar never covers content:
  1. `.masthead`: `BOOK_NAME` on the left, `{DAYS.length} days` on the right, then `.masthead-rule`
  2. `wordRowsHtml(HOME_WORDS)`
  3. A `[data-rise]` block: `.label` "{DAYS.length}-day Bible study", and `<h1 class="home-title t-condensed">` "First <span class="ten">10</span> Days"
  4. A `[data-rise]` welcome pill (`.btn-pill`, play icon, "Welcome video") that opens the existing modal
  5. `.day-list` of `<a class="day-row" href="#/day/N" data-state="done|next|later">`, each containing `<span class="day-row-inner" data-slide-in>` with:
     - `<span class="day-num t-giant" data-day-num="N">0N</span>`
     - `.day-topic`, set with `typeset`
     - `.day-mark`: a check for done, a chevron otherwise
  6. A `[data-rise]` `.signpost` link to `#/resources`: `.label` "Extra resources", "Go deeper", and a chevron
  7. The existing change-name button, with the name run through `escapeHtml`
  8. The existing install banner
  9. The Up next bar. When some day is incomplete: `<a class="up-next" href="#/day/N">` with "Up next" in vermilion, "· Day N", and an arrow button. When all are done: `<div class="up-next up-next--done">` with a check and "All {DAYS.length} days complete".
- Style values (style.css home section):

| Element | Value |
|---|---|
| Home rows font-size | `clamp(96px, 30vw, 170px)`; each `.word-row-wrap` after the first gets `margin-top: -0.1em` |
| `.home-title` | `clamp(40px, 12vw, 64px)`; `.ten` vermilion |
| `.day-row` | `min-height: 58px`; `border-top: 1px solid var(--rule)` |
| `.day-num` | 44px, `flex: 0 0 52px`. `done` vermilion, `next` ink, `later` `--ink-30` |
| `.day-topic` | 15px/500, two-line clamp |
| Check icon | `--vermilion-text` |
| `.motion-on [data-slide-in]` | `transform: translateX(calc(var(--k,0) * 60px)); opacity: calc(1 - var(--k,0) * .85)` |
| `.up-next` | `position: fixed; left: 12px; right: 12px; max-width: 616px; margin: 0 auto; bottom: calc(12px + env(safe-area-inset-bottom)); min-height: 56px`, ink pill. "Up next" in `--vermilion` (5.8:1 on ink). The arrow is a 44px vermilion circle with an ink arrow |

- Router: on the first render only, call `Motion.entrance('home', view)` when the route is home.

- [ ] **Step 1: Write the failing tests** (add to `tests/app.test.js` and `tests/motion.test.js`)

```js
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
```

```js
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
```

- [ ] **Step 2: Run the tests.** Expected: the new `app:` and `motion:` tests fail (`pad2 is not defined`, and so on).
- [ ] **Step 3: Implement** the helpers, the new `renderHome`, `Motion.entrance`/`finishActive`, the router's first-render entrance call, and the home CSS section.
- [ ] **Step 4: Run the tests.** Expected: PASS.
- [ ] **Step 5: App check.** Fresh load at 375×812 and at 360×740:
  - The overflow check returns `count: 0`.
  - On a fresh load, `document.getAnimations().length > 0` within the first 300ms.
  - After `window.scrollTo(0, 300)` and one frame, the first `.word-row` has a `--p` greater than 0, and `<html>` has `--v` set.
  - Tapping the welcome pill opens the video modal.
- [ ] **Step 6: Commit** with the message "Rebuild the home page in the Poster style".

---

### Task 8: Day page

**Files:**
- Modify: `app.js` (`renderDay`, `readingText`, the complete-button handler), `motion.js` (`'day'` entrance), `style.css` (day section), `tests/app.test.js`, `tests/motion.test.js`

**Interfaces:**
- Consumes `formatStudy`, `formatInline`, `typeset` (Task 2); `dayWords`, `wordRowsHtml`, `pad2`, and `Motion.entrance` (Task 7).
- Produces:
  - `readingText(day) -> string`: the trimmed `day.reading` if it isn't blank, otherwise `"Open your Bible to " + day.passage + " and read it through."`. The text is raw; the caller formats it.
  - `Motion.entrance('day', root)`: the `.word-row-wrap` sweep and the `[data-rise]` rise, using the same values as `'home'`.
- Day markup, inside `.view--day`:
  1. A `[data-rise]` back link `<a class="back-link" href="#/">` with "All days", at least 44px tall
  2. A `[data-rise]` `.masthead`: "Day N of {DAYS.length}" and `typeset(passage)`, then `.masthead-rule`
  3. `<header class="day-header">` containing `wordRowsHtml(dayWords(d))` and `<span class="day-big-num t-giant" aria-hidden="true">0N</span>`, which is absolutely positioned at `left: 0` over the rows with a z-index above them
  4. `<h1 class="day-title t-condensed" data-rise>` with `typeset(topic)`
  5. A `[data-rise]` `<section class="read-callout">`: `.label` "Read" in `--vermilion-text`, and `<p>` with `formatInline(readingText(d))`
  6. A `[data-rise]` `<div class="day-body">` containing:
     - `<div class="study">` with `formatStudy(d.study)`, when it's a non-blank string, or `<div class="study-placeholder">Study coming soon.</div>`
     - `<section class="reflect">`: `<h2 class="section-h t-condensed">Reflect</h2>` and the reflection cards. Labels and prompts go through `typeset`. Textareas keep `id="r-{id}"` and `data-field`.
     - The `reflectionQuestion` card, when it's set
     - `<button class="complete-btn btn-pill">`: "Mark day complete" when not done. When done, it gets `.is-complete` (vermilion background, ink text) and shows the check icon with "Day complete".
     - `<nav class="day-nav">` with `<a data-dir="prev" href="#/day/N-1">` (an arrow and "Day N−1") and `<a data-dir="next" href="#/day/N+1">`, each present only when that day exists
- Complete handler: read the button through `e.currentTarget`, never `e.target`. Toggle `.is-complete` and the label, call `setDayComplete`, the name prompt (when tracking is on and there's no name), and `sendProgressUpdate`.
- Style values:

| Element | Value |
|---|---|
| Day rows font-size | `clamp(84px, 24vw, 150px)` |
| `.day-big-num` | `clamp(110px, 34vw, 170px)`, ink |
| `.day-title` | `clamp(32px, 9.5vw, 52px)` |
| `.read-callout` | `border-top: 3px solid var(--ink)`; text 17px/1.5, weight 500 |
| `.study p`, `.study li` | 18px / 1.65, ink at 88% |
| `.study-h`, `.section-h` | 26px, with a rule above and `padding-top: 14px` |
| `.study-ul` | `list-style: square`; `li::marker` vermilion |
| `.study-ol li::marker` | weight 900 |
| `.pull` | `clamp(52px, 16vw, 88px)`, `.t-condensed`, line-height .86; `::after` is an 8px × 62% vermilion bar |
| `.study-placeholder` | 1.5px dashed `--rule`, 10px radius |
| Textareas | `--paper-raised`, 1.5px `--rule`, 10px radius, 16px font; focus border `--vermilion` |
| `.complete-btn` | full width, `min-height: 52px` |
| `.day-nav a` | `.t-condensed` 20px, `min-height: 44px` |

- Router: on the first render, call `Motion.entrance('day', view)` when the route is a day.

- [ ] **Step 1: Write the failing tests** (add to `tests/app.test.js` and `tests/motion.test.js`)

```js
test('app: readingText default and custom', () => {
  assertEqual(readingText({ passage: '1 John 2:7-11' }), 'Open your Bible to 1 John 2:7-11 and read it through.');
  assertEqual(readingText({ passage: 'x', reading: '  Custom.  ' }), 'Custom.');
  assertEqual(readingText({ passage: 'x', reading: '   ' }), 'Open your Bible to x and read it through.');
});
test('app: renderDay shows the Day 1 study and the Day 2 placeholder', () => {
  const v = document.createElement('div');
  renderDay(v, 1);
  assertEqual(v.querySelectorAll('.study .study-h').length, 2);
  assertEqual(v.querySelector('.day-big-num').textContent, '01');
  assertIncludes(v.querySelector('.read-callout').textContent, 'hit the brakes');
  assertEqual(v.querySelectorAll('.word-row').length, 2);
  renderDay(v, 2);
  assertEqual(v.querySelector('.study-placeholder').textContent.trim(), 'Study coming soon.');
  assertIncludes(v.querySelector('.read-callout').textContent, 'Open your Bible to 1 John 1:5–2:6 and read it through.');
  assertIncludes(v.querySelector('h1').textContent, 'What’s the Point');
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
test('app: day nav links', () => {
  const v = document.createElement('div');
  renderDay(v, 1);
  assert(!v.querySelector('.day-nav [data-dir="prev"]'));
  assertEqual(v.querySelector('.day-nav [data-dir="next"]').getAttribute('href'), '#/day/2');
  renderDay(v, 10);
  assert(!v.querySelector('.day-nav [data-dir="next"]'));
});
```

```js
test('motion: day entrance sweeps rows and raises content', () => {
  const root = document.createElement('div');
  root.innerHTML = '<div class="word-row-wrap"></div><div class="word-row-wrap"></div><h1 data-rise>T</h1>';
  document.body.appendChild(root);
  Motion.entrance('day', root);
  assertEqual(root.querySelectorAll('.word-row-wrap')[1].getAnimations().length, 1);
  assertEqual(root.querySelector('[data-rise]').getAnimations().length, 1);
  Motion.finishActive(); root.remove();
});
```

- [ ] **Step 2: Run the tests.** Expected: the new tests fail (`readingText is not defined`, missing `.study`, and the complete test fails on the old `e.target` handler).
- [ ] **Step 3: Implement** `readingText`, the new `renderDay`, the `currentTarget` handler, the `'day'` entrance, the router's first-render call, and the day CSS section.
- [ ] **Step 4: Run the tests.** Expected: PASS.
- [ ] **Step 5: App check.** Fresh load, then visit `#/day/1` and `#/day/6` (the longest topic) at 375×812 and 360×740:
  - The overflow check returns `count: 0`.
  - `getComputedStyle(document.querySelector('.study p')).fontSize === '18px'`
  - `getComputedStyle(document.querySelector('textarea')).fontSize === '16px'`
  - After scrolling the `.pull` into view, it has `.is-revealed`.
  - Type in a textarea, reload, and the text is still there.
- [ ] **Step 6: Commit** with the message "Rebuild the day page around the text study".

---

### Task 9: Page transitions

**Files:**
- Modify: `motion.js` (`Motion.transition`), `app.js` (`router`), `style.css` (`.view` stacking, `.fly-num`), `tests/motion.test.js`

**Interfaces:**
- Consumes `transitionType` (Task 5), `Motion.finishActive` (Task 7), `.day-num[data-day-num]` (Task 7), and `.day-big-num` (Task 8).
- Produces `Motion.transition(type: 'open'|'close'|'next'|'prev', oldView: Element, newView: Element, opts: { fromEl?: Element, toEl?: Element }) -> Promise<void>`. It resolves when every animation it started has finished or been finished by `finishActive()`. The timings use the constants from spec §5.4: flight 560ms `--ease-inout`, old-view fade 260ms, day fade 220ms, rise 420ms, sweep 640ms, slide 400ms `--ease-inout`, crossfade 150ms.
  - **`open` and `close`, the number flight.** Run it when both `fromEl` and `toEl` exist and `fromEl` is inside the viewport; otherwise skip the flight and run the rest.
    - Make two `fromEl` clones with class `fly-num`, `position: fixed` at `fromEl`'s rect, `transform-origin: 0 0`, `margin: 0`, z-index 1000, and `pointer-events: none`. Copy A uses `fromEl`'s computed color, and copy B uses `toEl`'s.
    - Animate both from `translate(0,0) scale(1)` to `translate(dx, dy) scale(s)`, where `s = toFontSize / fromFontSize` and `dx`/`dy` are the rect deltas. At the same time, A goes from opacity 1→0 and B from 0→1. `color` is never animated.
    - Hide `fromEl` and `toEl` with `style.visibility = 'hidden'` during the flight. Afterwards, clear `toEl.style.visibility` back to `''` and remove the clones.
  - **`open` (the rest).** The old view fades from opacity 1→0 and drops translateY 0→14px. In the new view, the `.word-row-wrap` sweep and `[data-rise]` rise use the day-entrance values with a delay of +120ms (the flight overlaps them).
  - **`close` (the rest).** The old view fades out over 220ms. In the new view, each `[data-rise]`, `.day-row`, and `.up-next` goes from opacity 0 and translateY(14px) to the rest state over 340ms, with a delay of 200ms + 22ms each.
  - **`next` / `prev`.** The old view slides out to translateX(∓100%) with `fill: forwards`, while the new view slides in from ±100% with `fill: backwards`. On `next` the old view leaves to the left.
  - **Reduced motion, or no `Element.prototype.animate`.** Crossfade the old view out and the new view in over 150ms (or resolve immediately when `animate` is missing). No flight.
- Router changes, for any type other than `none`:
  1. At the start of `router()`, call `Motion.finishActive()` and remove any `.view--leaving`.
  2. Capture `fromEl`: for `open` it's the old view's `[data-day-num="{to.day}"]`; for `close` it's the old view's `.day-big-num`.
  3. Freeze the old view at its rect: `position: fixed`, the rect's `top`, `left`, and `width`, plus the class `view--leaving` (z-index 0, `pointer-events: none`).
  4. Render the new view (z-index 1) and set its scroll position.
  5. Capture `toEl`: for `open` it's the new view's `.day-big-num`; for `close` it's the new view's `[data-day-num="{from.day}"]`.
  6. `await Motion.transition(…)`, then remove the old view.
- Known limitation, not to be fixed on this branch: iOS's edge-swipe Back plays Safari's own page-swipe animation before ours.

- [ ] **Step 1: Write the failing tests** (add to `tests/motion.test.js`)

```js
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
```

- [ ] **Step 2: Run the tests.** Expected: the four tests fail (`Motion.transition is not a function`).
- [ ] **Step 3: Implement** `Motion.transition`, the router changes, and the CSS for `.view { position: relative; z-index: 1 }`, `.view--leaving { z-index: 0; pointer-events: none }`, and `.fly-num`.
- [ ] **Step 4: Run the tests.** Expected: PASS.
- [ ] **Step 5: App check, flows.** At 375×812:
  - Tap the Day 2 row. Within 100ms there are two `.view` elements and two `.fly-num` clones. After 800ms there's one `.view--day` and zero `.fly-num`, and `.day-big-num` is visible.
  - Tap "All days". After 800ms there's one `.view--home`, and `scrollY` matches the position before opening.
  - On a day page, tap Next. After 600ms the view shows the next day.
- [ ] **Step 6: App check, mid-transition navigation.**
  - Tap the Day 2 row, then after 100ms run `location.hash = '#/'`.
  - After 900ms, expected: exactly one `.view`, which is `.view--home`; `document.querySelectorAll('.fly-num').length === 0`; `document.getAnimations().filter(a => a.playState === 'running').length === 0`; and every `[data-rise]` in the view has a computed opacity of `'1'`.
  - Repeat with a double tap on two different rows 50ms apart. Expected: one `.view--day` showing the second row's day.
- [ ] **Step 7: Commit** with the message "Fly the day number into place when opening a study, and slide between days".

---

### Task 10: Restyle the remaining pages

**Files:**
- Modify: `app.js` (class names in the resource, dashboard, and modal markup only), `style.css` (resources, dashboard, modals, install, change-name)

**Interfaces:**
- Consumes the tokens and `.btn-pill` (Task 6). Behavior is unchanged; only markup classes change.
- Requirements:
  - **Resources:** `.resource-item` rows match `.day-row` (hairline, 17px/600 title, chevron, `min-height: 56px`), and `.pdf-link` looks like `.btn-pill`.
  - **Dashboard:**
    - `.progress-search`: `--paper-raised`, a 1.5px `--rule` border, a 16px input font, and a `--vermilion` border on focus-within
    - `.progress-card`: hairline rows
    - `.dot.done`: vermilion; other dots get a 1.5px `--ink-30` border
    - Detail rows use `.t-condensed` numbers, vermilion when done
    - `.load-more`: an outlined ink pill
    - `.progress-empty`: the dashed box
  - **Modals:**
    - `.modal-card`: paper, a 1.5px ink border, 16px radius, and no shadow
    - Headings are `.t-condensed` 28px
    - Inputs follow the textarea rules
    - `.modal-error`: `--vermilion-text`
    - The video modal keeps 9:16, with a 44px ink close button
  - **Install banner:** an ink bar whose button is `.btn-pill--accent`.

- [ ] **Step 1: Write the check.** Fresh load, then stub the endpoint (in the console before navigating to `#/progress`):

```js
(() => { localStorage.setItem('student-name', 'Test Leader'); localStorage.removeItem('dashboard-key'); localStorage.setItem('dashboard-requires-key', 'false'); const now = Date.now(); const ALL = Array.from({ length: 30 }, (_, i) => ({ name: 'Student ' + (i + 1), completedCount: i % 11, lastActive: now - i * 5.4e6, days: Array.from({ length: i % 11 }, (_, d) => ({ day: d + 1, complete: true, updated: now - (10 - d) * 8.64e7 })) })); window.fetch = (u => async url => { if (!String(url).includes('script.google.com')) return u(url); const q = new URL(url).searchParams; if (q.get('key') !== 'test-pass') return { ok: true, json: async () => ({ ok: false, error: 'unauthorized' }) }; if (q.get('name')) return { ok: true, json: async () => ({ ok: true, total: 30, students: ALL.filter(s => s.name === q.get('name')) }) }; const o = +q.get('offset'), l = +q.get('limit'); return { ok: true, json: async () => ({ ok: true, total: 30, students: ALL.slice(o, o + l) }) }; })(window.fetch); location.hash = '#/progress'; return 'stubbed'; })()
```

Then run:
- Type a wrong password. Expected: `.modal-error` shows, with computed color `rgb(194, 49, 14)`.
- Type `test-pass`. Expected: 25 `.progress-card`; Load more brings it to 30; searching "Student 1" filters the list; tapping a card shows ten detail rows.
- At 360×740, the overflow check returns `count: 0` on `#/progress`, the detail page, `#/resources`, and `#/resources/maps-bible-study-method`.
- Expected: `getComputedStyle(document.querySelector('.modal-card')).backgroundColor === 'rgb(244, 241, 234)'` (open the name prompt to check).

- [ ] **Step 2: Run the check before restyling.** Expected to fail: the error color is the old `#A6412F` (`rgb(166, 65, 47)`), and the modal is white.
- [ ] **Step 3: Implement** the CSS sections and the class-name changes.
- [ ] **Step 4: Run the check.** Expected: every item passes, and the unit tests are still PASS.
- [ ] **Step 5: Commit** with the message "Restyle resources, the leader dashboard, and the popups".

---

### Task 11: Offline fonts, docs, final verification, and the phone test

**Files:**
- Modify: `service-worker.js`, `README.md`

**Interfaces:**
- Service worker:
  - `CACHE_NAME = 'first-10-days-v14'` and `FONT_CACHE = 'first-10-days-fonts-v1'`
  - `APP_SHELL` adds `'./format.js'` and `'./motion.js'`.
  - `activate` deletes every cache except those two.
  - `fetch`:
    - `fonts.googleapis.com` uses stale-while-revalidate into `FONT_CACHE`.
    - `fonts.gstatic.com` is cache-first into `FONT_CACHE`.
    - Cache a font response when `response.ok || response.type === 'opaque'`.
    - All other cross-origin requests return early, untouched.
    - Same-origin handling is unchanged.
- README:
  - Rewrite "Day page structure" (Header → Read → Study → Reflect → Reflection question → Mark complete).
  - Add "Writing a day's study": the marks table, a short example, the backtick and `${` warning, and the note that typed HTML shows literally.
  - Add "Changing the giant words" (`HOME_WORDS`, per-day `words`, and the fallback).
  - Document `reading` and `BOOK_NAME`.
  - Replace "Adding real videos" with "Changing the welcome video".
  - Update the cache-bump section: add `format.js` and `motion.js` to the file list, and give `v14` → `v15` as the example.
  - Add "Running the tests" (`tools/serve.ps1 -Port 8778`, open `/tests/`).
  - Add "Testing on your phone" (`tools/serve.ps1 -Lan`, use the printed `http://<ip>:8777/` on the same Wi-Fi, allow the Windows firewall prompt if you choose). Note that offline mode can't be tested this way, because service workers need HTTPS or localhost.

- [ ] **Step 1: Write the check** (run it in the app after a fresh load followed by one more normal reload)

```js
(async () => { const keys = await caches.keys(); const shell = await caches.open('first-10-days-v14'); const fonts = await caches.open('first-10-days-fonts-v1'); const fk = (await fonts.keys()).map(r => new URL(r.url).host); return JSON.stringify({ keys: keys.sort(), format: !!(await shell.match('format.js')), motion: !!(await shell.match('motion.js')), fontHosts: [...new Set(fk)].sort() }); })()
```

- [ ] **Step 2: Run the check.** Expected to fail: `keys` is `["first-10-days-v13"]` and the font cache is empty.
- [ ] **Step 3: Implement** the service worker changes and the README.
- [ ] **Step 4: Run the check.** Expected: `{"keys":["first-10-days-fonts-v1","first-10-days-v14"],"format":true,"motion":true,"fontHosts":["fonts.googleapis.com","fonts.gstatic.com"]}`.
- [ ] **Step 5: Offline check.** Stop the 8777 server and reload `http://localhost:8777/`. Expected: the home page renders from the service worker, and `#/day/1` opens. Then restart the server.
- [ ] **Step 6: Final sweep.**
  - All unit tests PASS.
  - At 375×812, 360×740, 768×1024, and desktop, the overflow check returns `count: 0` on `#/`, `#/day/1`, `#/day/6`, `#/resources`, `#/resources/maps-bible-study-method`, `#/progress` (stubbed), and one student detail.
  - Reduced-motion run: set `Motion.reduced = () => true; Motion.init();`, scroll home, and open a day. Expected: no `--v` changes and no `.fly-num`.
  - Spec §8 regression list: the welcome video, install section, name prompt, and change name all work.
  - Performance review: `Grep` `style.css` for `transition` and `@keyframes`, and `motion.js` for every `animate(` keyframe. Expected: the only animated properties are `transform` and `opacity`, and there's no `filter`, `backdrop-filter`, or `background-attachment: fixed` anywhere.
  - Frame-timing sample, at 375×812 on home: run a scripted scroll that steps `window.scrollTo` 40px per frame for 60 frames while recording `requestAnimationFrame` deltas. Expected: the median frame interval is no more than 20ms. Record the result in the task summary.
  - Reset the viewport to `desktop`.
- [ ] **Step 7: Commit** with the message "Cache the font for offline use, document the new content format, and bump the cache".
- [ ] **Step 8: Phone test, with the pastor.**
  1. Stop the 8777 server and run `powershell -NoProfile -ExecutionPolicy Bypass -File tools/serve.ps1 -Lan` in the background.
  2. Give the pastor the printed `http://<ip>:8777/` URL. They allow the Windows firewall prompt if they choose to.
  3. They open the URL on their phone and try home, Day 1, a transition, Next and Previous, and typing an answer.
  4. Record what they report. Afterwards, stop the LAN server. Never push.
