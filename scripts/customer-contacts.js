(function () {
  'use strict';
  var css = '' +
    '.menu-profile-image{cursor:pointer}' +
    '.cc-overlay{position:fixed;inset:0;background:rgba(40,25,15,.55);display:none;align-items:center;justify-content:center;padding:16px;z-index:100000}' +
    '.cc-overlay.open{display:flex}' +
    '.cc-card{position:relative;width:100%;max-width:420px;max-height:90vh;overflow:auto;border-radius:20px;background-color:#f7f0e6;background-size:cover;background-position:center;box-shadow:0 20px 50px rgba(0,0,0,.35)}' +
    '.cc-inner{padding:20px 16px 16px;background:linear-gradient(rgba(250,245,237,.88),rgba(250,245,237,.94));border-radius:20px}' +
    '.cc-close{position:absolute;top:8px;right:12px;border:0;background:none;font-size:30px;line-height:1;color:#5b3a29;cursor:pointer;z-index:2}' +
    '.cc-head{text-align:center;margin-bottom:14px}' +
    '.cc-head img{width:64px;height:64px;border-radius:50%;object-fit:cover;background:#fff}' +
    '.cc-head h2{margin:8px 0 0;font-size:20px;color:#5b3a29;letter-spacing:.5px}' +
    '.cc-panel{background:rgba(255,255,255,.88);border-radius:14px;padding:14px}' +
    '.cc-section-title{display:flex;align-items:center;justify-content:center;gap:8px;font-weight:700;font-size:19px;color:#3b2a20;margin:6px 0 12px}' +
    '.cc-item{background:#f0e8da;border:1px solid #e6dac8;border-radius:10px;padding:10px 12px;margin-bottom:10px;text-align:center;color:#3b2a20}' +
    '.cc-item b{display:block;font-size:15px;margin-bottom:4px}' +
    '.cc-line{display:block;font-size:14px;margin:3px 0;color:#4b3b30;word-break:break-word;text-decoration:none}' +
    '.cc-sep{border:0;border-top:1px solid #dfd2bf;margin:14px 0}' +
    '.cc-foot{text-align:center;font-size:12px;color:#5b4a3e;margin-top:12px}' +
    '.cc-empty{text-align:center;color:#8a7a6c;font-size:13px;padding:8px 0}';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function slug() {
    try { if (typeof CAFE_SLUG !== 'undefined' && CAFE_SLUG) return CAFE_SLUG; } catch (e) {}
    var q = new URLSearchParams(location.search).get('restaurant');
    if (q) return q;
    return decodeURIComponent((location.pathname.split('/').filter(Boolean).pop() || '').replace(/\.html$/, ''));
  }
  function base() { try { return typeof API_BASE !== 'undefined' ? API_BASE : ''; } catch (e) { return ''; } }

  var overlay, card, inner;

  function ensure() {
    if (overlay) return;
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    overlay = document.createElement('div');
    overlay.className = 'cc-overlay';
    overlay.innerHTML = '<div class="cc-card" role="dialog" aria-modal="true">' +
      '<button type="button" class="cc-close" aria-label="Close">&times;</button>' +
      '<div class="cc-inner"></div></div>';
    document.body.appendChild(overlay);
    card = overlay.querySelector('.cc-card');
    inner = overlay.querySelector('.cc-inner');
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay || e.target.classList.contains('cc-close')) close();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }
  function close() { if (overlay) overlay.classList.remove('open'); }

  function phoneLine(p) {
    var tel = String(p || '').replace(/[^\d+]/g, '');
    return '<a class="cc-line" href="tel:' + esc(tel) + '">&#128222; ' + esc(p) + '</a>';
  }
  function addressLine(a) {
    if (!a) return '';
    if (/^https?:\/\//i.test(a)) {
      return '<a class="cc-line" href="' + esc(a) + '" target="_blank" rel="noopener noreferrer">&#128205; View on map</a>';
    }
    return '<span class="cc-line">&#128205; ' + esc(a) + '</span>';
  }

  function render(data) {
    var logoEl = document.getElementById('restaurantLogo');
    var nameEl = document.getElementById('restaurantName');
    var logo = logoEl ? (logoEl.currentSrc || logoEl.src || '') : '';
    var name = nameEl ? nameEl.textContent.trim() : '';
    if (logo) card.style.backgroundImage = 'url("' + logo.replace(/"/g, '%22') + '")';
    var phones = data.central_phones || [], branches = data.branches || [];

    var html = '<div class="cc-head">' + (logo ? '<img src="' + esc(logo) + '" alt="">' : '') +
      '<h2>' + esc(name) + '</h2></div><div class="cc-panel">';

    html += '<div class="cc-section-title">&#128222; Central Phones</div>';
    html += phones.length ? phones.map(function (p) {
      return '<div class="cc-item"><b>' + esc(p.name) + '</b>' + phoneLine(p.phone) + '</div>';
    }).join('') : '<div class="cc-empty">No central phones.</div>';

    html += '<hr class="cc-sep"><div class="cc-section-title">&#127970; Branches</div>';
    html += branches.length ? branches.map(function (b) {
      return '<div class="cc-item"><b>' + esc(b.name) + '</b>' +
        (b.contact_name ? '<span class="cc-line">' + esc(b.contact_name) + '</span>' : '') +
        (b.phone ? phoneLine(b.phone) : '') + addressLine(b.address) + '</div>';
    }).join('') : '<div class="cc-empty">No branches.</div>';

    html += '<div class="cc-foot">&#9829;<br>Thank you for choosing ' + esc(name) + '</div></div>';
    inner.innerHTML = html;
  }

  function open() {
    ensure();
    inner.innerHTML = '<div class="cc-empty">Loading...</div>';
    overlay.classList.add('open');
    fetch(base() + '/api/menu/' + encodeURIComponent(slug()) + '/contacts', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) { render(d && d.ok ? d : { central_phones: [], branches: [] }); })
      .catch(function () { render({ central_phones: [], branches: [] }); });
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('.menu-profile-image')) open();
  });
})();