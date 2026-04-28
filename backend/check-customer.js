const { Client } = require('pg');

async function check() {
    const client = new Client({
        user: 'postgres',
        host: '127.0.0.1',
        database: 'ahizan',
        password: 'admin',
        port: 5432,
    });

    try {
        await client.connect();

        // Check for Customer linked to user 28
        const res = await client.query('SELECT * FROM "customer" WHERE "userId" = 28');
        console.log(`Customer count: ${res.rows.length}`);
        if (res.rows.length > 0) {
            console.log('Customer found:', res.rows[0]);
        } else {
            console.log('NO CUSTOMER FOUND for user 28');
        }

        // Check for Administrator linked to user 28
        const res2 = await client.query('SELECT * FROM "administrator" WHERE "userId" = 28');
        console.log(`Administrator count: ${res2.rows.length}`);
        if (res2.rows.length > 0) {
            console.log('Administrator found:', res2.rows[0]);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

check();
