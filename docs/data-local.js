/*
 * data-local.js - the prototype's data layer (browser localStorage).
 *
 * Implements the same client interface as the future AWS API
 * (contracts/api.md): getState, setDisplayName, logActivity, updateEntry,
 * deleteEntry, getRecognition. app.js talks ONLY to window.dataClient, so on
 * AWS this file is replaced by a data-api.js that calls API Gateway, and app.js
 * does not change. Seeded with demo data; no real identity, no shared state.
 */
(function () {
  'use strict';
  var C2C = window.C2C;
  var round = C2C.round;

  var CONFIG = {
    goalMiles: 2984,
    stepsPerMile: 2000,
    plausibilityThresholdMiles: 50,
    startCityLabel: 'San Francisco / Bay Area',
    launchTimestamp: '2026-06-01T09:00:00',
    quickAddMiles: [1, 2, 3, 5]
  };

  var ROUTE = [
    { order: 1, city: 'San Francisco / Bay Area, CA', cumulativeMiles: 0,
      celebrationMessage: "And we're off! We start in the Bay Area, where Ignite Reading began. Every great story starts with the basics, and so does every great journey.", sorTag: 'home',
      triviaFacts: [
        { text: "Robert Frost, the only poet to win four Pulitzer Prizes, was born in San Francisco in 1874.", source: "https://www.poetryfoundation.org/poets/robert-frost" },
        { text: "City Lights, founded here in 1953, was the country's first all-paperback bookstore, and in 1957 it won the obscenity trial over Ginsberg's 'Howl,' a landmark for free expression.", source: "https://en.wikipedia.org/wiki/City_Lights_Bookstore" }
      ] },
    { order: 2, city: 'Sacramento, CA', cumulativeMiles: 87,
      celebrationMessage: "Sacramento! California's capital, where the state committed to the Science of Reading. 87 miles down, together.", sorTag: 'sor',
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

  var CELEBRATIONS = [
    'Logged! You just moved the whole team east.',
    "That's miles on the board. Thank you for stepping away and moving.",
    'Every mile counts, and yours just did. The dot moved because of you.',
    "Nice. We're a little closer to the Atlantic thanks to you.",
    'Added! Small steps and long runs both get us there.',
    'You moved us forward. That is the Recharge spirit.',
    "On the map! Your miles are part of the team's story now.",
    'Boom. The dot inched east. Keep taking care of you.'
  ];

  var ME = { email: 'you@demo.local' };

  function load(key, def) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch (e) { return def; }
  }
  function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }

  function getEntries() { return load('c2c_entries', null); }
  function setEntries(e) { save('c2c_entries', e); }
  function getParticipant() { return load('c2c_participant', { email: ME.email, displayName: null }); }
  function setParticipant(p) { save('c2c_participant', p); }
  function getCompletion() { return load('c2c_completion', ''); }
  function setCompletion(t) { save('c2c_completion', t); }

  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  function dayStr(dateMs) { return new Date(dateMs).toISOString().slice(0, 10); }
  function recompute(entries) { var s = 0; entries.forEach(function (e) { s += e.miles; }); return round(s); }
  function byCreatedDesc(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); }

  function mkEntry(email, name, inputType, inputValue, miles, dateMs, note) {
    return {
      entryId: uuid(), userEmail: email, displayName: name,
      inputType: inputType, inputValue: inputValue, miles: round(miles),
      note: note || '', source: 'manual',
      activityDate: dayStr(dateMs), createdAt: new Date(dateMs).toISOString()
    };
  }

  function seedIfEmpty() {
    if (getEntries() !== null) return;
    var people = [
      ['ada@demo.local', 'Ada L.'], ['ben@demo.local', 'Ben R.'], ['cleo@demo.local', 'Cleo M.'],
      ['dev@demo.local', 'Dev P.'], ['evie@demo.local', 'Evie S.'], ['finn@demo.local', 'Finn T.']
    ];
    var entries = [];
    var now = Date.now();
    var dayMs = 86400000;
    for (var i = 0; i < 150; i++) {
      var p = people[i % people.length];
      var daysAgo = 20 - (i % 21);
      var miles = round(0.5 + (i % 7) * 0.6);
      entries.push(mkEntry(p[0], p[1], 'miles', miles, miles, now - daysAgo * dayMs, ''));
    }
    entries.push(mkEntry(ME.email, 'You', 'miles', 2, 2, now - 3 * dayMs, ''));
    entries.push(mkEntry(ME.email, 'You', 'miles', 3.5, 3.5, now - 1 * dayMs, ''));
    setEntries(entries);
  }

  function mergedConfig() {
    var c = JSON.parse(JSON.stringify(CONFIG));
    c.completionTimestamp = getCompletion();
    return c;
  }
  function buildProgress(total) { return C2C.computeProgress(mergedConfig(), ROUTE, total); }

  function toClient(e) {
    return {
      entryId: e.entryId, miles: e.miles, inputType: e.inputType, inputValue: e.inputValue,
      note: e.note, activityDate: e.activityDate, createdAt: e.createdAt
    };
  }

  function checkComplete(total) {
    if (total >= CONFIG.goalMiles && !getCompletion()) setCompletion(new Date().toISOString());
  }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function resolve(v) { return Promise.resolve(v); }

  function validateMiles(payload) {
    var inputType = payload.inputType === 'steps' ? 'steps' : 'miles';
    var inputValue = Number(payload.inputValue);
    if (!isFinite(inputValue) || inputValue <= 0) return { error: 'INVALID_VALUE' };
    var miles = round(inputType === 'steps' ? inputValue / CONFIG.stepsPerMile : inputValue);
    if (miles > CONFIG.plausibilityThresholdMiles && !payload.confirmedOverThreshold) {
      return { error: 'NEEDS_CONFIRMATION', miles: miles };
    }
    return { inputType: inputType, inputValue: inputValue, miles: miles };
  }

  window.dataClient = {
    getState: function () {
      seedIfEmpty();
      var entries = getEntries();
      var total = recompute(entries);
      checkComplete(total);
      var p = getParticipant();
      var mine = entries.filter(function (e) { return e.userEmail === ME.email; }).sort(byCreatedDesc);
      var myTotal = round(mine.reduce(function (s, e) { return s + e.miles; }, 0));
      var recent = entries.slice().sort(byCreatedDesc).slice(0, 25).map(function (e) {
        return { displayName: e.displayName, miles: e.miles, activityDate: e.activityDate };
      });
      return resolve({
        user: { email: ME.email, displayName: p.displayName || null },
        config: {
          goalMiles: CONFIG.goalMiles, stepsPerMile: CONFIG.stepsPerMile,
          plausibilityThresholdMiles: CONFIG.plausibilityThresholdMiles,
          startCityLabel: CONFIG.startCityLabel, launchTimestamp: CONFIG.launchTimestamp,
          quickAddMiles: CONFIG.quickAddMiles
        },
        route: ROUTE,
        progress: buildProgress(total),
        myEntries: mine.map(toClient),
        myTotalMiles: myTotal,
        recentActivity: recent
      });
    },

    setDisplayName: function (name) {
      name = (name || '').trim();
      if (name.length < 1 || name.length > 40) return resolve({ ok: false, error: 'INVALID_NAME' });
      var p = getParticipant(); p.displayName = name; setParticipant(p);
      return resolve({ ok: true, displayName: name });
    },

    logActivity: function (payload) {
      payload = payload || {};
      var v = validateMiles(payload);
      if (v.error) return resolve({ ok: false, error: v.error, miles: v.miles });
      var entries = getEntries() || [];
      var prev = recompute(entries);
      var name = getParticipant().displayName || 'You';
      var e = mkEntry(ME.email, name, v.inputType, v.inputValue, v.miles, Date.now(), payload.note);
      if (payload.activityDate) e.activityDate = payload.activityDate;
      entries.push(e); setEntries(entries);
      var next = round(prev + v.miles);
      checkComplete(next);
      return resolve({
        ok: true, entryId: e.entryId, milesLogged: v.miles,
        celebrationMessage: pick(CELEBRATIONS),
        progress: buildProgress(next),
        milestoneJustReached: C2C.findMilestoneCrossed(ROUTE, prev, next)
      });
    },

    updateEntry: function (entryId, payload) {
      payload = payload || {};
      var v = validateMiles(payload);
      if (v.error) return resolve({ ok: false, error: v.error, miles: v.miles });
      var entries = getEntries() || [];
      var found = null;
      for (var i = 0; i < entries.length; i++) { if (entries[i].entryId === entryId) { found = entries[i]; break; } }
      if (!found) return resolve({ ok: false, error: 'NOT_FOUND' });
      if (found.userEmail !== ME.email) return resolve({ ok: false, error: 'NOT_OWNER' });
      found.inputType = v.inputType; found.inputValue = v.inputValue; found.miles = v.miles;
      if (payload.activityDate) found.activityDate = payload.activityDate;
      if (payload.note != null) found.note = String(payload.note).slice(0, 200);
      setEntries(entries);
      var total = recompute(entries);
      checkComplete(total);
      return resolve({ ok: true, progress: buildProgress(total) });
    },

    deleteEntry: function (entryId) {
      var entries = getEntries() || [];
      var idx = -1;
      for (var i = 0; i < entries.length; i++) { if (entries[i].entryId === entryId) { idx = i; break; } }
      if (idx < 0) return resolve({ ok: false, error: 'NOT_FOUND' });
      if (entries[idx].userEmail !== ME.email) return resolve({ ok: false, error: 'NOT_OWNER' });
      entries.splice(idx, 1); setEntries(entries);
      return resolve({ ok: true, progress: buildProgress(recompute(entries)) });
    },

    getRecognition: function () {
      var total = recompute(getEntries() || []);
      var complete = total >= CONFIG.goalMiles;
      return resolve({
        isComplete: complete,
        elapsed: complete ? C2C.computeElapsed(CONFIG.launchTimestamp, getCompletion()) : null,
        boards: []
      });
    },

    _resetDemo: function () {
      try {
        localStorage.removeItem('c2c_entries');
        localStorage.removeItem('c2c_participant');
        localStorage.removeItem('c2c_completion');
      } catch (e) {}
    }
  };
})();
