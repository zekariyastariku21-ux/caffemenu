require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    await pool.query(`
      INSERT INTO users (
        restaurant_id,
        email,
        password,
        role
      )
      VALUES (
        NULL,
        'admin@example.com',
        'admin123',
        'super_admin'
      )
      ON CONFLICT (email) DO NOTHING;
    `);

    console.log('Owner account created');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();

