'use strict';
const crypto = require('crypto');

module.exports = function registerTelebirrRoutes(app, pool, requireRestaurantAdmin, getDeps) {
  let tableReady = null;

  function ensureTable() {
    if (!tableReady) {
      tableReady = pool.query(`
        CREATE TABLE IF NOT EXISTS branch_telebirr_settings (
          branch_id INTEGER PRIMARY KEY
            REFERENCES restaurant_payment_branches(id) ON DELETE CASCADE,
          restaurant_id INTEGER NOT NULL
            REFERENCES restaurants(id) ON DELETE CASCADE,
          enabled BOOLEAN NOT NULL DEFAULT TRUE,
          environment TEXT NOT NULL DEFAULT 'sandbox'
            CHECK (environment IN ('sandbox', 'production')),
          merchant_name TEXT NOT NULL DEFAULT '',
          merchant_code TEXT NOT NULL DEFAULT '',
          merchant_app_id TEXT NOT NULL DEFAULT '',
          fabric_app_id TEXT NOT NULL DEFAULT '',
          app_secret_encrypted TEXT NOT NULL DEFAULT '',
          private_key_encrypted TEXT NOT NULL DEFAULT '',
          notify_url TEXT NOT NULL DEFAULT '',
          return_url TEXT NOT NULL DEFAULT '',
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `).then(function () {
        return pool.query("ALTER TABLE branch_telebirr_settings ADD COLUMN IF NOT EXISTS cash_enabled BOOLEAN NOT NULL DEFAULT FALSE");
      }).catch(function (e) { tableReady = null; throw e; });
    }
    return tableReady;
  }

  /* ---------- AES-256-GCM ---------- */
  function encKey() {
    const hex = process.env.TELEBIRR_ENC_KEY || '';
    if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
      throw new Error('TELEBIRR_ENC_KEY must be 64 hex characters.');
    }
    return Buffer.from(hex, 'hex');
  }
  function encrypt(text) {
    const iv = crypto.randomBytes(12);
    const c = crypto.createCipheriv('aes-256-gcm', encKey(), iv);
    const data = Buffer.concat([c.update(text, 'utf8'), c.final()]);
    return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), data.toString('base64')].join(':');
  }
  function decrypt(stored) {
    const p = String(stored || '').split(':');
    if (p.length !== 4 || p[0] !== 'v1') throw new Error('Bad ciphertext.');
    const d = crypto.createDecipheriv('aes-256-gcm', encKey(), Buffer.from(p[1], 'base64'));
    d.setAuthTag(Buffer.from(p[2], 'base64'));
    return Buffer.concat([d.update(Buffer.from(p[3], 'base64')), d.final()]).toString('utf8');
  }
  function maskSecret(stored) {
    if (!stored) return '';
    try {
      const plain = decrypt(stored);
      return '\u2022\u2022\u2022\u2022' + plain.slice(-4);
    } catch (e) {
      return '\u2022\u2022\u2022\u2022';
    }
  }

  /* ---------- helpers ---------- */
  const clean = (v, max) => String(v == null ? '' : v).trim().slice(0, max);

  function httpsUrlOrEmpty(v, label) {
    const s = clean(v, 500);
    if (!s) return '';
    let u;
    try { u = new URL(s); } catch (e) { throw new Error(label + ' is not a valid URL.'); }
    if (u.protocol !== 'https:') throw new Error(label + ' must start with https://');
    return s;
  }

  async function authorizedRestaurantId(req, res) {
    const r = await pool.query('SELECT id FROM restaurants WHERE slug = $1 LIMIT 1', [req.params.slug]);
    if (!r.rows.length) {
      res.status(404).json({ ok: false, message: 'Restaurant not found.' });
      return null;
    }
    const restaurantId = r.rows[0].id;
    const { isSuperAdminRole } = getDeps();
    if (!isSuperAdminRole(req.user.role)) {
      const own = req.user.restaurant_id != null ? req.user.restaurant_id : req.user.restaurantId;
      if (Number(own) !== restaurantId) {
        res.status(403).json({ ok: false, message: 'Access denied.' });
        return null;
      }
    }
    return restaurantId;
  }

  function publicShape(row) {
    return {
      branch_id: row.id,
      branch_name: row.name,
      enabled: row.enabled == null ? true : row.enabled === true,
      cash_enabled: row.cash_enabled === true,
      environment: row.environment || 'sandbox',
      merchant_name: row.merchant_name || '',
      merchant_code: row.merchant_code || '',
      merchant_app_id: row.merchant_app_id || '',
      fabric_app_id: row.fabric_app_id || '',
      notify_url: row.notify_url || '',
      return_url: row.return_url || '',
      has_app_secret: !!row.app_secret_encrypted,
      app_secret_masked: maskSecret(row.app_secret_encrypted),
      has_private_key: !!row.private_key_encrypted,
      updated_at: row.updated_at || null
    };
  }

  /* ---------- admin: list all branches with their Telebirr settings ---------- */
  app.get('/api/admin/telebirr/:slug', requireRestaurantAdmin, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      await ensureTable();
      const restaurantId = await authorizedRestaurantId(req, res);
      if (restaurantId == null) return;
      const r = await pool.query(`
        SELECT b.id, b.name, t.enabled, t.cash_enabled, t.environment, t.merchant_name, t.merchant_code,
               t.merchant_app_id, t.fabric_app_id, t.app_secret_encrypted,
               t.private_key_encrypted, t.notify_url, t.return_url, t.updated_at
        FROM restaurant_payment_branches b
        LEFT JOIN branch_telebirr_settings t ON t.branch_id = b.id
        WHERE b.restaurant_id = $1 AND b.order_now_enabled = TRUE
        ORDER BY b.id ASC
      `, [restaurantId]);
      res.json({ ok: true, branches: r.rows.map(publicShape) });
    } catch (e) {
      console.error('[telebirr] list error:', e);
      res.status(500).json({ ok: false, message: 'Unable to load Telebirr settings.' });
    }
  });

  /* ---------- admin: save one branch ---------- */
  app.put('/api/admin/telebirr/:slug/:branchId', requireRestaurantAdmin, async (req, res) => {
    try {
      await ensureTable();
      const restaurantId = await authorizedRestaurantId(req, res);
      if (restaurantId == null) return;

      const branchId = Number(req.params.branchId);
      if (!Number.isSafeInteger(branchId) || branchId <= 0) {
        return res.status(400).json({ ok: false, message: 'Invalid branch.' });
      }
      const b = await pool.query(
        'SELECT id FROM restaurant_payment_branches WHERE id = $1 AND restaurant_id = $2',
        [branchId, restaurantId]
      );
      if (!b.rows.length) {
        return res.status(404).json({ ok: false, message: 'Branch not found.' });
      }

      const cur = (await pool.query(
        'SELECT * FROM branch_telebirr_settings WHERE branch_id = $1', [branchId]
      )).rows[0] || {};

      const body = req.body || {};
      const environment = body.environment === 'production' ? 'production' : 'sandbox';
      const next = {
        enabled: body.enabled === true,
        cash_enabled: body.cash_enabled !== false,
        environment,
        merchant_name: clean(body.merchant_name, 120),
        merchant_code: clean(body.merchant_code, 60),
        merchant_app_id: clean(body.merchant_app_id, 120),
        fabric_app_id: clean(body.fabric_app_id, 120),
        notify_url: httpsUrlOrEmpty(body.notify_url, 'Notify URL'),
        return_url: httpsUrlOrEmpty(body.return_url, 'Return URL'),
        app_secret_encrypted: cur.app_secret_encrypted || '',
        private_key_encrypted: cur.private_key_encrypted || ''
      };

      // Blank secret fields mean "keep the saved value".
      const newSecret = clean(body.app_secret, 500);
      if (newSecret) next.app_secret_encrypted = encrypt(newSecret);
      const newKey = String(body.private_key == null ? '' : body.private_key).trim();
      if (newKey) {
        if (newKey.length > 10000) throw new Error('Private key is too long.');
        next.private_key_encrypted = encrypt(newKey);
      }
      if (body.clear_secrets === true) {
        next.app_secret_encrypted = '';
        next.private_key_encrypted = '';
        next.enabled = false;
      }

      if (body.clear_secrets === true) next.cash_enabled = true;
      if (!next.enabled && !next.cash_enabled) {
        return res.status(400).json({ ok: false, message: 'At least one payment method must stay on. Turn on Cash or Telebirr.' });
      }
      if (next.enabled) {
        const missing = [];
        if (!next.merchant_code) missing.push('Short code');
        if (!next.merchant_app_id) missing.push('Merchant app ID');
        if (!next.fabric_app_id) missing.push('Fabric app ID');
        if (!next.app_secret_encrypted) missing.push('App secret');
        if (!next.private_key_encrypted) missing.push('Private key');
        if (!next.notify_url) missing.push('Notify URL');
        if (missing.length) {
          return res.status(400).json({
            ok: false,
            message: 'Cannot enable Telebirr. Missing: ' + missing.join(', ') + '.'
          });
        }
      }

      await pool.query(`
        INSERT INTO branch_telebirr_settings
          (branch_id, restaurant_id, enabled, environment, merchant_name, merchant_code,
           merchant_app_id, fabric_app_id, app_secret_encrypted, private_key_encrypted,
           notify_url, return_url, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
        ON CONFLICT (branch_id) DO UPDATE SET
          enabled = EXCLUDED.enabled,
          environment = EXCLUDED.environment,
          merchant_name = EXCLUDED.merchant_name,
          merchant_code = EXCLUDED.merchant_code,
          merchant_app_id = EXCLUDED.merchant_app_id,
          fabric_app_id = EXCLUDED.fabric_app_id,
          app_secret_encrypted = EXCLUDED.app_secret_encrypted,
          private_key_encrypted = EXCLUDED.private_key_encrypted,
          notify_url = EXCLUDED.notify_url,
          return_url = EXCLUDED.return_url,
          updated_at = NOW()
      `, [branchId, restaurantId, next.enabled, next.environment, next.merchant_name,
          next.merchant_code, next.merchant_app_id, next.fabric_app_id,
          next.app_secret_encrypted, next.private_key_encrypted, next.notify_url, next.return_url]);

      await pool.query("UPDATE branch_telebirr_settings SET cash_enabled = $2 WHERE branch_id = $1", [branchId, next.cash_enabled]);
      res.json({ ok: true, message: 'Telebirr settings saved.' });
    } catch (e) {
      const isInput = /URL|too long/.test(e.message);
      if (!isInput) console.error('[telebirr] save error:', e);
      res.status(isInput ? 400 : 500).json({
        ok: false,
        message: isInput ? e.message : 'Unable to save Telebirr settings.'
      });
    }
  });

  /* ---------- public: which branches accept Telebirr (no secrets) ---------- */
  app.get('/api/public/telebirr-branches/:slug', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      await ensureTable();
      const r = await pool.query(`
        SELECT b.id
        FROM restaurants rs
        JOIN restaurant_payment_branches b ON b.restaurant_id = rs.id
        JOIN branch_telebirr_settings t ON t.branch_id = b.id
        WHERE rs.slug = $1 AND rs.status = 'active' AND t.enabled = TRUE AND b.order_now_enabled = TRUE
        ORDER BY b.id ASC
      `, [req.params.slug]);
      res.json({ ok: true, branch_ids: r.rows.map(x => x.id) });
    } catch (e) {
      console.error('[telebirr] public error:', e);
      res.status(500).json({ ok: false, branch_ids: [] });
    }
  });

