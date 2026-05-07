/**
 * One-shot script to:
 * 1. Add the variant-id-filter to all existing collections that don't have it
 * 2. Migrate existing product-collection assignments from the join table into the filter
 *
 * Usage: npx ts-node scripts/add-variant-id-filter-to-collections.ts
 *
 * After running this script, restart the Vendure server to trigger collection re-evaluation.
 */
import { createConnection } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
    const connection = await createConnection({
        type: 'postgres',
        host: process.env.DB_HOST || '127.0.0.1',
        port: +(process.env.DB_PORT || 5432),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'vendure',
        schema: process.env.DB_SCHEMA || 'public',
        synchronize: false,
        logging: false,
    });

    try {
        // Step 1: Discover the actual schema
        const tables = await connection.query(
            `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%collection%' ORDER BY table_name`
        );
        console.log('Collection-related tables:', tables.map((t: any) => t.table_name));

        const collectionColumns = await connection.query(
            `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'collection' ORDER BY ordinal_position`
        );
        console.log('Collection table columns:', collectionColumns.map((c: any) => `${c.column_name} (${c.data_type})`));

        // Step 2: Check if filters are stored as JSONB column
        const hasFiltersColumn = collectionColumns.some((c: any) => c.column_name === 'filters');

        if (hasFiltersColumn) {
            console.log('\nFilters are stored as a JSONB column on the collection table');
            await migrateJsonbFilters(connection);
        } else {
            console.log('\nFilters are NOT a JSONB column. Dumping all collection tables columns for debug:');
            for (const t of tables) {
                const cols = await connection.query(
                    `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
                    [t.table_name]
                );
                console.log(`  ${t.table_name}:`, cols.map((c: any) => `${c.column_name} (${c.data_type})`));
            }
        }

        console.log('\nDone! Please restart the Vendure server to trigger collection re-evaluation.');
    } finally {
        await connection.close();
    }
}

async function migrateJsonbFilters(connection: any) {
    // First, get existing variant-collection assignments from the join table
    let existingAssignments: Map<string, string[]> = new Map();

    try {
        const joinTableCheck = await connection.query(
            `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%collection%variant%'`
        );

        if (joinTableCheck.length > 0) {
            const joinTableName = joinTableCheck[0].table_name;
            console.log(`\nFound join table: ${joinTableName}`);

            const joinCols = await connection.query(
                `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
                [joinTableName]
            );
            console.log(`Join table columns:`, joinCols.map((c: any) => c.column_name));

            // Determine column names
            const collCol = joinCols.find((c: any) => c.column_name.includes('collection'))?.column_name;
            const variantCol = joinCols.find((c: any) => c.column_name.includes('variant'))?.column_name;

            if (collCol && variantCol) {
                const rows = await connection.query(`SELECT "${collCol}" as coll_id, "${variantCol}" as variant_id FROM ${joinTableName}`);
                console.log(`Found ${rows.length} existing variant-collection assignments`);

                for (const row of rows) {
                    const collId = String(row.coll_id);
                    const variantId = String(row.variant_id);
                    if (!existingAssignments.has(collId)) {
                        existingAssignments.set(collId, []);
                    }
                    existingAssignments.get(collId)!.push(variantId);
                }

                console.log(`Assignments map:`, Array.from(existingAssignments.entries()).map(([k, v]) => `  Collection ${k}: ${v.length} variants`).join('\n'));
            }
        } else {
            console.log('\nNo join table found - no existing assignments to migrate');
        }
    } catch (e) {
        console.log('Could not read join table:', e);
    }

    // Now update each collection's filters
    const collections = await connection.query(`SELECT id, filters FROM collection`);
    console.log(`\nFound ${collections.length} collections`);

    for (const coll of collections) {
        let filters = coll.filters || [];

        if (typeof filters === 'string') {
            try { filters = JSON.parse(filters); } catch { filters = []; }
        }
        if (!Array.isArray(filters)) filters = [];

        // Get existing variant IDs from the filter
        let currentVariantIds: string[] = [];
        const existingFilter = filters.find((f: any) => f.code === 'variant-id-filter');
        if (existingFilter) {
            const arg = existingFilter.args?.find((a: any) => a.name === 'variantIds');
            if (arg?.value) {
                try { currentVariantIds = JSON.parse(arg.value); } catch { currentVariantIds = []; }
            }
        }

        // Merge with assignments from the join table
        const joinTableVariantIds = existingAssignments.get(String(coll.id)) || [];
        const mergedIds = Array.from(new Set([...currentVariantIds, ...joinTableVariantIds.map(String)]));

        // Build updated filters
        const updatedFilters = filters.filter((f: any) => f.code !== 'variant-id-filter');
        updatedFilters.push({
            code: 'variant-id-filter',
            args: [{ name: 'variantIds', value: JSON.stringify(mergedIds) }],
        });

        await connection.query(
            `UPDATE collection SET filters = $1 WHERE id = $2`,
            [JSON.stringify(updatedFilters), coll.id]
        );

        console.log(`  Collection ${coll.id}: ${mergedIds.length} variant IDs in filter (was ${currentVariantIds.length} + ${joinTableVariantIds.length} from join table)`);
    }
}

main().catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
});
