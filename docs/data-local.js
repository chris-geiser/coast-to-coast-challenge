/*
 * data-local.js - the prototype's data layer (browser localStorage).
 *
 * Implements the shared client interface (getState, setDisplayName,
 * logActivity, updateEntry, deleteEntry, getRecognition). app.js talks ONLY to
 * window.dataClient, so the Sheet-backed build swaps this file for
 * data-sheet.js and app.js does not change. This build is the local demo:
 * seeded with sample data, no real identity, no shared state.
 *
 * Route, celebration lines, and config defaults come from data-content.js
 * (window.C2C_CONTENT) so they stay single-sourced with the Sheet build.
 */
(function () {
  'use strict';
  var C2C = window.C2C;
  var round = C2C.round;
  var CONTENT = window.C2C_CONTENT;

  var CONFIG = CONTENT.CONFIG;
  var ROUTE = CONTENT.ROUTE;
  var CELEBRATIONS = CONTENT.CELEBRATIONS;

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

  // Small deterministic PRNG so the demo seed is varied but stable.
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // A lifelike ~3-week window of team activity: real cadences, rest days, a
  // range of walkers and runners, a few step-based logs, and a clear (but
  // distinct) protagonist for each recognition board. Deterministic per reset.
  function seedIfEmpty() {
    if (getEntries() !== null) return;
    var dayMs = 86400000, WINDOW = 24;
    var now = new Date();
    var todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    var entries = [];

    function m1(x) { return Math.max(0.3, Math.round(x * 10) / 10); }
    function add(email, name, miles, dd, hour, inputType, inputValue) {
      var ms = todayUTC - (WINDOW - 1 - dd) * dayMs + Math.round(hour * 3600000);
      entries.push(mkEntry(email, name, inputType || 'miles',
        inputValue != null ? inputValue : miles, miles, ms, ''));
    }

    // Grace: Most Days Active. Logs 21 of 24 days (a few rest days).
    var gr = mulberry32(101);
    for (var d = 0; d < WINDOW; d++) {
      if (d === 4 || d === 12 || d === 19) continue;
      add('grace@demo.local', 'Grace L.', m1(1.1 + gr() * 1.4), d, 7 + gr() * 3);
    }
    // Maya: Longest Streak. 16 days straight, then stops.
    var my = mulberry32(202);
    for (var d2 = 0; d2 < 16; d2++) add('maya@demo.local', 'Maya R.', m1(3 + my() * 3), d2, 6.5 + my() * 4);
    // Theo: Most Improved. Steady climb from ~1 to ~5.5 mi/day.
    var th = mulberry32(303);
    for (var d3 = 0; d3 < WINDOW; d3++) {
      if (th() < 0.25) continue;
      var prog = d3 / (WINDOW - 1);
      add('theo@demo.local', 'Theo K.', m1(1 + 4.6 * prog + (th() - 0.5) * 0.6), d3, 7 + th() * 3);
    }
    // Ivy: First Out of the Gate. Earliest timestamp of anyone, on day one.
    add('ivy@demo.local', 'Ivy C.', m1(2.2), 0, 5.4);
    var iv = mulberry32(404);
    for (var d4 = 1; d4 < WINDOW; d4++) {
      if (iv() < 0.55) continue;
      add('ivy@demo.local', 'Ivy C.', m1(1.8 + iv() * 2.2), d4, 8 + iv() * 4);
    }

    // The rest of the team: varied cadences and distances.
    var crowd = [
      { email: 'marcus@demo.local', name: 'Marcus D.', prob: 0.5, lo: 4, hi: 8, longRun: true, seed: 11 },
      { email: 'priya@demo.local', name: 'Priya S.', prob: 0.62, lo: 1, hi: 2.6, seed: 12 },
      { email: 'ana@demo.local', name: 'Ana G.', prob: 0.3, lo: 1, hi: 3, seed: 13 },
      { email: 'liam@demo.local', name: 'Liam O.', prob: 0.55, lo: 1.5, hi: 3, seed: 14 },
      { email: 'sofia@demo.local', name: 'Sofia H.', prob: 0.45, lo: 3, hi: 6, longRun: true, seed: 15 },
      { email: 'noah@demo.local', name: 'Noah B.', prob: 0.28, lo: 2, hi: 4, seed: 16 },
      { email: 'emma@demo.local', name: 'Emma W.', prob: 0.5, lo: 1, hi: 2.4, seed: 17 },
      { email: 'jamal@demo.local', name: 'Jamal T.', prob: 0.5, lo: 2, hi: 5, seed: 18 },
      { email: 'diego@demo.local', name: 'Diego M.', prob: 0.32, lo: 3, hi: 5, seed: 19 },
      { email: 'nina@demo.local', name: 'Nina P.', prob: 0.4, lo: 1.5, hi: 3.5, seed: 20 }
    ];
    crowd.forEach(function (p) {
      var r = mulberry32(p.seed * 7 + 1);
      for (var d5 = 0; d5 < WINDOW; d5++) {
        if (r() >= p.prob) continue;
        var miles = p.lo + (p.hi - p.lo) * r();
        if (p.longRun && r() < 0.12) miles += 3 + r() * 4;
        if (r() < 0.1) {
          var steps = Math.round(miles * CONFIG.stepsPerMile / 100) * 100;
          add(p.email, p.name, round(steps / CONFIG.stepsPerMile), d5, 7 + r() * 5, 'steps', steps);
        } else {
          add(p.email, p.name, m1(miles), d5, 7 + r() * 5);
        }
      }
    });

    // You: a few recent entries.
    add(ME.email, 'You', 2.0, WINDOW - 4, 8);
    add(ME.email, 'You', 3.4, WINDOW - 2, 18.5);
    add(ME.email, 'You', 1.5, WINDOW - 1, 7.5);

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
          quickAddMiles: CONFIG.quickAddMiles, welcomeVideoUrl: CONFIG.welcomeVideoUrl || ''
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
      var entries = getEntries() || [];
      var total = recompute(entries);
      var complete = total >= CONFIG.goalMiles;
      return resolve({
        isComplete: complete,
        elapsed: complete ? C2C.computeElapsed(CONFIG.launchTimestamp, getCompletion()) : null,
        boards: C2C.computeRecognition(entries, CONFIG)
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
