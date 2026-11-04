'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');
const registerBranchCashierRoutes = require('./branch-cashier-routes');

const restaurant = { id: 12, name: 'Zekariyas Cafe', slug: 'zekariyas-cafe' };
const branch = { id: 7, name: 'Main Branch' };

function encryptedPin(secret, pin) {
  const key = crypto.createHash('sha256')
    .update('caffemenu:branch-cashier-pin:v1\0')
    .update(secret)
    .digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(pin, 'utf8'), cipher.final()]);
  return {
    pin_ciphertext: ciphertext.toString('base64'),
    pin_iv: iv.toString('base64'),
    pin_auth_tag: cipher.getAuthTag().toString('base64')
  };
}

function makePool(setting) {
  return {
    async query(sql) {
      if (sql.includes('FROM restaurants')) return { rows: [restaurant] };
      if (sql.includes('SELECT b.id, b.name')) {
        return { rows: [Object.assign({ configured: true }, setting)] };
      }
      if (sql.includes('FROM restaurant_cashier_settings')) return { rows: [] };
      if (sql.includes('FROM restaurant_payment_branches')) return { rows: [branch] };
      if (sql.includes('FROM restaurant_branch_pins')) return { rows: [setting] };
      return { rows: [] };
    }
  };
}

function registerRoutes(pool) {
  const routes = {};
  const app = {
    get(path, ...handlers) { routes['GET ' + path] = handlers[handlers.length - 1]; },
    post(path, ...handlers) { routes['POST ' + path] = handlers[handlers.length - 1]; },
    put(path, ...handlers) { routes['PUT ' + path] = handlers[handlers.length - 1]; },
    patch(path, ...handlers) { routes['PATCH ' + path] = handlers[handlers.length - 1]; }
  };
  const dependencies = {
    cashierPinAttempts: new Map(),
    CASHIER_PIN_MAX_ATTEMPTS: 5,
    CASHIER_PIN_LOCK_MS: 900000,
    CASHIER_SESSION_MS: 3600000,
    safeCompareCashierPin: () => false,
    jwt: { sign: () => 'cashier-token' },
    cashierCookieOptions: () => ({}),
    requireCashier: () => {},
    isSuperAdminRole: () => false
  };
  registerBranchCashierRoutes(app, pool, () => {}, () => dependencies);
  return routes;
}

function makeResponse() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    set() { return this; },
    cookie() { return this; },
    json(body) { this.body = body; return this; }
  };
}

test('cashier login decrypts PINs with the dedicated key', async function () {
  const previousJwtSecret = process.env.JWT_SECRET;
  const previousPinKey = process.env.CASHIER_PIN_ENCRYPTION_KEY;
  process.env.JWT_SECRET = 'jwt-secret';
  process.env.CASHIER_PIN_ENCRYPTION_KEY = 'stable-pin-secret';
  try {
    const setting = Object.assign(
      { pin_salt: null, pin_hash: null },
      encryptedPin('stable-pin-secret', '123456')
    );
    const handler = registerRoutes(makePool(setting))['POST /api/cashier/login/:slug'];
    const response = makeResponse();
    await handler({
      params: { slug: restaurant.slug },
      body: { pin: '123456', branch_id: branch.id },
      ip: '127.0.0.1'
    }, response);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.ok, true);
  } finally {
    if (previousJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousJwtSecret;
    if (previousPinKey === undefined) delete process.env.CASHIER_PIN_ENCRYPTION_KEY;
    else process.env.CASHIER_PIN_ENCRYPTION_KEY = previousPinKey;
  }
});

test('branch PIN listing decrypts records encrypted with the legacy JWT key', async function () {
  const previousJwtSecret = process.env.JWT_SECRET;
  const previousPinKey = process.env.CASHIER_PIN_ENCRYPTION_KEY;
  process.env.JWT_SECRET = 'legacy-jwt-secret';
  process.env.CASHIER_PIN_ENCRYPTION_KEY = 'new-stable-pin-secret';
  try {
    const setting = Object.assign(
      { id: branch.id, name: branch.name, configured: true },
      encryptedPin('legacy-jwt-secret', '123456')
    );
    const handler = registerRoutes(makePool(setting))['GET /api/admin/branch-pins/:slug'];
    const response = makeResponse();
    await handler({ params: { slug: restaurant.slug }, user: { restaurant_id: restaurant.id } }, response);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.branches[0].current_pin, '123456');
    assert.equal(response.body.branches[0].needs_reset, false);
  } finally {
    if (previousJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousJwtSecret;
    if (previousPinKey === undefined) delete process.env.CASHIER_PIN_ENCRYPTION_KEY;
    else process.env.CASHIER_PIN_ENCRYPTION_KEY = previousPinKey;
  }
});

test('branch PIN listing remains usable when a stored PIN cannot be decrypted', async function () {
  const previousJwtSecret = process.env.JWT_SECRET;
  const previousPinKey = process.env.CASHIER_PIN_ENCRYPTION_KEY;
  process.env.JWT_SECRET = 'jwt-secret';
  process.env.CASHIER_PIN_ENCRYPTION_KEY = 'stable-pin-secret';
  try {
    const setting = Object.assign(
      { id: branch.id, name: branch.name, configured: true },
      encryptedPin('unavailable-secret', '123456')
    );
    const handler = registerRoutes(makePool(setting))['GET /api/admin/branch-pins/:slug'];
    const response = makeResponse();
    await handler({ params: { slug: restaurant.slug }, user: { restaurant_id: restaurant.id } }, response);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.branches[0].current_pin, null);
    assert.equal(response.body.branches[0].needs_reset, true);
  } finally {
    if (previousJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousJwtSecret;
    if (previousPinKey === undefined) delete process.env.CASHIER_PIN_ENCRYPTION_KEY;
    else process.env.CASHIER_PIN_ENCRYPTION_KEY = previousPinKey;
  }
});
