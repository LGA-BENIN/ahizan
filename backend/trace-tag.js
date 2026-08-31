const { Client } = require('pg');
require('dotenv').config();

async function traceTag() {
    const client = new Client({
        host: process.env.DB_HOST || '127.0.0.1',
        port: +(process.env.DB_PORT || 5432),
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'vendure',
    });
    await client.connect();

    const productId = 287;

    // Fetch attached option groups for product 287
    const ogRes = await client.query(`
        SELECT og.id, og.code, ogt.name
        FROM product_option_group og
        JOIN product_option_groups_product_option_group pog ON pog."productOptionGroupId" = og.id
        LEFT JOIN product_option_group_translation ogt ON ogt."baseId" = og.id AND ogt."languageCode" = 'fr'
        WHERE pog."productId" = $1
    `, [productId]);

    const attachedGroups = ogRes.rows;
    console.log('Attached groups for product 287:', attachedGroups);

    for (const og of attachedGroups) {
        const optsRes = await client.query(`
            SELECT po.id, po.code, pot.name
            FROM product_option po
            LEFT JOIN product_option_translation pot ON pot."baseId" = po.id AND pot."languageCode" = 'fr'
            WHERE po."groupId" = $1
        `, [og.id]);
        og.options = optsRes.rows;
    }

    const offerInput = {
        name: 'Vert L',
        optionNames: ['Vert', 'L'],
        optionCodes: ['vert', 'l']
    };

    const searchStrings = [
        ...(offerInput.optionNames || []),
        ...(offerInput.optionCodes || []),
    ].map(s => String(s).toLowerCase().trim());

    console.log('searchStrings:', searchStrings);

    const requiredOptionIds = [];
    for (const og of attachedGroups) {
        const opts = og.options || [];
        let matchedOpt = opts.find((opt) => {
            const optName = (opt.name || '').toLowerCase().trim();
            const optCode = (opt.code || '').toLowerCase().trim();
            return searchStrings.includes(optName) || searchStrings.includes(optCode);
        });

        console.log(`For group ${og.code} (id: ${og.id}), matchedOpt =`, matchedOpt);

        if (matchedOpt) {
            requiredOptionIds.push(String(matchedOpt.id));
        }
    }

    console.log('Final requiredOptionIds:', requiredOptionIds);
    await client.end();
}

traceTag().catch(console.error);
