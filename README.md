# First 10 Days

A 10-day Bible study, installable as an app on any phone (a "PWA").

## What's in this folder

- `data.js` — **this is the file you'll edit.** Every day's topic, passage, reading prompt, study text, and giant words live here in plain English. See the notes at the top of the file.
- `index.html`, `style.css`, `app.js`, `format.js`, `motion.js` — the app itself. You shouldn't need to touch these. (`format.js` turns the study marks below into formatted text; `motion.js` runs the sliding words and page transitions.)
- `manifest.json` / `service-worker.js` — what makes the site installable and work offline. No need to touch these, except the version bump below.
- `icons/` — the app icon shown on a phone's home screen.
- `resources/` — the MAPS study guide PDF, and a place to drop any other files you link to from `data.js`.
- `sheet-setup/` — the Google Apps Script that powers progress tracking and the leader dashboard. It runs inside Google Sheets, not on the site.
- `tests/` and `tools/` — the automated checks and a small local server for trying the app on your own computer or phone (see the last two sections).
- `docs/` — the design notes and build plan for this version of the app.

## Day page structure

Every day page starts the same way: "Day N of 10" and the passage, the giant sliding words with the big day number in front, the day's topic, and the **Read** box ("Open your Bible to [passage] and read it through", or the day's own `reading`). After that:

- **Days 1 and 2 teach first.** The **Bible Study** comes next, then the reflection boxes. Day 1's boxes are its three Context questions, each with a "Need a hint?" button. Day 2's are MAPS, with a Day 2 question under each step.
- **Days 3-10 ask first.** **MAPS** comes right after the Read box, then the **Bible Study**, then the day's **Application Questions** — one box per question.

Every day ends with **Mark day complete** and links to the previous and next day.

In `data.js`, a day's layout comes from a few fields:

| Field | What it does |
|---|---|
| `reflectFirst: true` | Puts the reflection boxes before the study (Days 3-10) |
| `reflectTitle` | The heading over the reflection boxes ("MAPS", "Context") |
| `reflections` | The reflection boxes. `MAPS_PROMPTS` is the standard four |
| `questions` | The Application Question boxes after the study |

Each reflection or question has an `id` (answers are saved under it, so don't change it once students have started), a `label` (the question itself), and optionally a `prompt` (grey text under it), a `question` (a bold, day-specific question under the prompt), and a `hint` (hidden behind a "Need a hint?" button). Add `size: "large"` for a tall text box (Day 7's "Write out your story"), or `type: "scale"` for a 1-10 slider instead of a text box, with `low` and `high` for the words at each end.

The `speaker` field on each day is stored in `data.js` for your own reference but is NOT shown anywhere on the live page — that's by design, not an oversight.

## Writing a day's study

