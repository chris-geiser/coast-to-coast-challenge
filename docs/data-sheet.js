/*
 * data-sheet.js - the Google Sheet data layer (Apps Script JSON API).
 *
 * Drop-in replacement for data-local.js. Implements the same window.dataClient
 * interface (getState, setDisplayName, logActivity, updateEntry, deleteEntry,
 * getRecognition), so app.js does not change. Instead of localStorage this
 * talks to an Apps Script web app deployed in front of the challenge Google
 * Sheet. See specs/sheet-backend.md for setup and deploy steps.
 *
 * The Sheet is the source of truth for entries and the operational Settings.
 * Progress math stays here (via window.C2C) and route/celebration copy comes
 * from data-content.js, so the backend stays a dumb, lock-guarded store.
 *
 * No auth by design: identity is a per-browser clientId. Ownership of entries
 * (edit/delete) is enforced against that id. A shared secret rides along on
 * every request as a light speed bump, not real authentication.
 */
(function () {
  'use strict';
  var C2C = window.C2C;
  var round = C2C.round;
  var CONTENT = window.C2C_CONTENT;

  var ROUTE = CONTENT.ROUTE;
  var CELEBRATIONS = CONTENT.CELEBRATIONS;
  var CONFIG_DEFAULTS = CONTENT.CONFIG;

  /* ==================================================================== */
  /* FILL THESE IN AFTER YOU DEPLOY THE APPS SCRIPT (see sheet-backend.md) */
  /* ==================================================================== */
  var API_URL = 'PASTE_YOUR_WEB_APP_EXEC_URL_HERE';
  var SHARED_SECRET = 'PASTE_YOUR_SHARED_SECRET_HERE';
  /* ==================================================================== */

  // Per-browser identity. Not real auth; just attributes entries to a device.
  function clientId() {
    var k = 'c2c_client_id', id;
    try { id = localStorage.getItem(k); } catch (e) {}
    if (!id) {
      id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      try { localStorage.setItem(k, id); } catch (e) {}
    }
    return id;
  }
  var ME = clientId();

  function cacheName(n) { try { if (n != null) localStorage.setItem('c2c_display_name', n); } catch (e) {} }
  function cachedName() { try { return localStorage.getItem('c2c_display_name') || null; } catch (e) { return null; } }

  // Last state fetched from the server, so mutations and getRecognition can
  // reason about settings/entries without an extra round trip.
  var cache = { settings: null, entries: [] };

  /* -------------------------------------------------------------------- */
  /* Transport                                                            */
  /* -------------------------------------------------------------------- */

  function apiGet() {
    var url = API_URL + '?action=state&secret=' + encodeURIComponent(SHARED_SECRET) +
      '&clientId=' + encodeURIComponent(ME);
    return fetch(url, { method: 'GET' }).then(function (r) { return r.json(); });
  }

  // text/plain avoids a CORS preflight the Apps Script endpoint cannot answer.
  function apiPost(action, data) {
    var body = {};
    for (var k in (data || {})) if (Object.prototype.hasOwnProperty.call(data, k)) body[k] = data[k];
    body.action = action;
    body.secret = SHARED_SECRET;
    body.clientId = ME;
    return fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); });
  }

  /* -------------------------------------------------------------------- */
  /* Helpers                                                              */
  /* -------------------------------------------------------------------- */

  function settings() {
    return cache.settings || {
      goalMiles: CONFIG_DEFAULTS.goalMiles,
      stepsPerMile: CONFIG_DEFAULTS.stepsPerMile,
      plausibilityThresholdMiles: CONFIG_DEFAULTS.plausibilityThresholdMiles,
      startCityLabel: CONFIG_DEFAULTS.startCityLabel,
      launchTimestamp: CONFIG_DEFAULTS.launchTimestamp,
      quickAddMiles: CONFIG_DEFAULTS.quickAddMiles,
      completionTimestamp: ''
    };
  }

  function progressFrom(total) { return C2C.computeProgress(settings(), ROUTE, total); }
  function byCreatedDesc(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); }
  function sumMiles(entries) { var s = 0; entries.forEach(function (e) { s += Number(e.miles) || 0; }); return round(s); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function toClient(e) {
    return {
      entryId: e.entryId, miles: e.miles, inputType: e.inputType, inputValue: e.inputValue,
      note: e.note, activityDate: e.activityDate, createdAt: e.createdAt
    };
  }

  // Client-side validation for instant UX (mirrors the server, which also
  // enforces this). Returns NEEDS_CONFIRMATION without touching the network so
  // the plausibility modal is instant.
  function validateMiles(payload) {
    var s = settings();
    var inputType = payload.inputType === 'steps' ? 'steps' : 'miles';
    var inputValue = Number(payload.inputValue);
    if (!isFinite(inputValue) || inputValue <= 0) return { error: 'INVALID_VALUE' };
    var stepsPerMile = Number(s.stepsPerMile) || CONFIG_DEFAULTS.stepsPerMile;
    var threshold = Number(s.plausibilityThresholdMiles) || CONFIG_DEFAULTS.plausibilityThresholdMiles;
    var miles = round(inputType === 'steps' ? inputValue / stepsPerMile : inputValue);
    if (miles > threshold && !payload.confirmedOverThreshold) {
      return { error: 'NEEDS_CONFIRMATION', miles: miles };
    }
    return { inputType: inputType, inputValue: inputValue, miles: miles };
  }

  /* -------------------------------------------------------------------- */
  /* Public client                                                        */
  /* -------------------------------------------------------------------- */

  window.dataClient = {
    getState: function () {
      return apiGet().then(function (res) {
        if (!res || !res.ok) throw new Error((res && res.error) || 'STATE_FAILED');
        cache.settings = res.settings || null;
        cache.entries = res.entries || [];
        var s = settings();
        var total = sumMiles(cache.entries);
        var displayName = res.displayName || cachedName();
        if (res.displayName) cacheName(res.displayName);

        var mine = cache.entries.filter(function (e) { return e.clientId === ME; }).sort(byCreatedDesc);
        var myTotal = sumMiles(mine);
        var recent = cache.entries.slice().sort(byCreatedDesc).slice(0, 25).map(function (e) {
          return { displayName: e.displayName, miles: e.miles, activityDate: e.activityDate };
        });

        return {
          user: { email: ME, displayName: displayName || null },
          config: {
            goalMiles: Number(s.goalMiles) || CONFIG_DEFAULTS.goalMiles,
            stepsPerMile: Number(s.stepsPerMile) || CONFIG_DEFAULTS.stepsPerMile,
            plausibilityThresholdMiles: Number(s.plausibilityThresholdMiles) || CONFIG_DEFAULTS.plausibilityThresholdMiles,
            startCityLabel: s.startCityLabel || CONFIG_DEFAULTS.startCityLabel,
            launchTimestamp: s.launchTimestamp || CONFIG_DEFAULTS.launchTimestamp,
            quickAddMiles: s.quickAddMiles || CONFIG_DEFAULTS.quickAddMiles
          },
          route: ROUTE,
          progress: progressFrom(total),
          myEntries: mine.map(toClient),
          myTotalMiles: myTotal,
          recentActivity: recent
        };
      });
    },

    setDisplayName: function (name) {
      name = (name || '').trim();
      if (name.length < 1 || name.length > 40) return Promise.resolve({ ok: false, error: 'INVALID_NAME' });
      return apiPost('setName', { displayName: name }).then(function (res) {
        if (res && res.ok) cacheName(name);
        return res;
      });
    },

    logActivity: function (payload) {
      payload = payload || {};
      var v = validateMiles(payload);
      if (v.error) return Promise.resolve({ ok: false, error: v.error, miles: v.miles });
      return apiPost('log', {
        inputType: v.inputType, inputValue: v.inputValue,
        confirmedOverThreshold: !!payload.confirmedOverThreshold,
        activityDate: payload.activityDate || null,
        note: payload.note || '',
        displayName: cachedName() || null
      }).then(function (res) {
        if (!res || !res.ok) return res || { ok: false, error: 'LOG_FAILED' };
        var prev = round(Number(res.prevTotal) || 0);
        var next = round(Number(res.newTotal) || 0);
        if (res.completionTimestamp && cache.settings) cache.settings.completionTimestamp = res.completionTimestamp;
        return {
          ok: true, entryId: res.entryId, milesLogged: res.miles,
          celebrationMessage: pick(CELEBRATIONS),
          progress: progressFrom(next),
          milestoneJustReached: C2C.findMilestoneCrossed(ROUTE, prev, next)
        };
      });
    },

    updateEntry: function (entryId, payload) {
      payload = payload || {};
      var v = validateMiles(payload);
      if (v.error) return Promise.resolve({ ok: false, error: v.error, miles: v.miles });
      return apiPost('update', {
        entryId: entryId, inputType: v.inputType, inputValue: v.inputValue,
        confirmedOverThreshold: !!payload.confirmedOverThreshold,
        activityDate: payload.activityDate || null,
        note: payload.note != null ? payload.note : null
      }).then(function (res) {
        if (!res || !res.ok) return res || { ok: false, error: 'UPDATE_FAILED' };
        return { ok: true, progress: progressFrom(round(Number(res.newTotal) || 0)) };
      });
    },

    deleteEntry: function (entryId) {
      return apiPost('delete', { entryId: entryId }).then(function (res) {
        if (!res || !res.ok) return res || { ok: false, error: 'DELETE_FAILED' };
        return { ok: true, progress: progressFrom(round(Number(res.newTotal) || 0)) };
      });
    },

    getRecognition: function () {
      function build() {
        var s = settings();
        var total = sumMiles(cache.entries);
        var goal = Number(s.goalMiles) || CONFIG_DEFAULTS.goalMiles;
        var complete = total >= goal;
        return {
          isComplete: complete,
          elapsed: complete ? C2C.computeElapsed(s.launchTimestamp, s.completionTimestamp) : null,
          boards: []
        };
      }
      if (cache.settings) return Promise.resolve(build());
      return apiGet().then(function (res) {
        if (res && res.ok) { cache.settings = res.settings || null; cache.entries = res.entries || []; }
        return build();
      });
    }
  };
})();
