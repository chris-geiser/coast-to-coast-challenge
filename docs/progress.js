/*
 * progress.js - pure progress math for the Coast-to-Coast Challenge.
 * No DOM, no storage, no framework. These functions are the single source
 * of truth for the numbers and are meant to run unchanged in both the
 * browser prototype (via data-local.js) and the future AWS Lambda backend.
 */
(function () {
  'use strict';
  var C2C = window.C2C = window.C2C || {};

  function round(n) {
    return Math.round((Number(n) + Number.EPSILON) * 1000) / 1000;
  }

  function computeElapsed(launch, completion) {
    if (!launch || !completion) return null;
    var ms = new Date(completion).getTime() - new Date(launch).getTime();
    if (!isFinite(ms) || ms < 0) return null;
    var h = ms / 3600000;
    return { days: Math.floor(h / 24), hours: Math.floor(h % 24) };
  }

  function computeProgress(config, route, totalMiles) {
    var goal = Number(config.goalMiles);
    totalMiles = round(totalMiles);
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
      nextMilestone: next ? { city: next.city, milesRemaining: round(next.cumulativeMiles - totalMiles) } : null,
      milesToCoast: Math.max(round(goal - totalMiles), 0),
      milestonesReached: reached,
      isComplete: isComplete,
      elapsed: isComplete ? computeElapsed(config.launchTimestamp, config.completionTimestamp) : null
    };
  }

  function findMilestoneCrossed(route, prev, next) {
    var crossed = null;
    for (var i = 0; i < route.length; i++) {
      var c = route[i];
      if (c.cumulativeMiles > 0 && c.cumulativeMiles > prev && c.cumulativeMiles <= next) crossed = c;
    }
    return crossed ? { city: crossed.city, celebrationMessage: crossed.celebrationMessage } : null;
  }

  // Integer day index for a yyyy-mm-dd string, used for streak math.
  function dayIndex(dateStr) {
    if (!dateStr) return NaN;
    var d = new Date(String(dateStr).slice(0, 10) + 'T00:00:00');
    var t = d.getTime();
    return isFinite(t) ? Math.floor(t / 86400000) : NaN;
  }

  /*
   * computeRecognition - the four inclusive boards. NONE of these rank by
   * total miles; every distance counts the same. Ties break toward whoever
   * acted first, so the result is deterministic. Returns four board objects,
   * each with a filled blurb or null when there is not enough data yet.
   */
  function computeRecognition(entries, config) {
    entries = entries || [];

    var people = {};
    var firstEver = null; // { name, createdAt } for "First Out of the Gate"

    entries.forEach(function (e) {
      var id = e.clientId || e.userEmail || e.displayName;
      if (!id) return;
      var p = people[id];
      if (!p) p = people[id] = { name: e.displayName || 'Someone', dates: {}, firstCreated: e.createdAt };
      if (e.displayName) p.name = e.displayName;
      var day = e.activityDate;
      p.dates[day] = round((p.dates[day] || 0) + (Number(e.miles) || 0));
      if (new Date(e.createdAt) < new Date(p.firstCreated)) p.firstCreated = e.createdAt;
      if (!firstEver || new Date(e.createdAt) < new Date(firstEver.createdAt)) {
        firstEver = { name: e.displayName || 'Someone', createdAt: e.createdAt };
      }
    });

    var ids = Object.keys(people);

    // earlier firstCreated wins a tie
    function better(aVal, aId, bestVal, bestId) {
      if (bestId === null) return true;
      if (aVal !== bestVal) return aVal > bestVal;
      return new Date(people[aId].firstCreated) < new Date(people[bestId].firstCreated);
    }

    var daysWinner = { id: null, val: 0 };
    var streakWinner = { id: null, val: 0 };
    var improvedWinner = { id: null, val: 0 };

    ids.forEach(function (id) {
      var p = people[id];
      var days = Object.keys(p.dates);
      var daysActive = days.length;
      if (better(daysActive, id, daysWinner.val, daysWinner.id)) daysWinner = { id: id, val: daysActive };

      // longest run of consecutive calendar days
      var idxs = days.map(dayIndex).filter(function (n) { return isFinite(n); }).sort(function (a, b) { return a - b; });
      var longest = idxs.length ? 1 : 0, run = idxs.length ? 1 : 0;
      for (var i = 1; i < idxs.length; i++) {
        run = (idxs[i] === idxs[i - 1] + 1) ? run + 1 : 1;
        if (run > longest) longest = run;
      }
      if (better(longest, id, streakWinner.val, streakWinner.id)) streakWinner = { id: id, val: longest };

      // growth from first active week to last active week (not speed, not total)
      var firstDay = idxs.length ? idxs[0] : null;
      if (firstDay !== null) {
        var weekMiles = {};
        days.forEach(function (d) {
          var wk = Math.floor((dayIndex(d) - firstDay) / 7);
          weekMiles[wk] = round((weekMiles[wk] || 0) + p.dates[d]);
        });
        var weeks = Object.keys(weekMiles).map(Number).sort(function (a, b) { return a - b; });
        if (weeks.length >= 2) {
          var growth = round(weekMiles[weeks[weeks.length - 1]] - weekMiles[weeks[0]]);
          if (growth > 0 && better(growth, id, improvedWinner.val, improvedWinner.id)) {
            improvedWinner = { id: id, val: growth };
          }
        }
      }
    });

    function nameOf(w) { return w.id ? people[w.id].name : null; }

    return [
      {
        key: 'days', title: 'Most Days Active',
        rule: 'Showed up on the most days. Consistency is the whole game.',
        blurb: daysWinner.id ? nameOf(daysWinner) + ' logged on ' + daysWinner.val + ' different day' + (daysWinner.val === 1 ? '' : 's') + '.' : null
      },
      {
        key: 'streak', title: 'Longest Streak',
        rule: 'The most days in a row.',
        blurb: streakWinner.id ? nameOf(streakWinner) + ' kept it going ' + streakWinner.val + ' day' + (streakWinner.val === 1 ? '' : 's') + ' straight.' : null
      },
      {
        key: 'improved', title: 'Most Improved',
        rule: 'Grew the most from their first week to their last.',
        blurb: improvedWinner.id ? nameOf(improvedWinner) + ' grew their weekly miles the most. Growth, not speed.' : null
      },
      {
        key: 'first', title: 'First Out of the Gate',
        rule: 'The very first to log a mile.',
        blurb: firstEver ? firstEver.name + ' got us moving.' : null
      }
    ];
  }

  C2C.round = round;
  C2C.computeElapsed = computeElapsed;
  C2C.computeProgress = computeProgress;
  C2C.findMilestoneCrossed = findMilestoneCrossed;
  C2C.computeRecognition = computeRecognition;
})();
