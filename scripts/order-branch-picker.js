(function () {
  'use strict';
  function slug() {
    return (localStorage.getItem('adminRestaurantSlug') || localStorage.getItem('selectedRestaurantSlug') || '').trim();
  }
  function init() {
    var pickerButton = document.getElementById('branchSelectButton');
    var branchHeading = document.getElementById('selectedBranchName');
    var s = slug();
    if (!pickerButton || !s) return;
    var restaurantName = document.getElementById('restaurantName');
    var cafeName = restaurantName ? restaurantName.textContent.trim() : '';
    var branchesLoaded = false;
    function updateHeader(branchName) {
      if (branchHeading) {
        branchHeading.textContent = !cafeName || !branchesLoaded
          ? 'Loading...'
          : cafeName + ' - ' + (branchName || 'Select branch');
      }
    }
    window.addEventListener('adminRestaurantNameLoaded', function (event) {
      cafeName = event.detail && event.detail.name ? event.detail.name : cafeName;
      updateHeader(sessionStorage.getItem('orderBranchName') || '');
    });
    updateHeader(sessionStorage.getItem('orderBranchName') || '');

    var st = document.createElement('style');
    st.textContent =
      '.branch-picker-dialog[hidden]{display:none!important}' +
      '.branch-picker-dialog{position:fixed;inset:0;z-index:1100;pointer-events:none}' +
      '.branch-picker-panel{position:absolute;top:72px;left:16px;width:min(280px,calc(100vw - 32px));padding:10px;background:#241b16;border:1px solid #49372b;border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,.45);color:#f8f0df;pointer-events:auto}' +
      '.branch-picker-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}' +
      '.branch-picker-head strong{font-size:17px}' +
      '.branch-picker-close{width:36px;height:36px;padding:0;border:1px solid #49372b;border-radius:9px;background:#302116;color:#f8f0df;font-size:22px;cursor:pointer}' +
      '.bp-list{display:grid;gap:8px}' +
      '.bp-list button{width:100%;padding:11px 13px;border:1px solid #49372b;border-radius:9px;background:transparent;color:inherit;text-align:left;font-weight:600;cursor:pointer}' +
      '.bp-list button.active{background:#d8ad62;color:#24170c;border-color:#d8ad62}' +
      '.bp-note{margin-top:12px;font-size:13px;opacity:.8}';
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
        var selectedBranch = list.find(function (b) { return String(b.id) === selected; });
        if (selectedBranch) {
          sessionStorage.setItem('orderBranchName', selectedBranch.name);
        }
        branchesLoaded = true;
        updateHeader(selectedBranch ? selectedBranch.name : '');
        var dialog = document.createElement('div');
        dialog.className = 'branch-picker-dialog';
        dialog.hidden = true;
        dialog.setAttribute('role', 'presentation');
        var panel = document.createElement('section');
        panel.className = 'branch-picker-panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-modal', 'true');
        panel.setAttribute('aria-label', 'Select branch');
        var head = document.createElement('div');
        head.className = 'branch-picker-head';
        var titleText = document.createElement('strong');
        titleText.textContent = 'Select branch';
        var close = document.createElement('button');
        close.type = 'button';
        close.className = 'branch-picker-close';
        close.setAttribute('aria-label', 'Close branch selector');
        close.textContent = '\u00d7';
        head.appendChild(titleText);
        head.appendChild(close);
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
          : (selected ? 'Showing orders for: ' + (sessionStorage.getItem('orderBranchName') || '') : 'Showing orders from all branches.');
        panel.appendChild(head);
        panel.appendChild(wrap);
        panel.appendChild(note);
        dialog.appendChild(panel);
        document.body.appendChild(dialog);
        function closeDialog() {
          dialog.hidden = true;
          pickerButton.setAttribute('aria-expanded', 'false');
        }
        close.addEventListener('click', closeDialog);
        document.addEventListener('keydown', function (event) {
          if (event.key === 'Escape' && !dialog.hidden) closeDialog();
        });
        document.addEventListener('click', function (event) {
          if (!dialog.hidden && event.target !== pickerButton && !panel.contains(event.target)) {
            closeDialog();
          }
        });
        pickerButton.addEventListener('click', function () {
          dialog.hidden = !dialog.hidden;
          pickerButton.setAttribute('aria-expanded', String(!dialog.hidden));
        });
      })
      .catch(function () {
        pickerButton.disabled = true;
        pickerButton.title = 'Unable to load branches.';
      });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();