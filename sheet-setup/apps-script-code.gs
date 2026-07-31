/* ============================================================
   FIRST 10 DAYS — Progress tracking script
   ------------------------------------------------------------
   This runs inside Google Sheets (Apps Script), NOT on your
   website. See README.md for the full step-by-step setup.

   It does two things:

   1. doPost — whenever a student marks a day complete (or
      un-marks it) on the site, it updates one row in this sheet
      for that student + day, with a status and timestamp. It
      never receives or stores anything students typed in their
      reflection boxes — just the name they entered and which day.

   2. doGet — hands that same data back to the Student Progress
      page in the app, grouped by student and sorted with the
      most recently active first.

   IMPORTANT: after you paste in a new version of this file, you
   have to re-deploy for the change to take effect. Use
   Deploy -> Manage deployments -> pencil icon -> Version:
   "New version" -> Deploy. That keeps your existing Web app URL,
   so you do NOT need to touch tracking-config.js.
   ============================================================ */

const HEADERS = ["Student Name", "Day", "Status", "Last Updated"];

/* ---------- Writing: a student marked a day ---------- */

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  ensureHeaders(sheet);

  const data = JSON.parse(e.postData.contents);
  const name = String(data.name || "").trim();
  const day = String(data.day || "").trim();
  const status = data.complete ? "Complete" : "Not complete";
  const timestamp = new Date();

  if (!name || !day) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: "Missing name or day" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const values = sheet.getDataRange().getValues();
  let rowIndex = -1;

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === name && String(values[i][1]).trim() === day) {
      rowIndex = i + 1; // sheet rows are 1-indexed
      break;
    }
  }

  if (rowIndex === -1) {
    sheet.appendRow([name, day, status, timestamp]);
  } else {
    sheet.getRange(rowIndex, 3).setValue(status);
    sheet.getRange(rowIndex, 4).setValue(timestamp);
  }

  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ---------- Reading: the leader's Student Progress page ----------
   Supported query strings:
     ?limit=25&offset=0   a page of students, most recently active first
     ?name=Jane%20Doe     one specific student
   Both also accept &callback=fn for JSONP, which the app falls
   back to if a plain cross-origin read is blocked. */

function doGet(e) {
  const params = (e && e.parameter) || {};
  const callback = params.callback;

  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const students = readStudents(sheet);

    if (params.name) {
      const wanted = String(params.name).trim().toLowerCase();
      const match = students.filter(function (s) { return s.name.toLowerCase() === wanted; });
      return jsonOut({ ok: true, total: students.length, students: match }, callback);
    }

    const limit = Math.min(Math.max(parseInt(params.limit, 10) || 25, 1), 200);
    const offset = Math.max(parseInt(params.offset, 10) || 0, 0);

    return jsonOut({
      ok: true,
      total: students.length,
      offset: offset,
      limit: limit,
      students: students.slice(offset, offset + limit)
    }, callback);

  } catch (err) {
    return jsonOut({ ok: false, error: String(err) }, callback);
  }
}

/* Turns the flat rows in the sheet into one record per student:
     { name, completedCount, lastActive, days: [{ day, complete, updated }] }
   Names are matched case-insensitively so "jane doe" and "Jane Doe"
   don't show up as two different students. */
function readStudents(sheet) {
  const values = sheet.getDataRange().getValues();
  const byKey = {};

  for (let i = 1; i < values.length; i++) {
    const name = String(values[i][0] || "").trim();
    const day = parseInt(values[i][1], 10);
    if (!name || !day) continue;

    const complete = String(values[i][2] || "").trim().toLowerCase() === "complete";
    const updated = toMillis(values[i][3]);
    const key = name.toLowerCase();

    if (!byKey[key]) byKey[key] = { name: name, dayMap: {}, lastActive: 0 };
    const student = byKey[key];

    // If the same student + day somehow appears twice, keep the newer row.
    const existing = student.dayMap[day];
    if (!existing || updated >= existing.updated) {
      student.dayMap[day] = { day: day, complete: complete, updated: updated };
    }
    if (updated > student.lastActive) student.lastActive = updated;
  }

  const list = Object.keys(byKey).map(function (key) {
    const student = byKey[key];
    const days = Object.keys(student.dayMap)
      .map(function (d) { return student.dayMap[d]; })
      .sort(function (a, b) { return a.day - b.day; });

    return {
      name: student.name,
      completedCount: days.filter(function (d) { return d.complete; }).length,
      lastActive: student.lastActive,
      days: days
    };
  });

  list.sort(function (a, b) { return b.lastActive - a.lastActive; });
  return list;
}

function toMillis(value) {
  if (value instanceof Date) return value.getTime();
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

function jsonOut(obj, callback) {
  const json = JSON.stringify(obj);

  // JSONP, but only for a sane callback name — never echo back arbitrary text.
  if (callback && /^[A-Za-z0-9_$.]{1,64}$/.test(callback)) {
    return ContentService.createTextOutput(callback + "(" + json + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function ensureHeaders(sheet) {
  const firstRow = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const hasHeaders = HEADERS.every((h, i) => firstRow[i] === h);
  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
}
