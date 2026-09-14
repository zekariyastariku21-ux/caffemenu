require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    const restaurant = await pool.query(
      'SELECT id FROM restaurants WHERE slug = $1',
      ['etete-coffee']
    );

    if (restaurant.rows.length === 0) {
      console.log('Etete Coffee not found');
      process.exit(1);
    }

    const restaurantId = restaurant.rows[0].id;

    await pool.query(
      `
      INSERT INTO users (
        restaurant_id,
        email,
        password,
        role
      )
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email)
      DO UPDATE SET
        restaurant_id = EXCLUDED.restaurant_id,
        password = EXCLUDED.password,
        role = EXCLUDED.role
      `,
      [
        restaurantId,
        'etete@cafe.com',
        'etete123',
        'cafe_admin'
      ]
    );

    console.log('Etete Coffee admin created');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();