# First 10 Days: Poster redesign and text-based study

**Status:** Design approved section by section; awaiting final review of this document
**Branch:** `Text-No-Videos` (experimental; `main` and the live site are untouched until a merge decision)
**Date:** 2026-10-12

---

## 1. Intent

**Outcome.** Replace the per-day videos with a text-based Bible study that students read, keep the home page welcome video, and rebuild the look as a modern, kinetic "Poster" design with layered depth and scroll-linked motion.

**Why.** Nine of the ten day videos were never filmed. Text lets the study exist now, and the reading has to carry the teaching the videos would have.

**Who it's for.**
- **Students:** mostly teens and young adults, many new to faith, reading on phones.
- **The pastor:** edits all content in `data.js` and needs to be able to paste future day scripts in with minimal formatting.
- **Leaders:** use the Student Progress dashboard.

**Success criteria.**
1. Any day reads comfortably on a phone: study body text at 18px or larger, body-text contrast of at least 4.5:1.
2. Motion stays smooth on a mid-range phone. Only `transform` and `opacity` ever animate.
3. The pastor can paste a day script into `data.js` using only the documented marks, and change the giant words without touching code.
4. Every existing feature behaves as it does today (see §8).

---

## 2. Decisions made during design

| Decision | Choice | Why |
|---|---|---|
| Visual direction | **Poster**, from the Kinetic family | Chosen by the pastor after nine mockups across three rounds |
| Bible passage text in the app | **Not shown**; students read in their own Bible | Pastor's choice. Also sidesteps translation licensing, since the ten days cover all of 1 John |
| Day 1 study | **The pastor's own script** (§3.4) | Supplied during design |
| Days 2–10 study | Styled "Study coming soon." placeholder | Pastor will write these |
| Theme | **Light only** | Best for reading on phones; a dark version can come later because every color is a token |
| Motion engine | **Small custom script** driving CSS variables | Works in every phone browser, offline, no download. CSS-only scroll animations lack older-iPhone support and can't measure scroll speed; GSAP-style libraries add weight and hijack native scrolling |
| Opening a day | **Number-flight transition** (§5.4) | Demoed and approved |

---

## 3. Content model (`data.js`)

`data.js` stays the only file the pastor edits.

### 3.1 Top-level values

| Name | Status | Purpose |
|---|---|---|
| `WELCOME_VIDEO_ID` | unchanged | Home page welcome video |
| `PROGRESS_SHEET_URL` | unchanged | Dashboard fallback link |
| `BOOK_NAME` | **new** | Masthead text, `"1 John"`. A small addition so the book name isn't hard-coded in `app.js` |
| `HOME_WORDS` | **new** | Home page giant rows, e.g. `["Light", "Love"]`. Typed in normal case; displayed uppercase |
| `MAPS_PROMPTS` | unchanged | Shared Meditate / Apply / Pray / Share prompts |
| `DAYS` | **reshaped** (§3.2) | The ten days |
| `RESOURCES` | unchanged | Leader Dashboard entry keeps its `#/progress` link |

### 3.2 Day entry

```js
{
  day: 2,
  passage: "1 John 1:5-2:6",
  topic: "What's the Point of Doing a Bible Study?",
  speaker: null,               // stored, never displayed (unchanged)
  words: ["Light", "Walk"],    // optional; falls back to HOME_WORDS
  reading: `...`,              // optional; the Read callout text
  study: `...`,                // optional; the study, written with the marks in §3.3
  reflections: MAPS_PROMPTS,   // or a day's own list (Day 1)
  reflectionQuestion: { ... }  // or null
}
```

- **Removed:** `videoId`, `videoId2`, `flow`, `intro`.
- **`reading` default:** "Open your Bible to {passage} and read it through."
- **`study` missing or empty:** shows the "Study coming soon." placeholder.
- **`reading` and `study`** are template literals (backticks), so they can span many lines.
- **Reflection Questions, Days 3–10:** reworded from "Now that you've watched today's video…" to "Now that you've read today's study, what's one specific way you'll put this into practice this week?"
- **Hyphens between digits** in displayed text become en dashes, so `1:1-4` reads as `1:1–4`.

### 3.3 Study text marks (handled by `format.js`)

