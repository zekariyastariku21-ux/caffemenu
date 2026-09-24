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

    console.table(result.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
})();
