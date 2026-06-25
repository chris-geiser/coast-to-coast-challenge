/**
 * Tests.gs - lightweight server-side checks and seed helpers.
 *
 * This is an internal celebration app, so the bar is correctness of the
 * numbers, not a full test pyramid (plan.md). Run runTests() from the editor
 * and read the log. Board math tests arrive with Phase 7 (T029).
 */

function runTests() {
  var results = [];
  results.push(check_('step conversion 6000 -> 3.0 mi', round_(6000 / 2000) === 3.0));
  results.push(check_('step conversion 6500 -> 3.25 mi', round_(6500 / 2000) === 3.25));
  results.push(check_('round_ kills float drift', round_(0.1 + 0.2) === 0.3));

  // Milestone position: with route loaded, 520 miles sits past Reno (219),
  // before Salt Lake City (737); next stop is Salt Lake City.
  var route = readRoute_();
  var progress = buildProgress_(readSettings_(), route, 520);
  results.push(check_('520 mi reached >= 3 cities', progress.milestonesReached.length >= 3));
  results.push(check_('520 mi next stop is Salt Lake City',
    progress.nextMilestone && progress.nextMilestone.city.indexOf('Salt Lake City') === 0));
  results.push(check_('520 mi miles to coast = 2464', progress.milesToCoast === round_(2984 - 520)));

  // Reconciliation: cached total equals the sum of the entries miles column.
  var sum = readEntries_().reduce(function (s, e) { return s + e.miles; }, 0);
  var cached = num_(readSettings_().cachedTotalMiles, 0);
  results.push(check_('cachedTotalMiles reconciles to sum of entries (run recomputeTotal first if this fails)',
    round_(sum) === round_(cached)));

  Logger.log(results.join('\n'));
  return results.join('\n');
}

function check_(label, pass) {
  return (pass ? 'PASS  ' : 'FAIL  ') + label;
}

/**
 * Seed a spread of entries across several people and dates so you can watch
 * the dot move and exercise milestones. Writes n entries, then recomputes the
 * total. Clear with clearEntries() before launch (T034).
 */
function seedDemoData(n) {
  n = n || 60;
  var people = [
    ['ada@ignite-reading.com', 'Ada L.'],
    ['ben@ignite-reading.com', 'Ben R.'],
    ['cleo@ignite-reading.com', 'Cleo M.'],
    ['dev@ignite-reading.com', 'Dev P.'],
    ['evie@ignite-reading.com', 'Evie S.'],
    ['finn@ignite-reading.com', 'Finn T.']
  ];
  var sheet = sheet_(SHEETS.ENTRIES);
  var start = new Date();
  start.setDate(start.getDate() - 21);

  for (var i = 0; i < n; i++) {
    var p = people[i % people.length];
    var d = new Date(start.getTime());
    d.setDate(start.getDate() + (i % 21));
    var miles = round_(0.5 + (i % 7) * 0.75); // 0.5 to ~5 mi, all inclusive
    appendEntry_({
      entryId: Utilities.getUuid(),
      userEmail: p[0], displayName: p[1],
      inputType: 'miles', inputValue: miles, miles: miles, note: '',
      source: 'manual',
      activityDate: Utilities.formatDate(d, tz_(), 'yyyy-MM-dd'),
      createdAt: d
    });
    // upsert participant so names resolve in the feed
    upsertParticipant_(p[0], p[1]);
  }
  var total = recomputeTotal();
  return 'Seeded ' + n + ' demo entries. Team total now ' + total + ' miles.';
}

/** Remove all entries (keeps the header) and reset the cached total. */
function clearEntries() {
  var s = sheet_(SHEETS.ENTRIES);
  if (s.getLastRow() > 1) {
    s.getRange(2, 1, s.getLastRow() - 1, s.getLastColumn()).clearContent();
  }
  setSetting_('cachedTotalMiles', 0);
  setSetting_('completionTimestamp', '');
  return 'Entries cleared, total reset to 0.';
}
