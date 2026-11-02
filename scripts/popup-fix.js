(function () {
  'use strict';
  var Z = {
    'customer-day-special-overlay': '99999',
    'cc-overlay': '100000',
    'item-customization-overlay': '100010',
    'order-form-overlay': '100020'
  };
  var SEL = Object.keys(Z).map(function (c) { return '.' + c; }).join(',');
  function visible(el) {
    var s = getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && parseFloat(s.opacity) > 0;
  }
  function sync() {
    var any = false;
    document.querySelectorAll(SEL).forEach(function (el) {
      if (el.parentElement !== document.body) document.body.appendChild(el);
      Object.keys(Z).forEach(function (c) {
        if (el.classList.contains(c) && el.style.getPropertyValue('z-index') !== Z[c]) {
          el.style.setProperty('z-index', Z[c], 'important');
        }
      });
      if (visible(el)) any = true;
    });
    document.body.classList.toggle('popup-open', any);
  }
  new MutationObserver(sync).observe(document.documentElement, {
    subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style']
  });
  document.addEventListener('DOMContentLoaded', sync);
})();