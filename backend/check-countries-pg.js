require('dotenv').config();
const { Client } = require('pg');

async function checkCountries() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/vendure'
  });

  try {
    await client.connect();
    
    // Check if country exists
    const bjResult = await client.query(`SELECT id, code, enabled FROM country WHERE code = 'BJ'`);
    console.log('BJ query result:', bjResult.rows);
    
    if (bjResult.rows.length === 0) {
      console.log('Country BJ not found. Fetching sample countries...');
      const allResult = await client.query(`SELECT id, code, enabled FROM country LIMIT 10`);
      console.log('Sample countries:', allResult.rows);
    }
  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    await client.end();
  }
}

checkCountries();
