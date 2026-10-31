(function () {
  'use strict';
  function slug() {
    return (localStorage.getItem('adminRestaurantSlug') || localStorage.getItem('selectedRestaurantSlug') || '').trim();
  }
  function init() {
    var box = document.getElementById('branchPicker');
    var s = slug();
    if (!box || !s) return;

    var st = document.createElement('style');
    st.textContent =
      '#branchPicker{margin:0 0 16px}' +
      '#branchPicker .bp-title{font-weight:700;margin-bottom:8px}' +
      '#branchPicker .bp-list{display:flex;flex-wrap:wrap;gap:8px}' +
      '#branchPicker button{padding:10px 16px;border:1px solid #49372b;border-radius:10px;background:transparent;color:inherit;font-weight:600;cursor:pointer}' +
      '#branchPicker button.active{background:#d8ad62;color:#24170c;border-color:#d8ad62}' +
      '#branchPicker .bp-note{margin-top:8px;font-size:13px;opacity:.8}';
    document.head.appendChild(st);

    var selected = sessionStorage.getItem('orderBranchId') || '';

    fetch('/api/public/payment-branches/' + encodeURIComponent(s), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var list = Array.isArray(d.branches) ? d.branches : [];
        if (selected && !list.some(function (b) { return String(b.id) === selected; })) {
          sessionStorage.removeItem('orderBranchId');
          sessionStorage.removeItem('orderBranchName');
          selected = '';
        }
        var title = document.createElement('div');
        title.className = 'bp-title';
        title.textContent = 'Select branch';
        var wrap = document.createElement('div');
        wrap.className = 'bp-list';
        list.forEach(function (b) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.textContent = b.name;
          if (String(b.id) === selected) btn.className = 'active';
          btn.addEventListener('click', function () {
            sessionStorage.setItem('orderBranchId', String(b.id));
            sessionStorage.setItem('orderBranchName', b.name);
            location.reload();
          });
          wrap.appendChild(btn);
        });
        var note = document.createElement('div');
        note.className = 'bp-note';
        note.textContent = !list.length ? 'No branches yet. Add branches in Profile.'
          : (selected ? 'Showing orders for: ' + (sessionStorage.getItem('orderBranchName') || '') : 'Choose a branch to see its orders.');
        box.appendChild(title);
        box.appendChild(wrap);
        box.appendChild(note);
      })
      .catch(function () { box.textContent = 'Unable to load branches.'; });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();