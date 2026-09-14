require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    await pool.query(`
      INSERT INTO restaurants (name, slug)
      VALUES ('Etete Coffee', 'etete-coffee')
      ON CONFLICT (slug) DO NOTHING;
    `);

    console.log('Cafe created');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();