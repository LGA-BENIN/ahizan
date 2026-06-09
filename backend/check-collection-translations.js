const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkCollections() {
  const result = await pool.query(`
    SELECT c.id, c.slug, c."parentId", c.position, c."isPrivate", c."inheritFilters",
           ct.name, ct.description, ct.languageCode, ct.slug as trans_slug
    FROM collection c
    LEFT JOIN collection_translation ct ON c.id = ct."baseId"
    ORDER BY c.id, ct.languageCode
    LIMIT 30
  `);
  
  console.log('Collections with translations:');
  console.log('ID | Slug | Name | Language | Description');
  console.log('---|------|------|----------|-----------');
  result.rows.forEach(row => {
    console.log(`${row.id} | ${row.slug || '(null)'} | ${row.name || '(null)'} | ${row.languageCode || '(null)'} | ${row.description || '(null)'}`);
  });
  
  await pool.end();
}

checkCollections().catch(console.error);
