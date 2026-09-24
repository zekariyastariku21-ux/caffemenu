require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function resetPassword() {
  try {
    const result = await pool.query(
      `
      UPDATE users
      SET password = $1
      WHERE email = $2
      RETURNING id, email, role, restaurant_id
      `,
      ['etete123', 'etete@cafe.com']
    );

    if (result.rows.length === 0) {
      console.log('Etete admin not found.');
    } else {
      console.log('Etete admin password reset successfully:');
      console.table(result.rows);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

resetPassword();
