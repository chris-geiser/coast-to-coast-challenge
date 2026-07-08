/**
 * Code.gs - JSON API backend for the Coast-to-Coast Literacy Challenge.
 *
 * Stack: a Google Apps Script web app deployed in front of the challenge Google
 * Sheet, called by the static frontend (docs/data-sheet.js) on GitHub Pages.
 *
 * doGet  -> returns full state as JSON (settings + all entries + caller's name)
 * doPost -> handles writes: log, update, delete, setName
 *
 * Design notes:
 *  - The team total is ALWAYS the live sum of the Entries rows. Nothing is
 *    cached, so the total can never drift from the entries (the hard rule).
 *  - Every write takes a LockService lock, so simultaneous logs cannot corrupt
 *    the Sheet or race each other.
 *  - No Google auth by design. Identity is a per-browser clientId sent by the
 *    frontend. Ownership of an entry (edit/delete) is checked against it.
 *  - A shared secret is checked on every request. It is a light speed bump
 *    against random POSTs, NOT real authentication. Keep the endpoint URL and
 *    this value together, and treat both as low-sensitivity.
 *
 * One-time setup: run setup() once from the editor to create the tabs and seed
 * the Settings. Then Deploy > New deployment > Web app (see specs/sheet-backend.md).
 */

// Must match SHARED_SECRET in docs/data-sheet.js. This is a low-sensitivity
// speed bump, not real auth: the same value ships in the public frontend.
var SHARED_SECRET = 'X6sZm2XkEEERyYm2CMtvmNfyK@WMbHqtzZFbRsT9UbQBqUNrCq';

var SHEETS = {
  SETTINGS: 'Settings',
  ENTRIES: 'Entries',
  PARTICIPANTS: 'Participants'
};

var ENTRY_COLS = ['entryId', 'clientId', 'displayName', 'inputType', 'inputValue', 'miles', 'note', 'source', 'activityDate', 'createdAt'];
var PARTICIPANT_COLS = ['clientId', 'displayName', 'joinedAt'];

/* ==================================================================== */
/* Web app entry points                                                  */
/* ==================================================================== */

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (!secretOk_(p.secret)) return json_({ ok: false, error: 'FORBIDDEN' });
  return json_(getState_(p.clientId || ''));
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ ok: false, error: 'BAD_JSON' });
  }
  if (!secretOk_(body.secret)) return json_({ ok: false, error: 'FORBIDDEN' });

  var clientId = String(body.clientId || '').trim();
  if (!clientId) return json_({ ok: false, error: 'NO_IDENTITY' });

  // Any handler exception becomes readable JSON. Without this, a thrown error
  // returns an HTML error page with no CORS headers, which the browser can only
  // report as an opaque "Failed to fetch".
  try {
    switch (body.action) {
      case 'state':   return json_(getState_(clientId));
      case 'log':     return json_(logActivity_(clientId, body));
      case 'update':  return json_(updateEntry_(clientId, body));
      case 'delete':  return json_(deleteEntry_(clientId, body));
      case 'setName': return json_(setDisplayName_(clientId, body));
      default:        return json_({ ok: false, error: 'UNKNOWN_ACTION' });
    }
  } catch (err) {
    return json_({ ok: false, error: 'SERVER_ERROR', detail: String(err && err.message || err) });
  }
}

