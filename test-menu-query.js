require('dotenv').config();

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    connectionTimeoutMillis: 15000,
    query_timeout: 30000,
    max: 1
});

async function test() {
    try {
        let start;

        start = Date.now();
        let result = await pool.query(
            "SELECT id, name, slug, status FROM restaurants WHERE slug = 'zekariyas-cafe' LIMIT 1"
        );
        console.log(
            'Restaurant:',
            Date.now() - start,
            'ms',
            result.rows
        );

        start = Date.now();
        result = await pool.query(
            'SELECT restaurant_id, menu FROM menu_data WHERE restaurant_id = 8'
        );
        console.log(
            'Menu:',
            Date.now() - start,
            'ms',
            result.rows.length,
            'rows'
        );

        start = Date.now();
        result = await pool.query(
            'SELECT restaurant_id, logo, phone_numbers, addresses FROM restaurant_profiles WHERE restaurant_id = 8'
        );
        console.log(
            'Profile:',
            Date.now() - start,
            'ms',
            result.rows.length,
            'rows'
        );

    } catch (error) {
        console.error('ERROR:', error);
    } finally {
        await pool.end();
    }
}

test();