| Written as | Becomes |
|---|---|
| A line of text | Its own paragraph. Blank lines are optional and collapse |
| `## Heading` (also `#`) | Section heading: condensed, with a rule above |
| `* item` or `- item` | Bullet list item, with a vermilion square. Consecutive lines form one list |
| `1. item` | Numbered list item. The list starts at the first number given |
| `> Text` | Poster-size pull quote that slides in once when reached. Consecutive `>` lines join into one quote |
| `**words**` | Bold |
| `[label](https://…)` | Link. External links open in a new tab; `#/…` links stay in the app |

Rules:
- All text is HTML-escaped before marks apply. Typed HTML shows literally, and old-style `<p>` tags aren't supported in `study` or `reading`.
- Straight quotes and apostrophes become curly ones.
- An unclosed or unknown mark renders as the literal characters. The formatter never throws.
- The two things to avoid are a backtick (`` ` ``) and the sequence `${`, because those end or break a template literal.

### 3.4 Day 1 content

The pastor's script, verbatim except for these formatting changes:

- **"The Daily Reading"** section becomes the `reading` field. Its heading is replaced by the callout's READ label.
- **"Making Sense of It"** and **"Finding the Right Tools"** become `##` headings, without their trailing colons.
- **"Why? Because CONTEXT IS KEY."** becomes the paragraph "Why? Because" followed by the pull quote `> CONTEXT IS KEY.`
- **Bullets and the numbered list** are kept as written.
- **The link placeholder** becomes `[The Bible Project](https://bibleproject.com/videos/1-3-john/)`, and "overview video for 1 John" becomes "overview video for 1–3 John", because BibleProject's single overview covers all three letters. Only the video is linked, not their guide page.
- **`words`:** `["Context", "Is key"]`.
- **"Your Assignment For Today:"** stays plain unless the pastor adds `**`.
- **`reflections`:** unchanged. The three author/audience/purpose boxes match the script's three questions.
- **`reflectionQuestion`:** stays `null`.

---

## 4. Visual system: Poster

### 4.1 Color tokens

| Token | Value | Use |
|---|---|---|
| `--paper` | `#F4F1EA` | Page background |
| `--paper-raised` | `#FBF9F4` | Answer boxes, inputs |
| `--ink` | `#0A0A14` | Text, rules, primary buttons |
| `--ink-60` / `--ink-30` | ink at 60% / 30% | Secondary text / upcoming days |
| `--rule` | ink at 20% | Hairlines |
| `--vermilion` | `#FF4A1C` | Shapes, fills, giant words, bullets. **Display size or decoration only** |
| `--vermilion-text` | `#C2310E` | Small vermilion text and links (≈5:1 on paper) |

Contrast rules:
- Bright vermilion is about 3:1 on paper, so it never carries small text.
- Text on a vermilion fill is ink, never white or paper.
- The design is flat: hairline rules instead of shadows and floating cards.

### 4.2 Type

**Archivo**, one variable font (width 62–125, weight 100–900), from Google Fonts with `display=swap`. Fallback: `system-ui, sans-serif`.

| Use | Width | Weight | Size |
|---|---|---|---|
| Giant words, day numbers | 62 | 900 | 70–170px |
| Titles, headings, pull quotes | 75 | 900 | 22–58px |
| Study body | 100 | 400 | 18px / 1.65 line height |
| UI text | 100 | 500–700 | 14–16px |
| Labels | 100 | 700, tracked caps | 11–12px |

### 4.3 Layout

- Phone-first at a 375px base width.
- Content max-width 640px, centered on larger screens.
- 20px side gutters.
- Safe-area insets for the notch and home bar.
- Dynamic viewport units, so Safari's collapsing address bar doesn't cause jumps.
- Tap targets at least 44px.

### 4.4 Pages and components

**Home**
- Masthead rule: `BOOK_NAME` on the left, "10 days" on the right. The count comes from `DAYS.length`.
- Giant rows from `HOME_WORDS`, one row per word. The first row is outline ink moving left, the second solid vermilion moving right, and so on alternating. The same rule applies to day headers.
- Eyebrow "10-day Bible study", then the title "First 10 Days" with the "10" in vermilion.
- Welcome video pill (ink), which opens the existing modal, restyled.
- Day list: hairline rows with numbers 01–10.
  - Complete: vermilion number and a check.
  - Up next: ink. This is the first incomplete day.
  - Later: ink at 30%.
- Extra Resources entry and "Not {name}? Change name", restyled.
- **"Up next" bar,** pinned to the bottom within thumb reach: "Up next · Day N" with an arrow button. It respects the bottom safe area, and once all days are complete it reads "All 10 days complete".
- Install banner, restyled.

**Day page**
1. Top bar: "← All days"
2. Masthead rule: "Day N of 10" on the left, the passage on the right
3. Header: giant rows from the day's `words` or `HOME_WORDS`, with the big ink day number "0N" layered in front, then the topic as the page title
4. Read callout: heavy ink rule, READ label, and the `reading` text
5. Study, formatted, or the placeholder
6. Reflect: heading and answer boxes. Boxes autosave and show a "Saved" indicator, with a vermilion border while focused
7. Reflection Question, when set
8. Mark day complete: a full-width ink pill. Once done, it becomes a vermilion fill with ink text, a check, and "Day complete"
9. Day nav: "← Day N−1" and "Day N+1 →"

**Everything else** — the resource list, resource pages, Student Progress list and detail, and the name, password, and welcome-video modals — gets the same tokens, type, and rules. Their behavior doesn't change.

---

## 5. Motion

### 5.1 Engine (`motion.js`)

- One passive scroll listener plus a `requestAnimationFrame` loop.
- Each frame it computes:
  - **Scroll velocity:** normalized, clamped to −1…1, and decaying toward 0 when scrolling stops. Written to `--v` and `--va` (the absolute value).
  - **Per-element progress:** 0→1 across each registered element's pass through the viewport, written to that element's `--p`.
- An IntersectionObserver gates updates, so off-screen elements are never touched.
- Element positions are cached and refreshed on resize, never read inside the scroll path.
- CSS consumes the variables in `transform` and `opacity` only.

### 5.2 Effects

| Where | Effect |
|---|---|
| Giant word rows | `translateX` by progress, in alternating directions; `skewX` by velocity; two faint offset copies whose opacity follows `--va` (the smear) |
| Home day rows | Slide in from the right and fade up as they enter, then hold |
| Pull quotes | Slide in once when about 30% visible (class toggle and CSS transition), then static |
| Body text, headings, answer boxes | Never move |

### 5.3 Entrances

- **Home, on a fresh load:** the masthead rule draws across, the word rows sweep in from opposite edges, the title rises, the day rows cascade at about 40ms apart, and the Up next bar slides up. About 1s total. It plays only when the app first loads on the home page. Any in-app return to home skips it, whether from a day page, Extra Resources, or the dashboard.
- **Day page:** the header rows sweep in, and the title and Read callout rise.

### 5.4 Page transitions

- **Home → day (number flight):** clone the tapped row's number, then animate translate and scale into the day header number's position, using FLIP with the Web Animations API. A finished day's number is vermilion in the list but ink in the header, so the flight uses two stacked copies that crossfade by opacity rather than animating `color`, which keeps to §5.6. Meanwhile, home content fades and drops slightly, the day's word rows sweep in from opposite edges, and the title and Read callout rise. About 560ms.
- **Day → home:** the reverse. The number shrinks back into its row and home content rises back in.
- **Day ↔ day (Previous/Next):** on Next, the outgoing page slides out to the left and the incoming one slides in from the right; Previous is the mirror image. The big number changes with the page. About 400ms.
- **Scroll position:** returning home restores the previous scroll position. Today, every route jumps to the top. Day pages open at the top.
- **Router:** detects the transition type (home→day, day→home, day→day, or other) and keeps the outgoing view in a layer until the transition finishes. Other routes switch instantly.

### 5.5 Reduce Motion

Under `prefers-reduced-motion: reduce`:
- No scroll-linked movement and no smear.
- No load entrance.
- Page transitions become a 150ms crossfade.

### 5.6 Performance rules

- Animate only `transform` and `opacity`. Never animate `filter` or `backdrop-filter`.
- No `background-attachment: fixed`; it's broken on iOS.
- `will-change` only on layers that are actively moving.
- If the Web Animations API is unavailable, route changes happen instantly.

### 5.7 Accessibility

- Giant word rows and big numbers are `aria-hidden`. The real title and topic are text headings.
- After a route change, focus moves to the page's main heading.
- Visible focus outlines use `--vermilion-text`.

---

## 6. Files

| File | Change |
|---|---|
| `data.js` | New shape (§3), Day 1 script, placeholders, reworded questions |
| `format.js` | **New.** Study-mark formatter (§3.3) |
| `motion.js` | **New.** Scroll engine, effects, entrances, transitions (§5) |
| `app.js` | Pages and routing rebuilt on the new structure. All existing features carried over |
| `style.css` | Replaced with the Poster system (§4) |
| `index.html` | Script order `data.js` → `tracking-config.js` → `format.js` → `motion.js` → `app.js`; Archivo font link; `theme-color` set to paper; `apple-mobile-web-app-status-bar-style` changed from `black-translucent` to `default`, because white status text would vanish on paper |
| `manifest.json` | `background_color` and `theme_color` set to paper |
| `service-worker.js` | `CACHE_NAME` bumped; `format.js` and `motion.js` added to the app shell; runtime caching for `fonts.googleapis.com` (stale-while-revalidate) and `fonts.gstatic.com` (cache-first), so the font works offline. Other cross-origin requests (YouTube, Apps Script) stay untouched |
| `README.md` | Documents the study marks, `HOME_WORDS`, `words`, `reading`, and `BOOK_NAME`. Replaces the "Day page structure" and "Adding real videos" sections; the welcome video instructions stay |
| `sheet-setup/apps-script-code.gs` | Unchanged |

---

## 7. Error handling

| Situation | Behavior |
|---|---|
| Syntax error in `data.js` (`DAYS` undefined) | Instead of a blank site, a plain message: the content file has a typo, so check the most recent change to `data.js` |
| Formatting slip in `study` or `reading` | The characters show literally, and the page still renders |
| Day has no `words` | Uses `HOME_WORDS`. If that's missing or empty, no giant rows appear |
| Day has no `study` / `reading` | Placeholder / default sentence |
| Font fails to load | System sans; layout holds |
| No Web Animations API | Instant route changes |

---

## 8. Behavior that must not change

- **localStorage keys:** `reflection:<day>:<fieldId>`, `complete:<day>`, `student-name`, `install-dismissed`, `dashboard-key`, `dashboard-requires-key`. Students' saved answers survive a merge.
- **Tracking:** the payload, endpoint, and Apps Script are unchanged.
- **Routes:** `#/`, `#/day/N`, `#/resources`, `#/resources/<slug>`, `#/progress`, `#/progress/<name>`.
- **Dashboard:** paging, search, detail view, and the password gate.
- **Also unchanged:** the welcome video modal, the install prompt, and the name prompt.
- **Included fix:** the Mark complete handler uses `currentTarget` instead of `target`, so tapping the check icon no longer breaks the button.

---

## 9. Verification

- **Viewports, in the browser pane:** 375×812 (iPhone), 360×740 (small Android), 768×1024 (tablet), and desktop.
- **Overflow:** checked by measuring every element's bounding box against the viewport, not `scrollWidth`, which `overflow-x: hidden` masks.
- **Functional checks:**
  - Every route renders.
  - Answers persist after a reload.
  - Mark complete toggles, and home updates its states and the Up next bar.
  - Dashboard and password flow work against a mock endpoint.
  - Home→day and day→home transitions, Previous/Next, and scroll restoration all work.
  - Reduce Motion is simulated by overriding the media query.
  - The app works offline after the first load.
- **Performance:** review that every animation and transition touches only `transform` and `opacity`, plus a frame-timing sample during a scripted scroll.
- **Real phone:** before any merge, the pastor opens this branch on their own phone over the same Wi-Fi, from a small local server on this computer. Windows will ask whether to allow it through the firewall, and that's the pastor's call. If that's blocked, use a temporary preview site the pastor sets up. The live site's GitHub Pages source never changes for testing.

---

## 10. Out of scope

- Dark mode
- Scripture text inside the app
- Study writing for Days 2–10
- Any change to the Apps Script, Google setup, or tracking
- Support for books other than 1 John beyond the `BOOK_NAME` label