﻿  /* ---------- pending Telebirr orders: created only after payment is verified ---------- */
  let pendingReady = null;
  function ensurePending() {
    if (!pendingReady) {
      pendingReady = pool.query(`
        CREATE TABLE IF NOT EXISTS telebirr_pending_orders (
          id BIGSERIAL PRIMARY KEY,
          restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
          branch_id INTEGER NOT NULL,
          customer_account_id BIGINT NOT NULL,
          payload JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`).catch(function (e) { pendingReady = null; throw e; });
    }
    return pendingReady;
  }

  async function createPending(p) {
    await ensurePending();
    await pool.query("DELETE FROM telebirr_pending_orders WHERE created_at < NOW() - INTERVAL '1 day'");
    const r = await pool.query(
      'INSERT INTO telebirr_pending_orders (restaurant_id, branch_id, customer_account_id, payload) VALUES ($1,$2,$3,$4::jsonb) RETURNING id',
      [p.restaurantId, p.branchId, p.customerAccountId, JSON.stringify(p)]);
    return r.rows[0];
  }

  /* ---------- TEST MODE payment (sandbox only). The real verified Telebirr notify callback replaces this. ---------- */
  app.post('/api/telebirr/:slug/test-pay/:paymentId', async (req, res) => {
    const client = await pool.connect();
    try {
      await ensureTable(); await ensurePending();
      const paymentId = Number(req.params.paymentId);
      if (!Number.isSafeInteger(paymentId) || paymentId <= 0) {
        return res.status(400).json({ ok: false, message: 'Invalid payment.' });
      }
      const rs = await pool.query("SELECT id FROM restaurants WHERE slug = $1 AND status = 'active' LIMIT 1", [req.params.slug]);
      if (!rs.rows.length) return res.status(404).json({ ok: false, message: 'Restaurant not found.' });
      const restaurantId = rs.rows[0].id;

      const { customerAccounts, broadcastOrderEvent } = getDeps();
      const customer = await customerAccounts.getCustomerFromRequest(req, restaurantId);
      if (!customer) return res.status(401).json({ ok: false, message: 'Please log in again.' });

      await client.query('BEGIN');
      const sel = await client.query(
        "SELECT * FROM telebirr_pending_orders WHERE id = $1 AND restaurant_id = $2 AND customer_account_id = $3 AND created_at > NOW() - INTERVAL '30 minutes' FOR UPDATE",
        [paymentId, restaurantId, customer.id]);
      if (!sel.rows.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ ok: false, message: 'Payment session expired. Please place the order again.' });
      }
      const p = sel.rows[0].payload;
      const cfg = await client.query(
        "SELECT 1 FROM branch_telebirr_settings t WHERE t.branch_id = $1 AND t.environment = 'sandbox' AND t.enabled = TRUE AND t.merchant_code <> '' AND t.merchant_app_id <> '' AND t.fabric_app_id <> '' AND t.app_secret_encrypted <> '' AND t.private_key_encrypted <> '' AND t.notify_url <> ''",
        [p.branchId]);
      if (!cfg.rows.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ ok: false, message: 'Telebirr test payment is not available for this branch.' });
      }
      const ins = await client.query(
        `INSERT INTO customer_orders (restaurant_id, branch_id, branch_name, customer_name, customer_phone, order_type,
           table_number, customer_address, items, total, customer_account_id, payment_method, payment_status, paid_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,'telebirr','paid',NOW())
         RETURNING id, status, created_at, total`,
        [restaurantId, p.branchId, p.branchName, p.customerName, p.customerPhone, p.orderType,
         p.tableNumber, p.customerAddress, JSON.stringify(p.items), p.total, customer.id]);
      await client.query('DELETE FROM telebirr_pending_orders WHERE id = $1', [paymentId]);
      const order = ins.rows[0];
      const dn = await client.query(
        'SELECT COUNT(*)::int AS n FROM customer_orders WHERE restaurant_id = $1 AND id <= $2', [restaurantId, order.id]);
      await client.query('COMMIT');

      const displayNumber = dn.rows[0].n;
      try {
        broadcastOrderEvent(req.params.slug, 'new-order', {
          order_number: displayNumber, branch_id: p.branchId, branch_name: p.branchName, order_type: p.orderType
        });
      } catch (e) { console.error('[telebirr] broadcast failed:', e.message); }

      res.status(201).json({ ok: true, test_mode: true, message: 'Payment verified (TEST MODE). Order placed.',
        order: { id: order.id, display_number: displayNumber, status: order.status, created_at: order.created_at, total: Number(order.total) } });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (x) {}
      console.error('[telebirr] test-pay error:', e);
      res.status(500).json({ ok: false, message: 'Payment failed. Please try again.' });
    } finally { client.release(); }
  });

  /* ---------- public: which payment methods each branch offers ---------- */
  app.get('/api/public/payment-methods/:slug', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      await ensureTable();
      const r = await pool.query(
        "SELECT b.id, COALESCE(t.cash_enabled, FALSE) AS cash, COALESCE(t.enabled AND t.merchant_code <> '' AND t.merchant_app_id <> '' AND t.fabric_app_id <> '' AND t.app_secret_encrypted <> '' AND t.private_key_encrypted <> '' AND t.notify_url <> '', FALSE) AS telebirr " +
        "FROM restaurants rs " +
        "JOIN restaurant_payment_branches b ON b.restaurant_id = rs.id " +
        "LEFT JOIN branch_telebirr_settings t ON t.branch_id = b.id " +
        "WHERE rs.slug = $1 AND rs.status = 'active' AND b.order_now_enabled = TRUE " +
        "ORDER BY b.id ASC", [req.params.slug]);
      res.json({ ok: true, branches: r.rows.map(function (x) { return Object.assign({}, x, { cash: x.cash === true && cashAllowed() }); }) });
    } catch (e) {
      console.error('[telebirr] methods error:', e);
      res.status(500).json({ ok: false, branches: [] });
    }
  });

  // Cash is a temporary testing option. Set CASH_PAYMENT_ENABLED=false in .env to remove it everywhere.
  function cashAllowed() { return String(process.env.CASH_PAYMENT_ENABLED || 'true').toLowerCase() !== 'false'; }

  async function branchMethods(branchId) {
    await ensureTable();
    const r = await pool.query(
      "SELECT t.enabled, t.cash_enabled, (t.enabled = TRUE AND t.merchant_code <> '' AND t.merchant_app_id <> '' AND t.fabric_app_id <> '' AND t.app_secret_encrypted <> '' AND t.private_key_encrypted <> '' AND t.notify_url <> '') AS ready FROM branch_telebirr_settings t WHERE t.branch_id = $1", [branchId]);
    const row = r.rows[0];
    if (!row) return { cash: false, telebirr: false };
    return { cash: row.cash_enabled === true && cashAllowed(), telebirr: row.ready === true };
  }

  return { encrypt, decrypt, branchMethods, createPending };
};
