/**
 * Code.gs - server for the Coast-to-Coast Literacy Challenge.
 *
 * Stack: Google Apps Script web app + bound Google Sheet (see plan.md).
 * Identity comes from the signed-in Google user; the client never sends an
 * email. The server is the only thing that writes miles, so a distance can
 * never be forged by the client. All writes take a LockService lock so the
 * cached team total stays correct under concurrency (research.md Decision 7).
 *
 * Public (client-callable) functions: getState, setDisplayName, logActivity,
 * updateEntry, deleteEntry, getRecognition (recognition lands in a later phase).
 * Server-only helpers end with an underscore.
 */

var SHEETS = {
  SETTINGS: 'Config_Settings',
  ROUTE: 'Config_Route',
  ENTRIES: 'Entries',
  PARTICIPANTS: 'Participants'
};

/* ------------------------------------------------------------------ */
/* Web app entry                                                       */
/* ------------------------------------------------------------------ */

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Coast-to-Coast Literacy Challenge')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

/** Lets Index.html pull in the other HTML partials. */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/* ------------------------------------------------------------------ */
/* Identity                                                            */
/* ------------------------------------------------------------------ */

function getEmail_() {
  return Session.getActiveUser().getEmail() || '';
}

/* ------------------------------------------------------------------ */
/* Public API (contracts/api.md)                                       */
/* ------------------------------------------------------------------ */

/** Everything the UI needs to render on load. */
function getState() {
  var email = getEmail_();
  var settings = readSettings_();
  var route = readRoute_();
  var total = round_(num_(settings.cachedTotalMiles, 0));
  var progress = buildProgress_(settings, route, total);

  var participant = email ? getParticipant_(email) : null;
  var entries = readEntries_();

  var mine = entries
    .filter(function (e) { return email && sameEmail_(e.userEmail, email); })
    .sort(function (a, b) { return time_(b.createdAt) - time_(a.createdAt); });
  var myTotal = round_(mine.reduce(function (s, e) { return s + e.miles; }, 0));

  var recent = entries.slice()
    .sort(function (a, b) { return time_(b.createdAt) - time_(a.createdAt); })
    .slice(0, 25)
    .map(function (e) {
      return { displayName: e.displayName, miles: e.miles, activityDate: e.activityDate };
    });

  return {
    user: {
      email: email,
      displayName: (participant && participant.displayName) ? participant.displayName : null
    },
    config: {
      goalMiles: num_(settings.goalMiles, 2984),
      stepsPerMile: num_(settings.stepsPerMile, 2000),
      plausibilityThresholdMiles: num_(settings.plausibilityThresholdMiles, 50),
      startCityLabel: settings.startCityLabel || 'San Francisco / Bay Area',
      launchTimestamp: fmtIso_(settings.launchTimestamp),
      quickAddMiles: parseQuickAdd_(settings.quickAddMiles)
    },
    route: route,
    progress: progress,
    myEntries: mine.map(toClientEntry_),
    myTotalMiles: myTotal,
    recentActivity: recent
  };
}

/** Set or update the caller's friendly display name. */
function setDisplayName(name) {
  var email = getEmail_();
  if (!email) return { ok: false, error: 'NO_IDENTITY' };
  name = (name == null ? '' : String(name)).trim();
  if (name.length < 1 || name.length > 40) return { ok: false, error: 'INVALID_NAME' };
  upsertParticipant_(email, name);
  return { ok: true, displayName: name };
}

