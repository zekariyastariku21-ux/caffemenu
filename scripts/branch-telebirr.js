(function () {
  'use strict';
  var branches = [], selectedId = '', dirty = false, pendingMsg = null;

  function slug() {
    try { if (typeof currentRestaurant !== 'undefined' && currentRestaurant && currentRestaurant.slug) return currentRestaurant.slug; } catch (e) {}
    return (localStorage.getItem('adminRestaurantSlug') || localStorage.getItem('selectedRestaurantSlug') || '').trim();
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function $(id) { return document.getElementById(id); }

  var css = '' +
    '.tb-card{background:#faf6ef;border:1px solid #eadfce;border-radius:14px;padding:18px;margin-top:16px}' +
    '.tb-title{font-weight:700;font-size:18px;color:#5b3a29;margin-bottom:4px}' +
    '.tb-hint{font-size:13px;color:#8a7a6c;margin-bottom:12px}' +
    '.tb-pick label,.tb-field label{display:block;font-size:13px;font-weight:600;color:#5b3a29;margin-bottom:4px}' +
    '.tb-pick select,.tb-field input,.tb-field select,.tb-field textarea{width:100%;box-sizing:border-box;padding:10px;border:1px solid #d9cdbb;border-radius:8px;background:#fff;font-size:14px;font-family:inherit}' +
    '.tb-field textarea{min-height:96px;resize:vertical;font-family:monospace;font-size:12px}' +
    '.tb-form{margin-top:16px;background:#fff;border:1px solid #eadfce;border-radius:12px;padding:16px}' +
    '.tb-top{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding-bottom:12px;border-bottom:1px solid #f0e8da;margin-bottom:14px}' +
    '.tb-top b{font-size:17px;color:#3b2a20;display:block}' +
    '.tb-badge{display:inline-block;margin-top:4px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700}' +
    '.tb-b-on{background:#dff3e6;color:#1f7a3d}.tb-b-off{background:#f3e9d6;color:#8a6a2f}.tb-b-none{background:#eee;color:#666}' +
    '.tb-switch{display:flex;align-items:center;gap:10px;font-weight:600;color:#5b3a29;font-size:14px;cursor:pointer}' +
    '.tb-switch input{position:absolute;opacity:0;width:0;height:0}' +
    '.tb-slider{width:46px;height:26px;border-radius:999px;background:#c9bda9;position:relative;transition:.2s;flex-shrink:0}' +
    '.tb-slider:after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:.2s}' +
    '.tb-switch input:checked + .tb-slider{background:#1f7a3d}' +
    '.tb-switch input:checked + .tb-slider:after{left:23px}' +
    '.tb-sec{font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#8a7a6c;margin:16px 0 8px}' +
    '.tb-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}' +
    '.tb-wide{grid-column:1 / -1}' +
    '.tb-saved{display:inline-block;margin-left:6px;padding:1px 8px;border-radius:999px;background:#dff3e6;color:#1f7a3d;font-size:11px;font-weight:700}' +
    '.tb-check{font-size:13px;margin-top:10px;padding:10px 12px;border-radius:8px;background:#fff6e0;color:#7a5a12}' +
    '.tb-check.ok{background:#e6f5ea;color:#1f7a3d}' +
    '.tb-actions{display:flex;gap:10px;margin-top:16px;flex-wrap:wrap}' +
    '.tb-save{flex:1;min-width:180px;padding:12px;border:0;border-radius:10px;background:#5b3a29;color:#fff;font-weight:700;cursor:pointer;font-size:15px}' +
    '.tb-save:disabled{opacity:.6;cursor:default}' +
    '.tb-clear{padding:12px 14px;border:0;border-radius:10px;background:#d93636;color:#fff;font-weight:600;cursor:pointer}' +
    '.tb-msg{margin-top:10px;font-size:13px;font-weight:600}' +
    '.tb-ok{color:#1f7a3d}.tb-err{color:#c0262d}' +
    '.tb-empty{margin-top:14px;font-size:13px;color:#8a7a6c;text-align:center;padding:18px;border:1px dashed #d9cdbb;border-radius:12px}' +
    '@media(max-width:480px){.tb-grid{grid-template-columns:1fr}}';

  function missing(b) {
    var m = [];
    if (!b.merchant_code) m.push('Short code');
    if (!b.merchant_app_id) m.push('Merchant app ID');
    if (!b.fabric_app_id) m.push('Fabric app ID');
    if (!b.has_app_secret) m.push('App secret');
    if (!b.has_private_key) m.push('Private key');
    if (!b.notify_url) m.push('Notify URL');
    return m;
  }
  function status(b) {
    if (b.enabled && !missing(b).length) return { t: 'Enabled', c: 'tb-b-on' };
    if (b.enabled) return { t: 'Needs setup', c: 'tb-b-off' };
    if (b.has_app_secret || b.has_private_key || b.merchant_code) return { t: 'Disabled', c: 'tb-b-off' };
    return { t: 'Not set up', c: 'tb-b-none' };
  }
  function find(id) {
    for (var i = 0; i < branches.length; i++) if (String(branches[i].branch_id) === String(id)) return branches[i];
    return null;
  }

  function input(f, label, value, type, ph, wide) {
    return '<div class="tb-field' + (wide ? ' tb-wide' : '') + '"><label>' + label + '</label>' +
      '<input data-f="' + f + '" type="' + (type || 'text') + '" value="' + esc(value) + '" placeholder="' + esc(ph || '') + '" autocomplete="off"></div>';
  }

  function formHtml(b) {
    var st = status(b), miss = missing(b);
    return '<div class="tb-top"><div><b>' + esc(b.branch_name) + '</b><span class="tb-badge ' + st.c + '">' + st.t + '</span></div>' +
      '<label class="tb-switch"><input type="checkbox" data-f="enabled"' + (b.enabled ? ' checked' : '') + '><span class="tb-slider"></span>Accept Telebirr</label></div>' +

      '<div class="tb-sec">Checkout payment options</div>' +
      '<label class="tb-switch"><input type="checkbox" data-f="cash_enabled"' + (b.cash_enabled !== false ? ' checked' : '') + '><span class="tb-slider"></span>Cash / pay at the branch</label>' +
      '<div class="tb-hint" style="margin-top:8px">Both on: the customer chooses. Only one on: it is used automatically. At least one must stay on.</div>' +
      '<div class="tb-sec">Merchant</div><div class="tb-grid">' +
      '<div class="tb-field"><label>Environment</label><select data-f="environment">' +
        '<option value="sandbox"' + (b.environment !== 'production' ? ' selected' : '') + '>Sandbox (testing)</option>' +
        '<option value="production"' + (b.environment === 'production' ? ' selected' : '') + '>Production (real money)</option></select></div>' +
      input('merchant_name', 'Merchant name', b.merchant_name, 'text', 'Shown to the customer') +
      input('merchant_code', 'Short code', b.merchant_code, 'text', 'Telebirr short code') +
      input('merchant_app_id', 'Merchant app ID', b.merchant_app_id, 'text', '') +
      '</div>' +

      '<div class="tb-sec">Credentials</div><div class="tb-grid">' +
      input('fabric_app_id', 'Fabric app ID', b.fabric_app_id, 'text', '') +
      '<div class="tb-field"><label>App secret' + (b.has_app_secret ? '<span class="tb-saved">Saved ' + esc(b.app_secret_masked) + '</span>' : '') + '</label>' +
        '<input data-f="app_secret" type="password" autocomplete="new-password" placeholder="' + (b.has_app_secret ? 'Leave blank to keep saved value' : 'Paste app secret') + '"></div>' +
      '<div class="tb-field tb-wide"><label>Private key' + (b.has_private_key ? '<span class="tb-saved">Saved</span>' : '') + '</label>' +
        '<textarea data-f="private_key" placeholder="' + (b.has_private_key ? 'Leave blank to keep saved key. Paste a new key to replace it.' : 'Paste private key') + '"></textarea></div>' +
      '</div>' +

      '<div class="tb-sec">Callback URLs</div><div class="tb-grid">' +
      input('notify_url', 'Notify URL (https)', b.notify_url, 'text', 'https://yourdomain.com/...', true) +
      input('return_url', 'Return URL (https, optional)', b.return_url, 'text', 'https://yourdomain.com/...', true) +
      '</div>' +

      '<div class="tb-check' + (miss.length ? '' : ' ok') + '">' +
        (miss.length ? 'Needed before enabling: ' + esc(miss.join(', ')) : 'All required details are saved.') + '</div>' +

      '<div class="tb-actions"><button type="button" class="tb-save">Save Telebirr settings</button>' +
      ((b.has_app_secret || b.has_private_key) ? '<button type="button" class="tb-clear">Remove saved keys</button>' : '') + '</div>' +
      '<div class="tb-msg" id="tbMsg"></div>';
  }

  function renderSelect() {
    var sel = $('tbSelect'); if (!sel) return;
    var html = '<option value="">Select a branch...</option>';
    branches.forEach(function (b) {
      html += '<option value="' + b.branch_id + '"' + (String(b.branch_id) === String(selectedId) ? ' selected' : '') + '>' +
        esc(b.branch_name) + ' \u2014 ' + status(b).t + '</option>';
    });
    sel.innerHTML = html;
    if (!find(selectedId)) { selectedId = ''; sel.value = ''; }
  }

  function renderForm() {
    var box = $('tbForm'); if (!box) return;
    if (!branches.length) {
      box.innerHTML = '<div class="tb-empty">No branches yet. Add a branch above, click Save Profile, then it appears here.</div>';
      return;
    }
    var b = find(selectedId);
    if (!b) { box.innerHTML = '<div class="tb-empty">Choose a branch to set up or edit its Telebirr payment.</div>'; return; }
    box.innerHTML = '<div class="tb-form">' + formHtml(b) + '</div>';
    if (pendingMsg) { setMsg(pendingMsg.t, pendingMsg.ok); pendingMsg = null; }
  }

  function setMsg(text, ok) {
    var m = $('tbMsg'); if (!m) return;
    m.textContent = text; m.className = 'tb-msg ' + (ok ? 'tb-ok' : 'tb-err');
  }

  function build() {
    if ($('tbTelebirr')) return true;
    var anchor = $('cxContacts') || document.querySelector('.profile-logo-section');
    if (!anchor) return false;
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var wrap = document.createElement('div');
    wrap.id = 'tbTelebirr';
    wrap.innerHTML = '<div class="tb-card"><div class="tb-title">&#128179; Telebirr Payment</div>' +
      '<div class="tb-hint">Each branch has its own Telebirr account. Choose a branch to set it up or edit it. Saved secrets are never shown again.</div>' +
      '<div class="tb-pick"><label for="tbSelect">Branch</label><select id="tbSelect"><option value="">Loading...</option></select></div>' +
      '<div id="tbForm"></div></div>';
    anchor.insertAdjacentElement('afterend', wrap);
    $('tbSelect').addEventListener('change', onPick);
    var f = $('tbForm');
    f.addEventListener('input', function () { dirty = true; });
    f.addEventListener('change', function () { dirty = true; });
    f.addEventListener('click', onClick);
    return true;
  }

  function onPick(e) {
    var next = e.target.value;
    if (dirty && !confirm('You have unsaved changes for this branch. Switch anyway?')) {
      e.target.value = selectedId; return;
    }
    dirty = false; selectedId = next; renderForm();
  }

  function collect() {
    var body = {};
    document.querySelectorAll('#tbForm [data-f]').forEach(function (el) {
      body[el.getAttribute('data-f')] = el.type === 'checkbox' ? el.checked : el.value;
    });
    return body;
  }

  function send(extra, doneText) {
    var s = slug(); if (!s) { setMsg('Cafe not found. Reload the page.', false); return; }
    var id = selectedId; if (!id) return;
    var body = collect();
    Object.keys(extra || {}).forEach(function (k) { body[k] = extra[k]; });
    var btn = document.querySelector('#tbForm .tb-save');
    if (btn) btn.disabled = true;
    setMsg('Saving...', true);
    fetch('/api/admin/telebirr/' + encodeURIComponent(s) + '/' + encodeURIComponent(id), {
      method: 'PUT', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (!d || !d.ok) { if (btn) btn.disabled = false; setMsg((d && d.message) || 'Could not save.', false); return; }
      dirty = false;
      pendingMsg = { t: doneText || 'Saved.', ok: true };
      load();
    }).catch(function () { if (btn) btn.disabled = false; setMsg('Could not save.', false); });
  }

  function onClick(e) {
    if (e.target.closest('.tb-save')) send({}, 'Saved.');
    else if (e.target.closest('.tb-clear')) {
      if (confirm('Remove the saved app secret and private key for this branch? Telebirr will be turned off.')) {
        send({ clear_secrets: true }, 'Keys removed. Telebirr is off.');
      }
    }
  }

  function load() {
    var s = slug(); if (!s) return;
    fetch('/api/admin/telebirr/' + encodeURIComponent(s), { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.ok) return;
        branches = d.branches || [];
        renderSelect();
        renderForm();
      })
      .catch(function (e) { console.error('[telebirr] load failed', e); });
  }

  function init() {
    build();
    var open = $('profileBtn'), saveBtn = $('profileSaveBtn');
    if (open) open.addEventListener('click', function () { build(); if (!dirty) load(); });
    // New branches are created by the Profile save; refresh the list shortly after.
    if (saveBtn) saveBtn.addEventListener('click', function () { setTimeout(function () { if (!dirty) load(); }, 1500); });
    load();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