function secretOk_(s) {
  return String(s || '') === SHARED_SECRET;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ==================================================================== */
/* Read                                                                  */
/* ==================================================================== */

function getState_(clientId) {
  var settings = readSettings_();
  var entries = readEntries_();
  var participant = clientId ? getParticipant_(clientId) : null;
  return {
    ok: true,
    settings: {
      goalMiles: num_(settings.goalMiles, 2984),
      stepsPerMile: num_(settings.stepsPerMile, 2000),
      plausibilityThresholdMiles: num_(settings.plausibilityThresholdMiles, 50),
      startCityLabel: settings.startCityLabel || 'San Francisco / Bay Area',
      launchTimestamp: fmtIso_(settings.launchTimestamp),
      quickAddMiles: parseQuickAdd_(settings.quickAddMiles),
      completionTimestamp: fmtIso_(settings.completionTimestamp) || ''
    },
    displayName: (participant && participant.displayName) ? participant.displayName : null,
    entries: entries.map(toClientEntry_)
  };
}

/* ==================================================================== */
/* Writes (all lock-guarded)                                             */
/* ==================================================================== */

function logActivity_(clientId, body) {
  var v = validateInput_(body);
  if (v.error) return { ok: false, error: v.error, miles: v.miles };

  var displayName = upsertParticipant_(clientId, body.displayName || null).displayName || 'Someone';
  var activityDate = sanitizeDate_(body.activityDate);
  var note = (body.note == null ? '' : String(body.note)).slice(0, 200);

  return withLock_(function () {
    // Idempotent replay: if the client-supplied entryId already exists, this is
    // a retry after a lost response. Return the same result without appending a
    // second row, so a burst-induced retry can never create a duplicate.
    if (body.entryId) {
      var dup = findEntryRow_(body.entryId);
      if (dup) {
        var totalNow = recompute_();
        return {
          ok: true, entryId: body.entryId, miles: v.miles,
          prevTotal: round_(totalNow - v.miles), newTotal: totalNow,
          completionTimestamp: fmtIso_(readSettings_().completionTimestamp) || '',
          duplicate: true
        };
      }
    }
    var prevTotal = recompute_();
    var entryId = body.entryId || Utilities.getUuid();
    var now = new Date();
    appendEntry_({
      entryId: entryId, clientId: clientId, displayName: displayName,
      inputType: v.inputType, inputValue: v.inputValue, miles: v.miles, note: note,
      source: 'manual', activityDate: activityDate, createdAt: now
    });
    var newTotal = round_(prevTotal + v.miles);
    var completion = maybeComplete_(newTotal, now);
    return {
      ok: true, entryId: entryId, miles: v.miles,
      prevTotal: prevTotal, newTotal: newTotal,
      completionTimestamp: completion
    };
  });
}

function updateEntry_(clientId, body) {
  var v = validateInput_(body);
  if (v.error) return { ok: false, error: v.error, miles: v.miles };
  return withLock_(function () {
    var loc = findEntryRow_(body.entryId);
    if (!loc) return { ok: false, error: 'NOT_FOUND' };
    if (String(loc.clientId) !== String(clientId)) return { ok: false, error: 'NOT_OWNER' };
    var s = sheet_(SHEETS.ENTRIES), idx = loc.idx;
    s.getRange(loc.row, idx.inputType + 1).setValue(v.inputType);
    s.getRange(loc.row, idx.inputValue + 1).setValue(v.inputValue);
    s.getRange(loc.row, idx.miles + 1).setValue(v.miles);
    if (body.note != null) s.getRange(loc.row, idx.note + 1).setValue(String(body.note).slice(0, 200));
    if (body.activityDate) s.getRange(loc.row, idx.activityDate + 1).setValue(sanitizeDate_(body.activityDate));
    var newTotal = recompute_();
    maybeComplete_(newTotal, new Date());
    return { ok: true, newTotal: newTotal };
  });
}

function deleteEntry_(clientId, body) {
  return withLock_(function () {
    var loc = findEntryRow_(body.entryId);
    if (!loc) return { ok: true, newTotal: recompute_() }; // already gone: idempotent, safe to retry
    if (String(loc.clientId) !== String(clientId)) return { ok: false, error: 'NOT_OWNER' };
    sheet_(SHEETS.ENTRIES).deleteRow(loc.row);
    return { ok: true, newTotal: recompute_() };
  });
}

function setDisplayName_(clientId, body) {
  var name = (body.displayName == null ? '' : String(body.displayName)).trim();
  if (name.length < 1 || name.length > 40) return { ok: false, error: 'INVALID_NAME' };
  upsertParticipant_(clientId, name);
  return { ok: true, displayName: name };
}

/* ==================================================================== */
/* Validation + totals                                                   */
/* ==================================================================== */

function validateInput_(body) {
  var inputType = (body.inputType === 'steps') ? 'steps' : 'miles';
  var inputValue = Number(body.inputValue);
  if (!isFinite(inputValue) || inputValue <= 0) return { error: 'INVALID_VALUE' };
  var settings = readSettings_();
  var stepsPerMile = num_(settings.stepsPerMile, 2000);
  var threshold = num_(settings.plausibilityThresholdMiles, 50);
  var miles = round_(inputType === 'steps' ? inputValue / stepsPerMile : inputValue);
  if (miles > threshold && !body.confirmedOverThreshold) {
    return { error: 'NEEDS_CONFIRMATION', miles: miles };
  }
  return { inputType: inputType, inputValue: inputValue, miles: miles };
}

// Live sum of the Entries rows. This is the single source of truth for the total.
function recompute_() {
  var sum = readEntries_().reduce(function (s, e) { return s + e.miles; }, 0);
  return round_(sum);
}

function maybeComplete_(total, now) {
  var s = readSettings_();
  var goal = num_(s.goalMiles, 2984);
  if (total >= goal && !s.completionTimestamp) {
    setSetting_('completionTimestamp', now);
    return fmtIso_(now);
  }
  return fmtIso_(s.completionTimestamp) || '';
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

/* ==================================================================== */
/* Sheet data access                                                     */
/* ==================================================================== */

function ss_() { return SpreadsheetApp.getActive(); }

function sheet_(name) {
  var s = ss_().getSheetByName(name);
  if (!s) throw new Error('Missing tab "' + name + '". Run setup() first.');
  return s;
}

function headerIndex_(headers) {
  var idx = {};
  for (var i = 0; i < headers.length; i++) idx[String(headers[i]).trim()] = i;
  return idx;
}

function readSettings_() {
  var s = sheet_(SHEETS.SETTINGS);
  var values = s.getDataRange().getValues();
  var out = {};
  for (var i = 1; i < values.length; i++) {
    var key = values[i][0];
    if (key === '' || key === null) continue;
    out[String(key).trim()] = values[i][1];
  }
  return out;
}

function setSetting_(key, value) {
  var s = sheet_(SHEETS.SETTINGS);
  var keys = s.getRange(1, 1, Math.max(s.getLastRow(), 1), 1).getValues();
  for (var i = 1; i < keys.length; i++) {
    if (String(keys[i][0]).trim() === key) { s.getRange(i + 1, 2).setValue(value); return; }
  }
  s.appendRow([key, value]);
}

function readEntries_() {
  var s = sheet_(SHEETS.ENTRIES);
  if (s.getLastRow() < 2) return [];
  var values = s.getDataRange().getValues();
  var idx = headerIndex_(values[0]);
  var out = [];
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    if (r[idx.entryId] === '' || r[idx.entryId] === null) continue;
    out.push({
      entryId: String(r[idx.entryId]),
      clientId: String(r[idx.clientId]),
      displayName: String(r[idx.displayName]),
      inputType: String(r[idx.inputType]),
      inputValue: Number(r[idx.inputValue]),
      miles: round_(Number(r[idx.miles])),
      note: r[idx.note] == null ? '' : String(r[idx.note]),
      source: String(r[idx.source]),
      activityDate: fmtDate_(r[idx.activityDate]),
      createdAt: r[idx.createdAt]
    });
  }
  return out;
}

function appendEntry_(e) {
  var s = sheet_(SHEETS.ENTRIES);
  ensureHeaders_(s, ENTRY_COLS);
  // Build the row in the fixed ENTRY_COLS order. Not reading the header row at
  // write time avoids throwing when the tab is empty (getLastColumn() === 0).
  var row = ENTRY_COLS.map(function (c) { return e[c] != null ? e[c] : ''; });
  s.appendRow(row);
}

// Write the header row if the sheet has none. Keeps writes safe even if a tab
// was created empty (e.g. a pre-existing blank tab setup() left untouched).
function ensureHeaders_(s, cols) {
  if (s.getLastRow() < 1) {
    s.getRange(1, 1, 1, cols.length).setValues([cols]);
    s.setFrozenRows(1);
  }
}

function findEntryRow_(entryId) {
  var s = sheet_(SHEETS.ENTRIES);
  if (s.getLastRow() < 2 || !entryId) return null;
  var values = s.getDataRange().getValues();
  var idx = headerIndex_(values[0]);
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idx.entryId]) === String(entryId)) {
      return { row: i + 1, idx: idx, clientId: String(values[i][idx.clientId]) };
    }
  }
  return null;
}

