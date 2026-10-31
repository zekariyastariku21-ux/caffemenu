(function () {
  'use strict';

  var css = [
    '.admin-actions{display:flex;align-items:center;gap:10px}',
    '.admin-menu-wrap{position:relative;margin-left:auto}',
    '.admin-hamburger-btn{width:42px;height:42px;border:0;border-radius:10px;background:#5b3a29;cursor:pointer;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:5px;padding:0}',
    '.admin-hamburger-btn span{display:block;width:20px;height:2px;border-radius:2px;background:#fff}',
    '.admin-menu-panel{position:absolute;top:calc(100% + 8px);right:0;min-width:210px;background:#fff;border:1px solid rgba(0,0,0,.12);border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,.18);padding:8px;display:flex;flex-direction:column;gap:6px;z-index:10000}',
    '.admin-menu-panel[hidden]{display:none}',
    '.admin-menu-panel button{width:100%;margin:0;text-align:left;white-space:nowrap}'
  ].join('');

  function init() {
    var actions = document.querySelector('.admin-actions');
    var refresh = document.getElementById('adminRefreshBtn');
    if (!actions || document.getElementById('adminMenuBtn')) return;

    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var wrap = document.createElement('div');
    wrap.className = 'admin-menu-wrap';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'adminMenuBtn';
    btn.className = 'admin-hamburger-btn';
    btn.setAttribute('aria-label', 'Menu');
    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span></span><span></span><span></span>';

    var panel = document.createElement('div');
    panel.id = 'adminMenuPanel';
    panel.className = 'admin-menu-panel';
    panel.hidden = true;

    Array.prototype.slice.call(actions.children).forEach(function (el) {
      if (el !== refresh && el.tagName === 'BUTTON') panel.appendChild(el);
    });

    wrap.appendChild(btn);
    wrap.appendChild(panel);
    actions.appendChild(wrap);

    function setOpen(open) {
      panel.hidden = !open;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen(panel.hidden);
    });
    panel.addEventListener('click', function () { setOpen(false); });
    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();