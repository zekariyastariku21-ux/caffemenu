require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false
});

async function createAdmin() {
  try {
    const restaurant = await pool.query(
      `
      SELECT id, name, slug
      FROM restaurants
      WHERE slug = $1
      `,
      ['zekariyas-cafe']
    );

    if (restaurant.rows.length === 0) {
      console.log('Zekariyas Cafe not found.');
      return;
    }

    const cafe = restaurant.rows[0];

    const result = await pool.query(
      `
      INSERT INTO users (restaurant_id, email, password, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email)
      DO UPDATE SET
        restaurant_id = EXCLUDED.restaurant_id,
        password = EXCLUDED.password,
        role = EXCLUDED.role
      RETURNING id, email, role, restaurant_id
      `,
      [cafe.id, 'zekariyas@cafe.com', 'zekariyas123', 'cafe_admin']
    );

    console.log('Zekariyas Cafe admin created successfully:');
    console.table(result.rows);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

createAdmin();

