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
      ADD CONSTRAINT menu_data_restaurant_unique
      UNIQUE (restaurant_id);
    `);

    console.log('restaurant_id is now unique in menu_data.');

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
})();
