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
    SELECT c.id, ct.name 
    FROM collection c 
    JOIN collection_translation ct ON c.id = ct."baseId"
  `);
  const facetValues = await client.query(`
    SELECT fv.id, fvt.name 
    FROM facet_value fv 
    JOIN facet_value_translation fvt ON fv.id = fvt."baseId"
  `);
  console.log("Collections:", collections.rows);
  console.log("Facet Values:", facetValues.rows);
  await client.end();
}
run().catch(console.error);
