const { Client } = require('pg');

const client = new Client({
    host: 'aws-0-eu-west-3.pooler.supabase.com',
    port: 5432,
    user: 'postgres.ytmgjvozocubpcfywdqz',
    password: 'jVAh6FuJ3C5/QH4',
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
});

client.connect()
    .then(() => {
        console.log('Connected successfully!');
        return client.query('SELECT version()');
    })
    .then(res => {
        console.log(res.rows[0]);
        client.end();
    })
    .catch(err => {
        console.error('Connection error:', err);
        client.end();
    });
