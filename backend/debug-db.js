const { Client } = require('pg');

async function run() {
    const client = new Client({
        user: 'postgres',
        host: '127.0.0.1',
        database: 'ahizan',
        password: 'admin',
        port: 5432,
    });

    try {
        await client.connect();
        console.log('Connected to database');

        const email = 'eli111@gmail.com';

        // 1. Get User
        const userRes = await client.query('SELECT * FROM "user" WHERE identifier = $1', [email]);
        if (userRes.rows.length === 0) {
            console.log('User NOT FOUND');
            return;
        }

        const user = userRes.rows[0];
        console.log('User found:', user);

        // 2. Get Auth Method
        const authRes = await client.query('SELECT * FROM "authentication_method" WHERE "userId" = $1', [user.id]);
        if (authRes.rows.length === 0) {
            console.log('Auth Method NOT FOUND');
        } else {
            console.log('Auth Methods found:', authRes.rows);
            authRes.rows.forEach(row => {
                console.log(`Method: ${row.type}, Identifier: ${row.identifier}`);
                // Vendure stores args as JSON string in 'string' column usually? No, native auth uses specific columns?
                // Let's check the schema by selecting *
                // Native auth usually stores hash in `passwordHash` column if it exists, or inside a JSON column.
                // In standard Vendure: 'authentication_method' table has 'passwordHash' column for native method?
                // Or it is a discriminator.

                // Let's just print the whole row.
            });
        }

        // 3. Get Role
        const roleRes = await client.query(`
            SELECT r.code, r.description 
            FROM "role" r
            JOIN "user_roles_role" ur ON ur."roleId" = r.id
            WHERE ur."userId" = $1
        `, [user.id]);

        console.log('Roles:', roleRes.rows);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await client.end();
    }
}

run();
