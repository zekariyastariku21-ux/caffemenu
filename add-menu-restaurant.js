require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    await pool.query(`
      ALTER TABLE menu_data
      ADD COLUMN IF NOT EXISTS restaurant_id INTEGER;
    `);

    await pool.query(`
      UPDATE menu_data
      SET restaurant_id = 1
      WHERE id = 1;
    `);

    console.log('menu_data connected to Etete Coffee successfully.');

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
})();
