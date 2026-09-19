require('dotenv').config();

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function fixSuperAdmin() {
    try {
        const email = 'zekariyastariku21@gmail.com';

        const result = await pool.query(
            `UPDATE users
             SET role = 'super_admin',
                 restaurant_id = NULL
             WHERE email = $1
             RETURNING id, email, role, restaurant_id`,
            [email]
        );

        if (result.rowCount === 0) {
            console.log('❌ User not found.');
        } else {
            console.log('✅ Account updated successfully:');
            console.table(result.rows);
        }

    } catch (error) {
        console.error('❌ Database error:', error);
    } finally {
        await pool.end();
    }
}

fixSuperAdmin();
