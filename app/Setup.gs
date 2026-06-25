/**
 * Setup.gs - one-time builder for the Coast-to-Coast Literacy Challenge.
 *
 * Run setup() once from the Apps Script editor. It creates the four tabs
 * exactly per contracts/sheet-schema.md and seeds Config_Settings and the
 * 11 route rows from data-model.md (with the canonical copy from
 * design/copy.md).
 *
 * Re-running setup() rebuilds Config_Settings and Config_Route from scratch
 * and resets the cached total to 0. It does NOT clear Entries or Participants
 * unless you also run resetForLaunch().
 */

function setup() {
  var ss = SpreadsheetApp.getActive();
  buildSettings_(ss);
  buildRoute_(ss);
  ensureEntries_(ss);
  ensureParticipants_(ss);
  SpreadsheetApp.flush();
  return 'Setup complete. Tabs: Config_Settings, Config_Route, Entries, Participants. ' +
         'Remember to set launchTimestamp in Config_Settings before launch.';
}

/** Settings key/value tab. */
function buildSettings_(ss) {
  var s = getOrCreateSheet_(ss, 'Config_Settings');
  s.clear();
  var rows = [
    ['key', 'value'],
    ['launchTimestamp', ''],                 // PLACEHOLDER: set to retreat start before launch
    ['goalMiles', 2984],
    ['stepsPerMile', 2000],
    ['plausibilityThresholdMiles', 50],
    ['completionTimestamp', ''],             // set once, automatically, when the goal is reached
    ['cachedTotalMiles', 0],
    ['startCityLabel', 'San Francisco / Bay Area'],
    ['quickAddMiles', '1,2,3,5']             // FR-018 quick-add chips
  ];
  s.getRange(1, 1, rows.length, 2).setValues(rows);
  s.setFrozenRows(1);
  s.getRange(1, 1, 1, 2).setFontWeight('bold');
  s.autoResizeColumns(1, 2);
}

/** Route tab: 11 milestone rows, in order. Copy is canonical (design/copy.md). */
function buildRoute_(ss) {
  var s = getOrCreateSheet_(ss, 'Config_Route');
  s.clear();
  var header = ['order', 'city', 'cumulativeMiles', 'celebrationMessage', 'sorTag'];
  var rows = [
    [1, 'San Francisco / Bay Area, CA', 0,
      "And we're off! We start in the Bay Area, where Ignite Reading began. Every great story starts with the basics, and so does every great journey.", 'home'],
    [2, 'Sacramento, CA', 87,
      "Sacramento! California's capital, where the state committed to the Science of Reading. 87 miles down, together.", 'sor'],
    [3, 'Reno, NV', 219,
      "Over the Sierra Nevada and into Reno. The mountains are behind us.", 'literary'],
    [4, 'Salt Lake City, UT', 737,
      "Salt Lake City! We've crossed the Great Basin. That is real distance, all of us together.", 'literary'],
    [5, 'Cheyenne, WY', 1176,
      "Cheyenne, Wyoming. Through the Rockies and onto the high plains. Look how far we have come.", 'literary'],
    [6, 'Omaha, NE', 1670,
      "Omaha, and we are past halfway! Crossing the Missouri River with the whole team.", 'literary'],
    [7, 'Des Moines, IA', 1804,
      "Des Moines, the heart of the heartland. Steady steps, big progress.", 'literary'],
    [8, 'Chicago, IL', 2136,
      "Chicago! Hometown of Shel Silverstein, who helped millions of kids fall in love with words. Good company to keep.", 'literary'],
    [9, 'Cleveland, OH', 2480,
      "Cleveland, in a state that now teaches reading by the science. Two-thirds of the way there.", 'sor'],
    [10, 'Pittsburgh, PA', 2615,
      "Pittsburgh, where much of the Science of Reading was built at the University of Pittsburgh. The home stretch.", 'sor'],
    [11, 'New York, NY', 2984,
      "New York City. Coast to coast. We made it together, for every student learning to read.", 'sor']
  ];
  var all = [header].concat(rows);
  s.getRange(1, 1, all.length, header.length).setValues(all);
  s.setFrozenRows(1);
  s.getRange(1, 1, 1, header.length).setFontWeight('bold');
  s.autoResizeColumns(1, header.length);
}

/** Entries tab: headers only, append-only thereafter. Preserved on re-setup. */
function ensureEntries_(ss) {
  var s = ss.getSheetByName('Entries');
  if (!s) {
    s = ss.insertSheet('Entries');
  }
  var header = ['entryId', 'userEmail', 'displayName', 'inputType', 'inputValue',
                'miles', 'note', 'source', 'activityDate', 'createdAt'];
  if (s.getLastRow() === 0) {
    s.getRange(1, 1, 1, header.length).setValues([header]);
    s.setFrozenRows(1);
    s.getRange(1, 1, 1, header.length).setFontWeight('bold');
  }
}

/** Participants tab: headers only. Preserved on re-setup. */
function ensureParticipants_(ss) {
  var s = ss.getSheetByName('Participants');
  if (!s) {
    s = ss.insertSheet('Participants');
  }
  var header = ['email', 'displayName', 'joinedAt'];
  if (s.getLastRow() === 0) {
    s.getRange(1, 1, 1, header.length).setValues([header]);
    s.setFrozenRows(1);
    s.getRange(1, 1, 1, header.length).setFontWeight('bold');
  }
}

function getOrCreateSheet_(ss, name) {
  var s = ss.getSheetByName(name);
  if (!s) s = ss.insertSheet(name);
  return s;
}

/**
 * Launch-day reset (Phase 8, T034). Clears all entries and participants and
 * resets the running total and completion. Use only when you are ready to
 * launch for real. Does not touch the route or other settings.
 */
function resetForLaunch() {
  var ss = SpreadsheetApp.getActive();
  var entries = ss.getSheetByName('Entries');
  if (entries && entries.getLastRow() > 1) {
    entries.getRange(2, 1, entries.getLastRow() - 1, entries.getLastColumn()).clearContent();
  }
  var participants = ss.getSheetByName('Participants');
  if (participants && participants.getLastRow() > 1) {
    participants.getRange(2, 1, participants.getLastRow() - 1, participants.getLastColumn()).clearContent();
  }
  setSetting_('cachedTotalMiles', 0);
  setSetting_('completionTimestamp', '');
  SpreadsheetApp.flush();
  return 'Reset complete. Set launchTimestamp, confirm deployment access is DOMAIN, then share the URL.';
}
