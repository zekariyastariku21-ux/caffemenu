require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    const result = await pool.query(
      'SELECT * FROM restaurants'
    );

    console.table(result.rows);
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();

