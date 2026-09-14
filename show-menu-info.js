require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        jsonb_typeof(menu) AS menu_type,
        jsonb_array_length(
          CASE
            WHEN jsonb_typeof(menu) = 'array' THEN menu
            ELSE '[]'::jsonb
          END
        ) AS menu_items
      FROM menu_data
    `);

    console.table(result.rows);
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();