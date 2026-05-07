const { Client } = require('pg');

async function checkFilters() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        database: 'ahizan_local',
        user: 'postgres',
        password: 'admin'
    });

    try {
        await client.connect();
        const res = await client.query('SELECT id, filters FROM collection');
        console.log('Filtres des collections:', JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error('Erreur:', err);
    } finally {
        await client.end();
    }
}

checkFilters();
