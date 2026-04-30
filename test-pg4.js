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
  const filters = await client.query("SELECT id, filters FROM collection");
  console.log("Collections:", JSON.stringify(filters.rows, null, 2));
  await client.end();
}
run().catch(console.error);
