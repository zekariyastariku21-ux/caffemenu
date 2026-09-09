const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));



app.use(express.static('public'));
// Enable CORS for all routes (simple dev convenience)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  console.log(`[req] ${req.method} ${req.path}`);
  next();
});

// Handle OPTIONS for any API path to avoid preflight 405 errors
app.use((req, res, next) => {
  if (req.method === 'OPTIONS' && req.path && req.path.startsWith('/api/')) {
    return res.sendStatus(200);
  }
  next();
});

app.get('/', (req, res) => {
  res.redirect('/save.html');
});

const CART_FILE = './cart.json';
const MENU_FILE = './menu.json';

const ADMIN_USERS = {
  'admin@example.com': 'admin123'
};

const TELEBIRR_MERCHANT_ACCOUNT = process.env.TELEBIRR_MERCHANT_ACCOUNT || '';

function loadMenu() {
  if (!fs.existsSync(MENU_FILE)) {
    return {
      breakfast: [],
      lunch: [],
      dessert: [],
      hotdrinks: [],
      mocktail: []
    };
  }

  try {
    return JSON.parse(fs.readFileSync(MENU_FILE, 'utf8'));
  } catch (error) {
    return {
      breakfast: [],
      lunch: [],
      dessert: [],
      hotdrinks: [],
      mocktail: []
    };
  }
}

function saveMenu(menu) {
  fs.writeFileSync(MENU_FILE, JSON.stringify(menu, null, 2));
}

// Note: cart persistence is handled locally in the browser (localStorage).
// The server exposes only admin APIs under /api/* for managing the menu.

app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ ok: false, message: 'Email and password are required.' });
  }

  if (ADMIN_USERS[email] !== password) {
    return res.status(401).json({ ok: false, message: 'Invalid email or password.' });
  }

  res.json({ ok: true, message: 'Admin login successful.' });
});

app.get('/api/menu', (req, res) => {
  res.json(loadMenu());
});

app.post('/api/payments/telebirr/create', (req, res) => {
  const { accountNumber, amount, items } = req.body || {};
  if (!Number.isFinite(amount) || amount <= 0 || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ ok: false, message: 'A valid cart and amount are required.' });
  }

  if (!TELEBIRR_MERCHANT_ACCOUNT) {
    return res.status(503).json({
      ok: false,
      message: 'Cafe Telebirr account is not configured. Set TELEBIRR_MERCHANT_ACCOUNT in the server environment.'
    });
  }

  const paymentId = `order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  res.json({ ok: true, paymentId, merchantAccount: TELEBIRR_MERCHANT_ACCOUNT });
});

app.post('/api/admin/menu', (req, res) => {
  const { menu } = req.body;
  if (!menu || typeof menu !== 'object') {
    return res.status(400).json({ ok: false, message: 'Menu data is required.' });
  }

  saveMenu(menu);
  res.json({ ok: true, message: 'Menu saved.' });
});

// Debug endpoint: echoes method, headers and parsed body for troubleshooting
app.all('/api/debug', (req, res) => {
  console.log('[api-debug] method=%s path=%s headers=%o body=%o', req.method, req.path, req.headers, req.body);
  res.json({ ok: true, method: req.method, path: req.path, headers: req.headers, body: req.body });
});

// Fallback for API paths to log unmatched requests
app.use((req, res, next) => {
  if (req.path && req.path.startsWith('/api/')) {
    console.log(`[api] No matching route for ${req.method} ${req.path}`);
    return res.status(404).json({ ok: false, message: 'API route not found' });
  }
  next();
});

app.listen(3000, '0.0.0.0', () => {
  console.log('Server running on http://0.0.0.0:3000');
});