require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

pool.query('SELECT restaurant_id FROM menu_data ORDER BY restaurant_id')
  .then(result => console.log(result.rows))
  .catch(error => console.error(error))
  .finally(() => pool.end());
