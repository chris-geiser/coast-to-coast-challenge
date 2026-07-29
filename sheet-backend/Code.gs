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
  PARTICIPANTS: 'Participants',
  ROUTE: 'Route',
  TRIVIA: 'Trivia'
};

var ENTRY_COLS = ['entryId', 'clientId', 'displayName', 'inputType', 'inputValue', 'miles', 'note', 'source', 'activityDate', 'createdAt'];
var PARTICIPANT_COLS = ['clientId', 'displayName', 'joinedAt'];
var ROUTE_COLS = ['order', 'city', 'cumulativeMiles', 'celebrationMessage', 'sorTag'];
var TRIVIA_COLS = ['order', 'text', 'source'];

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
      completionTimestamp: fmtIso_(settings.completionTimestamp) || '',
      welcomeVideoUrl: settings.welcomeVideoUrl ? String(settings.welcomeVideoUrl) : ''
    },
    displayName: (participant && participant.displayName) ? participant.displayName : null,
    route: readRoute_(),
    entries: entries.map(toClientEntry_)
  };
}

// The route (stops + joined trivia) from the Route and Trivia tabs. Returns []
// if the tabs are missing or empty, so the frontend can fall back to its
// bundled copy and never render an empty map.
function readRoute_() {
  var rs = ss_().getSheetByName(SHEETS.ROUTE);
  if (!rs || rs.getLastRow() < 2) return [];

  var triviaByOrder = {};
  var ts = ss_().getSheetByName(SHEETS.TRIVIA);
  if (ts && ts.getLastRow() >= 2) {
    var tv = ts.getDataRange().getValues();
    var tidx = headerIndex_(tv[0]);
    for (var i = 1; i < tv.length; i++) {
      var ord = Number(tv[i][tidx.order]);
      var text = tv[i][tidx.text];
      if (!isFinite(ord) || text === '' || text == null) continue;
      (triviaByOrder[ord] = triviaByOrder[ord] || []).push({
        text: String(text),
        source: tv[i][tidx.source] == null ? '' : String(tv[i][tidx.source])
      });
    }
  }

  var rv = rs.getDataRange().getValues();
  var ridx = headerIndex_(rv[0]);
  var out = [];
  for (var r = 1; r < rv.length; r++) {
    var row = rv[r];
    if (row[ridx.city] === '' || row[ridx.city] == null) continue;
    var order = Number(row[ridx.order]);
    out.push({
      order: order,
      city: String(row[ridx.city]),
      cumulativeMiles: Number(row[ridx.cumulativeMiles]),
      celebrationMessage: row[ridx.celebrationMessage] == null ? '' : String(row[ridx.celebrationMessage]),
      sorTag: row[ridx.sorTag] == null ? '' : String(row[ridx.sorTag]),
      triviaFacts: triviaByOrder[order] || []
    });
  }
  out.sort(function (a, b) { return a.order - b.order; });
  return out;
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
 * Run once from the Apps Script editor. Creates the five tabs with headers,
 * seeds Settings defaults, and seeds Route/Trivia with the default stops. Safe
 * to re-run: it only adds what is missing and never overwrites Route/Trivia.
 */
function setup() {
  var ss = ss_();

  ensureTab_(ss, SHEETS.ENTRIES, ENTRY_COLS);
  ensureTab_(ss, SHEETS.PARTICIPANTS, PARTICIPANT_COLS);
  ensureTab_(ss, SHEETS.ROUTE, ROUTE_COLS);
  ensureTab_(ss, SHEETS.TRIVIA, TRIVIA_COLS);
  seedRouteIfEmpty_();

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
    completionTimestamp: '',
    welcomeVideoUrl: '' // optional Loom share URL; blank means text-only welcome
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

// Seed the Route and Trivia tabs from ROUTE_SEED, but only when Route has no
// data rows yet. Once seeded, the Sheet is the source of truth and this never
// overwrites edits. ROUTE_SEED mirrors docs/data-content.js (the frontend
// fallback); after seeding, edit the tabs, not the code.
function seedRouteIfEmpty_() {
  var rs = sheet_(SHEETS.ROUTE);
  if (rs.getLastRow() >= 2) return;
  var ts = sheet_(SHEETS.TRIVIA);
  var routeRows = [], triviaRows = [];
  ROUTE_SEED.forEach(function (stop) {
    routeRows.push([stop.order, stop.city, stop.cumulativeMiles, stop.celebrationMessage, stop.sorTag]);
    (stop.triviaFacts || []).forEach(function (f) { triviaRows.push([stop.order, f.text, f.source]); });
  });
  if (routeRows.length) rs.getRange(2, 1, routeRows.length, ROUTE_COLS.length).setValues(routeRows);
  if (triviaRows.length) ts.getRange(2, 1, triviaRows.length, TRIVIA_COLS.length).setValues(triviaRows);
}

var ROUTE_SEED = [
  { order: 1, city: 'San Francisco / Bay Area, CA', cumulativeMiles: 0,
    celebrationMessage: "And we're off! We start in the Bay Area, where Ignite Reading began. Every great story starts with the basics, and so does every great journey.", sorTag: 'home',
    triviaFacts: [
      { text: "Robert Frost, the only poet to win four Pulitzer Prizes, was born in San Francisco in 1874.", source: "https://www.poetryfoundation.org/poets/robert-frost" },
      { text: "City Lights, founded here in 1953, was the country's first all-paperback bookstore, and in 1957 it won the obscenity trial over Ginsberg's 'Howl,' a landmark for free expression.", source: "https://en.wikipedia.org/wiki/City_Lights_Bookstore" }
    ] },
  { order: 2, city: 'Sacramento, CA', cumulativeMiles: 87,
    celebrationMessage: "Sacramento, our first stop! 87 miles down, together.", sorTag: 'sor',
    triviaFacts: [
      { text: "California's capital, where the state signed its 2025 Science of Reading law (AB 1454), moving classrooms toward explicit, evidence-based reading instruction.", source: "https://edsource.org/2025/governor-newsom-signs-literacy-bill/742396" },
      { text: "Writer Joan Didion, one of America's most influential essayists, was born in Sacramento in 1934.", source: "https://www.britannica.com/biography/Joan-Didion" }
    ] },
  { order: 3, city: 'Reno, NV', cumulativeMiles: 219,
    celebrationMessage: "Over the Sierra Nevada and into Reno. The mountains are behind us.", sorTag: 'literary',
    triviaFacts: [
      { text: "Just outside Reno, in Virginia City, Samuel Clemens first signed his work 'Mark Twain' in 1863. One of America's greatest writers got his pen name in Nevada.", source: "https://www.history.com/this-day-in-history/mark-twain-begins-reporting-in-virginia-city" }
    ] },
  { order: 4, city: 'Salt Lake City, UT', cumulativeMiles: 737,
    celebrationMessage: "Salt Lake City! We've crossed the Great Basin. That is real distance, all of us together.", sorTag: 'literary',
    triviaFacts: [
      { text: "Utah is a surprising hotbed of children's and young-adult authors, including Shannon Hale and 'Fablehaven' author Brandon Mull.", source: "https://lasvegassun.com/news/2023/sep/04/an-unexpected-hotbed-of-ya-authors-utah/" },
      { text: "Author Brandon Mull says learning to read for fun as a kid changed the trajectory of his life.", source: "https://www.ksl.com/article/51455338/reading-changed-these-authors-lives-now-they-want-the-same-for-utahs-youth" }
    ] },
  { order: 5, city: 'Cheyenne, WY', cumulativeMiles: 1176,
    celebrationMessage: "Cheyenne, Wyoming. Through the Rockies and onto the high plains. Look how far we have come.", sorTag: 'literary',
    triviaFacts: [
      { text: "Through Wyoming Reads, every first-grader in the state gets a book of their own to keep, a nice echo of our First Grade Promise.", source: "https://library.wyo.gov/services/wyoming-residents/programs-for-literacy/" },
      { text: "Wyoming leads the entire US in library visits per person, and about 68% of residents hold a library card.", source: "https://library.wyo.gov/wyoming-leads-the-u-s-in-library-visits/" }
    ] },
  { order: 6, city: 'Omaha, NE', cumulativeMiles: 1670,
    celebrationMessage: "Omaha, and we are past halfway! Crossing the Missouri River with the whole team.", sorTag: 'literary',
    triviaFacts: [
      { text: "Omaha is home to bestselling young-adult author Rainbow Rowell ('Eleanor & Park,' 'Fangirl').", source: "https://nebraskaauthors.org/authors/rainbow-rowell" },
      { text: "Nebraska shaped Pulitzer winner Willa Cather, whose Great Plains novels like 'My Antonia' are American classics.", source: "https://www.willacather.org/about/willa-cather-biography" }
    ] },
  { order: 7, city: 'Des Moines, IA', cumulativeMiles: 1804,
    celebrationMessage: "Des Moines, the heart of the heartland. Steady steps, big progress.", sorTag: 'literary',
    triviaFacts: [
      { text: "Des Moines is the birthplace of bestselling author Bill Bryson.", source: "https://en.wikipedia.org/wiki/Bill_Bryson" },
      { text: "Nearby Iowa City was the first US UNESCO City of Literature and home to the country's oldest creative-writing MFA, the Iowa Writers' Workshop.", source: "https://stories.uiowa.edu/iowa-city-little-town-big-writing" }
    ] },
  { order: 8, city: 'Chicago, IL', cumulativeMiles: 2136,
    celebrationMessage: "Chicago! Hometown of Shel Silverstein, who helped millions of kids fall in love with words. Good company to keep.", sorTag: 'literary',
    triviaFacts: [
      { text: "Chicago is the birthplace of beloved children's poet Shel Silverstein ('Where the Sidewalk Ends,' 'The Giving Tree').", source: "https://chicagoliteraryhof.org/inductees/profile/shel-silverstein" },
      { text: "Chicago poet Gwendolyn Brooks was the first African American to win a Pulitzer Prize, in 1950.", source: "https://www.pulitzer.org/article/frost-williams-no-gwendolyn-brooks" }
    ] },
  { order: 9, city: 'Cleveland, OH', cumulativeMiles: 2480,
    celebrationMessage: "Cleveland, in a state that now teaches reading by the science. Two-thirds of the way there.", sorTag: 'sor',
    triviaFacts: [
      { text: "Ohio's 2023 law now requires evidence-based, phonics-first instruction statewide and bans the discredited three-cueing method.", source: "https://ohiocapitaljournal.com/2024/08/22/science-of-reading-curriculum-is-now-being-taught-in-all-ohio-school-districts/" },
      { text: "A teenage Langston Hughes found his voice at Cleveland's Central High, writing his first poems for the school magazine.", source: "https://case.edu/ech/articles/h/hughes-james-langston" }
    ] },
  { order: 10, city: 'Pittsburgh, PA', cumulativeMiles: 2615,
    celebrationMessage: "Pittsburgh, where much of the Science of Reading was built at the University of Pittsburgh. The home stretch.", sorTag: 'sor',
    triviaFacts: [
      { text: "The University of Pittsburgh's Learning Research and Development Center is where Charles Perfetti, Isabel Beck, and Margaret McKeown built much of the modern science of reading.", source: "https://en.wikipedia.org/wiki/Charles_Perfetti" },
      { text: "The first Carnegie library in the US opened in 1889 in Braddock, just outside Pittsburgh. Andrew Carnegie went on to fund more than 1,600 libraries nationwide.", source: "https://en.wikipedia.org/wiki/Braddock_Carnegie_Library" },
      { text: "Fred Rogers studied child development at the University of Pittsburgh, which shaped the learning-first spirit of 'Mister Rogers' Neighborhood.'", source: "https://www.pittwire.pitt.edu/pittwire/features-articles/mister-rogers-legacy-beyond-tv-screen" }
    ] },
  { order: 11, city: 'New York, NY', cumulativeMiles: 2984,
    celebrationMessage: "New York City. Coast to coast. We made it together, for every student learning to read.", sorTag: 'sor',
    triviaFacts: [
      { text: "New York City runs NYC Reads, the largest US school system to shift to Science of Reading curricula.", source: "https://www.chalkbeat.org/newyork/2024/09/06/what-to-know-about-nyc-reads-curriculum-mandate-for-schools/" },
      { text: "The New York Public Library is the second-largest public library in the country, with about 53 million items across 92 locations, all free to use.", source: "https://en.wikipedia.org/wiki/New_York_Public_Library" }
    ] }
];
