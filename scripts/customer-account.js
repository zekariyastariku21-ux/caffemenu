/* ==========================================================================
   CUSTOMER ACCOUNT  (log in / create account with SMS code, order tracking)
   Works together with scripts/saveAdd.js through window.CustomerAccount.
   ========================================================================== */
(function () {
  'use strict';

  var pathSlug = location.pathname.split('/').filter(Boolean)[0];
  var SLUG = ((pathSlug && pathSlug !== 'save.html' ? pathSlug : '') ||
    (function () { try { return localStorage.getItem('selectedRestaurantSlug') || ''; } catch (_) { return ''; } })()
  ).trim();

  var TOKEN_KEY = 'cafeCustomerToken:' + SLUG;
  var PROFILE_KEY = 'cafeCustomerProfile:' + SLUG;

  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (_) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (_) {} }
  };
  function parseJson(text) { try { return text ? JSON.parse(text) : null; } catch (_) { return null; } }

  var STEPS = [
    { key: 'pending', label: 'Received', at: 'created_at' },
    { key: 'preparing', label: 'Preparing', at: 'preparing_at' },
    { key: 'ready', label: 'Ready', at: 'ready_at' },
    { key: 'completed', label: 'Completed', at: 'completed_at' }
  ];

  var state = {
    enabled: false,
    token: store.get(TOKEN_KEY) || '',
    customer: parseJson(store.get(PROFILE_KEY)),
    orders: [],
    ordersLoaded: false,
    view: null,                // null | 'auth' | 'account'
    tab: 'active',             // 'active' | 'history'
    auth: { mode: 'login', step: 'details', channel: '', phone: '', name: '', code: '', devOtp: '', resendAt: 0, busy: false, error: '', info: '' },
    pending: null,             // callback to run after a successful login
    channels: null,            // ways a code can be sent: [] | ['sms'] | ['sms','whatsapp'] (null = not loaded yet)
    channelsLoading: false,
    stream: null,
    poll: null,
    refreshTimer: null,
    tick: null
  };

  var el = {};   // DOM references

  /* ---------------- small helpers ---------------- */


  function h(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === false || v == null) return;
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = v;
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v === true ? '' : v);
      });
    }
    (children || []).forEach(function (c) {
      if (c == null || c === false) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function money(v) { return (Math.round((Number(v) || 0) * 100) / 100) + ' ETB'; }

  function when(v) {
    if (!v) return '';
    var d = new Date(v);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  function toast(message, type) {
    if (typeof window.showToast === 'function') { try { window.showToast(message, type || 'success'); return; } catch (_) {} }
    var t = h('div', { class: 'ca-toast', role: 'status', text: message });
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3200);
  }

  function api(path, options) {
    var opts = options || {};
    var headers = { Accept: 'application/json' };
    if (opts.body) headers['Content-Type'] = 'application/json';
    if (state.token && !opts.noAuth) headers.Authorization = 'Bearer ' + state.token;

    return fetch('/api/customer/' + encodeURIComponent(SLUG) + path, {
      method: opts.method || 'GET',
      headers: headers,
      cache: 'no-store',
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (data) {
        if (!response.ok || data.ok !== true) {
          var err = new Error(data.message || 'Something went wrong. Please try again.');
          err.status = response.status;
          err.code = data.code || '';
          throw err;
        }
        return data;
      });
    });
  }

  /* ---------------- session ---------------- */

  function isLoggedIn() { return !!(state.token && state.customer); }

  function saveSession(token, customer) {
    state.token = token;
    state.customer = customer;
    store.set(TOKEN_KEY, token);
    store.set(PROFILE_KEY, JSON.stringify(customer));
  }

  function clearSession() {
    state.token = '';
    state.customer = null;
    state.orders = [];
    state.ordersLoaded = false;
    store.del(TOKEN_KEY);
    store.del(PROFILE_KEY);
    stopLive();
  }

  function logout() {
    clearSession();
    closeOverlay();
    renderButton();
    toast('You are logged out.');
  }

  /* ---------------- header button ---------------- */

  function activeOrders() {
    return state.orders.filter(function (o) {
      var status = String(o.status || '').toLowerCase();
      return status !== 'completed' && status !== 'deleted';
    });
  }

  function renderButton() {
    if (!el.button) return;
    el.button.hidden = !state.enabled;
    if (el.bar) el.bar.hidden = !state.enabled;
    el.button.replaceChildren();

    if (isLoggedIn()) {
      var first = String(state.customer.full_name || '').split(' ')[0] || 'Account';
      el.button.appendChild(h('span', { class: 'ca-btn-icon', 'aria-hidden': 'true', text: '\u{1F464}' }));
      el.button.appendChild(h('span', { class: 'ca-btn-label notranslate', translate: 'no', text: first }));
      var n = activeOrders().length;
      if (n > 0) el.button.appendChild(h('span', { class: 'ca-badge', 'aria-label': n + ' active order(s)', text: String(n) }));
      el.button.setAttribute('aria-label', 'My account');
    } else {
      el.button.appendChild(h('span', { class: 'ca-btn-icon', 'aria-hidden': 'true', text: '\u{1F464}' }));
      el.button.appendChild(h('span', { class: 'ca-btn-label', text: 'Log in' }));
      el.button.setAttribute('aria-label', 'Log in or create account');
    }
    placeButton();
  }

  // The language selector in this menu is pinned (position:absolute) to the top-right
  // corner of the header. Preferred spot for the button: far right of the logo / name
  // row, just under the selector. If the row is too short for that (small phones), put
  // it right beside the selector instead. Either way the cafe name never goes under it.
  function placeButton() {
    var btn = el.button;
    var row = btn && btn.parentElement;
    if (!btn || !row || !row.classList.contains('menu-brand-row')) return;

    // 1) start from the normal in-row position
    btn.classList.remove('ca-btn-abs');
    btn.style.top = btn.style.right = btn.style.height = '';
    row.classList.remove('ca-reserve');
    row.style.removeProperty('--ca-reserve');
    if (btn.hidden) return;

    var lang = document.getElementById('customerLanguageControl');
    var cs = lang ? window.getComputedStyle(lang) : null;
    if (!lang || cs.position !== 'absolute' || !lang.offsetWidth) return;   // nothing to avoid

    var b = btn.getBoundingClientRect();
    var l = lang.getBoundingClientRect();
    var clash = !(b.right <= l.left - 4 || b.left >= l.right + 4 || b.bottom <= l.top - 4 || b.top >= l.bottom + 4);
    if (!clash) return;                                                    // fits under the selector

    // 2) not enough room: sit beside the selector, same height
    btn.classList.add('ca-btn-abs');
    btn.style.top = cs.top;
    btn.style.right = ((parseFloat(cs.right) || 0) + lang.offsetWidth + 8) + 'px';
    btn.style.height = Math.max(26, lang.offsetHeight) + 'px';

    var info = row.querySelector('.menu-brand-info');
    row.style.setProperty('--ca-reserve', '0px');
    row.classList.add('ca-reserve');
    if (info) {
      var need = Math.ceil(info.getBoundingClientRect().right - btn.getBoundingClientRect().left + 8);
      row.style.setProperty('--ca-reserve', Math.max(0, need) + 'px');
    }
  }

  function buildButton() {
    el.button = h('button', { type: 'button', class: 'ca-btn', id: 'customerAccountBtn', hidden: true, onclick: onButtonClick });

    // Same row as the logo and cafe name, at the far right.
    var row = document.querySelector('header.menu-profile-header .menu-brand-row');
    if (row) {
      row.appendChild(el.button);
      window.addEventListener('resize', placeButton);
      if (window.ResizeObserver) {
        try { new ResizeObserver(placeButton).observe(el.button); } catch (_) {}
      }
    } else {
      // Fallback if the header layout is not found: small floating button.
      el.bar = h('div', { class: 'ca-bar ca-bar-floating', hidden: true }, [el.button]);
      document.body.appendChild(el.bar);
    }
    renderButton();
  }

  function onButtonClick() {
    if (isLoggedIn()) openAccount('active');
    else openAuth('login');
  }

  /* ---------------- overlay shell ---------------- */

  function buildOverlay() {
    el.card = h('section', { class: 'ca-card', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Customer account' });
    el.overlay = h('div', { class: 'ca-overlay', hidden: true }, [el.card]);
    el.overlay.addEventListener('mousedown', function (e) { if (e.target === el.overlay) closeOverlay(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && state.view) closeOverlay(); });
    document.body.appendChild(el.overlay);
  }

  function showOverlay() {
    el.overlay.hidden = false;
    document.body.classList.add('ca-lock');
  }

  function closeOverlay() {
    state.view = null;
    state.pending = null;
    clearInterval(state.tick);
    if (el.overlay) el.overlay.hidden = true;
    document.body.classList.remove('ca-lock');
  }

  function closeButton() {
    return h('button', { type: 'button', class: 'ca-close', 'aria-label': 'Close', onclick: closeOverlay, text: '\u00D7' });
  }

  /* ---------------- login / sign-up ---------------- */

  function openAuth(mode, notice) {
    state.view = 'auth';
    loadChannels();
    state.auth = {
      mode: mode === 'signup' || mode === 'reset' ? mode : 'login',
      step: 'details', channel: '', phone: '', name: '', password: '', confirm: '', showPw: false,
      code: '', devOtp: '', resendAt: 0, busy: false, sending: '', error: '', info: notice || ''
    };
    renderAuth();
    showOverlay();
    setTimeout(function () {
      var first = el.card.querySelector('input');
      if (first) first.focus();
    }, 30);
  }

  function setAuth(patch) {
    Object.keys(patch).forEach(function (k) { state.auth[k] = patch[k]; });
    renderAuth();
  }

  function renderAuth() {
    if (state.view !== 'auth') return;
    clearInterval(state.tick);
    var a = state.auth;
    var body = a.step === 'code' ? codeStep(a) : detailsStep(a);
    el.card.replaceChildren(closeButton(), body);
  }

  var CHANNEL_LABEL = { sms: 'SMS', whatsapp: 'WhatsApp' };
  var PASSWORD_MIN = 8;

  function loadChannels() {
    if (state.channels !== null || state.channelsLoading) return;
    state.channelsLoading = true;
    api('/otp-options', { noAuth: true })
      .then(function (d) { state.channels = Array.isArray(d.channels) ? d.channels : []; })
      .catch(function () { state.channels = []; })
      .then(function () {
        state.channelsLoading = false;
        var typing = document.activeElement && el.card && el.card.contains(document.activeElement) && document.activeElement.tagName === 'INPUT';
        if (state.view === 'auth' && state.auth.step === 'details' && state.auth.mode !== 'login' && !typing) renderAuth();
      });
  }

  /* ----- form pieces ----- */

  function field(id, label, attrs) {
    return [h('label', { for: id, text: label }), h('input', Object.assign({ id: id, required: true }, attrs))];
  }

  function passwordFields(a, isNew) {
    var type = a.showPw ? 'text' : 'password';
    var out = field('caPassword', isNew ? (a.mode === 'reset' ? 'New password' : 'Password') : 'Password', {
      type: type, autocomplete: isNew ? 'new-password' : 'current-password', maxlength: '100',
      placeholder: isNew ? 'At least ' + PASSWORD_MIN + ' characters' : 'Your password', value: a.password,
      oninput: function (e) { a.password = e.target.value; }
    });
    if (isNew) {
      out = out.concat(field('caConfirm', 'Confirm password', {
        type: type, autocomplete: 'new-password', maxlength: '100', placeholder: 'Type it again', value: a.confirm,
        oninput: function (e) { a.confirm = e.target.value; }
      }));
    }
    out.push(h('button', {
      type: 'button', class: 'ca-link ca-showpw', 'aria-pressed': String(!!a.showPw),
      onclick: function () { setAuth({ showPw: !a.showPw }); setTimeout(function () { var i = el.card.querySelector('#caPassword'); if (i) i.focus(); }, 20); },
      text: a.showPw ? 'Hide password' : 'Show password'
    }));
    return out;
  }

  function passwordProblem(a) {
    if (String(a.password || '').length < PASSWORD_MIN) return 'Password must be at least ' + PASSWORD_MIN + ' characters.';
    if (a.password !== a.confirm) return 'Passwords do not match.';
    return '';
  }

  function messages(a) {
    return [
      a.info ? h('p', { class: 'ca-info', role: 'status', text: a.info }) : null,
      a.error ? h('p', { class: 'ca-error', role: 'alert', text: a.error }) : null
    ];
  }

  function detailsStep(a) {
    var mode = a.mode;
    var phoneInput = field('caPhone', 'Phone number', {
      type: 'tel', inputmode: 'tel', autocomplete: mode === 'login' ? 'username' : 'tel', maxlength: '20',
      placeholder: '09XXXXXXXX', value: a.phone, oninput: function (e) { a.phone = e.target.value; }
    });

    var kids, onSubmit, title, sub;

    if (mode === 'login') {
      title = 'Log in';
      sub = 'Welcome back. Log in with your phone number and password.';
      onSubmit = doLogin;
      kids = [].concat(phoneInput, passwordFields(a, false), messages(a), [
        h('button', { type: 'submit', class: 'ca-primary', disabled: a.busy, text: a.busy ? 'Logging in...' : 'Log in' }),
        h('div', { class: 'ca-row' }, [
          h('button', { type: 'button', class: 'ca-link', onclick: function () { setAuth({ mode: 'reset', password: '', confirm: '', error: '', info: '' }); }, text: 'Forgot password?' })
        ])
      ]);
    } else if (mode === 'signup') {
      title = 'Create your account';
      sub = 'Sign up once to order and track your orders.';
      onSubmit = function () { sendCode(false); };
      kids = [].concat(
        field('caName', 'Full name', { type: 'text', autocomplete: 'name', maxlength: '120', placeholder: 'Your full name', value: a.name, oninput: function (e) { a.name = e.target.value; } }),
        phoneInput, passwordFields(a, true),
        [h('p', { class: 'ca-hint', text: channelHint() })], messages(a), [sendButtons(a)]
      );
    } else {
      title = 'Reset your password';
      sub = 'Enter your phone number and a new password. We will send a code to confirm it is you.';
      onSubmit = function () { sendCode(false); };
      kids = [].concat(
        phoneInput, passwordFields(a, true),
        [h('p', { class: 'ca-hint', text: channelHint() })], messages(a), [sendButtons(a)],
        [h('div', { class: 'ca-row' }, [
          h('button', { type: 'button', class: 'ca-link', onclick: function () { setAuth({ mode: 'login', password: '', confirm: '', error: '', info: '' }); }, text: '\u2039 Back to log in' })
        ])]
      );
    }

    var form = h('form', { class: 'ca-form', novalidate: true, onsubmit: function (e) { e.preventDefault(); onSubmit(); } }, kids);

    var nodes = [h('h2', { class: 'ca-title', text: title }), h('p', { class: 'ca-sub', text: sub })];
    if (mode !== 'reset') {
      var signup = mode === 'signup';
      nodes.push(h('div', { class: 'ca-switch', role: 'tablist' }, [
        h('button', { type: 'button', role: 'tab', 'aria-selected': String(!signup), class: signup ? '' : 'on', onclick: function () { setAuth({ mode: 'login', error: '', info: '' }); }, text: 'Log in' }),
        h('button', { type: 'button', role: 'tab', 'aria-selected': String(signup), class: signup ? 'on' : '', onclick: function () { setAuth({ mode: 'signup', error: '', info: '' }); }, text: 'Create account' })
      ]));
    }
    nodes.push(form);
    return h('div', null, nodes);
  }

  function channelHint() {
    var ch = state.channels || [];
    if (ch.length > 1) return 'We will confirm your phone number. Choose how you want to receive your 6-digit code.';
    if (ch.length === 1) return 'We will send a 6-digit code by ' + CHANNEL_LABEL[ch[0]] + ' to confirm your phone number.';
    return 'We will send you a 6-digit code to confirm your phone number.';
  }

  function sendButtons(a) {
    var ch = state.channels || [];
    var wrap = h('div', { class: 'ca-send' });
    if (ch.length === 0) {
      wrap.appendChild(h('button', { type: 'submit', class: 'ca-primary', disabled: a.busy, text: a.busy ? 'Sending...' : 'Send code' }));
      return wrap;
    }
    ch.forEach(function (c, i) {
      var busyThis = a.busy && a.sending === c;
      wrap.appendChild(h('button', {
        type: i === 0 ? 'submit' : 'button',
        class: 'ca-primary ca-ch-' + c,
        disabled: a.busy,
        onclick: i === 0 ? null : function () { sendCode(false, c); },
        text: busyThis ? 'Sending...' : 'Send code by ' + CHANNEL_LABEL[c]
      }));
    });
    return wrap;
  }

  function codeStep(a) {
    var codeInput = h('input', {
      id: 'caCode', type: 'text', inputmode: 'numeric', autocomplete: 'one-time-code',
      maxlength: '6', pattern: '[0-9]*', placeholder: '------', class: 'ca-code notranslate', translate: 'no', value: a.code || '',
      oninput: function (e) {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
        a.code = e.target.value;
        if (e.target.value.length === 6 && !a.busy) verifyCode(e.target.value);
      }
    });

    var resend = h('button', { type: 'button', class: 'ca-link', id: 'caResend', onclick: function () { sendCode(true, a.channel); } });
    var others = (state.channels || []).filter(function (c) { return c !== a.channel; });
    var switchBtns = others.map(function (c) {
      return h('button', { type: 'button', class: 'ca-link ca-switch-channel', disabled: a.busy, onclick: function () { sendCode(true, c); }, text: 'Send by ' + CHANNEL_LABEL[c] + ' instead' });
    });

    function paintResend() {
      var left = Math.max(0, Math.ceil((a.resendAt - Date.now()) / 1000));
      resend.disabled = left > 0 || a.busy;
      switchBtns.forEach(function (b) { b.disabled = left > 0 || a.busy; });
      resend.textContent = left > 0 ? 'Resend code in ' + left + 's' : 'Resend code';
    }
    paintResend();
    state.tick = setInterval(paintResend, 1000);

    var submitText = a.busy ? 'Checking...' : (a.mode === 'signup' ? 'Confirm & create account' : 'Confirm & set new password');

    var form = h('form', { class: 'ca-form', novalidate: true, onsubmit: function (e) { e.preventDefault(); verifyCode(codeInput.value); } }, [
      h('label', { for: 'caCode', text: '6-digit code' }),
      codeInput,
      a.devOtp ? h('p', { class: 'ca-dev', text: 'Test mode code: ' + a.devOtp }) : null,
      a.info ? h('p', { class: 'ca-info', role: 'status', text: a.info }) : null,
      a.error ? h('p', { class: 'ca-error', role: 'alert', text: a.error }) : null,
      h('button', { type: 'submit', class: 'ca-primary', disabled: a.busy, text: submitText }),
      h('div', { class: 'ca-row' }, [
        resend,
        h('button', { type: 'button', class: 'ca-link', onclick: function () { setAuth({ step: 'details', error: '', info: '', devOtp: '', code: '' }); }, text: 'Change number' })
      ]),
      switchBtns.length ? h('div', { class: 'ca-row' }, switchBtns) : null
    ]);

    setTimeout(function () { codeInput.focus(); }, 30);

    return h('div', null, [
      h('h2', { class: 'ca-title', text: 'Confirm your phone number' }),
      h('p', { class: 'ca-sub' }, [
        a.channel === 'whatsapp' ? 'We sent a code to your WhatsApp ' : (a.channel === 'sms' ? 'We sent a code by SMS to ' : 'We sent a code to '),
        h('strong', { class: 'notranslate', translate: 'no', text: a.phone }), '.'
      ]),
      form
    ]);
  }

  /* ----- actions ----- */

  // Shared by password log-in and by the OTP steps (sign-up / reset).
  function finishLogin(data) {
    saveSession(data.token, data.customer);
    var cb = state.pending;
    state.pending = null;
    state.auth.password = state.auth.confirm = '';
    closeOverlay();
    renderButton();
    startLive();
    loadOrders().then(function () {
      toast(data.message || 'You are logged in.');
      if (typeof cb === 'function') cb();
      else openAccount('active');
    });
  }

  function doLogin() {
    var a = state.auth;
    if (a.busy) return;
    var phone = String(a.phone || '').trim();
    if (!phone) { setAuth({ error: 'Enter your phone number.', info: '' }); return; }
    if (!a.password) { setAuth({ error: 'Enter your password.', info: '' }); return; }

    setAuth({ busy: true, error: '', info: '' });

    api('/login', { method: 'POST', noAuth: true, body: { phone: phone, password: a.password } })
      .then(finishLogin)
      .catch(function (err) {
        if (err.code === 'self_ordering_disabled') { setEnabled(false); return; }
        var patch = { busy: false, error: err.message, info: '', password: '' };
        if (err.code === 'password_not_set') { patch.mode = 'reset'; patch.error = ''; patch.info = 'Your account needs a password. Choose one below and we will confirm your number by code.'; }
        setAuth(patch);
        var input = el.card.querySelector('#caPassword');
        if (input) input.focus();
      });
  }

  function sendCode(isResend, channel) {
    var a = state.auth;
    if (a.busy) return;
    var chosen = channel || a.channel || (state.channels && state.channels[0]) || '';

    var phone = String(a.phone || '').trim();
    var name = String(a.name || '').replace(/\s+/g, ' ').trim();

    if (a.mode === 'signup' && name.length < 2) { setAuth({ error: 'Enter your full name.', info: '' }); return; }
    if (!phone) { setAuth({ error: 'Enter your phone number.', info: '' }); return; }
    var problem = passwordProblem(a);
    if (problem) { setAuth({ error: problem, info: '' }); return; }

    setAuth({ busy: true, sending: chosen, error: '', info: '' });

    var payload = { mode: a.mode, full_name: name, phone: phone, password: a.password, confirm_password: a.confirm };
    if (chosen) payload.channel = chosen;

    api('/request-otp', { method: 'POST', noAuth: true, body: payload })
      .then(function (data) {
        setAuth({
          busy: false, step: 'code', phone: data.phone || phone, name: name,
          channel: data.channel === 'sms' || data.channel === 'whatsapp' ? data.channel : '',
          devOtp: data.dev_otp || '',
          resendAt: Date.now() + (Number(data.resend_in) || 45) * 1000,
          info: isResend ? 'A new code was sent.' : '', error: ''
        });
        if (Array.isArray(data.channels)) state.channels = data.channels;
      })
      .catch(function (err) {
        var patch = { busy: false, error: err.message, info: '' };
        // Friendly redirects between the modes
        if (err.code === 'account_exists') { patch.mode = 'login'; patch.error = ''; patch.password = ''; patch.confirm = ''; patch.info = 'This number already has an account. Log in with your password, or tap "Forgot password?".'; }
        if (err.code === 'account_not_found') { patch.mode = 'signup'; patch.error = ''; patch.info = 'No account for this number yet. Fill in the form to create one.'; }
        if (err.code === 'self_ordering_disabled') { setEnabled(false); return; }
        setAuth(patch);
      });
  }

  function verifyCode(code) {
    var a = state.auth;
    if (a.busy) return;
    code = String(code || '').replace(/\D/g, '');
    if (code.length !== 6) { setAuth({ error: 'Enter the 6-digit code.' }); return; }

    setAuth({ busy: true, error: '', info: '' });

    api('/verify-otp', { method: 'POST', noAuth: true, body: { mode: a.mode, phone: a.phone, code: code } })
      .then(finishLogin)
      .catch(function (err) {
        if (err.code === 'self_ordering_disabled') { setEnabled(false); return; }
        setAuth({ busy: false, error: err.message, info: '', code: '' });
      });
  }

  /* ---------------- account panel ---------------- */

  function openAccount(tab) {
    if (!isLoggedIn()) { openAuth('login'); return; }
    state.view = 'account';
    state.tab = tab === 'history' ? 'history' : 'active';
    renderAccount();
    showOverlay();
    loadOrders();
  }

  function trackerFor(order) {
    var status = String(order.status || 'pending').toLowerCase();
    if (status === 'deleted') {
      return h('div', { class: 'ca-track ca-track-deleted', role: 'status' }, [
        h('p', { class: 'ca-track-note', text: 'Your order has been deleted by the cafe.' })
      ]);
    }

    var index = 0;
    STEPS.forEach(function (s, i) { if (s.key === status) index = i; });

    var note = {
      pending: 'We received your order and are waiting for the cafe to start it.',
      preparing: 'Your order is being prepared.',
      ready: order.order_type === 'delivery' ? 'Your order is ready and on its way.' :
        (order.order_type === 'pickup' ? 'Your order is ready for pick-up.' : 'Your order is ready.'),
      completed: 'This order is complete.'
    }[status] || '';

    var list = h('ol', { class: 'ca-steps' }, STEPS.map(function (s, i) {
      var cls = i < index ? 'done' : (i === index ? 'current' : '');
      return h('li', { class: cls }, [
        h('span', { class: 'ca-dot', 'aria-hidden': 'true' }),
        h('span', { class: 'ca-step-label', text: s.label }),
        h('span', { class: 'ca-step-time', text: i <= index ? when(order[s.at]) : '' })
      ]);
    }));

    return h('div', { class: 'ca-track' }, [list, note ? h('p', { class: 'ca-track-note', text: note }) : null]);
  }

  function orderCard(order, withTracker) {
    var status = String(order.status || 'pending').toLowerCase();
    var items = (Array.isArray(order.items) ? order.items : []).map(function (item) {
      var qty = Number(item.quantity != null ? item.quantity : item.qty) || 1;
      var price = Number(item.price != null ? item.price : item.unit_price) || 0;
      var extras = Array.isArray(item.extras)
        ? item.extras.filter(function (extra) {
          return extra && typeof extra === 'object';
        })
        : [];
      var extrasTotal = extras.reduce(function (total, extra) {
        return total + (Number(extra.price) || 0) * (Number(extra.quantity) || 0);
      }, 0);
      var basePrice = item.base_price != null
        ? Number(item.base_price) || 0
        : Math.max(0, price - extrasTotal);
      var customization = [];
      if (Array.isArray(item.removedIngredients)) {
        customization = customization.concat(item.removedIngredients);
      }
      if (Array.isArray(item.adjustments)) {
        customization = customization.concat(item.adjustments);
      }
      if (extras.length) {
        customization = customization.concat(extras.map(function (extra) {
          return String(extra.name || '') +
            (Number(extra.quantity) > 1 ? ' x' + extra.quantity : '');
        }));
      }
      return h('li', null, [
        h('div', { class: 'ca-item-row' }, [
          h('span', { text: String(item.name || '') }),
          h('span', { text: money(basePrice * qty) })
        ]),
        ...extras.map(function (extra) {
          return h('div', { class: 'ca-item-row ca-item-extra' }, [
            h('span', { text: '+ ' + String(extra.name || '') }),
            h('span', {
              text: money(
                (Number(extra.price) || 0) *
                (Number(extra.quantity) || 0) *
                qty
              )
            })
          ]);
        }),
        h('div', { class: 'ca-item-note', text: 'Qty: ' + qty + ' - ' + money(basePrice) + ' each' }),
        customization.length ? h('div', { class: 'ca-item-note', text: customization.join(', ') }) : null,
        item.note ? h('div', { class: 'ca-item-note', text: 'Note: ' + item.note }) : null
      ]);
    });

    var where = [order.branch_name, order.order_type === 'dine-in' ? 'Dine-in' : (order.order_type === 'pickup' ? 'Pick-up' : 'Delivery')];
    if (order.table_number) where.push('Table ' + order.table_number);

    return h('article', { class: 'ca-order ca-status-' + status }, [
      h('div', { class: 'ca-order-head' }, [
        h('strong', { text: 'Order #' + (order.display_number != null ? order.display_number : order.id) }),
        h('span', { class: 'ca-pill', text: status === 'deleted' ? 'Deleted' : status.charAt(0).toUpperCase() + status.slice(1) })
      ]),
      h('p', { class: 'ca-order-meta', text: when(order.created_at) }),
      status === 'deleted' && order.removed_at
        ? h('p', { class: 'ca-order-meta', text: 'Deleted: ' + when(order.removed_at) })
        : null,
      h('p', { class: 'ca-order-meta', text: where.filter(Boolean).join(' \u00B7 ') }),
      order.customer_address ? h('p', { class: 'ca-order-meta', text: 'Address: ' + order.customer_address }) : null,
      withTracker ? trackerFor(order) : null,
      h('ul', { class: 'ca-items' }, items),
      h('div', { class: 'ca-total' }, [h('span', { text: 'Total' }), h('strong', { text: money(order.total) })])
    ]);
  }

  function renderAccount() {
    if (state.view !== 'account') return;
    var c = state.customer || {};
    var active = activeOrders();
    var past = state.orders.filter(function (o) {
      var status = String(o.status || '').toLowerCase();
      return status === 'completed' || status === 'deleted';
    });

    var list;
    if (!state.ordersLoaded) {
      list = h('p', { class: 'ca-empty', text: 'Loading your orders...' });
    } else if (state.tab === 'active') {
      list = active.length
        ? h('div', null, active.map(function (o) { return orderCard(o, true); }))
        : h('p', { class: 'ca-empty', text: 'You have no active orders right now.' });
    } else {
      list = past.length
        ? h('div', null, past.map(function (o) { return orderCard(o, false); }))
        : h('p', { class: 'ca-empty', text: 'Your completed orders will appear here.' });
    }

    var scrollBox = el.card.querySelector('.ca-scroll');
    var previousScroll = scrollBox ? scrollBox.scrollTop : 0;

    el.card.replaceChildren(
      closeButton(),
      h('div', { class: 'ca-profile' }, [
        h('div', { class: 'ca-avatar', 'aria-hidden': 'true', text: String(c.full_name || '?').trim().charAt(0).toUpperCase() }),
        h('div', { class: 'ca-profile-text' }, [
          h('strong', { class: 'notranslate', translate: 'no', text: c.full_name || '' }),
          h('span', { class: 'notranslate', translate: 'no', text: c.phone || '' })
        ]),
        h('button', { type: 'button', class: 'ca-logout', onclick: logout, text: 'Log out' })
      ]),
      h('div', { class: 'ca-switch', role: 'tablist' }, [
        h('button', { type: 'button', role: 'tab', 'aria-selected': String(state.tab === 'active'), class: state.tab === 'active' ? 'on' : '', onclick: function () { state.tab = 'active'; renderAccount(); },
          text: 'Current order' + (active.length ? ' (' + active.length + ')' : '') }),
        h('button', { type: 'button', role: 'tab', 'aria-selected': String(state.tab === 'history'), class: state.tab === 'history' ? 'on' : '', onclick: function () { state.tab = 'history'; renderAccount(); },
          text: 'Order history' })
      ]),
      h('div', { class: 'ca-scroll' }, [list])
    );

    var nextScroll = el.card.querySelector('.ca-scroll');
    if (nextScroll) nextScroll.scrollTop = previousScroll;
  }

  /* ---------------- orders + live updates ---------------- */

  function loadOrders() {
    if (!isLoggedIn()) return Promise.resolve();
    return api('/orders')
      .then(function (data) {
        var previousOrders = Object.create(null);
        state.orders.forEach(function (order) {
          previousOrders[String(order.id)] = String(order.status || '').toLowerCase();
        });
        var orders = data.orders || [];
        if (state.ordersLoaded) {
          orders.forEach(function (order) {
            if (
              String(order.status || '').toLowerCase() === 'deleted' &&
              previousOrders[String(order.id)] &&
              previousOrders[String(order.id)] !== 'deleted'
            ) {
              toast('Your order has been deleted by the cafe.', 'error');
            }
          });
        }
        state.orders = orders;
        state.ordersLoaded = true;
        renderButton();
        renderAccount();
      })
      .catch(function (err) {
        if (err.status === 401) { handleUnauthorized(); return; }
        if (err.code === 'self_ordering_disabled') { setEnabled(false); return; }
        state.ordersLoaded = true;
        renderAccount();
      });
  }

  function scheduleRefresh() {
    clearTimeout(state.refreshTimer);
    state.refreshTimer = setTimeout(loadOrders, 400);
  }

  function startLive() {
    stopLive();
    if (!isLoggedIn() || !state.enabled) return;

    try {
      if (window.EventSource) {
        state.stream = new EventSource('/api/orders-stream/' + encodeURIComponent(SLUG));
        state.stream.addEventListener('orders', scheduleRefresh);
      }
    } catch (_) {}

    // Safety net in case the live connection drops.
    state.poll = setInterval(function () {
      if (document.hidden) return;
      if (state.view === 'account' || activeOrders().length) loadOrders();
    }, 20000);
  }

  function stopLive() {
    if (state.stream) { try { state.stream.close(); } catch (_) {} state.stream = null; }
    clearInterval(state.poll); state.poll = null;
    clearTimeout(state.refreshTimer);
  }

  function handleUnauthorized(callback) {
    var wasOpen = !!state.view;
    clearSession();
    renderButton();
    if (wasOpen || typeof callback === 'function') {
      openAuth('login', 'Your session expired. Please log in again.');
      if (typeof callback === 'function') state.pending = callback;
    }
  }

  /* ---------------- self-ordering switch ---------------- */

  function setEnabled(value) {
    state.enabled = !!value;
    if (!state.enabled) {
      state.pending = null;
      closeOverlay();
      stopLive();
    } else {
      loadChannels();
      if (isLoggedIn()) { startLive(); loadOrders(); }
    }
    renderButton();
  }

  /* ---------------- hooks used by saveAdd.js ---------------- */

  function requireLogin(callback) {
    state.pending = typeof callback === 'function' ? callback : null;
    openAuth('login', 'Log in or create an account to place your order.');
  }

  function prefillOrderForm() {
    if (!isLoggedIn()) return;
    var name = document.getElementById('orderCustomerName');
    var phone = document.getElementById('orderCustomerPhone');
    if (name) { name.value = state.customer.full_name || ''; name.readOnly = true; }
    if (phone) { phone.value = state.customer.phone || ''; phone.readOnly = true; }
  }

  function onOrderPlaced() {
    loadOrders().then(function () { openAccount('active'); });
  }

  window.CustomerAccount = {
    isLoggedIn: isLoggedIn,
    authHeader: function () { return state.token ? { Authorization: 'Bearer ' + state.token } : {}; },
    requireLogin: requireLogin,
    setEnabled: setEnabled,
    prefillOrderForm: prefillOrderForm,
    onOrderPlaced: onOrderPlaced,
    handleUnauthorized: handleUnauthorized,
    openAccount: openAccount
  };

  /* ---------------- start ---------------- */

  function init() {
    if (!SLUG) return;
    buildButton();
    buildOverlay();
    // The button stays hidden until saveAdd.js reports that self-ordering is enabled.
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
