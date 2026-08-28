const fetch = require('node-fetch');

async function test188() {
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
            query: `query { collection(id: "188") { id name slug filters { code args { name value } } productVariants { items { id name } } } }`
        })
    });
    console.log(JSON.stringify(await res.json(), null, 2));
}
test188();
