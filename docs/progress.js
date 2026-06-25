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

  C2C.round = round;
  C2C.computeElapsed = computeElapsed;
  C2C.computeProgress = computeProgress;
  C2C.findMilestoneCrossed = findMilestoneCrossed;
})();
