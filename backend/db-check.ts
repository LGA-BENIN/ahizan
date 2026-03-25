import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function checkDb() {
    const client = new Client({
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'ahizan',
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'admin',
    });

    try {
        await client.connect();
        console.log('--- Database Check ---');
        
        const facets = await client.query('SELECT id, name, code FROM facet;');
        console.log(`Facets found: ${facets.rowCount}`);
        facets.rows.forEach(r => console.log(` - [${r.id}] ${r.name} (${r.code})`));

        const values = await client.query('SELECT id, name, code, "facetId" FROM facet_value;');
        console.log(`FacetValues found: ${values.rowCount}`);
        values.rows.forEach(r => console.log(` - [${r.id}] ${r.name} (${r.code}) -> Facet: ${r.facetId}`));

        await client.end();
    } catch (err) {
        console.error('Database connection error:', err);
    }
}

checkDb();
