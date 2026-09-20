require('dotenv').config();

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function check() {
    try {
        console.log('\n=== MENU DATA ===');

        const menu = await pool.query(`
            SELECT
                restaurant_id,
                pg_typeof(menu) AS menu_type,
                length(menu::text) AS menu_size,
                updated_at
            FROM menu_data
            WHERE restaurant_id = 8
        `);

        console.table(menu.rows);

        console.log('\n=== ACTIVE DATABASE QUERIES ===');

        const activity = await pool.query(`
            SELECT
                pid,
                state,
                wait_event_type,
                wait_event,
                query_start,
                now() - query_start AS duration,
                query
            FROM pg_stat_activity
            WHERE datname = current_database()
            ORDER BY query_start
        `);

        console.table(activity.rows);

    } catch (error) {
        console.error('\nDATABASE ERROR:');
        console.error(error);
    } finally {
        await pool.end();
    }
}

check();
