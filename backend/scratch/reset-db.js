const { Client } = require('pg');
require('dotenv').config();

const dbName = process.env.DB_NAME || 'ahizan_local';

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'admin',
  database: 'postgres', // Connecter à la base par défaut 'postgres'
});

async function resetDb() {
  console.log(`Connecting to PostgreSQL as ${client.user}...`);
  try {
    await client.connect();
    
    console.log(`Terminating all active connections to database "${dbName}"...`);
    await client.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = '${dbName}'
        AND pid <> pg_backend_pid();
    `).catch(err => console.log('No active connections or error terminating:', err.message));

    console.log(`Dropping database "${dbName}"...`);
    await client.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    console.log(`Database "${dbName}" dropped successfully.`);

    console.log(`Creating database "${dbName}"...`);
    await client.query(`CREATE DATABASE "${dbName}"`);
    console.log(`Database "${dbName}" created successfully.`);
    
    console.log('🎉 Database reset completed successfully!');
  } catch (err) {
    console.error('❌ Error during database reset:', err);
  } finally {
    await client.end();
  }
}

resetDb();
