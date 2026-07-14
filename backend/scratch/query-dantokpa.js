const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ahizan_local',
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
});

async function queryDantokpa() {
    try {
        console.log('Querying Market Dantokpa...');
        const res = await pool.query("SELECT * FROM market WHERE slug = 'marche-dantokpa'");
        console.log('Dantokpa:', JSON.stringify(res.rows[0], null, 2));
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await pool.end();
    }
}

queryDantokpa();
