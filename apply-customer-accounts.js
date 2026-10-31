/* ==========================================================================
   apply-customer-accounts.js
   Run once from the project folder:   node apply-customer-accounts.js

   - Makes a backup of every file it changes:  <file>.before-customer-accounts.bak
   - Every edit must match exactly once, otherwise NOTHING is written.
   - Safe to run twice (already-patched files are skipped).
   ========================================================================== */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

/* ---------- helpers ---------- */

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
const plan = [];       // { file, info, text, changed }

function patchFile(file, marker, edits) {
  if (!fs.existsSync(path.join(ROOT, file))) {
    problems.push(`${file}: file not found.`);
    return;
  }
  const info = read(file);
  let text = info.text;

  if (marker && text.includes(marker)) {
    console.log(`  = ${file}: already patched, skipped.`);
    return;
  }

  for (const edit of edits) {
    const re = edit.find instanceof RegExp
      ? new RegExp(edit.find.source, edit.find.flags.includes('g') ? edit.find.flags : edit.find.flags + 'g')
      : flex(edit.find);
    const count = (text.match(re) || []).length;
    if (count !== 1) {
      problems.push(`${file}: "${edit.name}" matched ${count} times (expected 1).`);
      continue;
    }
    text = text.replace(re, m => (typeof edit.replace === 'function' ? edit.replace(m) : edit.replace));
  }

  plan.push({ file, info, text });
}

/* ---------- required new files ---------- */

['customer-accounts-routes.js', 'scripts/customer-account.js', 'stylesheets/customer-account.css'].forEach(f => {
  if (!fs.existsSync(path.join(ROOT, f))) {
    problems.push(`${f} is missing. Copy it into the project first (same folder structure).`);
  }
});

/* ==========================================================================
   server.js
   ========================================================================== */

