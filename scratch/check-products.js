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
        console.log("Login JSON response:", JSON.stringify(loginJson));
        
        console.log("Response headers:");
        for (const [key, val] of loginRes.headers.entries()) {
            console.log(`  ${key}: ${val}`);
        }

        const authToken = loginRes.headers.get('vendure-auth-token');
        const cookie = loginRes.headers.get('set-cookie');
        
        const headers = { 'Content-Type': 'application/json' };
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
            headers['vendure-auth-token'] = authToken;
        } else if (cookie) {
            headers['cookie'] = cookie;
        }

        // 2. Query products
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
        console.log(`\nTotal products queried: ${items.length}`);
        
        const pendingVisible = items.filter(p => p.enabled && p.customFields?.approvalStatus === 'pending');
        const rejectedVisible = items.filter(p => p.enabled && p.customFields?.approvalStatus === 'rejected');
        const pendingHidden = items.filter(p => !p.enabled && p.customFields?.approvalStatus === 'pending');
        const approvedVisible = items.filter(p => p.enabled && p.customFields?.approvalStatus === 'approved');
        const approvedHidden = items.filter(p => !p.enabled && p.customFields?.approvalStatus === 'approved');

        console.log(`- Pending & Visible (enabled: true, approvalStatus: 'pending'): ${pendingVisible.length}`);
        console.log(`- Rejected & Visible (enabled: true, approvalStatus: 'rejected'): ${rejectedVisible.length}`);
        console.log(`- Pending & Hidden (enabled: false, approvalStatus: 'pending'): ${pendingHidden.length}`);
        console.log(`- Approved & Visible (enabled: true, approvalStatus: 'approved'): ${approvedVisible.length}`);
        console.log(`- Approved & Hidden (enabled: false, approvalStatus: 'approved'): ${approvedHidden.length}`);

        if (pendingVisible.length > 0) {
            console.log("\nSome pending visible products:");
            pendingVisible.slice(0, 5).forEach(p => console.log(`  - [ID: ${p.id}] ${p.name}`));
        }
    } catch (e) {
        console.error("Error running check-products:", e);
    }
}
run();
