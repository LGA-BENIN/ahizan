const { Client } = require('pg');
const c = new Client({ host: 'localhost', port: 5432, user: 'postgres', password: 'admin', database: 'ahizan_local' });
c.connect().then(() => {
    c.query("SELECT conname, conrelid::regclass, a.attname FROM pg_constraint c JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey) WHERE conname = 'REL_1966e18ce6a39a82b19204704d'").then(r => {
        console.log(r.rows);
        c.end();
    });
});
