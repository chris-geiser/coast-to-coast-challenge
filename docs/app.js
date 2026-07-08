/*
 * app.js - UI for the Coast-to-Coast Challenge prototype.
 * Talks ONLY to window.dataClient, so it is identical to the eventual AWS
 * build (only the dataClient implementation swaps). Renders the Map and Log
 * views and never computes the team total itself.
 */
(function () {
  'use strict';

  var STATE = null;
  var unit = 'miles';
  var selectedDate = todayStr_();
  var editingId = null;
  var locSticky_ = false;

  function api(method) {
    var args = Array.prototype.slice.call(arguments, 1);
    if (!window.dataClient) return Promise.reject(new Error('NO_DATA_CLIENT'));
    return window.dataClient[method].apply(window.dataClient, args);
  }

  document.addEventListener('DOMContentLoaded', function () {
    try { unit = localStorage.getItem('c2c_unit') || 'miles'; } catch (e) {}
    wireStaticEvents_();
    reload_();
  });

  function reload_() {
    return api('getState').then(function (s) {
      STATE = s;
      renderAll_();
      renderRecognition_();
      if (!STATE.user.displayName) showOverlay_('ov-name');
    }).catch(function () {
      document.getElementById('next-line').textContent = 'Could not load the challenge. Refresh to try again.';
    });
  }

  function renderAll_() {
    renderChips_();
    renderUnit_();
    renderMap_();
    renderStatus_();
    renderTally_();
    updateConversion_();
  }

  var SVGNS = 'http://www.w3.org/2000/svg';

  function renderMap_() {
    var path = document.getElementById('route-full');
    if (!path || !path.getTotalLength) return;
    hideLocCard_();
    var L = path.getTotalLength();
    var goal = STATE.config.goalMiles;
    var total = STATE.progress.totalMiles;

    var g = document.getElementById('markers');
    g.innerHTML = '';
    STATE.route.forEach(function (r) {
      var f = Math.min(r.cumulativeMiles / goal, 1);
      var pt = path.getPointAtLength(f * L);
      var reached = r.cumulativeMiles <= total;
      var big = (r.order === 1 || r.cumulativeMiles >= goal);
      var c = document.createElementNS(SVGNS, 'circle');
      c.setAttribute('cx', pt.x.toFixed(1));
      c.setAttribute('cy', pt.y.toFixed(1));
      c.setAttribute('r', big ? 6.5 : 5);
      c.setAttribute('class', 'pin ' + (reached ? ('pin-' + (r.sorTag || 'literary')) : 'pin-unreached'));
      c.setAttribute('data-city', r.city);
      g.appendChild(c);

      var hit = document.createElementNS(SVGNS, 'circle');
      hit.setAttribute('cx', pt.x.toFixed(1));
      hit.setAttribute('cy', pt.y.toFixed(1));
      hit.setAttribute('r', 16);
      hit.setAttribute('fill', 'transparent');
      hit.setAttribute('class', 'pin-hit');
      hit.setAttribute('tabindex', '0');
      hit.setAttribute('role', 'button');
      hit.setAttribute('aria-label', shortCity_(r.city) + (reached ? ', reached' : ', not yet reached') + '. Read its story.');
      (function (item, isReached, anchor) {
        hit.addEventListener('mouseenter', function () { openLocCard_(item, isReached, anchor, false); });
        hit.addEventListener('mouseleave', closeLocCardIfHover_);
        hit.addEventListener('focus', function () { openLocCard_(item, isReached, anchor, false); });
        hit.addEventListener('blur', closeLocCardIfHover_);
        hit.addEventListener('click', function (e) { e.stopPropagation(); openLocCard_(item, isReached, anchor, true); });
        hit.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLocCard_(item, isReached, anchor, true); }
        });
      })(r, reached, hit);
      g.appendChild(hit);
    });

    var fc = STATE.progress.fractionComplete;
    var dp = path.getPointAtLength(fc * L);
    document.getElementById('dot').setAttribute('transform',
      'translate(' + dp.x.toFixed(1) + ',' + dp.y.toFixed(1) + ')');
    document.getElementById('route-traveled').setAttribute('stroke-dasharray',
      (fc * L).toFixed(1) + ' ' + L.toFixed(1));
  }

  function pulsePin_(city) {
    var pins = document.querySelectorAll('#markers .pin');
    for (var i = 0; i < pins.length; i++) {
      if (pins[i].getAttribute('data-city') === city) { pins[i].classList.add('pin-pulse'); break; }
    }
  }

  function openLocCard_(item, reached, anchor, sticky) {
    var card = document.getElementById('loc-card');
    var status = item.cumulativeMiles === 0
      ? 'Starting line'
      : (reached ? '✓ Reached • mile ' + fmtMiles_(item.cumulativeMiles)
                 : 'Still ahead • mile ' + fmtMiles_(item.cumulativeMiles));
    var statusEl = document.getElementById('loc-status');
    statusEl.textContent = status;
    statusEl.className = 'loc-status ' + (reached ? 'is-reached' : 'is-ahead');
    document.getElementById('loc-title').textContent = shortCity_(item.city);
    document.getElementById('loc-sor').style.display = (item.sorTag === 'sor') ? 'inline-block' : 'none';
    document.getElementById('loc-note').textContent = item.celebrationMessage;
    renderTrivia_(item.triviaFacts || []);
    positionCard_(card, anchor);
    card.classList.add('show');
    if (sticky) locSticky_ = true;
  }

  function renderTrivia_(facts) {
    var wrap = document.getElementById('loc-trivia');
    var box = document.getElementById('loc-facts');
    box.innerHTML = '';
    if (!facts.length) { wrap.classList.add('hidden'); return; }
    wrap.classList.remove('hidden');
    facts.forEach(function (f) {
      var p = document.createElement('p');
      p.className = 'loc-fact';
      p.textContent = f.text;
      box.appendChild(p);
    });
  }

  function positionCard_(card, anchor) {
    var prevVis = card.style.visibility;
    card.style.visibility = 'hidden';
    card.classList.add('show');
    var rect = anchor.getBoundingClientRect();
    var cw = card.offsetWidth, ch = card.offsetHeight;
    var left = rect.left + rect.width / 2 - cw / 2;
    var top = rect.top - ch - 12;
    if (top < 8) top = rect.bottom + 12;
    if (top + ch > window.innerHeight - 8) top = Math.max(8, window.innerHeight - 8 - ch);
    left = Math.max(8, Math.min(left, window.innerWidth - cw - 8));
    card.style.left = left + 'px';
    card.style.top = top + 'px';
    card.style.visibility = prevVis || '';
  }

  function hideLocCard_() {
    var card = document.getElementById('loc-card');
    if (card) card.classList.remove('show');
    locSticky_ = false;
  }

  function closeLocCardIfHover_() {
    if (!locSticky_) document.getElementById('loc-card').classList.remove('show');
  }

  function renderStatus_() {
    var p = STATE.progress;
    document.getElementById('total-miles').textContent = fmtMiles_(p.totalMiles);
    var nextLine = document.getElementById('next-line');
    var coastLine = document.getElementById('coast-line');
    if (p.isComplete) {
      nextLine.innerHTML = 'Coast to coast. <b>We made it together.</b>';
      coastLine.textContent = '';
    } else if (p.nextMilestone) {
      nextLine.innerHTML = 'Next stop: <b>' + escapeHtml_(shortCity_(p.nextMilestone.city)) +
        '</b>, ' + fmtMiles_(p.nextMilestone.milesRemaining) + ' to go.';
      coastLine.textContent = fmtMiles_(p.milesToCoast) + ' miles to the Atlantic.';
    }
  }

  function renderChips_() {
    var box = document.getElementById('chips');
    box.innerHTML = '';
    (STATE.config.quickAddMiles || [1, 2, 3, 5]).forEach(function (m) {
      var b = document.createElement('button');
      b.className = 'chip'; b.type = 'button'; b.textContent = '+' + m;
      b.addEventListener('click', function () {
        if (unit !== 'miles') { unit = 'miles'; renderUnit_(); }
        document.getElementById('num-input').value = m;
        updateConversion_();
        b.classList.add('flash');
        setTimeout(function () { b.classList.remove('flash'); }, 200);
      });
      box.appendChild(b);
    });
  }

  function renderUnit_() {
    document.getElementById('unit-miles').classList.toggle('selected', unit === 'miles');
    document.getElementById('unit-steps').classList.toggle('selected', unit === 'steps');
    document.getElementById('num-input').setAttribute('aria-label', unit === 'steps' ? 'How many steps?' : 'How many miles?');
  }

  function setUnit_(u) {
    unit = u;
    try { localStorage.setItem('c2c_unit', u); } catch (e) {}
    renderUnit_();
    updateConversion_();
  }

  function updateConversion_() {
    var v = parseFloat(document.getElementById('num-input').value);
    var conv = document.getElementById('conversion');
    if (!isFinite(v) || v <= 0) { conv.innerHTML = ''; return; }
    if (unit === 'steps') {
      var mi = v / STATE.config.stepsPerMile;
      conv.innerHTML = fmtInt_(v) + ' steps = <b>' + fmtMiles1_(mi) + ' mi</b>';
    } else {
      conv.innerHTML = '<b>' + fmtMiles1_(v) + ' mi</b> on the board';
    }
  }

  function doLog_(confirmed) {
    var v = parseFloat(document.getElementById('num-input').value);
    if (!isFinite(v) || v <= 0) { toast_("Pop in a number above zero and we'll add it."); return; }
    setBusy_(true);
    api('logActivity', {
      inputType: unit, inputValue: v, activityDate: selectedDate, confirmedOverThreshold: !!confirmed
    }).then(function (res) {
      setBusy_(false);
      if (!res.ok) {
        if (res.error === 'NEEDS_CONFIRMATION') { showConfirm_(res.miles); return; }
        if (res.error === 'INVALID_VALUE') { toast_("Pop in a number above zero and we'll add it."); return; }
        toast_('Something went sideways. Try again.'); return;
      }
      STATE.progress = res.progress;
      document.getElementById('num-input').value = '';
      updateConversion_();
      renderMap_();
      renderStatus_();
      var msg = res.celebrationMessage;
      if (res.milestoneJustReached) {
        msg = res.milestoneJustReached.celebrationMessage;
        pulsePin_(res.milestoneJustReached.city);
      }
      toast_(msg, res.milesLogged);
      goView_('map');
      setTimeout(reload_, 1000);
    }).catch(function () { setBusy_(false); toast_('Something went sideways. Try again.'); });
  }

  function renderTally_() {
    document.getElementById('your-miles').textContent = fmtMiles_(STATE.myTotalMiles || 0);
    var list = document.getElementById('entry-list');
    var empty = document.getElementById('entry-empty');
    list.innerHTML = '';
    var entries = STATE.myEntries || [];
    empty.style.display = entries.length ? 'none' : 'block';
    entries.slice(0, 12).forEach(function (e) {
      var li = document.createElement('li');
      var miles = document.createElement('span');
      miles.className = 'e-miles'; miles.textContent = fmtMiles_(e.miles) + ' mi';
      var date = document.createElement('span');
      date.className = 'e-date'; date.textContent = e.activityDate;
      var edit = document.createElement('button');
      edit.className = 'e-act e-edit'; edit.type = 'button'; edit.textContent = 'Edit';
      edit.addEventListener('click', function () { openEdit_(e); });
      var del = document.createElement('button');
      del.className = 'e-act e-del'; del.type = 'button'; del.textContent = 'Delete';
      del.addEventListener('click', function () { doDelete_(e); });
      li.appendChild(miles); li.appendChild(date); li.appendChild(edit); li.appendChild(del);
      list.appendChild(li);
    });
  }

  function openEdit_(e) {
    editingId = e.entryId;
    document.getElementById('edit-num').value = e.miles;
    document.getElementById('edit-date').value = e.activityDate;
    showOverlay_('ov-edit');
  }

  function saveEdit_() {
    var v = parseFloat(document.getElementById('edit-num').value);
    if (!isFinite(v) || v <= 0) { toast_("Pop in a number above zero and we'll add it."); return; }
    var date = document.getElementById('edit-date').value || selectedDate;
    api('updateEntry', editingId, {
      inputType: 'miles', inputValue: v, activityDate: date, confirmedOverThreshold: true
    }).then(function (res) {
      hideOverlay_('ov-edit');
      if (!res.ok) { toast_('Could not update that entry.'); return; }
      toast_('Updated. Your total adjusted.');
      reload_();
    }).catch(function () { hideOverlay_('ov-edit'); toast_('Could not update that entry.'); });
  }

  function doDelete_(e) {
    if (!window.confirm('Remove this entry? Your total will adjust.')) return;
    api('deleteEntry', e.entryId).then(function (res) {
      if (!res.ok) { toast_('Could not remove that entry.'); return; }
      toast_('Removed. Your total adjusted.');
      reload_();
    }).catch(function () { toast_('Could not remove that entry.'); });
  }

  function saveName_() {
    var name = document.getElementById('name-input').value.trim();
    if (name.length < 1) { return; }
    api('setDisplayName', name).then(function (res) {
      if (!res.ok) { toast_('Please enter a name (1 to 40 characters).'); return; }
      STATE.user.displayName = res.displayName;
      hideOverlay_('ov-name');
    }).catch(function () { toast_('Could not save your name. Try again.'); });
  }

  function wireStaticEvents_() {
    document.getElementById('unit-miles').addEventListener('click', function () { setUnit_('miles'); });
    document.getElementById('unit-steps').addEventListener('click', function () { setUnit_('steps'); });
    document.getElementById('num-input').addEventListener('input', updateConversion_);
    document.getElementById('btn-log').addEventListener('click', function () { doLog_(false); });
    document.getElementById('btn-name').addEventListener('click', saveName_);

    document.getElementById('date-toggle').addEventListener('click', function () {
      var di = document.getElementById('date-input');
      di.value = selectedDate; di.style.display = 'inline-block'; di.focus();
    });
    document.getElementById('date-input').addEventListener('change', function () {
      selectedDate = this.value || todayStr_();
    });

    document.getElementById('btn-confirm-yes').addEventListener('click', function () {
      hideOverlay_('ov-confirm'); doLog_(true);
    });
    document.getElementById('btn-confirm-no').addEventListener('click', function () { hideOverlay_('ov-confirm'); });
    document.getElementById('btn-edit-save').addEventListener('click', saveEdit_);
    document.getElementById('btn-edit-cancel').addEventListener('click', function () { hideOverlay_('ov-edit'); });

    document.getElementById('btn-finish').addEventListener('click', function () {
      try { localStorage.setItem('c2c_finish_seen', '1'); } catch (e) {}
      hideOverlay_('ov-finish');
      goView_('recognition');
    });

    var reset = document.getElementById('reset-demo');
    if (reset) reset.addEventListener('click', function (e) {
      e.preventDefault();
      if (window.dataClient._resetDemo) { window.dataClient._resetDemo(); }
      try { localStorage.removeItem('c2c_unit'); localStorage.removeItem('c2c_finish_seen'); } catch (x) {}
      location.reload();
    });

    var navBtns = document.querySelectorAll('.nav button');
    for (var i = 0; i < navBtns.length; i++) {
      navBtns[i].addEventListener('click', function () { goView_(this.getAttribute('data-view')); });
    }

    document.getElementById('loc-close').addEventListener('click', function (e) {
      e.stopPropagation(); hideLocCard_();
    });
    document.addEventListener('click', function () { if (locSticky_) hideLocCard_(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { hideLocCard_(); hideOverlay_('ov-confirm'); hideOverlay_('ov-edit'); hideOverlay_('ov-finish'); }
    });
  }

  function goView_(name) {
    var views = document.querySelectorAll('.view');
    for (var i = 0; i < views.length; i++) views[i].classList.toggle('active', views[i].id === 'view-' + name);
    var btns = document.querySelectorAll('.nav button');
    for (var j = 0; j < btns.length; j++) btns[j].classList.toggle('active', btns[j].getAttribute('data-view') === name);
    if (name === 'recognition') renderRecognition_();
    window.scrollTo(0, 0);
  }

  // The four inclusive boards, plus the one-time arrival moment at the finish.
  function renderRecognition_() {
    return api('getRecognition').then(function (rec) {
      var box = document.getElementById('rec-boards');
      if (box) {
        box.innerHTML = '';
        (rec.boards || []).forEach(function (b) {
          var card = document.createElement('div');
          card.className = 'rec-board';
          var h = document.createElement('h3');
          h.className = 'rec-board-title';
          h.textContent = b.title;
          var rule = document.createElement('p');
          rule.className = 'rec-board-rule';
          rule.textContent = b.rule;
          var blurb = document.createElement('p');
          blurb.className = 'rec-board-blurb';
          if (b.blurb) {
            blurb.textContent = b.blurb;
          } else {
            blurb.textContent = 'Still early. This one fills in as folks log.';
            blurb.classList.add('is-empty');
          }
          card.appendChild(h);
          card.appendChild(rule);
          card.appendChild(blurb);
          box.appendChild(card);
        });
      }
      maybeShowFinish_(rec);
      return rec;
    }).catch(function () { /* boards are non-critical; keep the app usable */ });
  }

  function maybeShowFinish_(rec) {
    if (!rec || !rec.isComplete) return;
    // Elapsed days run from config.launchTimestamp (2026-08-05) to completion.
    // Before launch there is no positive elapsed span, so computeElapsed returns
    // null and the day count is simply omitted (the fallback caption is used).
    var days = rec.elapsed ? rec.elapsed.days : null;
    var total = (STATE && STATE.progress) ? fmtMiles_(STATE.progress.totalMiles) : '';
    var sub = document.getElementById('finish-sub');
    var cap = document.getElementById('finish-caption');
    if (sub) {
      sub.textContent = 'From the Bay Area to New York, ' + total + ' miles' +
        (days != null ? ' in ' + days + ' days' : '') +
        '. Every one of those miles was someone choosing to step away from the desk and move. ' +
        'That is the Recharge spirit, and it is the same energy we bring to every student learning to read.';
    }
    if (cap) cap.textContent = (days != null ? days + ' days, coast to coast.' : 'Coast to coast.');
    var seen = null;
    try { seen = localStorage.getItem('c2c_finish_seen'); } catch (e) {}
    if (!seen) showOverlay_('ov-finish');
  }

  function showConfirm_(miles) {
    document.getElementById('confirm-text').textContent =
      'Whoa, ' + fmtMiles_(miles) + ' miles in one go! Amazing if that is real. ' +
      'Want to double-check it is not a typo, like steps typed in the miles box?';
    showOverlay_('ov-confirm');
  }
  function showOverlay_(id) { document.getElementById(id).classList.add('show'); }
  function hideOverlay_(id) { document.getElementById(id).classList.remove('show'); }
  function setBusy_(b) { document.getElementById('btn-log').disabled = b; }

  function toast_(msg, miles) {
    var t = document.getElementById('toast');
    t.innerHTML = (miles ? '<div class="mile-line">+' + fmtMiles_(miles) + ' mi</div>' : '') +
      '<div>' + escapeHtml_(msg) + '</div>';
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove('show'); }, 3800);
  }

  function fmtMiles_(m) { return (Math.round(Number(m) * 10) / 10).toLocaleString(undefined, { maximumFractionDigits: 1 }); }
  function fmtMiles1_(m) { return (Math.round(Number(m) * 10) / 10).toFixed(1); }
  function fmtInt_(n) { return Math.round(Number(n)).toLocaleString(); }
  function shortCity_(c) { return String(c).split(',')[0]; }
  function todayStr_() {
    var d = new Date();
    return d.getFullYear() + '-' + pad_(d.getMonth() + 1) + '-' + pad_(d.getDate());
  }
  function pad_(n) { return (n < 10 ? '0' : '') + n; }
  function escapeHtml_(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
})();
