require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false
});

async function createCafe() {
  try {
    const result = await pool.query(
      `
      INSERT INTO restaurants (name, slug)
      VALUES ($1, $2)
      ON CONFLICT (slug) DO NOTHING
      RETURNING id, name, slug, status
      `,
      ['Zekariyas Cafe', 'zekariyas-cafe']
    );

    if (result.rows.length === 0) {
      console.log('Zekariyas Cafe already exists.');
    } else {
      console.log('Zekariyas Cafe created successfully:');
      console.table(result.rows);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

createCafe();
