const { Client } = require('pg');

async function run() {
  const client = new Client({
    host: '127.0.0.1', port: 5432, user: 'postgres', password: 'admin', database: 'ahizan_local',
  });
  await client.connect();
  
  const res = await client.query(`
    SELECT "productName", "collectionIds", "collectionSlugs"
    FROM search_index_item
    WHERE "collectionIds" != ''
  `);
  
  console.log(`Found ${res.rows.length} indexed products with collections.`);
  console.log(JSON.stringify(res.rows, null, 2));

  await client.end();
}

run().catch(console.error);
