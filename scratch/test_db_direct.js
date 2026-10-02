const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres'
    });
    try {
        await client.connect();
    } catch (e) {
        // try without port mapping inside docker network
        console.error('Cannot connect to localhost:5432:', e.message);
        return;
    }

    const res = await client.query(`
        SELECT v.id, v.name, v.latitude, v.longitude, count(so.id) as offer_count 
        FROM seller_offer so 
        JOIN vendor v ON so."vendorId" = v.id 
        GROUP BY v.id, v.name, v.latitude, v.longitude 
        ORDER BY v.id ASC;
    `);
    console.table(res.rows);
    await client.end();
}

main().catch(console.error);
