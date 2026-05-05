const { Client } = require('pg');

async function checkDb() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        database: 'ahizan_local',
        user: 'postgres',
        password: 'admin'
    });

    try {
        await client.connect();
        console.log('Connecté à la base de données.');

        const joinTable = 'collection_product_variants_product_variant';
        
        // 1. Compter les liaisons
        const countRes = await client.query('SELECT count(*) FROM "' + joinTable + '"');
        console.log('Nombre total de liaisons dans ' + joinTable + ' :', countRes.rows[0].count);

        // 2. Voir les colonnes
        const columnsRes = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = '" + joinTable + "'");
        console.log('Colonnes de la table :', columnsRes.rows.map(r => r.column_name));

        // 3. Vérifier s'il y a des produits
        const productsRes = await client.query('SELECT count(*) FROM product');
        console.log('Nombre total de produits en base :', productsRes.rows[0].count);

        // 4. Vérifier les collections
        const collectionsRes = await client.query('SELECT count(*) FROM collection');
        console.log('Nombre total de collections en base :', collectionsRes.rows[0].count);

    } catch (err) {
        console.error('Erreur :', err);
    } finally {
        await client.end();
    }
}

checkDb();
