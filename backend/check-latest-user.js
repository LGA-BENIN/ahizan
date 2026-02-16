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

        console.log('Checking for latest user...');

        // 1. Get Latest User
        const userRes = await client.query('SELECT * FROM "user" ORDER BY "createdAt" DESC LIMIT 1');

        if (userRes.rows.length > 0) {
            const user = userRes.rows[0];
            console.log('Latest User:', user);
            const userId = user.id;

            // 2. Check Administrator
            const adminRes = await client.query('SELECT * FROM "administrator" WHERE "userId" = $1', [userId]);
            console.log(`Administrator Linked: ${adminRes.rows.length}`);
            if (adminRes.rows.length > 0) console.log(adminRes.rows[0]);

            // 3. Check Customer
            const custRes = await client.query('SELECT * FROM "customer" WHERE "userId" = $1', [userId]);
            console.log(`Customer Linked: ${custRes.rows.length}`);
            if (custRes.rows.length > 0) {
                console.log(custRes.rows[0]);
                // Check channel link
                const chanRes = await client.query('SELECT * FROM customer_channels_channel WHERE "customerId" = $1', [custRes.rows[0].id]);
                console.log(`Customer Channels: ${chanRes.rows.length}`);
            }

            // 4. Check Auth Method
            const authRes = await client.query('SELECT * FROM "authentication_method" WHERE "userId" = $1', [userId]);
            console.log(`Auth Methods: ${authRes.rows.length}`);
            if (authRes.rows.length > 0) console.log(authRes.rows[0]);

        } else {
            console.log('No users found in database');
        }

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

check();
