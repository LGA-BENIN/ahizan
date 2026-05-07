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
  const collections = await client.query("SELECT * FROM collection");
  const facets = await client.query("SELECT * FROM facet");
  const facetValues = await client.query("SELECT * FROM facet_value");
  console.log("Collections count:", collections.rowCount);
  console.log("Facets count:", facets.rowCount);
  console.log("FacetValues count:", facetValues.rowCount);
  await client.end();
}
run().catch(console.error);
