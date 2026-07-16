# First 10 Days

A 10-day Bible study, installable as an app on any phone (a "PWA").

## What's in this folder

- `index.html`, `style.css`, `app.js` — the app itself. You shouldn't need to touch these.
- `data.js` — **this is the file you'll edit.** All the day content, topics, passages, and video links live here in plain English. See the notes at the top of the file.
- `manifest.json` / `service-worker.js` — what makes the site installable and work offline. No need to touch these.
- `icons/` — the app icon shown on a phone's home screen.
- `resources/` — the MAPS study guide PDF, and a place to drop any other files you link to from `data.js`.

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

## Adding real videos

In `data.js`, find the day you want and change:

```js
videoId: null,
```

to:

```js
videoId: "yourVideoID",
```

Grab the ID from the YouTube URL — for `https://www.youtube.com/watch?v=dQw4w9WgXcQ` or `https://www.youtube.com/shorts/dQw4w9WgXcQ`, the ID is `dQw4w9WgXcQ`.

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

## A note on the reflection boxes

Students' answers save to their own browser only (using something called `localStorage`) — there's no server, login, or database involved, which is what keeps this free and simple. That means answers stay on the device they typed them on, and clearing browser data or switching phones will lose them. That's expected behavior, not a bug.
