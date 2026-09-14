require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'menu_data'
      ORDER BY ordinal_position
    `);

    console.log(result.rows);
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();