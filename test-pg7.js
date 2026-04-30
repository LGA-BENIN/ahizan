const { Client } = require('pg');

const client = new Client({
  host: '127.0.0.1',
  port: 5432,
  user: 'postgres',
  password: 'admin',
  database: 'ahizan_local',
});

async function run() {
  await client.connect();
  const collections = await client.query(`
    SELECT c.id, ct.slug 
    FROM collection c 
    JOIN collection_translation ct ON c.id = ct."baseId"
  `);
  console.log("Collection Slugs:", collections.rows);
  await client.end();
}
run().catch(console.error);
