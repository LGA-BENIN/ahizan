const { Client } = require('pg');

async function check() {
  const client = new Client({
    user: 'postgres',
    host: '127.0.0.1',
    database: 'ahizan',
    password: 'admin',
    port: 5432,
  });

  try {
    await client.connect();

    // Check for Customer keys
    const res = await client.query('SELECT * FROM customer LIMIT 1');
    console.log('Customer keys:', res.rows.length ? Object.keys(res.rows[0]) : 'No customer rows found to infer keys');
    if (res.rows.length === 0) {
      // If no rows, check information_schema
      const resCol = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'customer'");
      console.log('Customer columns:', resCol.rows.map(r => r.column_name));
    }

    // Check for Join Table
    const res2 = await client.query("SELECT table_name FROM information_schema.tables WHERE table_name = 'customer_channels_channel'");
    console.log('Join table exists:', res2.rows.length > 0);

    // Also check if 'customer' table has 'channelId' column (unlikely in v2)

  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

check();
