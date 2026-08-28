const { Client } = require('pg');

async function main() {
    const client = new Client({
        host: 'db',
        port: 5432,
        user: 'postgres',
        password: process.env.DB_PASSWORD || 'Fernand0@91820805',
        database: 'postgres',
    });

    await client.connect();

    console.log('--- Checking recent notification logs ---');
    const logs = await client.query(`
        SELECT id, "createdAt", "userId", "eventType", title, body 
        FROM notification_log 
        ORDER BY id DESC 
        LIMIT 10;
    `);
    console.table(logs.rows);

    await client.end();
}

main().catch(console.error);
