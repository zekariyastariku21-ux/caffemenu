require('dotenv').config();
const { Pool } = require('pg');
const url = process.env.DATABASE_URL;
if (!url) { console.log('DATABASE_URL not found in .env - tell Claude the variable name used in server.js'); process.exit(1); }
const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

(async () => {
  const slug = process.argv[2];
  const del = process.argv[3];
  const r = await pool.query(`
    SELECT b.id, b.name, b.order_now_enabled AS visible,
           (SELECT COUNT(*) FROM customer_orders o WHERE o.branch_id = b.id) AS orders
    FROM restaurant_payment_branches b
    JOIN restaurants r ON r.id = b.restaurant_id
    WHERE r.slug = $1 ORDER BY b.id`, [slug]);
  console.table(r.rows);

  if (del) {
    const row = r.rows.find(x => x.name === del);
    if (!row) console.log('No branch named "' + del + '"');
    else if (Number(row.orders) > 0) console.log('Not deleted: it has ' + row.orders + ' past orders.');
    else {
      await pool.query('DELETE FROM restaurant_payment_branches WHERE id = $1', [row.id]);
      console.log('Deleted branch: ' + del);
    }
  }
  await pool.end();
})().catch(e => { console.error(e.message); process.exit(1); });