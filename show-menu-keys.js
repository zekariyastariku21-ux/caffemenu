require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    const result = await pool.query(`
      SELECT id, jsonb_object_keys(menu) AS category
      FROM menu_data
      ORDER BY id
    `);

    console.table(result.rows);

    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
