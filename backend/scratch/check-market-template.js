const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ahizan_local',
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
});

async function checkMarketTemplateSection() {
    try {
        const res = await pool.query(`
            SELECT ps.id, ps.type, ps."dataJson"
            FROM page_section ps
            JOIN page p ON p.id = ps."pageId"
            WHERE p.slug = 'market'
        `);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

checkMarketTemplateSection();
