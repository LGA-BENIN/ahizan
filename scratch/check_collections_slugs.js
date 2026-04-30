const { Client } = require('pg');

async function run() {
  const client = new Client({
    host: '127.0.0.1', port: 5432, user: 'postgres', password: 'admin', database: 'ahizan_local',
  });
  await client.connect();
  
  const res = await client.query(`
    SELECT c.id, ct.name, ct.slug
    FROM collection c
    JOIN collection_translation ct ON c.id = ct."baseId"
  `);
  
  console.log(JSON.stringify(res.rows, null, 2));

  await client.end();
}

run().catch(console.error);
