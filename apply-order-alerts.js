/* ==========================================================================
   apply-order-alerts.js
   Run once from the project folder:   node apply-order-alerts.js

   Adds sound + pop-up banner + notification for new customer orders to
     - the admin  "Order Management" page (orders-display.html)
     - the cashier page               (cashier-orders.html)
   Backups: <file>.before-order-alerts.bak
   Every edit must match exactly once, otherwise NOTHING is written.
   ========================================================================== */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const flex = str => new RegExp(str.trim().split(/\s+/).map(esc).join('\\s+'), 'g');

function read(file) {
  const raw = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const bom = raw.charCodeAt(0) === 0xFEFF;
  const text = bom ? raw.slice(1) : raw;
  const crlf = (text.match(/\r\n/g) || []).length;
  const lf = (text.match(/(?<!\r)\n/g) || []).length;
  return { text: text.replace(/\r\n/g, '\n'), crlf: crlf > lf, bom };
}

function write(file, info, text) {
  let out = info.crlf ? text.replace(/\n/g, '\r\n') : text;
  if (info.bom) out = '\uFEFF' + out;
  fs.writeFileSync(path.join(ROOT, file), out, 'utf8');
}

const problems = [];
const plan = [];

function patchFile(file, marker, edits) {
  if (!fs.existsSync(path.join(ROOT, file))) { problems.push(`${file}: file not found.`); return; }
  const info = read(file);
  let text = info.text;

  if (text.includes(marker)) { console.log(`  = ${file}: already patched, skipped.`); return; }

  for (const edit of edits) {
    const re = flex(edit.find);
    const count = (text.match(re) || []).length;
    if (count !== 1) { problems.push(`${file}: "${edit.name}" matched ${count} times (expected 1).`); continue; }
    text = text.replace(re, () => edit.replace);
  }
  plan.push({ file, info, text });
}

if (!fs.existsSync(path.join(ROOT, 'scripts/order-alerts.js'))) {
  problems.push('scripts/order-alerts.js is missing. Copy it into the project first.');
}

/* ---------- server.js: the live stream now says WHICH order / branch ---------- */

patchFile('server.js', 'function broadcastOrderEvent(slug, type, data)', [
  {
    name: 'broadcast accepts extra data',
    find: `function broadcastOrderEvent(slug, type) {`,
    replace: `function broadcastOrderEvent(slug, type, data) {`
  },
  {
    name: 'broadcast sends extra data',
    find: `JSON.stringify({ type })`,
    replace: `JSON.stringify(Object.assign({ type }, data || {}))`
  },
  {
    name: 'new-order broadcast carries order number + branch',
    find: `broadcastOrderEvent(req.params.slug, 'new-order');`,
    replace: `broadcastOrderEvent(req.params.slug, 'new-order', {
      order_number: displayNumber,
      branch_id: branchResult.rows[0].id,
      branch_name: branchResult.rows[0].name,
      order_type: orderType
    });`
  }
]);

/* ---------- admin Order Management page ---------- */

patchFile('orders-display.html', 'order-alerts.js', [
  {
    name: 'admin alerts script',
    find: `<script src="/scripts/order-branch-picker.js?v=1"></script>`,
    replace: `<script src="/scripts/order-branch-picker.js?v=1"></script>
<script src="/scripts/order-alerts.js?v=1" data-mode="admin"></script>`
  }
]);

/* ---------- cashier page ---------- */

patchFile('cashier-orders.html', 'order-alerts.js', [
  {
    name: 'cashier alerts script (before the page script)',
    find: `<script>
(function(){
 const pathParts=location.pathname.split('/').filter(Boolean);`,
    replace: `<script src="/scripts/order-alerts.js?v=1" data-mode="cashier"></script>
<script>
(function(){
 const pathParts=location.pathname.split('/').filter(Boolean);`
  },
  {
    name: 'cashier tells alerts which branch it is',
    find: `document.getElementById('restaurantName').textContent=(d.restaurant&&d.restaurant.name)||slug;`,
    replace: `document.getElementById('restaurantName').textContent=(d.restaurant&&d.restaurant.name)||slug;
     if(window.OrderAlerts&&d.branch&&d.branch.id!=null)OrderAlerts.setBranch(d.branch.id);`
  }
]);

/* ---------- finish ---------- */

if (problems.length) {
  console.error('\nNothing was changed. Please fix these first:\n');
  problems.forEach(p => console.error('  - ' + p));
  process.exit(1);
}
if (!plan.length) { console.log('\nNothing to do. Everything is already patched.'); process.exit(0); }

for (const item of plan) {
  const backup = path.join(ROOT, item.file + '.before-order-alerts.bak');
  if (!fs.existsSync(backup)) fs.copyFileSync(path.join(ROOT, item.file), backup);
  write(item.file, item.info, item.text);
  console.log(`  + ${item.file} patched (backup: ${item.file}.before-order-alerts.bak)`);
}
console.log('\nDone. Restart the server:  node server.js');