function getParticipant_(clientId) {
  var s = sheet_(SHEETS.PARTICIPANTS);
  if (s.getLastRow() < 2) return null;
  var values = s.getDataRange().getValues();
  var idx = headerIndex_(values[0]);
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idx.clientId]) === String(clientId)) {
      return { row: i + 1, clientId: String(values[i][idx.clientId]), displayName: String(values[i][idx.displayName] || '') };
    }
  }
  return null;
}

// Create the participant if new; set the name when one is provided.
function upsertParticipant_(clientId, displayName) {
  var s = sheet_(SHEETS.PARTICIPANTS);
  var existing = getParticipant_(clientId);
  if (existing) {
    if (displayName != null && displayName !== '') {
      var idx = headerIndex_(s.getDataRange().getValues()[0]);
      s.getRange(existing.row, idx.displayName + 1).setValue(displayName);
      existing.displayName = displayName;
    }
    return existing;
  }
  s.appendRow([clientId, displayName || '', new Date()]);
  return { clientId: clientId, displayName: displayName || '' };
}

/* ==================================================================== */
/* Formatting helpers                                                    */
/* ==================================================================== */

function tz_() { return Session.getScriptTimeZone() || 'America/Los_Angeles'; }
function num_(v, fallback) { var n = Number(v); return isFinite(n) ? n : fallback; }
function round_(n) { return Math.round((Number(n) + Number.EPSILON) * 1000) / 1000; }

