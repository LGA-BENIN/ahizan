
const fetch = require('node-fetch');

// Config
const ENDPOINT = 'http://localhost:3000/admin-api';
// Default superadmin credentials from Vendure standard setup
const USERNAME = 'superadmin';
const PASSWORD = 'superadmin';

async function main() {
    console.log('🚀 Starting Data Population...');

    // 1. Login
    console.log('1. Logging in as SuperAdmin...');
    const loginQuery = `
        mutation Login($username: String!, $password: String!) {
            login(username: $username, password: $password) {
                ... on CurrentUser {
                    id
                }
                ... on InvalidCredentialsError {
                    message
                }
            }
        }
    `;

    // We try 'superadmin' then 'admin' just in case
    let token = await login(USERNAME, PASSWORD);

    if (!token) {
        console.error('❌ Failed to login. Please ensure the server is running on localhost:3000 and superadmin/superadmin or admin/admin works.');
        process.exit(1);
    }

    console.log('✅ Logged in!');

    // 2. Create Vendors
    const vendors = [
        {
            name: "Ahizan Electronics",
            email: "contact@ahizan-electro.com",
            description: "Votre destination pour l'électronique de pointe. Smartphones, ordinateurs et accessoires.",
            zone: "Cotonou - Haie Vive",
            deliveryInfo: "Livraison 24h sur Cotonou. Expédition nationale via la Poste.",
            returnPolicy: "Retours acceptés sous 7 jours si emballage intact.",
            type: "BUSINESS",
            address: "Avenue Steinmetz, Cotonou",
            rating: 4.8,
            ratingCount: 120
        },
        {
            name: "Mawuli Fashion",
            email: "mawuli@mode.bj",
            description: "Créations uniques en pagne tissé et accessoires modernes. L'élégance béninoise.",
            zone: "Porto-Novo - Ouando",
            deliveryInfo: "Livraison sous 48h. Remise en main propre possible.",
            returnPolicy: "Pas de retour sur les articles personnalisés.",
            type: "INDIVIDUAL",
            address: "Marché Ouando, Porto-Novo",
            rating: 4.5,
            ratingCount: 45
        },
        {
            name: "Bio Bénin Nature",
            email: "bio@nature.bj",
            description: "Produits cosmétiques naturels et bio. Karité, huiles essentielles et savons.",
            zone: "Cotonou - Cadjehoun",
            deliveryInfo: "Livraison gratuite à partir de 10.000 FCFA.",
            returnPolicy: "Retours non acceptés pour raisons d'hygiène.",
            type: "BUSINESS",
            address: "Rue des Cocotiers, Cotonou",
            rating: 4.9,
            ratingCount: 200
        }
    ];

    for (const v of vendors) {
        console.log(`Creating vendor: ${v.name}...`);
        const createMutation = `
            mutation CreateVendor($input: CreateVendorInput!) {
                createVendor(input: $input) {
                    id
                    name
                }
            }
        `;

        const result = await request(createMutation, { input: v }, token);

        if (result.errors) {
            console.error(`❌ Error creating ${v.name}:`, JSON.stringify(result.errors, null, 2));
            continue;
        }

        const newVendor = result.data?.createVendor;

        if (newVendor) {
            console.log(`✅ Created ${newVendor.name} (ID: ${newVendor.id})`);

            // Approve it
            const approveMutation = `
                mutation ApproveVendor($id: ID!, $status: String!) {
                    updateVendorStatus(id: $id, status: $status) {
                        id
                        status
                    }
                }
            `;
            await request(approveMutation, { id: newVendor.id, status: "APPROVED" }, token);
            console.log(`✅ Approved ${newVendor.name}`);

            // Optional: Set rating manually via update (if create didn't handle it fully or to enforce it)
            const updateMutation = `
                mutation UpdateVendor($id: ID!, $input: UpdateVendorInput!) {
                    updateVendor(id: $id, input: $input) {
                        id
                        rating
                        ratingCount
                    }
                }
            `;
            // We pass rating again just to be sure if create logic ignored it (it shouldn't but safe check)
            await request(updateMutation, {
                id: newVendor.id,
                input: { rating: v.rating, ratingCount: v.ratingCount }
            }, token);

        } else {
            console.error(`❌ Failed to create ${v.name}`, JSON.stringify(result));
        }
    }

    console.log('🎉 Population Complete!');
}

async function login(username, password) {
    const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            query: `mutation Login($username: String!, $password: String!) {
                login(username: $username, password: $password) {
                    ... on CurrentUser { id }
                }
            }`,
            variables: { username, password }
        })
    });

    const token = res.headers.get('vendure-auth-token');
    const json = await res.json();

    if (json.data?.login?.id) {
        return token;
    }
    return null;
}

async function request(query, variables, token) {
    const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query, variables })
    });
    return res.json();
}

main().catch(console.error);
