const fetch = require('node-fetch');

async function testMutation() {
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
                __type(name: "Mutation") {
                    fields { name }
                }
            }`
        })
    });
    const data = await res.json();
    const names = data.data?.__type?.fields?.map(f => f.name) || [];
    console.log('Collection related mutations:', names.filter(n => n.toLowerCase().includes('collection')));
    console.log('Product related mutations:', names.filter(n => n.toLowerCase().includes('product')));
}
testMutation();
