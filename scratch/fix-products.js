async function run() {
    try {
        // 1. Login
        const loginRes = await fetch('http://ahizan_backend:3000/admin-api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: `mutation { login(username: "superadmin", password: "superadmin") { ... on CurrentUser { id } } }`
            })
        });
        const loginJson = await loginRes.json();
        const cookie = loginRes.headers.get('set-cookie');
        const authToken = loginRes.headers.get('vendure-auth-token');
        
        const headers = { 'Content-Type': 'application/json' };
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
            headers['vendure-auth-token'] = authToken;
        } else if (cookie) {
            headers['cookie'] = cookie;
        }

        // 2. Query all products
        const query = `
        query {
            products(options: { take: 100 }) {
                items {
                    id
                    name
                    enabled
                    customFields {
                        approvalStatus
                    }
                }
            }
        }
        `;
        const res = await fetch('http://ahizan_backend:3000/admin-api', {
            method: 'POST',
            headers,
            body: JSON.stringify({ query })
        });
        const json = await res.json();
        
        if (!json.data || !json.data.products) {
            console.log("Failed to query products:", JSON.stringify(json));
            return;
        }

        const items = json.data.products.items;
        const productsToDisable = items.filter(p => p.enabled && (p.customFields?.approvalStatus === 'pending' || p.customFields?.approvalStatus === 'rejected'));
        
        console.log(`Found ${productsToDisable.length} products to disable (enabled but pending/rejected).`);

        // 3. Disable them one by one
        const mutation = `
        mutation DisableProduct($input: UpdateProductInput!) {
            updateProduct(input: $input) {
                id
                enabled
                customFields {
                    approvalStatus
                }
            }
        }
        `;

        for (const p of productsToDisable) {
            console.log(`Disabling product: [ID: ${p.id}] ${p.name} (Status: ${p.customFields?.approvalStatus})`);
            const updateRes = await fetch('http://ahizan_backend:3000/admin-api', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    query: mutation,
                    variables: {
                        input: {
                            id: p.id,
                            enabled: false
                        }
                    }
                })
            });
            const updateJson = await updateRes.json();
            if (updateJson.errors) {
                console.error(`  Error disabling product ${p.id}:`, JSON.stringify(updateJson.errors));
            } else {
                console.log(`  Successfully disabled product ${p.id}.`);
            }
        }

        console.log("\nAll done!");
    } catch (e) {
        console.error("Error running fix-products:", e);
    }
}
run();
