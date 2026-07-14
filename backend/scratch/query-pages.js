const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ahizan_local',
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
});

async function queryPages() {
    try {
        console.log('Querying Pages...');
        const pages = await pool.query('SELECT id, title, slug, type, "isActive" FROM page');
        console.log('Pages:');
        console.log(JSON.stringify(pages.rows, null, 2));

        console.log('\nQuerying sections of page "market"...');
        const marketPage = await pool.query("SELECT id FROM page WHERE slug = 'market'");
        if (marketPage.rows.length > 0) {
            const sections = await pool.query('SELECT id, type, title, "isActive", "dataJson" FROM page_section WHERE "pageId" = $1', [marketPage.rows[0].id]);
            console.log('Market Page Sections:');
            console.log(JSON.stringify(sections.rows, null, 2));
        } else {
            console.log('No page with slug "market" found.');
        }
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await pool.end();
    }
}

queryPages();
