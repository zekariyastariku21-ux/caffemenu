'use strict';
const crypto = require('crypto');

module.exports = function registerBranchCashierRoutes(app, pool, requireRestaurantAdmin, deps) {
  let tableReady = null;
  function ensureTable() {
    if (!tableReady) {
      tableReady = pool.query(`
        CREATE TABLE IF NOT EXISTS restaurant_branch_pins (
          branch_id INTEGER PRIMARY KEY REFERENCES restaurant_payment_branches(id) ON DELETE CASCADE,
          restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
          pin_salt TEXT NOT NULL,
          pin_hash TEXT NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `).catch(function (e) { tableReady = null; throw e; });
    }
    return tableReady;
  }

  function cashierGuard(req, res, next) { return deps().requireCashier(req, res, next); }

  async function findRestaurant(slug) {
    const r = await pool.query(
      'SELECT id, name, slug FROM restaurants WHERE slug = $1 LIMIT 1',
      [String(slug || '').trim()]
    );
    return r.rows[0] || null;
  }

  function adminAllowed(req, restaurant) {
    const d = deps();
    return d.isSuperAdminRole(req.user && req.user.role) ||
      Number(req.user && req.user.restaurant_id) === Number(restaurant.id);
  }

  function clearAttempts(restaurantId) {
    const map = deps().cashierPinAttempts;
    Array.from(map.keys()).forEach(function (key) {
      if (String(key).startsWith(restaurantId + ':')) map.delete(key);
    });
  }

  const ORDER_COLUMNS = `
    (
      SELECT COUNT(*)::int
      FROM customer_orders AS earlier
      WHERE earlier.restaurant_id = customer_orders.restaurant_id
        AND earlier.id <= customer_orders.id
    ) AS display_number,
    id, status, created_at, preparing_at, ready_at, completed_at,
    customer_name, customer_phone, branch_name, order_type,
    table_number, customer_address, items, total`;

  function mapOrders(rows) {
    return rows.map(function (order) {
      return Object.assign({}, order, {
        total: Number(order.total),
        items: Array.isArray(order.items) ? order.items : []
      });
    });
  }

  /* ---------- admin: list branches + PIN status ---------- */
  app.get('/api/admin/branch-pins/:slug', requireRestaurantAdmin, async function (req, res) {
    try {
      const restaurant = await findRestaurant(req.params.slug);
      if (!restaurant) return res.status(404).json({ ok: false, message: 'Restaurant not found.' });
      if (!adminAllowed(req, restaurant)) {
        return res.status(403).json({ ok: false, message: 'You are not authorized to manage this restaurant.' });
      }
      await ensureTable();
      const branches = await pool.query(`
        SELECT b.id, b.name, (p.branch_id IS NOT NULL) AS configured
        FROM restaurant_payment_branches b
        LEFT JOIN restaurant_branch_pins p ON p.branch_id = b.id
        WHERE b.restaurant_id = $1 AND b.order_now_enabled = TRUE
        ORDER BY b.id ASC`, [restaurant.id]);
      const shared = await pool.query(
        'SELECT 1 FROM restaurant_cashier_settings WHERE restaurant_id = $1', [restaurant.id]);
      res.set('Cache-Control', 'no-store');
      return res.json({ ok: true, branches: branches.rows, shared_configured: shared.rows.length > 0 });
    } catch (error) {
      console.error('[branch-pins:list] Failed:', error);
      return res.status(500).json({ ok: false, message: 'Unable to load branch PIN settings.' });
    }
  });

  /* ---------- admin: set one branch PIN ---------- */
  app.put('/api/admin/branch-pins/:slug/:branchId', requireRestaurantAdmin, async function (req, res) {
    try {
      const pin = String((req.body && req.body.pin) || '');
      if (!/^\d{6,12}$/.test(pin)) {
        return res.status(400).json({ ok: false, message: 'PIN must contain 6 to 12 digits.' });
      }
      const branchId = Number(req.params.branchId);
      if (!Number.isSafeInteger(branchId) || branchId <= 0) {
        return res.status(400).json({ ok: false, message: 'Invalid branch.' });
      }
      const restaurant = await findRestaurant(req.params.slug);
      if (!restaurant) return res.status(404).json({ ok: false, message: 'Restaurant not found.' });
      if (!adminAllowed(req, restaurant)) {
        return res.status(403).json({ ok: false, message: 'You are not authorized to manage this restaurant.' });
      }
      const branch = await pool.query(
        `SELECT id FROM restaurant_payment_branches
         WHERE id = $1 AND restaurant_id = $2 AND order_now_enabled = TRUE`,
        [branchId, restaurant.id]);
      if (!branch.rows.length) return res.status(404).json({ ok: false, message: 'Branch not found.' });

      await ensureTable();
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = deps().hashCashierPin(pin, salt);
      await pool.query(`
        INSERT INTO restaurant_branch_pins (branch_id, restaurant_id, pin_salt, pin_hash, updated_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (branch_id) DO UPDATE SET
          pin_salt = EXCLUDED.pin_salt,
          pin_hash = EXCLUDED.pin_hash,
          updated_at = NOW()`, [branchId, restaurant.id, salt, hash]);
      clearAttempts(restaurant.id);
      res.set('Cache-Control', 'no-store');
      return res.json({ ok: true, message: 'Branch cashier PIN saved.' });
    } catch (error) {
      console.error('[branch-pins:save] Failed:', error);
      return res.status(500).json({ ok: false, message: 'Unable to save branch PIN.' });
    }
  });

  /* ---------- cashier login: branch + PIN ---------- */
  app.post('/api/cashier/login/:slug', async function (req, res) {
    try {
      const d = deps();
      const pin = String((req.body && req.body.pin) || '');
      const branchId = Number(req.body && req.body.branch_id);
      const restaurant = await findRestaurant(req.params.slug);
      if (!restaurant) return res.status(404).json({ ok: false, message: 'Restaurant not found.' });
      if (!Number.isSafeInteger(branchId) || branchId <= 0) {
        return res.status(400).json({ ok: false, message: 'Select your branch.' });
      }
      const branchResult = await pool.query(
        `SELECT id, name FROM restaurant_payment_branches
         WHERE id = $1 AND restaurant_id = $2 AND order_now_enabled = TRUE LIMIT 1`,
        [branchId, restaurant.id]);
      const branch = branchResult.rows[0];
      if (!branch) return res.status(400).json({ ok: false, message: 'Select a valid branch.' });

      const attemptKey = restaurant.id + ':' + branch.id + ':' +
        (req.ip || (req.socket && req.socket.remoteAddress) || 'unknown');
      const attempts = d.cashierPinAttempts;
      const attempt = attempts.get(attemptKey);
      const now = Date.now();
      res.set('Cache-Control', 'no-store');

      if (attempt && attempt.lockedUntil && attempt.lockedUntil > now) {
        return res.status(429).json({ ok: false, message: 'Too many incorrect PIN attempts. Please try again in 15 minutes.' });
      }

      await ensureTable();
      let setting = (await pool.query(
        'SELECT pin_salt, pin_hash FROM restaurant_branch_pins WHERE branch_id = $1', [branch.id])).rows[0];
      if (!setting) {
        setting = (await pool.query(
          'SELECT pin_salt, pin_hash FROM restaurant_cashier_settings WHERE restaurant_id = $1',
          [restaurant.id])).rows[0];
      }
      if (!setting) {
        return res.status(403).json({
          ok: false,
          code: 'CASHIER_PIN_NOT_CONFIGURED',
          message: 'The administrator has not set a cashier PIN for this branch yet.'
        });
      }

      const valid = /^\d{6,12}$/.test(pin) &&
        d.safeCompareCashierPin(pin, setting.pin_salt, setting.pin_hash);

      if (!valid) {
        const failures = ((attempt && attempt.failures) || 0) + 1;
        const locked = failures >= d.CASHIER_PIN_MAX_ATTEMPTS;
        attempts.set(attemptKey, { failures: failures, lockedUntil: locked ? now + d.CASHIER_PIN_LOCK_MS : 0 });
        return res.status(locked ? 429 : 401).json({
          ok: false,
          message: locked
            ? 'Too many incorrect PIN attempts. Please try again in 15 minutes.'
            : 'Incorrect cashier PIN.'
        });
      }

      attempts.delete(attemptKey);
      const token = d.jwt.sign(
        {
          role: 'cashier',
          restaurant_id: restaurant.id,
          restaurant_slug: restaurant.slug,
          restaurant_name: restaurant.name,
          branch_id: branch.id,
          branch_name: branch.name
        },
        process.env.JWT_SECRET,
        { expiresIn: Math.floor(d.CASHIER_SESSION_MS / 1000) }
      );
      res.cookie('cashierToken', token, d.cashierCookieOptions());
      return res.json({
        ok: true,
        restaurant: { name: restaurant.name, slug: restaurant.slug },
        branch: { id: branch.id, name: branch.name }
      });
    } catch (error) {
      console.error('[cashier:login] Failed:', error);
      return res.status(500).json({ ok: false, message: 'Unable to sign in right now.' });
    }
  });

  /* ---------- cashier: orders of their own branch only ---------- */
  async function cashierBranch(req) {
    const c = req.cashier || {};
    if (!c.branch_id) return null;
    const r = await pool.query(
      `SELECT id, name FROM restaurant_payment_branches
       WHERE id = $1 AND restaurant_id = $2 AND order_now_enabled = TRUE LIMIT 1`,
      [c.branch_id, c.restaurant_id]);
    return r.rows[0] || null;
  }

  app.get('/api/cashier/orders/:slug', cashierGuard, async function (req, res) {
    try {
      const slug = String(req.params.slug || '').trim();
      if (slug !== req.cashier.restaurant_slug) {
        return res.status(403).json({ ok: false, message: 'You are not authorized to view these orders.' });
      }
      const branch = await cashierBranch(req);
      if (!branch) {
        return res.status(401).json({
          ok: false,
          code: 'CASHIER_SESSION_INVALID',
          message: 'Please sign in again and choose your branch.'
        });
      }
      const orders = await pool.query(
        `SELECT ${ORDER_COLUMNS}
         FROM customer_orders
         WHERE restaurant_id = $1 AND branch_id = $2
         ORDER BY created_at DESC, id DESC
         LIMIT 100`,
        [req.cashier.restaurant_id, branch.id]);
      res.set('Cache-Control', 'no-store');
      return res.json({
        ok: true,
        restaurant: { name: (req.cashier.restaurant_name || slug) + ' - ' + branch.name, slug: slug },
        branch: { id: branch.id, name: branch.name },
        orders: mapOrders(orders.rows)
      });
    } catch (error) {
      console.error('[cashier:orders] Failed:', error);
      return res.status(500).json({ ok: false, message: 'Unable to load orders right now.' });
    }
  });

  app.patch('/api/cashier/orders/:slug/:orderId/status', cashierGuard, async function (req, res) {
    try {
      const slug = String(req.params.slug || '').trim();
      if (slug !== req.cashier.restaurant_slug) {
        return res.status(403).json({ ok: false, message: 'You are not authorized to update these orders.' });
      }
      const branch = await cashierBranch(req);
      if (!branch) {
        return res.status(401).json({
          ok: false,
          code: 'CASHIER_SESSION_INVALID',
          message: 'Please sign in again and choose your branch.'
        });
      }
      if (!/^\d+$/.test(String(req.params.orderId || ''))) {
        return res.status(400).json({ ok: false, message: 'Invalid order.' });
      }
      const own = await pool.query(
        'SELECT 1 FROM customer_orders WHERE id = $1 AND restaurant_id = $2 AND branch_id = $3',
        [req.params.orderId, req.cashier.restaurant_id, branch.id]);
      if (!own.rows.length) {
        return res.status(404).json({ ok: false, message: 'Order not found for your branch.' });
      }
      res.set('Cache-Control', 'no-store');
      return await deps().applyCustomerOrderStatus(
        req.cashier.restaurant_id, req.params.orderId, req.body && req.body.status, res);
    } catch (error) {
      console.error('[cashier:orders:update-status] Failed:', error);
      return res.status(500).json({ ok: false, message: 'Unable to update order status right now.' });
    }
  });

  /* ---------- admin: orders of one selected branch ---------- */
  app.get('/api/admin/orders/:slug', requireRestaurantAdmin, async function (req, res, next) {
    if (!req.query || req.query.branch_id === undefined || req.query.branch_id === '') return next();
    try {
      const branchId = Number(req.query.branch_id);
      if (!Number.isSafeInteger(branchId) || branchId <= 0) {
        return res.status(400).json({ ok: false, message: 'Invalid branch.' });
      }
      const restaurant = await findRestaurant(req.params.slug);
      if (!restaurant) return res.status(404).json({ ok: false, message: 'Restaurant not found.' });
      if (!adminAllowed(req, restaurant)) {
        return res.status(403).json({ ok: false, message: 'You are not authorized to view these orders.' });
      }
      const branch = (await pool.query(
        'SELECT id, name FROM restaurant_payment_branches WHERE id = $1 AND restaurant_id = $2',
        [branchId, restaurant.id])).rows[0];
      if (!branch) return res.status(404).json({ ok: false, message: 'Branch not found.' });

      const orders = await pool.query(
        `SELECT ${ORDER_COLUMNS}
         FROM customer_orders
         WHERE restaurant_id = $1 AND branch_id = $2
         ORDER BY created_at DESC, id DESC
         LIMIT 100`,
        [restaurant.id, branch.id]);
      res.set('Cache-Control', 'no-store');
      return res.json({
        ok: true,
        restaurant: { name: restaurant.name, slug: restaurant.slug },
        branch: { id: branch.id, name: branch.name },
        orders: mapOrders(orders.rows)
      });
    } catch (error) {
      console.error('[orders:list-branch] Failed:', error);
      return res.status(500).json({ ok: false, message: 'Unable to load orders.' });
    }
  });
};