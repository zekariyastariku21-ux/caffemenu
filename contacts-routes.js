'use strict';
module.exports = function registerContactRoutes(app, pool, requireRestaurantAdmin) {
  pool.query(`
    CREATE TABLE IF NOT EXISTS restaurant_contacts (
      restaurant_id INTEGER PRIMARY KEY REFERENCES restaurants(id) ON DELETE CASCADE,
      central_phones JSONB NOT NULL DEFAULT '[]'::jsonb,
      branches JSONB NOT NULL DEFAULT '[]'::jsonb,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `).catch(function (e) { console.error('[contacts] table error:', e); });

  function txt(v, max) { return String(v == null ? '' : v).trim().slice(0, max); }

  function cleanPhones(list) {
    return (Array.isArray(list) ? list : []).slice(0, 20).map(function (p) {
      return { name: txt(p && p.name, 80), phone: txt(p && p.phone, 40) };
    }).filter(function (p) { return p.name && p.phone; });
  }

  function cleanBranches(list) {
    var seen = {};
    return (Array.isArray(list) ? list : []).slice(0, 50).map(function (b) {
      return {
        name: txt(b && b.name, 80),
        phone: txt(b && b.phone, 40),
        contact_name: txt(b && b.contact_name, 80),
        address: txt(b && b.address, 300)
      };
    }).filter(function (b) {
      if (!b.name || seen[b.name]) return false;
      seen[b.name] = true;
      return true;
    });
  }

  async function findRestaurant(slug) {
    var r = await pool.query(
      'SELECT id, slug, status FROM restaurants WHERE slug = $1 LIMIT 1', [slug]);
    return r.rows[0] || null;
  }

  async function readContacts(id) {
    var r = await pool.query(
      'SELECT central_phones, branches FROM restaurant_contacts WHERE restaurant_id = $1 LIMIT 1', [id]);
    if (r.rows.length) {
      var row = r.rows[0];
      return {
        central_phones: Array.isArray(row.central_phones) ? row.central_phones : [],
        branches: Array.isArray(row.branches) ? row.branches : []
      };
    }
    // Nothing saved yet: show the current order branches (names only).
    var old = await pool.query(
      'SELECT name FROM restaurant_payment_branches WHERE restaurant_id = $1 AND order_now_enabled = TRUE ORDER BY id ASC', [id]);
    return {
      central_phones: [],
      branches: old.rows.map(function (x) {
        return { name: x.name, phone: '', contact_name: '', address: '' };
      })
    };
  }

  function ownsRestaurant(req, restaurant) {
    return !(req.user && req.user.role === 'cafe_admin' &&
      Number(req.user.restaurant_id) !== Number(restaurant.id));
  }

  app.get('/api/admin/contacts/:slug', requireRestaurantAdmin, async function (req, res) {
    try {
      var restaurant = await findRestaurant(req.params.slug);
      if (!restaurant) return res.status(404).json({ ok: false, message: 'Restaurant not found.' });
      if (!ownsRestaurant(req, restaurant)) {
        return res.status(403).json({ ok: false, message: 'You can only access your own restaurant.' });
      }
      var data = await readContacts(restaurant.id);
      return res.json({ ok: true, central_phones: data.central_phones, branches: data.branches });
    } catch (error) {
      console.error('[contacts:get] Error:', error);
      return res.status(500).json({ ok: false, message: 'Unable to load contacts.' });
    }
  });

  app.put('/api/admin/contacts/:slug', requireRestaurantAdmin, async function (req, res) {
    var client = null;
    try {
      var restaurant = await findRestaurant(req.params.slug);
      if (!restaurant) return res.status(404).json({ ok: false, message: 'Restaurant not found.' });
      if (!ownsRestaurant(req, restaurant)) {
        return res.status(403).json({ ok: false, message: 'You can only edit your own restaurant.' });
      }
      var phones = cleanPhones(req.body && req.body.central_phones);
      var branches = cleanBranches(req.body && req.body.branches);
      var names = branches.map(function (b) { return b.name; });

      client = await pool.connect();
      await client.query('BEGIN');

      await client.query(`
        INSERT INTO restaurant_contacts (restaurant_id, central_phones, branches, updated_at)
        VALUES ($1, $2::jsonb, $3::jsonb, NOW())
        ON CONFLICT (restaurant_id) DO UPDATE SET
          central_phones = EXCLUDED.central_phones,
          branches = EXCLUDED.branches,
          updated_at = NOW()
      `, [restaurant.id, JSON.stringify(phones), JSON.stringify(branches)]);

      // Mirror branch names into the table the order form reads.
      for (var i = 0; i < names.length; i++) {
        await client.query(`
          INSERT INTO restaurant_payment_branches (restaurant_id, name)
          VALUES ($1, $2)
          ON CONFLICT (restaurant_id, name) DO UPDATE SET
            order_now_enabled = TRUE,
            updated_at = NOW()
        `, [restaurant.id, names[i]]);
      }

      // Branches removed from the profile are hidden, not deleted.
      await client.query(`
        UPDATE restaurant_payment_branches
        SET order_now_enabled = FALSE, updated_at = NOW()
        WHERE restaurant_id = $1
          AND order_now_enabled = TRUE
          AND NOT (name = ANY($2::text[]))
      `, [restaurant.id, names]);

      await client.query('COMMIT');
      return res.json({ ok: true, central_phones: phones, branches: branches });
    } catch (error) {
      if (client) { try { await client.query('ROLLBACK'); } catch (e) {} }
      console.error('[contacts:put] Error:', error);
      return res.status(500).json({ ok: false, message: 'Unable to save contacts.' });
    } finally {
      if (client) client.release();
    }
  });

  app.get('/api/menu/:slug/contacts', async function (req, res) {
    try {
      res.set('Cache-Control', 'no-store');
      var restaurant = await findRestaurant(req.params.slug);
      if (!restaurant) return res.status(404).json({ ok: false, message: 'Restaurant not found.' });
      if (restaurant.status !== 'active') {
        return res.status(403).json({ ok: false, message: 'This restaurant is currently unavailable.' });
      }
      var data = await readContacts(restaurant.id);
      return res.json({ ok: true, central_phones: data.central_phones, branches: data.branches });
    } catch (error) {
      console.error('[contacts:public] Error:', error);
      return res.status(500).json({ ok: false, message: 'Unable to load contacts.' });
    }
  });
};