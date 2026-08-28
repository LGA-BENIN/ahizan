const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ahizan_local',
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
});

async function listSlugs() {
    try {
        console.log('Querying markets...');
        const markets = await pool.query('SELECT name, slug FROM market');
        console.log('Markets:');
        markets.rows.forEach(r => console.log(` - Name: ${r.name}, Slug: ${r.slug}`));

        console.log('\nQuerying neighborhoods/geographic locations...');
        const locations = await pool.query("SELECT name, type FROM geographic_location");
        console.log('Locations:');
        locations.rows.forEach(r => console.log(` - Name: ${r.name}, Type: ${r.type}`));
    } catch (e) {
        console.error('Error listing slugs:', e);
    } finally {
        await pool.end();
    }
}

listSlugs();
