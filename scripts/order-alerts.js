/* ==========================================================================
   ORDER ALERTS  (new customer order -> sound + pop-up banner + notification)
   Used by orders-display.html (admin)  data-mode="admin"
           cashier-orders.html (cashier) data-mode="cashier"
   Listens to the existing live stream:  /api/orders-stream/<slug>
   ========================================================================== */
(function () {
  'use strict';

  var script = document.currentScript;
  var MODE = (script && script.getAttribute('data-mode')) === 'cashier' ? 'cashier' : 'admin';

  var SOUND_KEY = 'orderAlertsSound';
  var REPEAT_EVERY_MS = 20000;   // chime again while an alert is still waiting
  var REPEAT_MAX = 8;            // ... at most this many extra times
  var MAX_BANNERS = 4;

  function lsGet(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (_) {} }

  function detectSlug() {
    if (MODE === 'cashier') {
      var parts = location.pathname.split('/').filter(Boolean);
      var fromPath = parts.length === 2 && parts[1] === 'cashier-orders' ? parts[0] : '';
      return (fromPath || new URLSearchParams(location.search).get('restaurant') || '').trim();
    }
    return (lsGet('adminRestaurantSlug') || lsGet('selectedRestaurantSlug') || '').trim();
  }

  var state = {
    slug: '',
    branchId: null,
    branchKnown: false,
    soundOn: lsGet(SOUND_KEY) !== 'off',
    ctx: null,
    lockedBeforeGesture: true,
    seen: {},
    banners: [],
    repeatTimer: null,
    repeatCount: 0,
    titleTimer: null,
    baseTitle: '',
    stream: null
  };
  var ui = {};

  /* ---------------- sound (generated, no audio files needed) ---------------- */

  function getCtx() {
    if (!state.ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { state.ctx = new AC(); } catch (_) { return null; }
      try { state.ctx.addEventListener('statechange', updateUi); } catch (_) {}
    }
    return state.ctx;
  }

  function audioRunning() { return !!(state.ctx && state.ctx.state === 'running'); }

  function unlockAudio() {
    var c = getCtx();
    if (c && c.state === 'suspended') {
      try { c.resume().then(updateUi, function () {}); } catch (_) {}
    }
    updateUi();
  }

  function tone(freq, when, dur, vol) {
    var c = state.ctx;
    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(vol, when + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(when);
    osc.stop(when + dur + 0.05);
  }

  // "ding-dong, ding-dong"
  function chime() {
    if (!state.soundOn || !getCtx() || !audioRunning()) return false;
    var t = state.ctx.currentTime + 0.02;
    [0, 0.9].forEach(function (offset) {
      tone(880, t + offset, 0.55, 0.45);
      tone(1175, t + offset + 0.2, 0.8, 0.45);
    });
    return true;
  }

  /* ---------------- floating control ---------------- */

  function injectStyles() {
    var css = [
      '#oaControl{position:fixed;left:12px;bottom:12px;z-index:2147483000;display:flex;gap:6px;flex-wrap:wrap;font-family:Arial,sans-serif}',
      '#oaControl button{padding:9px 13px;border:1px solid #b9833a;border-radius:999px;background:#2b1d14;color:#f8f0df;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.35)}',
      '#oaControl button:hover{background:#4a321f}',
      '#oaControl button.oa-warn{background:#b3261e;border-color:#ff8c8c;animation:oaPulse 1.4s infinite}',
      '@keyframes oaPulse{50%{box-shadow:0 0 0 7px rgba(179,38,30,.25)}}',
      '#oaStack{position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:2147483001;width:min(520px,calc(100vw - 20px));display:flex;flex-direction:column;gap:8px;font-family:Arial,sans-serif}',
      '.oa-banner{display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:14px;background:#1f7a46;color:#fff;box-shadow:0 8px 28px rgba(0,0,0,.45);animation:oaIn .25s ease-out}',
      '@keyframes oaIn{from{transform:translateY(-14px);opacity:0}to{transform:none;opacity:1}}',
      '.oa-banner .oa-icon{font-size:26px;line-height:1}',
      '.oa-banner .oa-text{flex:1;min-width:0}',
      '.oa-banner .oa-title{font-size:17px;font-weight:800}',
      '.oa-banner .oa-sub{margin-top:2px;font-size:13px;opacity:.92}',
      '.oa-banner button{padding:9px 14px;border:0;border-radius:10px;background:#fff;color:#14522e;font-weight:800;cursor:pointer}'
    ].join('');
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  function buildUi() {
    injectStyles();

    ui.stack = document.createElement('div');
    ui.stack.id = 'oaStack';
    ui.stack.setAttribute('role', 'alert');
    ui.stack.setAttribute('aria-live', 'assertive');

    ui.control = document.createElement('div');
    ui.control.id = 'oaControl';

    ui.sound = document.createElement('button');
    ui.sound.type = 'button';
    ui.sound.addEventListener('click', onSoundClick);

    ui.test = document.createElement('button');
    ui.test.type = 'button';
    ui.test.textContent = 'Test alert';
    ui.test.addEventListener('click', function () {
      onNewOrder({ type: 'new-order', order_number: 'TEST', branch_name: 'Test branch', order_type: 'dine-in', test: true });
    });

    ui.notify = document.createElement('button');
    ui.notify.type = 'button';
    ui.notify.textContent = 'Allow popup alerts';
    ui.notify.addEventListener('click', function () {
      if (!('Notification' in window)) return;
      try { Notification.requestPermission().then(updateUi, updateUi); } catch (_) { updateUi(); }
    });

    ui.control.appendChild(ui.sound);
    ui.control.appendChild(ui.test);
    ui.control.appendChild(ui.notify);
    document.body.appendChild(ui.stack);
    document.body.appendChild(ui.control);
    updateUi();
  }

  function updateUi() {
    if (!ui.sound) return;
    var locked = state.soundOn && !audioRunning();
    ui.sound.className = locked ? 'oa-warn' : '';
    ui.sound.textContent = !state.soundOn ? '\uD83D\uDD15 Sound off' : (locked ? '\uD83D\uDD14 Tap to enable sound' : '\uD83D\uDD14 Sound on');
    ui.notify.hidden = !('Notification' in window) || Notification.permission !== 'default';
  }

  function onSoundClick() {
    // The page-wide pointerdown listener already tried to unlock audio.
    if (state.lockedBeforeGesture && state.soundOn) {
      setTimeout(function () { chime(); updateUi(); }, 200);   // just enabling: play a test, do not toggle
      return;
    }
    state.soundOn = !state.soundOn;
    lsSet(SOUND_KEY, state.soundOn ? 'on' : 'off');
    if (state.soundOn) { unlockAudio(); setTimeout(chime, 150); } else stopRinging();
    updateUi();
  }

  /* ---------------- banners / notification ---------------- */

  function orderTypeLabel(t) {
    return t === 'dine-in' ? 'Dine-in' : t === 'pickup' ? 'Pick-up' : t === 'delivery' ? 'Delivery' : '';
  }

  function showBanner(d) {
    var title = 'New order' + (d.order_number != null ? ' #' + d.order_number : '') + (d.test ? ' (test)' : '');
    var sub = [d.branch_name, orderTypeLabel(d.order_type)].filter(Boolean).join(' \u00B7 ');

    var el = document.createElement('div');
    el.className = 'oa-banner';

    var icon = document.createElement('span'); icon.className = 'oa-icon'; icon.textContent = '\uD83D\uDECE\uFE0F';
    var text = document.createElement('div'); text.className = 'oa-text';
    var t1 = document.createElement('div'); t1.className = 'oa-title'; t1.textContent = title;
    var t2 = document.createElement('div'); t2.className = 'oa-sub'; t2.textContent = sub || 'A customer just placed an order.';
    text.appendChild(t1); text.appendChild(t2);
    var ok = document.createElement('button'); ok.type = 'button'; ok.textContent = 'Got it';
    ok.addEventListener('click', function () { dismiss(el); });

    el.appendChild(icon); el.appendChild(text); el.appendChild(ok);
    ui.stack.insertBefore(el, ui.stack.firstChild);
    state.banners.push(el);

    while (state.banners.length > MAX_BANNERS) dismiss(state.banners[0]);
  }

  function dismiss(el) {
    var i = state.banners.indexOf(el);
    if (i >= 0) state.banners.splice(i, 1);
    if (el.parentNode) el.parentNode.removeChild(el);
    if (!state.banners.length) { stopRinging(); stopTitleFlash(); }
  }

  function popup(d) {
    if (!('Notification' in window) || Notification.permission !== 'granted' || !document.hidden) return;
    try {
      var n = new Notification('New order' + (d.order_number != null ? ' #' + d.order_number : ''), {
        body: [d.branch_name, orderTypeLabel(d.order_type)].filter(Boolean).join(' \u00B7 ') || 'A customer just placed an order.',
        tag: 'cafe-order-' + (d.order_number != null ? d.order_number : Date.now()),
        requireInteraction: true
      });
      n.onclick = function () { try { window.focus(); } catch (_) {} n.close(); };
    } catch (_) {}
  }

  /* ---------------- ringing + title flash ---------------- */

  function startRinging() {
    chime();
    clearInterval(state.repeatTimer);
    state.repeatCount = 0;
    state.repeatTimer = setInterval(function () {
      if (!state.banners.length || ++state.repeatCount > REPEAT_MAX) { stopRinging(); return; }
      chime();
    }, REPEAT_EVERY_MS);
  }

  function stopRinging() { clearInterval(state.repeatTimer); state.repeatTimer = null; }

  function startTitleFlash() {
    if (!document.hidden || state.titleTimer) return;
    state.baseTitle = document.title;
    var on = false;
    state.titleTimer = setInterval(function () {
      on = !on;
      document.title = on ? '\uD83D\uDD14 New order!' : state.baseTitle;
    }, 1000);
  }

  function stopTitleFlash() {
    if (state.titleTimer) { clearInterval(state.titleTimer); state.titleTimer = null; document.title = state.baseTitle || document.title; }
  }

  /* ---------------- event handling ---------------- */

  function onNewOrder(d) {
    if (!d.test) {
      // The same order is never announced twice (reconnects, duplicate events).
      var key = String(d.order_number) + ':' + String(d.branch_id);
      if (d.order_number != null) {
        if (state.seen[key]) return;
        state.seen[key] = Date.now();
        var keys = Object.keys(state.seen);
        if (keys.length > 200) delete state.seen[keys[0]];
      }

      // A cashier only hears about the branch they signed in to.
      if (MODE === 'cashier') {
        if (!state.branchKnown) return;
        if (d.branch_id != null && String(d.branch_id) !== String(state.branchId)) return;
      }
    }

    showBanner(d);
    startRinging();
    popup(d);
    startTitleFlash();
    try { if (navigator.vibrate) navigator.vibrate([250, 120, 250]); } catch (_) {}
  }

  function connect() {
    if (!state.slug || !window.EventSource) return;
    try {
      state.stream = new EventSource('/api/orders-stream/' + encodeURIComponent(state.slug));
      state.stream.addEventListener('orders', function (e) {
        var data;
        try { data = JSON.parse(e.data); } catch (_) { return; }
        if (data && data.type === 'new-order') onNewOrder(data);
      });
    } catch (_) {}
  }

  /* ---------------- start ---------------- */

  function init() {
    state.slug = detectSlug();
    if (!state.slug) return;
    state.baseTitle = document.title;

    buildUi();

    // Browsers only allow sound after the user has touched the page once.
    document.addEventListener('pointerdown', function () {
      state.lockedBeforeGesture = !audioRunning();
      unlockAudio();
    }, true);
    document.addEventListener('keydown', unlockAudio, true);

    document.addEventListener('visibilitychange', function () { if (!document.hidden) stopTitleFlash(); });
    getCtx();
    connect();
  }

  window.OrderAlerts = {
    // The cashier page tells us which branch the cashier signed in to.
    setBranch: function (id) {
      if (id == null || id === '') return;
      state.branchId = id;
      state.branchKnown = true;
    },
    test: function () { onNewOrder({ type: 'new-order', order_number: 'TEST', branch_name: 'Test branch', order_type: 'dine-in', test: true }); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
