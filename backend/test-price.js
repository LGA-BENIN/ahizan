const fetch = require('node-fetch');

async function testPrice() {
    const loginRes = await fetch('http://127.0.0.1:3000/admin-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            query: `mutation { login(username: "superadmin", password: "superadmin") { ... on CurrentUser { id } } }`
        })
    });
    const token = loginRes.headers.get('vendure-auth-token');
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    const res = await fetch('http://127.0.0.1:3000/admin-api', {
        method: 'POST',
        headers,
        body: JSON.stringify({
            query: `query {
                taxCategories { items { id name isDefault } }
                productVariants(options: { take: 3 }) {
                    items { id name sku price priceWithTax taxCategory { id name } }
                }
            }`
        })
    });
    console.log(JSON.stringify(await res.json(), null, 2));
}
testPrice();