/** Validate, convert, append one entry, bump the cached total under a lock. */
function logActivity(payload) {
  var email = getEmail_();
  if (!email) return { ok: false, error: 'NO_IDENTITY' };
  payload = payload || {};

  var inputType = (payload.inputType === 'steps') ? 'steps' : 'miles';
  var inputValue = Number(payload.inputValue);
  if (!isFinite(inputValue) || inputValue <= 0) return { ok: false, error: 'INVALID_VALUE' };

  var settings = readSettings_();
  var stepsPerMile = num_(settings.stepsPerMile, 2000);
  var threshold = num_(settings.plausibilityThresholdMiles, 50);

  var miles = round_(inputType === 'steps' ? inputValue / stepsPerMile : inputValue);
  if (miles > threshold && !payload.confirmedOverThreshold) {
    return { ok: false, error: 'NEEDS_CONFIRMATION', miles: miles };
  }

  var participant = upsertParticipant_(email, null);
  var displayName = (participant && participant.displayName) ? participant.displayName : email.split('@')[0];
  var activityDate = sanitizeDate_(payload.activityDate);
  var note = (payload.note == null ? '' : String(payload.note)).slice(0, 200);

  return withLock_(function () {
    var entryId = Utilities.getUuid();
    var now = new Date();
    appendEntry_({
      entryId: entryId, userEmail: email, displayName: displayName,
      inputType: inputType, inputValue: inputValue, miles: miles, note: note,
      source: 'manual', activityDate: activityDate, createdAt: now
    });

    var s = readSettings_();
    var goal = num_(s.goalMiles, 2984);
    var prevTotal = round_(num_(s.cachedTotalMiles, 0));
    var newTotal = round_(prevTotal + miles);
    setSetting_('cachedTotalMiles', newTotal);

    if (newTotal >= goal && !s.completionTimestamp) {
      setSetting_('completionTimestamp', now);
    }

    var route = readRoute_();
    var milestoneJustReached = findMilestoneCrossed_(route, prevTotal, newTotal);
    var progress = buildProgress_(readSettings_(), route, newTotal);

    return {
      ok: true,
      entryId: entryId,
      milesLogged: miles,
      celebrationMessage: pickCelebration_(),
      progress: progress,
      milestoneJustReached: milestoneJustReached
    };
  });
}

/** Edit one of the caller's own entries. */
function updateEntry(entryId, payload) {
  var email = getEmail_();
  if (!email) return { ok: false, error: 'NO_IDENTITY' };
  payload = payload || {};

  var inputType = (payload.inputType === 'steps') ? 'steps' : 'miles';
  var inputValue = Number(payload.inputValue);
  if (!isFinite(inputValue) || inputValue <= 0) return { ok: false, error: 'INVALID_VALUE' };

  var settings = readSettings_();
  var stepsPerMile = num_(settings.stepsPerMile, 2000);
  var threshold = num_(settings.plausibilityThresholdMiles, 50);
  var miles = round_(inputType === 'steps' ? inputValue / stepsPerMile : inputValue);
  if (miles > threshold && !payload.confirmedOverThreshold) {
    return { ok: false, error: 'NEEDS_CONFIRMATION', miles: miles };
  }

  return withLock_(function () {
    var loc = findEntryRow_(entryId);
    if (!loc) return { ok: false, error: 'NOT_FOUND' };
    if (!sameEmail_(loc.userEmail, email)) return { ok: false, error: 'NOT_OWNER' };

    var s = sheet_(SHEETS.ENTRIES);
    var idx = loc.idx;
    s.getRange(loc.row, idx.inputType + 1).setValue(inputType);
    s.getRange(loc.row, idx.inputValue + 1).setValue(inputValue);
    s.getRange(loc.row, idx.miles + 1).setValue(miles);
    if (payload.note != null) s.getRange(loc.row, idx.note + 1).setValue(String(payload.note).slice(0, 200));
    if (payload.activityDate) s.getRange(loc.row, idx.activityDate + 1).setValue(sanitizeDate_(payload.activityDate));

    var newTotal = recomputeTotal_unlocked_();
    maybeCompleteAt_(newTotal);
    return { ok: true, progress: buildProgress_(readSettings_(), readRoute_(), newTotal) };
  });
}

/** Delete one of the caller's own entries. */
function deleteEntry(entryId) {
  var email = getEmail_();
  if (!email) return { ok: false, error: 'NO_IDENTITY' };

  return withLock_(function () {
    var loc = findEntryRow_(entryId);
    if (!loc) return { ok: false, error: 'NOT_FOUND' };
    if (!sameEmail_(loc.userEmail, email)) return { ok: false, error: 'NOT_OWNER' };

    sheet_(SHEETS.ENTRIES).deleteRow(loc.row);
    var newTotal = recomputeTotal_unlocked_();
    return { ok: true, progress: buildProgress_(readSettings_(), readRoute_(), newTotal) };
  });
}

