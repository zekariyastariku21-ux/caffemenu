require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  const slug = process.argv[2];
  const flags = process.argv.slice(3);
  const rest = await pool.query('SELECT id FROM restaurants WHERE slug = $1', [slug]);
  if (!rest.rows.length) { console.log('No restaurant with slug "' + slug + '"'); return; }
  const id = rest.rows[0].id;

  const c = await pool.query('SELECT branches FROM restaurant_contacts WHERE restaurant_id = $1', [id]);
  const hasProfile = c.rows.length > 0;
  const profile = hasProfile ? (c.rows[0].branches || []) : [];
  const names = profile.map(b => b.name);

  async function show(title) {
    const r = await pool.query(`
      SELECT b.id, b.name, b.order_now_enabled AS shown_in_order_form,
             (SELECT COUNT(*) FROM customer_orders o WHERE o.branch_id = b.id) AS orders
      FROM restaurant_payment_branches b WHERE b.restaurant_id = $1 ORDER BY b.id`, [id]);
    console.log('\n' + title); console.table(r.rows);
  }

  console.log('\nBranches saved in the Profile modal:');
  console.log(hasProfile ? names : '(none saved yet - Profile branches were never saved)');
  await show('Branches in the order form table:');

  if (flags.includes('--sync')) {
    if (!hasProfile) { console.log('Refusing to sync: open Profile, set your branches, click Save Profile first.'); return; }
    for (const n of names) {
      await pool.query(`INSERT INTO restaurant_payment_branches (restaurant_id, name) VALUES ($1, $2)
        ON CONFLICT (restaurant_id, name) DO UPDATE SET order_now_enabled = TRUE, updated_at = NOW()`, [id, n]);
    }
    await pool.query(`UPDATE restaurant_payment_branches SET order_now_enabled = FALSE, updated_at = NOW()
      WHERE restaurant_id = $1 AND order_now_enabled = TRUE AND NOT (name = ANY($2::text[]))`, [id, names]);
    console.log('Synced: the order form now shows only the Profile branches.');
  }

  if (flags.includes('--purge')) {
    const d = await pool.query(`DELETE FROM restaurant_payment_branches b
      WHERE b.restaurant_id = $1 AND b.order_now_enabled = FALSE
        AND NOT EXISTS (SELECT 1 FROM customer_orders o WHERE o.branch_id = b.id)
      RETURNING b.name`, [id]);
    console.log('Deleted hidden branches with no orders:', d.rows.map(x => x.name));
  }

  if (flags.length) await show('Now:');
})().catch(e => console.error(e.message)).finally(() => pool.end());