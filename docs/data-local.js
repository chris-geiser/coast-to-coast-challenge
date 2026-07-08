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