patchFile('server.js', "require('./customer-accounts-routes')", [
  {
    name: 'create customer tables at startup',
    find: `CREATE INDEX IF NOT EXISTS idx_customer_orders_restaurant_created
      ON customer_orders (restaurant_id, created_at DESC)
    \`);`,
    replace: `CREATE INDEX IF NOT EXISTS idx_customer_orders_restaurant_created
      ON customer_orders (restaurant_id, created_at DESC)
    \`);

    // Customer accounts + OTP tables (customer-accounts-routes.js)
    await customerAccounts.ensureTables();`
  },
  {
    name: 'public settings: self_ordering_enabled',
    find: `settingsResult.rows[0]?.super_admin_order_now_enabled !== false)
    });`,
    replace: `settingsResult.rows[0]?.super_admin_order_now_enabled !== false),
      self_ordering_enabled:
        settingsResult.rows.length === 0 ||
        settingsResult.rows[0]?.super_admin_order_now_enabled !== false
    });`
  },
  {
    name: 'branch filter helper',
    find: `const ADMIN_DAY_TZ = 'Africa/Addis_Ababa';`,
    replace: `function adminBranchFilter(req) {
  const value = Number(req.query.branch_id);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

const ADMIN_DAY_TZ = 'Africa/Addis_Ababa';`
  },
  {
    name: 'order history: branch filter',
    find: `AND (created_at::timestamptz AT TIME ZONE $2)::date = $3::date
       ORDER BY created_at ASC, id ASC\`,
      [restaurant.id, ADMIN_DAY_TZ, date]`,
    replace: `AND (created_at::timestamptz AT TIME ZONE $2)::date = $3::date
         AND ($4::int IS NULL OR branch_id = $4::int)
       ORDER BY created_at ASC, id ASC\`,
      [restaurant.id, ADMIN_DAY_TZ, date, adminBranchFilter(req)]`
  },
  {
    name: 'customers list: branch filter',
    find: `WHERE restaurant_id = $1
       GROUP BY COALESCE(NULLIF(TRIM(customer_phone), ''), customer_name)
       ORDER BY MAX(created_at) DESC\`,
      [restaurant.id]`,
    replace: `WHERE restaurant_id = $1
         AND ($2::int IS NULL OR branch_id = $2::int)
       GROUP BY COALESCE(NULLIF(TRIM(customer_phone), ''), customer_name)
       ORDER BY MAX(created_at) DESC\`,
      [restaurant.id, adminBranchFilter(req)]`
  },
  {
    name: 'customer orders: branch filter',
    find: `AND COALESCE(NULLIF(TRIM(customer_phone), ''), customer_name) = $2
       ORDER BY created_at DESC, id DESC\`,
      [restaurant.id, key]`,
    replace: `AND COALESCE(NULLIF(TRIM(customer_phone), ''), customer_name) = $2
         AND ($3::int IS NULL OR branch_id = $3::int)
       ORDER BY created_at DESC, id DESC\`,
      [restaurant.id, key, adminBranchFilter(req)]`
  },
  {
    name: 'live orders: branch filter',
    find: `WHERE restaurant_id = $1
         ORDER BY created_at DESC, id DESC
         LIMIT 100\`,
        [restaurant.id]`,
    replace: `WHERE restaurant_id = $1
           AND ($2::int IS NULL OR branch_id = $2::int)
         ORDER BY created_at DESC, id DESC
         LIMIT 100\`,
        [restaurant.id, adminBranchFilter(req)]`
  },
  {
    name: 'register customer account routes',
    find: `app.post('/api/orders/:slug', async (req, res) => {`,
    replace: `/* ================================================================
   CUSTOMER ACCOUNTS (sign-up / log-in with OTP, admin account list)
   ================================================================ */
const customerAccounts = require('./customer-accounts-routes')(app, {
  pool,
  requireRestaurantAdmin,
  getAdminRestaurant,
  isSuperAdminRole
});

app.post('/api/orders/:slug', async (req, res) => {`
  },
  {
    name: 'order: name/phone come from the account',
    find: `const customerName = String(customer_name || '').trim();
    const customerPhone = String(customer_phone || '').trim();`,
    replace: `let customerName = String(customer_name || '').trim();
    let customerPhone = String(customer_phone || '').trim();`
  },
  {
    name: 'order: require login + super-admin switch',
    find: `message: 'Restaurant not found or unavailable.'
      });
    }

    const restaurant = restaurantResult.rows[0];`,
    replace: `message: 'Restaurant not found or unavailable.'
      });
    }

    const restaurant = restaurantResult.rows[0];

    // Self-ordering must be enabled by the super admin ...
    if (!(await customerAccounts.isSelfOrderingEnabled(restaurant.id))) {
      return res.status(403).json({
        ok: false,
        code: 'self_ordering_disabled',
        message: 'Self-ordering is currently unavailable for this cafe.'
      });
    }

    // ... and the customer must be logged in to their account.
    const customerAccount = await customerAccounts.getCustomerFromRequest(req, restaurant.id);
    if (!customerAccount) {
      return res.status(401).json({
        ok: false,
        code: 'login_required',
        message: 'Please log in or create an account to place your order.'
      });
    }
    customerName = customerAccount.full_name;
    customerPhone = customerAccount.phone;`
  },
  {
    name: 'order: save customer_account_id',
    find: `items,
         total
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)`,
    replace: `items,
         total,
         customer_account_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11)`
  },
  {
    name: 'order: pass customer_account_id',
    find: `JSON.stringify(savedItems),
        total
      ]`,
    replace: `JSON.stringify(savedItems),
        total,
        customerAccount.id
      ]`
  }
]);

/* ==========================================================================
   orders-display.html  (cafe admin: branch filter + Customer Accounts module)
   ========================================================================== */

const ADMIN_JS_HELPERS = `let currentCustomer = null;

// ---- Branch filter (order history, customers, customer accounts) ----
let adminBranches = null;
let adminBranchId = sessionStorage.getItem('adminBranchFilter');
if (adminBranchId === null) adminBranchId = sessionStorage.getItem('orderBranchId') || '';
let currentAccount = null;
let accountCache = [];
let accountSearch = '';
let accountTotal = 0;

async function ensureAdminBranches() {
  if (adminBranches) return;
  try {
    const data = await adminRequest(\`/api/admin/branches/\${encodeURIComponent(slug)}\`);
    adminBranches = data.branches || [];
  } catch (e) { adminBranches = []; }
  if (adminBranchId && !adminBranches.some(b => String(b.id) === String(adminBranchId))) adminBranchId = '';
}
function branchFilterMarkup() {
  if (!adminBranches || !adminBranches.length) return '';
  return \`<div class="admin-branch-bar"><label for="adminBranchSelect">Branch</label><select id="adminBranchSelect"><option value="">All branches</option>\${adminBranches.map(b => \`<option value="\${escapeHtml(b.id)}"\${String(b.id) === String(adminBranchId) ? ' selected' : ''}>\${escapeHtml(b.name)}</option>\`).join('')}</select></div>\`;
}
function branchQuery(prefix) { return adminBranchId ? prefix + 'branch_id=' + encodeURIComponent(adminBranchId) : ''; }
function onBranchFilterChange(value) {
  adminBranchId = value || '';
  sessionStorage.setItem('adminBranchFilter', adminBranchId);
  if (adminView === 'history') showHistory();
  else if (adminView === 'customers') showCustomers();
  else if (adminView === 'accounts') showAccounts();
  else if (adminView === 'customer-detail' && currentCustomer) showCustomerOrders(currentCustomer.key, currentCustomer.name);
  else if (adminView === 'account-detail' && currentAccount) showAccountOrders(currentAccount.id, currentAccount.name);
}`;

