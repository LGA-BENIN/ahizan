const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'vendure.sqlite');
const db = new Database(dbPath);

try {
  const bj = db.prepare('SELECT id, code, enabled FROM country WHERE code = ?').get('BJ');
  console.log('BJ query result:', bj);
  
  if (!bj) {
    console.log('Fetching all countries to see what is available...');
    const all = db.prepare('SELECT id, code, enabled FROM country').all();
    console.log('Total countries:', all.length);
    console.log('First 5 countries:', all.slice(0, 5));
  }
} catch (e) {
  console.error('Error querying DB:', e);
} finally {
  db.close();
}
