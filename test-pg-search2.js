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
  const index = await client.query("SELECT \"productName\", \"collectionIds\", \"facetIds\", \"facetValueIds\" FROM search_index_item WHERE \"collectionIds\" != '' OR \"facetValueIds\" != ''");
  console.log("Valid Search Index Items:", JSON.stringify(index.rows, null, 2));
  await client.end();
}
run().catch(console.error);
