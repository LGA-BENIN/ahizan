async function run() {
    try {
        // 1. Login
        const loginRes = await fetch('http://localhost:3000/admin-api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: `mutation { login(username: "superadmin", password: "superadmin") { ... on CurrentUser { id } } }`
            })
        });
        const loginJson = await loginRes.json();
        
        const cookie = loginRes.headers.get('set-cookie');
        
        // 2. Test products query
        const query = `
        query {
            products(options: { take: 10 }) {
                items {
                    id
                    name
                    featuredAsset {
                        preview
                    }
                }
            }
        }
        `;
        const res = await fetch('http://localhost:3000/admin-api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'cookie': cookie },
            body: JSON.stringify({ query })
        });
        const json = await res.json();
        console.log(JSON.stringify(json, null, 2));

        // 3. Test search query
        const query2 = `
        query {
            search(input: { take: 10, groupByProduct: true }) {
                items {
                    productId
                    productName
                    productAsset {
                        preview
                    }
                }
            }
        }
        `;
        const res2 = await fetch('http://localhost:3000/admin-api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'cookie': cookie },
            body: JSON.stringify({ query: query2 })
        });
        const json2 = await res2.json();
        console.log("SEARCH QUERY:");
        console.log(JSON.stringify(json2, null, 2));

    } catch (e) {
        console.error(e);
    }
}
run();
