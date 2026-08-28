const { Client } = require('pg');

const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: '',
    database: 'vendure',
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to database');

        const result = await client.query('SELECT COUNT(*) as count FROM collection');
        console.log('Collections count:', result.rows[0].count);

        const result2 = await client.query('SELECT id, "createdAt", "isVisible" FROM collection LIMIT 5');
        console.log('Sample collections:', result2.rows);

        await client.end();
    } catch (error) {
        console.error('Error:', error.message);
        await client.end().catch(() => {});
    }
}

run();
