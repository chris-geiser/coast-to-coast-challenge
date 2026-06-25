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
      celebrationMessage: "And we're off! We start in the Bay Area, where Ignite Reading began. Every great story starts with the basics, and so does every great journey.", sorTag: 'home' },
    { order: 2, city: 'Sacramento, CA', cumulativeMiles: 87,
      celebrationMessage: "Sacramento! California's capital, where the state committed to the Science of Reading. 87 miles down, together.", sorTag: 'sor' },
    { order: 3, city: 'Reno, NV', cumulativeMiles: 219,
      celebrationMessage: "Over the Sierra Nevada and into Reno. The mountains are behind us.", sorTag: 'literary' },
    { order: 4, city: 'Salt Lake City, UT', cumulativeMiles: 737,
      celebrationMessage: "Salt Lake City! We've crossed the Great Basin. That is real distance, all of us together.", sorTag: 'literary' },
    { order: 5, city: 'Cheyenne, WY', cumulativeMiles: 1176,
      celebrationMessage: "Cheyenne, Wyoming. Through the Rockies and onto the high plains. Look how far we have come.", sorTag: 'literary' },
    { order: 6, city: 'Omaha, NE', cumulativeMiles: 1670,
      celebrationMessage: "Omaha, and we are past halfway! Crossing the Missouri River with the whole team.", sorTag: 'literary' },
    { order: 7, city: 'Des Moines, IA', cumulativeMiles: 1804,
      celebrationMessage: "Des Moines, the heart of the heartland. Steady steps, big progress.", sorTag: 'literary' },
    { order: 8, city: 'Chicago, IL', cumulativeMiles: 2136,
      celebrationMessage: "Chicago! Hometown of Shel Silverstein, who helped millions of kids fall in love with words. Good company to keep.", sorTag: 'literary' },
    { order: 9, city: 'Cleveland, OH', cumulativeMiles: 2480,
      celebrationMessage: "Cleveland, in a state that now teaches reading by the science. Two-thirds of the way there.", sorTag: 'sor' },
    { order: 10, city: 'Pittsburgh, PA', cumulativeMiles: 2615,
      celebrationMessage: "Pittsburgh, where much of the Science of Reading was built at the University of Pittsburgh. The home stretch.", sorTag: 'sor' },
    { order: 11, city: 'New York, NY', cumulativeMiles: 2984,
      celebrationMessage: "New York City. Coast to coast. We made it together, for every student learning to read.", sorTag: 'sor' }
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
