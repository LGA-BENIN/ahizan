import fs from 'fs';
import pg from 'pg';

const { Client } = pg;

async function registerPreset() {
    const layoutPath = fs.existsSync('./homepage_layout.json') 
        ? './homepage_layout.json' 
        : '/srv/ahizan/specs/002-homepage-ui-modernization/homepage_layout.json';
    const layoutRaw = fs.readFileSync(layoutPath, 'utf-8');
    const sections = JSON.parse(layoutRaw);

    const client = new Client({
        host: process.env.DB_HOST || 'db',
        port: 5432,
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'Fernand0@91820805',
        database: process.env.DB_NAME || 'postgres'
    });

    await client.connect();
    console.log('Connected to PostgreSQL database');

    const presetName = 'homepage_v2_marketplace_master';
    const description = 'Habillage V2 Areezan Marketplace Master (Jumia + Amazon + Cdiscount) - 10 sections dynamiques';

    // Check if preset already exists
    const checkRes = await client.query('SELECT id, name FROM page_preset WHERE name = $1', [presetName]);
    let presetId;

    if (checkRes.rows.length > 0) {
        presetId = checkRes.rows[0].id;
        console.log(`Updating existing preset ${presetName} (ID: ${presetId})`);
        await client.query(`
            UPDATE page_preset 
            SET "sectionsJson" = $1, 
                "description" = $2, 
                "updatedAt" = NOW(), 
                "status" = 'published'
            WHERE id = $3
        `, [layoutRaw, description, presetId]);
    } else {
        console.log(`Creating new preset ${presetName}`);
        const insertRes = await client.query(`
            INSERT INTO page_preset (
                "createdAt", "updatedAt", "name", "description", "sectionsJson",
                "isBuiltIn", "isDefault", "isDraft", "status", "version",
                "publishedAt", "isBackup", "historyPointer"
            ) VALUES (
                NOW(), NOW(), $1, $2, $3,
                false, false, false, 'published', 1,
                NOW(), false, -1
            ) RETURNING id
        `, [presetName, description, layoutRaw]);
        presetId = insertRes.rows[0].id;
    }

    console.log(`PRESET_SUCCESS_ID:${presetId}`);
    console.log(`✅ Preset successfully registered with ID: ${presetId}`);
    console.log(`Preview URL: http://localhost:3001/preview?presetId=${presetId}`);
    console.log(`Direct Home Preview URL: http://localhost:3001/?presetId=${presetId}`);

    await client.end();
}

registerPreset().catch(err => {
    console.error('Registration failed:', err);
    process.exit(1);
});