Each day in `data.js` has a `study` field. Write the study between its two backtick marks ( `` ` `` ). It can run as many lines as you like: each line of text becomes its own paragraph (blank lines are optional), and a few simple marks add formatting.

| Write | You get |
|---|---|
| `## Heading` | A section heading |
| `* item` or `- item` | A bullet point |
| `-- item` | A smaller bullet tucked under the bullet above it |
| `1. item` | A numbered list |
| `> Text` | A big poster-size pull quote that slides in as you reach it. Keep its words short: one longer than about ten letters won't fit across a phone and breaks onto the next line |
| `**words**` | Bold, anywhere in a line |
| `_words_` | Italic, anywhere in a line |
| `==words==` | A highlighter stroke that sweeps across the words as they scroll into view |
| `[circle]…[/circle]`, `[underline]…[/underline]`, `[squiggle]…[/squiggle]`, `[double]…[/double]` (inside `==…==`) | Red pen marks drawn over the highlighted words once the highlighter finishes: a circle, an underline, a wavy squiggle, or a thick double underline (Day 6) |
| `{{word\|what it means}}` | A "church vocab" word students can tap to see what it means |
| `[label](https://...)` | A link (opens in a new tab) |
| `[label](#/resources)` | A link to a page inside the app |

### Effects

An effect starts with a line like `::: stack` and ends with a line of just `:::`. Each written day uses a different one, so the lessons don't all look alike.

| Write | You get | Used on |
|---|---|---|
| `::: swap` … `:::` with a `+ Title` line starting each part | Tabs that switch between two (or more) boxes, one showing at a time | Not used right now |
| `::: flip "Ate, and left no crumbs."` … `:::` with a `+ Title` line starting each side | A card students tap to flip over in 3D: the first side is dark, the second red. The words after `flip` show in big type on both sides | Day 1 |
| `::: scripture 1 John 1:5-6` … `:::` | A Bible verse set apart, with its reference underneath | Day 2 |
| `::: light` … `:::` | A dark panel that fills with light as its lines arrive | Not used right now |
| `::: hold Embrace the light!` … `:::`, one card per line, written `the start \| the hidden part` | A dark card per line. Students press and hold the light: the ring fills, the glow spreads, and the part after `\|` is drawn in. Let go early and it fades; hold about two seconds and it stays lit. The words after `hold` are added in orange to every answer | Day 2 |
| `::: reveal C.S. Lewis` … `:::` | A long quote that lights up word by word as you scroll down it | Not used right now |
| `::: typewriter C.S. Lewis \| images/cs-lewis-signature.webp` … `:::` | A quote on a typed page that tips up flat, then types out as you scroll. Mark a phrase with `==…==` for a red-pencil underline once it's typed. The part after `\|` is an optional signature picture from the site's `images` folder; leave it out to sign with the name in text | Day 3 |
| `::: together We are united in worship and study` … `:::`, one card per line | A dark box with the heading in big type over one card per line. The cards start scattered and tilted, and line up neatly as the box scrolls into view | Day 3 |
| `::: terms` … `:::` with a `+ WORD` line starting each word | Giant key words, each followed by what it means. Each word fills with color once it scrolls up to the middle of the screen | Day 4 |
| `::: type` … `:::` | A sentence that types itself out, letter by letter | Day 7 |
| `::: stack` … `:::` | Big words stamped down one line at a time | Day 9 |
| `::: closing` … `:::` | A soft sign-off to end a study: the first line as a quiet greeting, the next a little larger, both fading up gently | Day 9 |
| `::: video` and a YouTube ID, on one line | An embedded video (the ID is the part after `v=` in a YouTube link) | Days 1 and 8 |
| `::: trinity`, on one line | The Shield of the Trinity — tap Father, Son, or Holy Spirit | Day 8 |

An effect name that's misspelled just shows up as the typed text, so it's easy to spot. With Reduce Motion turned on, every effect simply shows its finished state.

For example:

```js
study: `
## Making Sense of It
Why? Because
> CONTEXT IS KEY.
::: swap
+ My context
Back then, it was an insult.
+ Students' context
Now, it's a compliment!
:::
* Worshipping together is so meaningful!
-- even when the music isn't my style
Head over to [The Bible Project](https://bibleproject.com/videos/1-3-john/) and watch their overview video.
`,
```

Two things to avoid inside the backticks: another backtick ( `` ` `` ), and a dollar sign right before a curly brace ( `${` ). Either one breaks the whole file, and the site shows its typo message instead of the study. HTML tags you type (like `<p>`) show up as plain text, so the marks above are the way to format. Straight quotes and apostrophes turn into curly ones, and a dash between numbers (`1:1-4`) turns into a proper en dash on its own.

**The Read box** comes from the day's `reading` field, written the same way. Leave `reading` out and the day says "Open your Bible to [passage] and read it through."

## Changing the giant words

The big sliding words come from `data.js` — no code changes needed:

- `HOME_WORDS` near the top of the file sets the home page's rows, one row per word: `const HOME_WORDS = ["Light", "Love"];`
- Any day can have its own with a `words` line, like Day 1's `words: ["Context", "Is key"],`
- A day without `words` uses `HOME_WORDS`.

Type the words in normal case; the app makes them capitals. Add a third word and you get a third row.

`BOOK_NAME` (also near the top) is the book shown across the top of the home page.

## IMPORTANT: after changing style.css, app.js, format.js, motion.js, data.js, tracking-config.js, or manifest.json

This site works offline, which means visitors' phones/browsers cache these files. If you change any of them and don't do the step below, people who've already opened the site may keep seeing the OLD version even after you push the update.

**The fix:** open `service-worker.js` and bump the version number, e.g.:
```js
const CACHE_NAME = 'first-10-days-v14';
```
becomes
```js
const CACHE_NAME = 'first-10-days-v15';
```
Do this any time you change one of the files listed above, then commit/push as usual. (You don't need to do this for changes to `README.md` or files in `resources/`. Leave `FONT_CACHE` alone — it only holds the web font.)

If a change still doesn't show up after that, the fix on the viewer's end is a hard refresh (`Ctrl+Shift+R` / `Cmd+Shift+R`) or clearing the site's cached data in the browser.

## Putting it online with GitHub Pages (free)

1. Go to [github.com/new](https://github.com/new) and create a new repository (public). Name it anything, e.g. `first-10-days`.
2. On your computer, go to the repository page you just created and click the **Add file → Upload files** button.
3. Drag in every file and folder from this project (keep the folder structure — `icons/` and `resources/` should stay as folders).
4. Click **Commit changes**.
5. In the repository, go to **Settings → Pages**.
6. Under "Build and deployment," set **Source** to "Deploy from a branch," pick the `main` branch and `/ (root)` folder, then **Save**.
7. GitHub will give you a URL like `https://yourusername.github.io/first-10-days/` — that's your live site (it can take a minute or two to go live the first time).

## Connecting your own domain

Once the site is live on GitHub Pages:

1. In your domain registrar's DNS settings, add a **CNAME** record pointing your domain (or subdomain, like `study.yourdomain.com`) to `yourusername.github.io`.
2. Back in **Settings → Pages** on GitHub, enter your domain under "Custom domain" and save. GitHub will create a `CNAME` file in your repo automatically — you don't need to make one yourself.
3. It can take up to a few hours for DNS to update. GitHub will show a green checkmark once it's verified, and you can turn on "Enforce HTTPS" once that's available.

## Updating content later

Just edit `data.js` (either directly on GitHub — click the file, then the pencil/edit icon — or on your computer and re-upload), commit the change, and the live site updates automatically within a minute or two. No rebuilding, no other steps.

## Changing the welcome video

The welcome video behind the home page's **Welcome video** button is the only video in the app. In `data.js`, change:

```js
const WELCOME_VIDEO_ID = null;
```

to:

```js
const WELCOME_VIDEO_ID = "yourVideoID";
```

Grab the ID from the YouTube URL — for `https://www.youtube.com/watch?v=dQw4w9WgXcQ` or `https://www.youtube.com/shorts/dQw4w9WgXcQ`, the ID is `dQw4w9WgXcQ`. Only copy the part before any `?` — links often add tracking text after `?si=` that isn't part of the ID.

## Student progress tracking (optional)

By default, this is off — nothing is sent anywhere, and every student's progress just stays on their own device. If you'd like to see a simple "who's completed which days" list yourself, here's the free setup using Google Sheets:

1. Go to [sheets.google.com](https://sheets.google.com) and create a new blank sheet. Name it something like "First 10 Days — Student Progress."
2. In the sheet, go to **Extensions → Apps Script**. It opens a code editor in a new tab.
3. Delete anything in the editor, then open `sheet-setup/apps-script-code.gs` from this project, copy all of it, and paste it in.
4. Click the **Save** icon (top left), then click **Deploy → New deployment**.
5. Click the gear icon next to "Select type" and choose **Web app**.
6. Set "Execute as" to **Me**, and "Who has access" to **Anyone**. (This just means the site can send it updates — your actual spreadsheet stays private to you.)
7. Click **Deploy**. The first time, Google will ask you to authorize it — click through the "Advanced" / "Go to (unsafe)" prompts; this is normal for a script you wrote yourself.
8. Copy the **Web app URL** it gives you.
9. Open `tracking-config.js` in this project and paste that URL between the quotes:
   ```js
   const TRACKING_ENDPOINT = "paste your Web app URL here";
   ```
10. Upload the updated `tracking-config.js` to GitHub (and re-deploy the Apps Script with a new version any time you change the script itself).

Once that's set, the first time a student opens the site they'll be asked their name, and each time they mark a day complete, a row updates in your sheet with their name, the day, a status, and a timestamp. If a student clears their browser data or switches devices, they'll just be asked for their name again.

### Updating the script later

Any time `sheet-setup/apps-script-code.gs` changes, paste the new version into the Apps Script editor, Save, then re-deploy — but re-deploy the *existing* deployment so your Web app URL doesn't change:

**Deploy → Manage deployments → pencil icon → Version: "New version" → Deploy.**

If you instead pick "New deployment," Google gives you a brand-new URL and you'd have to paste it into `tracking-config.js`. Editing the existing one avoids that.

## The leader dashboard

Extra Resources → **Leader Dashboard** → **View student progress** opens a Student Progress page inside the app itself, reading live from the same Google Sheet. It shows:

- The 25 most recently active students, each with ten dots for the ten days and a "7/10" count.
- A **Load 25 more** button at the bottom to pull further back in history.
- A search box that filters the students you've loaded. If someone doesn't turn up, load more and search again — the page tells you how many haven't been pulled down yet.
- Tapping a student opens their ten days with the date each was marked.

Two things worth knowing:

- **The dates are "last marked," not "first completed."** The script keeps one row per student per day and overwrites its timestamp, so if a student un-marks and re-marks a day, you see the most recent change. Good for spotting who's fallen behind; not a precise history.
- **Without a password set (see below), this page is reachable by anyone who can open the site** — same as the old shared-sheet link was.

If the page can't reach the sheet, it offers a link to open the Google Sheet directly instead. That link lives in `PROGRESS_SHEET_URL` near the top of `data.js`; set it to `null` to hide it.

### Putting a password on the dashboard

Do this in Google, not in these files — that's what keeps the password out of your public repo:

1. Open your Apps Script project (from the sheet: **Extensions → Apps Script**).
2. Click the **gear icon (Project Settings)** in the left sidebar.
3. Scroll to **Script properties** and click **Add script property**.
4. Property: `DASHBOARD_PASSWORD`. Value: whatever password you want leaders to type.
5. Click **Save script properties**. No re-deploy needed for this part.

Now anyone opening Student Progress gets a password box, and the sheet refuses to hand over any data until the right password is sent. **Because the check happens inside Google rather than in the website's code, the password can't be read out of the public repo** — which is exactly why it's worth doing this way rather than putting it in `data.js`.

Once a leader enters it correctly, it's saved on that device and they won't be asked again. On a shared or borrowed device, the **Lock dashboard** button at the bottom of the page clears it.

To change the password later, edit that same script property. Every leader will be asked for the new one the next time they open the page. To remove it entirely, delete the property — the dashboard goes back to being open to anyone.

A caveat worth being honest about: this keeps out students and anyone casually poking around, which is what it's for. It is not bank-grade security — the password travels in the request URL, so treat it as a gate on a low-stakes list of names and day counts, not as protection for anything sensitive. Students' written reflections are never sent anywhere regardless, so they aren't at stake here.

## A note on the reflection boxes

Students' answers save to their own browser only (using something called `localStorage`) — there's no server, login, or database involved, which is what keeps this free and simple. That means answers stay on the device they typed them on, and clearing browser data or switching phones will lose them. That's expected behavior, not a bug.

## Running the tests

The app has a set of automated checks that run in a web browser. From the project folder:

1. Start the local server on the test port:
   ```bash
   powershell -NoProfile -ExecutionPolicy Bypass -File tools/serve.ps1 -Port 8778
   ```
2. Open `http://localhost:8778/tests/` in a browser. The page lists every check as PASS or FAIL, with a total at the bottom.

Or, with that server running, get the same results in the terminal (it uses Microsoft Edge in the background with a throwaway profile, and never touches your own browser):

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File tools/run-tests.ps1
```

Don't open the app itself on port 8778 — its offline cache would start holding on to old copies of the test files. Use port 8777 for the app.

The local server has its own checks: that it hands out the app's files and refuses everything else, like hidden folders and network paths. They start their own server on port 8790, so nothing else needs to be running:

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File tests/serve.test.ps1
```

## Testing on your phone

To try a version of the app on your phone before it goes live:

1. In the project folder, run:
   ```bash
   powershell -NoProfile -ExecutionPolicy Bypass -File tools/serve.ps1 -Lan
   ```
2. Windows may ask whether to allow it through the firewall. That's your call; it only needs to be allowed on private networks.
3. It prints an address like `http://192.168.1.20:8777/`. Open that on your phone while it's on the same Wi-Fi.
4. Close the window (or press Ctrl+C) when you're done.

Offline mode can't be tested this way: phones only allow it on HTTPS sites or on the same computer. Everything else works normally.