const ADMIN_JS_ACCOUNTS = `// ---- Customer Accounts module (accounts created from the customer menu) ----
async function showAccounts() {
  adminView = 'accounts';
  currentAccount = null;
  adminOverlayTitle.textContent = 'Customer Accounts';
  adminOverlayBody.innerHTML = '<p class="muted">Loading...</p>';
  await ensureAdminBranches();
  if (adminView !== 'accounts') return;
  adminOverlayBody.innerHTML = branchFilterMarkup() + \`<input type="search" id="accountSearchInput" class="admin-search" placeholder="Search name or phone" value="\${escapeHtml(accountSearch)}"><div id="accountResult"><p class="muted">Loading...</p></div>\`;
  try {
    const data = await adminRequest(\`/api/admin/customer-accounts/\${encodeURIComponent(slug)}\${branchQuery('?')}\`);
    if (adminView !== 'accounts') return;
    accountCache = data.accounts || [];
    accountTotal = Number(data.total_accounts) || 0;
    renderAccounts();
  } catch (e) {
    const box = document.getElementById('accountResult');
    if (box) box.innerHTML = \`<p class="muted">\${escapeHtml(e.message || 'Unable to load customer accounts.')}</p>\`;
  }
}
function renderAccounts() {
  const box = document.getElementById('accountResult');
  if (!box) return;
  const q = accountSearch.trim().toLowerCase();
  const list = accountCache.filter(a => !q || [a.full_name, a.phone].join(' ').toLowerCase().includes(q));
  if (!list.length) { box.innerHTML = \`<div class="empty">\${accountTotal ? 'No accounts found.' : 'No customer accounts have been created yet.'}</div>\`; return; }
  box.innerHTML = \`<p class="muted">\${list.length} account(s)\${adminBranchId ? ' with orders at this branch' : ''} &middot; \${accountTotal} created in total</p>\` + list.map(a => \`
    <article class="order admin-customer">
      <div class="admin-customer-main">
        <strong>\${escapeHtml(a.full_name || 'Unknown')}</strong>
        <div>\${escapeHtml(a.phone || '')}</div>
        <div class="muted">Joined \${escapeHtml(formatDate(a.created_at))}\${a.last_login_at ? ' &middot; Last login ' + escapeHtml(formatDate(a.last_login_at)) : ''}</div>
        <div class="muted">\${escapeHtml(a.order_count)} order(s) &middot; \${formatMoney(a.total_spent)}\${a.last_order_at ? ' &middot; Last order ' + escapeHtml(formatDate(a.last_order_at)) : ''}</div>
      </div>
      <button type="button" class="admin-detail-btn" data-account-id="\${escapeHtml(a.id)}" data-account-name="\${escapeHtml(a.full_name || '')}">Orders</button>
    </article>\`).join('');
}
async function showAccountOrders(id, name) {
  adminView = 'account-detail';
  currentAccount = { id: id, name: name };
  adminOverlayTitle.textContent = (name || 'Customer') + ' - Orders';
  adminOverlayBody.innerHTML = \`<div class="admin-date-bar"><button type="button" data-account-back>&#8249; Back to accounts</button></div><div id="accountOrdersResult"><p class="muted">Loading...</p></div>\`;
  const box = document.getElementById('accountOrdersResult');
  try {
    const data = await adminRequest(\`/api/admin/customer-accounts/\${encodeURIComponent(slug)}/\${encodeURIComponent(id)}/orders\${branchQuery('?')}\`);
    if (adminView !== 'account-detail') return;
    const orders = data.orders || [];
    if (!orders.length) { box.innerHTML = '<div class="empty">No orders for this customer.</div>'; return; }
    const total = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    box.innerHTML = \`<div class="admin-summary"><strong>\${orders.length}</strong> order(s) &middot; <strong>\${formatMoney(total)}</strong> total</div>\` + orders.map(historyOrderMarkup).join('');
  } catch (e) { box.innerHTML = \`<p class="muted">\${escapeHtml(e.message || 'Unable to load orders.')}</p>\`; }
}

async function deleteOrder(id, number) {`;

