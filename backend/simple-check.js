const { Client } = require('pg');
const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: 'admin',
    database: 'ahizan',
});
client.connect()
    .then(() => client.query('SELECT name FROM tax_category'))
    .then(res => {
        console.log('Categories:', res.rows.map(r => r.name));
        return client.query('SELECT name, value FROM tax_rate');
    })
    .then(res => {
        console.log('Rates:', res.rows.map(r => `${r.name}: ${r.value}`));
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
bau
