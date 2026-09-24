require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false
});

async function createMenu() {
  try {
    const result = await pool.query(
      `
      INSERT INTO menu_data (id, restaurant_id, menu)
      VALUES ($1, $2, $3)
      ON CONFLICT (restaurant_id) DO NOTHING
      RETURNING id, restaurant_id, menu
      `,
      [2, 2, {}]
    );

    if (result.rows.length === 0) {
      console.log('Zekariyas Cafe menu already exists.');
    } else {
      console.log('Zekariyas Cafe menu created successfully:');
      console.table(result.rows);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

createMenu();
