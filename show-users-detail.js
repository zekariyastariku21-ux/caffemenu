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
        users.id,
        users.email,
        users.role,
        users.restaurant_id,
        restaurants.name AS cafe_name,
        restaurants.slug
      FROM users
      LEFT JOIN restaurants
        ON users.restaurant_id = restaurants.id
      ORDER BY users.id
    `);

    console.table(result.rows);
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();