/**
 * Recognition boards. Stubbed for the MVP (Phase 7, T027). Returns the shape
 * from contracts/api.md with no rows so the client never breaks if it asks.
 */
function getRecognition() {
  var settings = readSettings_();
  var total = round_(num_(settings.cachedTotalMiles, 0));
  var goal = num_(settings.goalMiles, 2984);
  return {
    isComplete: total >= goal,
    elapsed: (total >= goal) ? computeElapsed_(settings.launchTimestamp, settings.completionTimestamp) : null,
    boards: []
  };
}

/* ------------------------------------------------------------------ */
/* Progress math (T007)                                                */
/* ------------------------------------------------------------------ */

function buildProgress_(settings, route, totalMiles) {
  var goal = num_(settings.goalMiles, 2984);
  totalMiles = round_(totalMiles);

  var reached = route
    .filter(function (r) { return r.cumulativeMiles <= totalMiles; })
    .map(function (r) { return r.city; });

  var next = null;
  for (var i = 0; i < route.length; i++) {
    if (route[i].cumulativeMiles > totalMiles) { next = route[i]; break; }
  }

  var isComplete = totalMiles >= goal;
  return {
    totalMiles: totalMiles,
    fractionComplete: goal > 0 ? Math.min(totalMiles / goal, 1) : 0,
    nextMilestone: next ? { city: next.city, milesRemaining: round_(next.cumulativeMiles - totalMiles) } : null,
    milesToCoast: Math.max(round_(goal - totalMiles), 0),
    milestonesReached: reached,
    isComplete: isComplete,
    elapsed: isComplete ? computeElapsed_(settings.launchTimestamp, settings.completionTimestamp) : null
  };
}

function findMilestoneCrossed_(route, prevTotal, newTotal) {
  var crossed = null;
  for (var i = 0; i < route.length; i++) {
    var c = route[i];
    if (c.cumulativeMiles > 0 && c.cumulativeMiles > prevTotal && c.cumulativeMiles <= newTotal) {
      crossed = c; // keep the furthest city reached by this single entry
    }
  }
  return crossed ? { city: crossed.city, celebrationMessage: crossed.celebrationMessage } : null;
}

function computeElapsed_(launch, completion) {
  if (!launch || !completion) return null;
  var ms = time_(completion) - time_(launch);
  if (!isFinite(ms) || ms < 0) return null;
  var totalHours = ms / 3600000;
  return { days: Math.floor(totalHours / 24), hours: Math.floor(totalHours % 24) };
}

/* ------------------------------------------------------------------ */
/* Totals + integrity (T009)                                           */
/* ------------------------------------------------------------------ */

/** Public, lock-guarded recompute. Reconciles cachedTotalMiles to entries. */
function recomputeTotal() {
  return withLock_(function () { return recomputeTotal_unlocked_(); });
}

function recomputeTotal_unlocked_() {
  var sum = readEntries_().reduce(function (s, e) { return s + e.miles; }, 0);
  sum = round_(sum);
  setSetting_('cachedTotalMiles', sum);
  return sum;
}

function maybeCompleteAt_(total) {
  var s = readSettings_();
  if (total >= num_(s.goalMiles, 2984) && !s.completionTimestamp) {
    setSetting_('completionTimestamp', new Date());
  }
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

/* ------------------------------------------------------------------ */
/* Sheet data-access layer (T005)                                      */
/* ------------------------------------------------------------------ */

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
    if (String(keys[i][0]).trim() === key) {
      s.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  s.appendRow([key, value]);
}

function readRoute_() {
  var s = sheet_(SHEETS.ROUTE);
  var values = s.getDataRange().getValues();
  if (values.length < 2) return [];
  var idx = headerIndex_(values[0]);
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    if (r[idx.order] === '' || r[idx.order] === null) continue;
    rows.push({
      order: Number(r[idx.order]),
      city: String(r[idx.city]),
      cumulativeMiles: Number(r[idx.cumulativeMiles]),
      celebrationMessage: String(r[idx.celebrationMessage]),
      sorTag: String(r[idx.sorTag])
    });
  }
  rows.sort(function (a, b) { return a.order - b.order; });
  return rows;
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
      userEmail: String(r[idx.userEmail]),
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
  var headers = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0];
  var idx = headerIndex_(headers);
  var row = new Array(headers.length).fill('');
  row[idx.entryId] = e.entryId;
  row[idx.userEmail] = e.userEmail;
  row[idx.displayName] = e.displayName;
  row[idx.inputType] = e.inputType;
  row[idx.inputValue] = e.inputValue;
  row[idx.miles] = e.miles;
  row[idx.note] = e.note;
  row[idx.source] = e.source;
  row[idx.activityDate] = e.activityDate;
  row[idx.createdAt] = e.createdAt;
  s.appendRow(row);
}

