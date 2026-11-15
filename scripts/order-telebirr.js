(function () {
  'use strict';
  var methods = {};

  function slug() {
    try { if (typeof CAFE_SLUG !== 'undefined' && CAFE_SLUG) return CAFE_SLUG; } catch (e) {}
    return decodeURIComponent((location.pathname.split('/').filter(Boolean)[0] || '')).replace(/\.html$/, '');
  }
  function $(id) { return document.getElementById(id); }
  function toast(msg, type) {
    try { if (typeof showToast === 'function') return showToast(msg, type); } catch (e) {}
  }

  function loadMethods() {
    var s = slug(); if (!s) return;
    fetch('/api/public/payment-methods/' + encodeURIComponent(s), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        methods = {};
        ((d && d.ok && d.branches) || []).forEach(function (b) {
          methods[String(b.id)] = { cash: b.cash === true, telebirr: b.telebirr === true };
        });
        update();
      })
      .catch(function () { methods = {}; update(); });
  }

  function current() {
    var sel = $('orderBranch');
    return (sel && methods[String(sel.value)]) || null;
  }

  function chosen() {
    var m = current();
    if (!m) return 'cash';
    if (m.cash && m.telebirr) {
      var el = document.querySelector('input[name="orderPayMethod"]:checked');
      return el ? el.value : 'telebirr';
    }
    return m.telebirr ? 'telebirr' : 'cash';
  }

  function update() {
    var box = $('orderPayBox'); if (!box) return;
    var m = current();
    if (!m) { box.hidden = true; return; }
    box.hidden = false;
    var both = m.cash && m.telebirr;
    $('orderPayChoice').hidden = !both;
    $('orderPayFixed').hidden = both;
    if (both) {
      if (!document.querySelector('input[name="orderPayMethod"]:checked')) {
        document.querySelector('input[name="orderPayMethod"][value="telebirr"]').checked = true;
      }
    } else if (m.telebirr) {
      $('orderPayFixed').textContent = 'Payment: Telebirr. Your order is placed after payment (TEST MODE, no money is charged)';
    } else if (m.cash) {
      $('orderPayFixed').textContent = 'Payment: Cash / pay at the branch';
    } else {
      $('orderPayFixed').textContent = 'Payment is not set up for this branch yet. Please choose another branch.';
    }
  }

  function build() {
    var sel = $('orderBranch');
    if (!sel || $('orderPayBox')) return !!$('orderPayBox');
    var st = document.createElement('style');
    st.textContent = '#orderPayBox[hidden],#orderPayChoice[hidden],#orderPayFixed[hidden]{display:none!important}';
    document.head.appendChild(st);
    var box = document.createElement('div');
    box.id = 'orderPayBox';
    box.hidden = true;
    box.style.cssText = 'margin:12px 0';
    box.innerHTML =
      '<div id="orderPayFixed" hidden style="font-weight:600"></div>' +
      '<div id="orderPayChoice" hidden>' +
        '<div style="font-weight:600;margin-bottom:6px">Payment</div>' +
        '<label style="display:flex;gap:8px;align-items:center;margin-bottom:6px">' +
          '<input type="radio" name="orderPayMethod" value="telebirr" checked> Telebirr <small>(order placed after payment; TEST MODE, no money is charged)</small></label>' +
        '<label style="display:flex;gap:8px;align-items:center">' +
          '<input type="radio" name="orderPayMethod" value="cash"> Cash / pay at the branch</label>' +
      '</div>';
    var anchor = sel.closest('label') || sel.parentElement;
    anchor.insertAdjacentElement('afterend', box);
    sel.addEventListener('change', update);
    new MutationObserver(update).observe(sel, { childList: true });
    update();
    return true;
  }

  function json(status, obj) {
    return new Response(JSON.stringify(obj), { status: status, headers: { 'Content-Type': 'application/json' } });
  }

  var origFetch = window.fetch;
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    var isOrder = init && init.method === 'POST' && /\/api\/orders\/[^\/?]+$/.test(url);
    if (!isOrder) return origFetch.apply(this, arguments);

    var method = chosen();
    try {
      var body = JSON.parse(init.body);
      body.payment_method = method;
      init = Object.assign({}, init, { body: JSON.stringify(body) });
    } catch (e) {}

    var p = origFetch.call(this, input, init);
    if (method !== 'telebirr') return p;

    // Telebirr: the server holds the order; it is created only after payment succeeds.
    return p.then(function (resp) {
      return resp.clone().json().catch(function () { return {}; }).then(function (d) {
        if (!(resp.status === 202 && d && d.pending_payment)) return resp;
        var headers = window.CustomerAccount ? window.CustomerAccount.authHeader() : {};
        return origFetch('/api/telebirr/' + encodeURIComponent(slug()) + '/test-pay/' + d.payment_id, {
          method: 'POST', credentials: 'same-origin', headers: headers
        }).then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (x) {
            if (r.ok && x && x.ok) { toast('Payment verified (TEST MODE).', 'success'); return json(201, x); }
            return json(r.status === 401 ? 401 : 402, { ok: false, message: (x && x.message) || 'Payment failed. Your order was not placed.' });
          });
        }).catch(function () { return json(402, { ok: false, message: 'Payment failed. Your order was not placed.' }); });
      });
    });
  };

  function init() {
    build(); loadMethods();
    var open = $('orderNowButton');
    if (open) open.addEventListener('click', function () { build(); loadMethods(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
