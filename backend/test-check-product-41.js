const fetch = require('node-fetch');

async function checkProd41() {
    const loginRes = await fetch('http://127.0.0.1:3000/admin-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            query: `mutation { login(username: "superadmin", password: "superadmin") { ... on CurrentUser { id } } }`
        })
    });
    const token = loginRes.headers.get('vendure-auth-token');
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

    const res = await fetch('http://127.0.0.1:3000/admin-api', {
        method: 'POST', headers,
        body: JSON.stringify({
            query: `query {
                product(id: "41") {
                    id name customFields { vendor { id name } approvalStatus }
                }
            }`
        })
    });
    console.log('Admin API product 41:', JSON.stringify(await res.json(), null, 2));
}
checkProd41();
