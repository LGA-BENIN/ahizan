const fetch = require('node-fetch');
const { Client } = require('pg');
require('dotenv').config();

const API_URL = 'http://localhost:3000/shop-api';
const ADMIN_API_URL = 'http://localhost:3000/admin-api';

async function graphqlReq(url, query, variables = {}, token = null) {
    const headers = { 
        'Content-Type': 'application/json',
        'vendure-token': '__default_channel__'
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['vendure-auth-token'] = token;
    }
    const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, variables }),
    });
    const authHeader = res.headers.get('vendure-auth-token');
    const json = await res.json();
    return { data: json.data, errors: json.errors, token: authHeader };
}

async function runGqlTest() {
    console.log('=== START GRAPHQL API TERMINAL TEST ===');
    const db = new Client({
        host: process.env.DB_HOST || '127.0.0.1',
        port: +(process.env.DB_PORT || 5432),
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'vendure',
    });
    await db.connect();

    // 1. Get Seller A and Seller B users
    const usersRes = await db.query(`
        SELECT u.id as "userId", u.identifier, v.id as "vendorId", v.name as "vendorName"
        FROM "user" u
        JOIN vendor v ON v."userId" = u.id
        ORDER BY u.id ASC
        LIMIT 5
    `);
    console.log('Users/Vendors in DB:', usersRes.rows);

    if (usersRes.rows.length < 2) {
        console.log('Need at least 2 vendors to test Seller A and Seller B scenarios.');
        await db.end();
        return;
    }

    const sellerA = usersRes.rows[0];
    const sellerB = usersRes.rows[1];

    console.log(`Seller A: ${sellerA.identifier} (Vendor ID: ${sellerA.vendorId})`);
    console.log(`Seller B: ${sellerB.identifier} (Vendor ID: ${sellerB.vendorId})`);

    // Let's get passwords or set dummy passwords for testing if needed, or authenticate as them
    // Check if we can log in or authenticate with token
    // In Vendure, we can generate a session token directly from user in DB:
    const sessionResA = await db.query(`
        INSERT INTO "session" ("createdAt", "updatedAt", "token", "expires", "invalidated", "type", "authenticationStrategy", "activeOrderId", "activeChannelId")
        VALUES (NOW(), NOW() + INTERVAL '1 day', 'test-token-seller-a-' || NOW()::text, NOW() + INTERVAL '1 day', false, 'AuthenticatedSession', 'native', NULL, 1)
        RETURNING token
    `);
    const tokenA = sessionResA.rows[0].token;
    await db.query(`UPDATE "session" SET "userId" = $1 WHERE token = $2`, [sellerA.userId, tokenA]);

    const sessionResB = await db.query(`
        INSERT INTO "session" ("createdAt", "updatedAt", "token", "expires", "invalidated", "type", "authenticationStrategy", "activeOrderId", "activeChannelId")
        VALUES (NOW(), NOW() + INTERVAL '1 day', 'test-token-seller-b-' || NOW()::text, NOW() + INTERVAL '1 day', false, 'AuthenticatedSession', 'native', NULL, 1)
        RETURNING token
    `);
    const tokenB = sessionResB.rows[0].token;
    await db.query(`UPDATE "session" SET "userId" = $1 WHERE token = $2`, [sellerB.userId, tokenB]);

    console.log(`Created test session tokens: tokenA=${tokenA}, tokenB=${tokenB}`);

    // Verify Seller A profile query
    const profileA = await graphqlReq(API_URL, `query { myVendorProfile { id name } }`, {}, tokenA);
    console.log('Seller A Profile API Response:', JSON.stringify(profileA));

    const profileB = await graphqlReq(API_URL, `query { myVendorProfile { id name } }`, {}, tokenB);
    console.log('Seller B Profile API Response:', JSON.stringify(profileB));

    // TEST SCENARIO 1: Seller A creates a product
    console.log('\n--- SCENARIO 1: Seller A creates product ---');
    const createRes = await graphqlReq(API_URL, `
        mutation CreateMyProduct($input: CreateVendorProductInput!) {
            createMyProduct(input: $input) {
                id
                name
                slug
                variants {
                    id
                    sku
                    price
                }
            }
        }
    `, {
        input: {
            name: 'Terminal Test Product ' + Date.now(),
            description: 'Description test',
            price: 150000,
            stock: 10,
            variants: [
                { name: 'Rouge - S', price: 150000, stock: 5, sku: 'TEST-SKU-ROUGE-S-' + Date.now() },
                { name: 'Bleu - M', price: 160000, stock: 5, sku: 'TEST-SKU-BLEU-M-' + Date.now() }
            ]
        }
    }, tokenA);

    console.log('CreateProduct result:', JSON.stringify(createRes));

    if (createRes.errors || !createRes.data?.createMyProduct) {
        console.error('Failed to create product:', createRes.errors);
        await db.end();
        return;
    }

    const productId = createRes.data.createMyProduct.id;
    console.log(`Product created with ID: ${productId}`);

    // Superadmin confirms product (sets customFieldsVendorid = NULL and approvalStatus = 'approved')
    await db.query(`
        UPDATE product 
        SET "customFieldsVendorid" = NULL, "customFieldsApprovalstatus" = 'approved', "enabled" = true
        WHERE id = $1
    `, [productId]);
    console.log(`Superadmin confirmed Product ${productId} (customFieldsVendorid set to NULL).`);

    // TEST ISSUE 1: Seller A updates their offer on confirmed product
    console.log('\n--- SCENARIO 2: Seller A updates offer on confirmed product ---');
    const updateResA = await graphqlReq(API_URL, `
        mutation UpdateMyProduct($id: ID!, $input: UpdateVendorProductInput!) {
            updateMyProduct(id: $id, input: $input) {
                id
                name
            }
        }
    `, {
        id: productId,
        input: {
            variants: [
                { id: createRes.data.createMyProduct.variants[0].id, price: 155000, stock: 12 },
                { id: createRes.data.createMyProduct.variants[1].id, price: 165000, stock: 8 }
            ]
        }
    }, tokenA);

    console.log('Seller A update offer result:', JSON.stringify(updateResA));
    if (updateResA.errors) {
        console.error('❌ SCENARIO 2 FAILED with errors:', JSON.stringify(updateResA.errors, null, 2));
    } else {
        console.log('✅ SCENARIO 2 PASSED cleanly!');
    }

    // TEST ISSUE 2 & 3: Seller B attaches offers ("greffage") to Seller A's product using option combinations
    console.log('\n--- SCENARIO 3: Seller B attaches offers (greffage) to Seller A product ---');
    const tagResB = await graphqlReq(API_URL, `
        mutation TagProductWithVariantOffers($input: TagProductWithVariantOffersInput!) {
            tagProductWithVariantOffers(input: $input) {
                id
                price
                stock
                sku
            }
        }
    `, {
        input: {
            productId: productId,
            optionGroups: [
                {
                    name: 'Couleur',
                    code: 'couleur',
                    options: [
                        { name: 'Vert', code: 'vert' },
                        { name: 'Jaune', code: 'jaune' }
                    ]
                },
                {
                    name: 'Taille',
                    code: 'taille',
                    options: [
                        { name: 'L', code: 'l' },
                        { name: 'XL', code: 'xl' }
                    ]
                }
            ],
            offers: [
                {
                    name: 'Vert L',
                    optionNames: ['Vert', 'L'],
                    optionCodes: ['vert', 'l'],
                    price: 170000,
                    stock: 20
                },
                {
                    name: 'Jaune XL',
                    optionNames: ['Jaune', 'XL'],
                    optionCodes: ['jaune', 'xl'],
                    price: 180000,
                    stock: 15
                }
            ]
        }
    }, tokenB);

    console.log('Seller B tag offers result:', JSON.stringify(tagResB));
    if (tagResB.errors) {
        console.error('❌ SCENARIO 3 FAILED with errors:', JSON.stringify(tagResB.errors, null, 2));
    } else {
        console.log('✅ SCENARIO 3 PASSED cleanly!');
    }

    await db.end();
    console.log('=== END TERMINAL TEST ===');
}

runGqlTest().catch(err => {
    console.error('Fatal test execution error:', err);
});