function findEntryRow_(entryId) {
  var s = sheet_(SHEETS.ENTRIES);
  if (s.getLastRow() < 2) return null;
  var values = s.getDataRange().getValues();
  var idx = headerIndex_(values[0]);
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idx.entryId]) === String(entryId)) {
      return { row: i + 1, idx: idx, userEmail: String(values[i][idx.userEmail]) };
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Participants (T006)                                                 */
/* ------------------------------------------------------------------ */

function getParticipant_(email) {
  var s = sheet_(SHEETS.PARTICIPANTS);
  if (s.getLastRow() < 2) return null;
  var values = s.getDataRange().getValues();
  var idx = headerIndex_(values[0]);
  for (var i = 1; i < values.length; i++) {
    if (sameEmail_(values[i][idx.email], email)) {
      return {
        row: i + 1,
        email: String(values[i][idx.email]),
        displayName: String(values[i][idx.displayName] || ''),
        joinedAt: values[i][idx.joinedAt]
      };
    }
  }
  return null;
}

/** Create the participant if new; update the name when one is provided. */
function upsertParticipant_(email, displayName) {
  var s = sheet_(SHEETS.PARTICIPANTS);
  var existing = getParticipant_(email);
  if (existing) {
    if (displayName != null && displayName !== '') {
      var idx = headerIndex_(s.getDataRange().getValues()[0]);
      s.getRange(existing.row, idx.displayName + 1).setValue(displayName);
      existing.displayName = displayName;
    }
    return existing;
  }
  s.appendRow([email, displayName || '', new Date()]);
  return getParticipant_(email);
}

/* ------------------------------------------------------------------ */
/* Formatting + small helpers                                          */
/* ------------------------------------------------------------------ */

function tz_() { return Session.getScriptTimeZone() || 'America/Los_Angeles'; }

function num_(v, fallback) {
  var n = Number(v);
  return isFinite(n) ? n : fallback;
}

function round_(n) {
  return Math.round((Number(n) + Number.EPSILON) * 1000) / 1000;
}

function time_(v) {
  if (v == null || v === '') return NaN;
  if (Object.prototype.toString.call(v) === '[object Date]') return v.getTime();
  return new Date(v).getTime();
}

function sameEmail_(a, b) {
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

function fmtDate_(d) {
  if (d == null || d === '') return '';
  if (Object.prototype.toString.call(d) === '[object Date]') {
    return Utilities.formatDate(d, tz_(), 'yyyy-MM-dd');
  }
  return String(d).slice(0, 10);
}

function fmtIso_(d) {
  if (d == null || d === '') return null;
  if (Object.prototype.toString.call(d) === '[object Date]') {
    return Utilities.formatDate(d, tz_(), "yyyy-MM-dd'T'HH:mm:ss");
  }
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
    miles: e.miles,
    inputType: e.inputType,
    inputValue: e.inputValue,
    note: e.note,
    activityDate: e.activityDate,
    createdAt: fmtIso_(e.createdAt)
  };
}

var CELEBRATIONS_ = [
  'Logged! You just moved the whole team east.',
  "That's miles on the board. Thank you for stepping away and moving.",
  'Every mile counts, and yours just did. The dot moved because of you.',
  "Nice. We're a little closer to the Atlantic thanks to you.",
  'Added! Small steps and long runs both get us there.',
  'You moved us forward. That is the Recharge spirit.',
  "On the map! Your miles are part of the team's story now.",
  'Boom. The dot inched east. Keep taking care of you.'
];

function pickCelebration_() {
  return CELEBRATIONS_[Math.floor(Math.random() * CELEBRATIONS_.length)];
}
