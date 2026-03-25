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

        const email = 'curltest@example.com';
        console.log(`Checking for user: ${email}`);

        // 1. Check User
        const userRes = await client.query('SELECT * FROM "user" WHERE identifier = $1', [email]);
        console.log(`User found: ${userRes.rows.length}`);

        if (userRes.rows.length > 0) {
            const userId = userRes.rows[0].id;
            console.log(`User ID: ${userId}`);

            // 2. Check Administrator
            const adminRes = await client.query('SELECT * FROM "administrator" WHERE "userId" = $1', [userId]);
            console.log(`Administrator found: ${adminRes.rows.length}`);

            // 3. Check Customer
            const custRes = await client.query('SELECT * FROM "customer" WHERE "userId" = $1', [userId]);
            console.log(`Customer found: ${custRes.rows.length}`);

            if (custRes.rows.length > 0) {
                console.log('Customer Details:', custRes.rows[0]);
                // Check channel
                const chanRes = await client.query('SELECT * FROM customer_channels_channel WHERE "customerId" = $1', [custRes.rows[0].id]);
                console.log(`Customer Channels: ${chanRes.rows.length}`);
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

check();
