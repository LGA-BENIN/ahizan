const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ahizan_local',
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
});

async function checkLocalProductsSections() {
    try {
        const res = await pool.query(`
            SELECT p.slug as page_slug, ps.id, ps.type, ps."dataJson"
            FROM page_section ps
            JOIN page p ON p.id = ps."pageId"
            WHERE ps.type = 'LOCAL_PRODUCTS'
        `);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

checkLocalProductsSections();