patchFile('orders-display.html', 'data-admin-view="accounts"', [
  {
    name: 'menu entry: Customer Accounts',
    find: `<button type="button" data-admin-view="customers">&#128101; Customers</button>`,
    replace: `<button type="button" data-admin-view="customers">&#128101; Customers</button>
        <button type="button" data-admin-view="accounts">&#128100; Customer Accounts</button>`
  },
  {
    name: 'branch filter + accounts CSS',
    find: `.admin-detail-btn { color: var(--gold); border-color: #80643b; white-space: nowrap; }`,
    replace: `.admin-detail-btn { color: var(--gold); border-color: #80643b; white-space: nowrap; }
.admin-branch-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin: 0 0 14px; }
.admin-branch-bar label { color: var(--muted); font-size: 14px; font-weight: bold; }
.admin-branch-bar select { min-width: 190px; padding: 10px 12px; border-radius: 9px; border: 1px solid var(--line); background: #302116; color: var(--cream); font-size: 15px; }`
  },
  {
    name: 'branch filter state + helpers',
    find: `let currentCustomer = null;`,
    replace: ADMIN_JS_HELPERS
  },
  {
    name: 'order history: branch select + await branches',
    find: `adminOverlayBody.innerHTML = \`<div class="admin-date-bar">
      <button type="button" data-history-shift="-1"`,
    replace: `await ensureAdminBranches();
  adminOverlayBody.innerHTML = branchFilterMarkup() + \`<div class="admin-date-bar">
      <button type="button" data-history-shift="-1"`
  },
  {
    name: 'order history: send branch',
    find: `?date=\${encodeURIComponent(historyDate)}\``,
    replace: `?date=\${encodeURIComponent(historyDate)}\${branchQuery('&')}\``
  },
  {
    name: 'customers: branch select + await branches',
    find: `adminOverlayBody.innerHTML = \`<input type="search" id="customerSearchInput"`,
    replace: `await ensureAdminBranches();
  adminOverlayBody.innerHTML = branchFilterMarkup() + \`<input type="search" id="customerSearchInput"`
  },
  {
    name: 'customers: send branch',
    find: `await adminRequest(\`/api/admin/customers/\${encodeURIComponent(slug)}\`);`,
    replace: `await adminRequest(\`/api/admin/customers/\${encodeURIComponent(slug)}\${branchQuery('?')}\`);`
  },
  {
    name: 'customer orders: send branch',
    find: `/orders?key=\${encodeURIComponent(key)}\``,
    replace: `/orders?key=\${encodeURIComponent(key)}\${branchQuery('&')}\``
  },
  {
    name: 'accounts module functions',
    find: `async function deleteOrder(id, number) {`,
    replace: ADMIN_JS_ACCOUNTS
  },
  {
    name: 'delete refresh in account detail',
    find: `else if (adminView === 'customer-detail' && currentCustomer) await showCustomerOrders(currentCustomer.key, currentCustomer.name);`,
    replace: `else if (adminView === 'customer-detail' && currentCustomer) await showCustomerOrders(currentCustomer.key, currentCustomer.name);
      else if (adminView === 'account-detail' && currentAccount) await showAccountOrders(currentAccount.id, currentAccount.name);`
  },
  {
    name: 'menu click: accounts view',
    find: `if (view === 'history') showHistory(); else showCustomers();`,
    replace: `if (view === 'history') showHistory(); else if (view === 'accounts') showAccounts(); else showCustomers();`
  },
  {
    name: 'overlay click: account buttons',
    find: `if (e.target.closest('button[data-customer-back]')) showCustomers();`,
    replace: `if (e.target.closest('button[data-customer-back]')) { showCustomers(); return; }
  const acct = e.target.closest('button[data-account-id]');
  if (acct) { showAccountOrders(acct.dataset.accountId, acct.dataset.accountName); return; }
  if (e.target.closest('button[data-account-back]')) showAccounts();`
  },
  {
    name: 'overlay change: branch select',
    find: `adminOverlay.addEventListener('change', e => {`,
    replace: `adminOverlay.addEventListener('change', e => {
  if (e.target.id === 'adminBranchSelect') { onBranchFilterChange(e.target.value); return; }`
  },
  {
    name: 'overlay input: account search',
    find: `if (e.target.id === 'customerSearchInput') { customerSearch = e.target.value; renderCustomers(); }`,
    replace: `if (e.target.id === 'customerSearchInput') { customerSearch = e.target.value; renderCustomers(); }
  if (e.target.id === 'accountSearchInput') { accountSearch = e.target.value; renderAccounts(); }`
  }
]);

