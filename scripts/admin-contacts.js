(function () {
  'use strict';
  var state = { central_phones: [], branches: [] };

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
  function val(id) { var el = $(id); return el ? el.value.trim() : ''; }
  function clear(ids) { ids.forEach(function (id) { if ($(id)) $(id).value = ''; }); }

  var css = '' +
    '.cx-card{background:#faf6ef;border:1px solid #eadfce;border-radius:14px;padding:16px;margin-top:16px}' +
    '.cx-title{font-weight:700;font-size:18px;color:#5b3a29;margin-bottom:12px}' +
    '.cx-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}' +
    '.cx-field label{display:block;font-size:13px;font-weight:600;color:#5b3a29;margin-bottom:4px}' +
    '.cx-field input{width:100%;box-sizing:border-box;padding:10px;border:1px solid #d9cdbb;border-radius:8px;background:#fff;font-size:14px}' +
    '.cx-add{width:100%;margin-top:12px;padding:12px;border:0;border-radius:10px;background:#5b3a29;color:#fff;font-weight:700;cursor:pointer;font-size:15px}' +
    '.cx-sub{margin:16px 0 8px;font-size:13px;font-weight:700;color:#5b3a29}' +
    '.cx-row{display:flex;align-items:center;justify-content:space-between;gap:10px;background:#f0e8da;border-radius:10px;padding:10px 12px;margin-bottom:8px}' +
    '.cx-row b{display:block;color:#3b2a20;font-size:14px}' +
    '.cx-row span{display:block;color:#5b4a3e;font-size:13px;word-break:break-word}' +
    '.cx-del{border:0;border-radius:8px;background:#d93636;color:#fff;padding:8px 14px;font-weight:600;cursor:pointer;flex-shrink:0}' +
    '.cx-empty{color:#8a7a6c;font-size:13px}' +
    '@media(max-width:480px){.cx-grid{grid-template-columns:1fr}}';

  function field(label, id, ph) {
    return '<div class="cx-field"><label for="' + id + '">' + label + '</label>' +
      '<input id="' + id + '" type="text" placeholder="' + ph + '"></div>';
  }

  function render() {
    var p = $('cxPhoneList'), b = $('cxBranchList');
    if (p) {
      p.innerHTML = state.central_phones.length ? state.central_phones.map(function (x, i) {
        return '<div class="cx-row"><div><b>' + esc(x.name) + '</b><span>' + esc(x.phone) + '</span></div>' +
          '<button type="button" class="cx-del" data-kind="phone" data-i="' + i + '">Delete</button></div>';
      }).join('') : '<div class="cx-empty">No central phones yet.</div>';
    }
    if (b) {
      b.innerHTML = state.branches.length ? state.branches.map(function (x, i) {
        return '<div class="cx-row"><div><b>' + esc(x.name) + '</b>' +
          (x.contact_name ? '<span>' + esc(x.contact_name) + '</span>' : '') +
          (x.phone ? '<span>' + esc(x.phone) + '</span>' : '') +
          (x.address ? '<span>' + esc(x.address) + '</span>' : '') + '</div>' +
          '<button type="button" class="cx-del" data-kind="branch" data-i="' + i + '">Delete</button></div>';
      }).join('') : '<div class="cx-empty">No branches yet.</div>';
    }
  }

  function addPhone() {
    var name = val('cxPhName'), phone = val('cxPhNum');
    if (!name || !phone) { alert('Enter the central phone name and number.'); return false; }
    state.central_phones.push({ name: name, phone: phone });
    clear(['cxPhName', 'cxPhNum']); render(); return true;
  }
  function addBranch() {
    var name = val('cxBrName');
    if (!name) { alert('Enter the branch name.'); return false; }
    state.branches.push({ name: name, phone: val('cxBrPhone'), contact_name: val('cxBrContact'), address: val('cxBrAddress') });
    clear(['cxBrName', 'cxBrPhone', 'cxBrContact', 'cxBrAddress']); render(); return true;
  }

  function build() {
    var logoSection = document.querySelector('.profile-logo-section');
    if (!logoSection || $('cxContacts')) return !!$('cxContacts');
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var wrap = document.createElement('div');
    wrap.id = 'cxContacts';
    wrap.innerHTML =
      '<div class="cx-card"><div class="cx-title">&#128222; Central Phone</div>' +
      '<div class="cx-grid">' + field('Name', 'cxPhName', 'Enter central phone name') +
      field('Phone', 'cxPhNum', 'Enter phone number') + '</div>' +
      '<button type="button" class="cx-add" id="cxAddPhone">+ Add Central Phone</button>' +
      '<div class="cx-sub">Added Central Phones</div><div id="cxPhoneList"></div></div>' +
      '<div class="cx-card"><div class="cx-title">&#127970; Branch</div>' +
      '<div class="cx-grid">' + field('Branch Name', 'cxBrName', 'Enter branch name') +
      field('Phone', 'cxBrPhone', 'Enter phone number') +
      field('Contact Name', 'cxBrContact', 'Enter contact name') +
      field('Address', 'cxBrAddress', 'Enter address (e.g. https://...)') + '</div>' +
      '<button type="button" class="cx-add" id="cxAddBranch">+ Add Branch</button>' +
      '<div class="cx-sub">Added Branches</div><div id="cxBranchList"></div></div>';
    logoSection.insertAdjacentElement('afterend', wrap);
    $('cxAddPhone').addEventListener('click', addPhone);
    $('cxAddBranch').addEventListener('click', addBranch);
    wrap.addEventListener('click', function (e) {
      var btn = e.target.closest('.cx-del'); if (!btn) return;
      var i = Number(btn.getAttribute('data-i'));
      if (btn.getAttribute('data-kind') === 'phone') state.central_phones.splice(i, 1);
      else state.branches.splice(i, 1);
      render();
    });
    render();
    return true;
  }

  function load() {
    var s = slug(); if (!s) return;
    fetch('/api/admin/contacts/' + encodeURIComponent(s), { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && d.ok) { state.central_phones = d.central_phones || []; state.branches = d.branches || []; }
        render();
      }).catch(function (e) { console.error('[contacts] load failed', e); });
  }

  function save() {
    var s = slug(); if (!s) return;
    if (val('cxPhName') && val('cxPhNum')) addPhone();
    if (val('cxBrName')) addBranch();
    fetch('/api/admin/contacts/' + encodeURIComponent(s), {
      method: 'PUT', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ central_phones: state.central_phones, branches: state.branches })
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (!d || !d.ok) alert((d && d.message) || 'Could not save central phones and branches.');
    }).catch(function () { alert('Could not save central phones and branches.'); });
  }

  function init() {
    build();
    var open = $('profileBtn'), saveBtn = $('profileSaveBtn');
    if (open) open.addEventListener('click', function () { build(); load(); });
    if (saveBtn) saveBtn.addEventListener('click', save, true);
    load();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();