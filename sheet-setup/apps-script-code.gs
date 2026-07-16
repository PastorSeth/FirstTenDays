/* ============================================================
   FIRST 10 DAYS — Progress tracking script
   ------------------------------------------------------------
   This runs inside Google Sheets (Apps Script), NOT on your
   website. See README.md for the full step-by-step setup.

   What it does: whenever a student marks a day complete (or
   un-marks it) on the site, it updates one row in this sheet
   for that student + day, with a status and timestamp. It
   never receives or stores anything students typed in their
   reflection boxes — just the name they entered and which day.
   ============================================================ */

const HEADERS = ["Student Name", "Day", "Status", "Last Updated"];

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

function ensureHeaders(sheet) {
  const firstRow = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const hasHeaders = HEADERS.every((h, i) => firstRow[i] === h);
  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
}