/* ==========================================================================
   save.html  (customer menu: load the account script + styles)
   ========================================================================== */

patchFile('save.html', 'customer-account.js', [
  {
    name: 'account stylesheet',
    find: /<link\s+rel="stylesheet"\s+href="stylesheets\/menu-expiration\.css[^"]*"\s*>/,
    replace: m => m + `
  <link rel="stylesheet" href="stylesheets/customer-account.css?v=1">`
  },
  {
    name: 'account script',
    find: /<script\s+src="scripts\/saveAdd\.js[^"]*"\s*><\/script>/,
    replace: m => `<script src="scripts/customer-account.js?v=1"></script>
  ` + m
  }
]);

/* ==========================================================================
   scripts/saveAdd.js  (customer menu: Order Now needs login, send token)
   ========================================================================== */

patchFile('scripts/saveAdd.js', 'window.CustomerAccount', [
  {
    name: 'Order Now requires login',
    find: `if (cart.length === 0) return;
        openOrderFormModal();`,
    replace: `if (cart.length === 0) return;
        if (window.CustomerAccount && !window.CustomerAccount.isLoggedIn()) {
            window.CustomerAccount.requireLogin(() => {
                if (cart.length) openOrderFormModal();
            });
            return;
        }
        openOrderFormModal();`
  },
  {
    name: 'prefill name/phone from the account',
    find: `setupOrderFormEvents();
    loadCustomerOrderBranches();`,
    replace: `setupOrderFormEvents();
    loadCustomerOrderBranches();
    if (window.CustomerAccount) window.CustomerAccount.prefillOrderForm();`
  },
  {
    name: 'send customer token with the order',
    find: `headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    customer_name:`,
    replace: `headers: Object.assign(
                    { 'Content-Type': 'application/json' },
                    window.CustomerAccount ? window.CustomerAccount.authHeader() : {}
                ),
                body: JSON.stringify({
                    customer_name:`
  },
  {
    name: 'expired login while ordering',
    find: `const result = await response.json().catch(() => ({}));

        if (!response.ok || !result.ok) {
            throw new Error(
                result.message || 'Unable to place your order. Please try again.'
            );
        }`,
    replace: `const result = await response.json().catch(() => ({}));

        if (response.status === 401 && window.CustomerAccount) {
            window.CustomerAccount.handleUnauthorized(() => {
                if (cart.length) openOrderFormModal();
            });
        }

        if (!response.ok || !result.ok) {
            throw new Error(
                result.message || 'Unable to place your order. Please try again.'
            );
        }`
  },
  {
    name: 'after order: open My Account to track it',
    find: `closeOrderFormModal();
    } catch (error) {`,
    replace: `closeOrderFormModal();

        if (window.CustomerAccount) {
            window.CustomerAccount.onOrderPlaced(result.order);
        }
    } catch (error) {`
  },
  {
    name: 'show/hide login button with Self-Ordering',
    find: `orderNowButton.hidden = data?.ok === false || data?.order_now_enabled === false;
        }`,
    replace: `orderNowButton.hidden = data?.ok === false || data?.order_now_enabled === false;
        }

        // Login / account button follows the super-admin Self-Ordering switch.
        if (window.CustomerAccount) {
            window.CustomerAccount.setEnabled(
                data?.ok === true && data?.self_ordering_enabled !== false
            );
        }`
  }
]);

/* ==========================================================================
   scripts/super-admin.js  (clearer confirmation message only)
   ========================================================================== */

patchFile('scripts/super-admin.js', 'Customers can now create accounts', [
  {
    name: 'self-ordering toast text',
    find: `self-ordering \${enabled ? 'enabled' : 'disabled'}.\``,
    replace: `self-ordering \${enabled ? 'enabled. Customers can now create accounts, log in and order.' : 'disabled. Login and Order Now are hidden from customers.'}\``
  }
]);

/* ==========================================================================
   finish
   ========================================================================== */

if (problems.length) {
  console.error('\nNothing was changed. Please fix these first:\n');
  problems.forEach(p => console.error('  - ' + p));
  process.exit(1);
}

if (!plan.length) {
  console.log('\nNothing to do. Everything is already patched.');
  process.exit(0);
}

for (const item of plan) {
  const backup = path.join(ROOT, item.file + '.before-customer-accounts.bak');
  if (!fs.existsSync(backup)) fs.copyFileSync(path.join(ROOT, item.file), backup);
  write(item.file, item.info, item.text);
  console.log(`  + ${item.file} patched (backup: ${item.file}.before-customer-accounts.bak)`);
}

console.log('\nDone. Restart the server:  node server.js');