function fmtDate_(d) {
  if (d == null || d === '') return '';
  if (Object.prototype.toString.call(d) === '[object Date]') return Utilities.formatDate(d, tz_(), 'yyyy-MM-dd');
  return String(d).slice(0, 10);
}

function fmtIso_(d) {
  if (d == null || d === '') return null;
  if (Object.prototype.toString.call(d) === '[object Date]') return Utilities.formatDate(d, tz_(), "yyyy-MM-dd'T'HH:mm:ss");
  return String(d);
}

function sanitizeDate_(s) {
  if (s && /^\d{4}-\d{2}-\d{2}$/.test(String(s))) return String(s);
  return Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd');
}

function parseQuickAdd_(s) {
  if (!s) return [1, 2, 3, 5];
  var out = String(s).split(',').map(function (x) { return Number(String(x).trim()); })
    .filter(function (x) { return isFinite(x) && x > 0; });
  return out.length ? out : [1, 2, 3, 5];
}

function toClientEntry_(e) {
  return {
    entryId: e.entryId,
    clientId: e.clientId,
    displayName: e.displayName,
    miles: e.miles,
    inputType: e.inputType,
    inputValue: e.inputValue,
    note: e.note,
    activityDate: e.activityDate,
    createdAt: fmtIso_(e.createdAt)
  };
}

/* ==================================================================== */
/* One-time setup                                                        */
/* ==================================================================== */

/**
 * Run once from the Apps Script editor. Creates the three tabs with headers
 * and seeds Settings defaults. Safe to re-run: it only adds what is missing.
 */
function setup() {
  var ss = ss_();

  ensureTab_(ss, SHEETS.ENTRIES, ENTRY_COLS);
  ensureTab_(ss, SHEETS.PARTICIPANTS, PARTICIPANT_COLS);

  var settings = ss.getSheetByName(SHEETS.SETTINGS);
  if (!settings) {
    settings = ss.insertSheet(SHEETS.SETTINGS);
    settings.getRange(1, 1, 1, 2).setValues([['key', 'value']]);
  }
  var defaults = {
    goalMiles: 2984,
    stepsPerMile: 2000,
    plausibilityThresholdMiles: 50,
    startCityLabel: 'San Francisco / Bay Area',
    launchTimestamp: '2026-08-05T09:00:00',
    quickAddMiles: '1,2,3,5',
    completionTimestamp: ''
  };
  var current = readSettings_();
  Object.keys(defaults).forEach(function (k) {
    if (!(k in current)) setSetting_(k, defaults[k]);
  });

  // Drop the default blank "Sheet1" if it is empty and unused.
  var blank = ss.getSheetByName('Sheet1');
  if (blank && blank.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(blank);
}

function ensureTab_(ss, name, cols) {
  var s = ss.getSheetByName(name) || ss.insertSheet(name);
  ensureHeaders_(s, cols); // add headers whether the tab is new or a blank pre-existing one
  return s;
}
