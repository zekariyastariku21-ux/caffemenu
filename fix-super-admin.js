require('dotenv').config();

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
  query_timeout: 30000,
  max: 1
});

async function test() {
  try {
    await pool.query('SELECT 1');
    console.log('Connection ready');

    const start = Date.now();

    const result = await pool.query(`
      SELECT
        r.id,
        r.name,
        r.slug,
        r.status,
        md.menu,
        md.updated_at AS menu_updated_at,
        rp.logo,
        rp.phone_numbers,
        rp.addresses,
        rp.updated_at AS profile_updated_at
      FROM restaurants r
      LEFT JOIN menu_data md
        ON md.restaurant_id = r.id
      LEFT JOIN restaurant_profiles rp
        ON rp.restaurant_id = r.id
      WHERE r.slug = 'zekariyas-cafe'
      LIMIT 1
    `);

    console.log('FULL MENU QUERY:', Date.now() - start, 'ms');

    if (result.rows.length === 0) {
      console.log('NO RESTAURANT FOUND');
      return;
    }

    const row = result.rows[0];

    console.log('Restaurant:', row.name);
    console.log('Slug:', row.slug);
    console.log('Status:', row.status);
    console.log('Menu exists:', !!row.menu);
    console.log('Menu size:', JSON.stringify(row.menu || {}).length);
    console.log('Logo exists:', !!row.logo);
    console.log('Phones:', row.phone_numbers);
    console.log('Addresses:', row.addresses);

  } catch (error) {
    console.error('QUERY ERROR:', error);
  } finally {
    await pool.end();
  }
}

test();
