const fetch = require('node-fetch');

async function testUpdate() {
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

    const resUp = await fetch('http://127.0.0.1:3000/admin-api', {
        method: 'POST',
        headers,
        body: JSON.stringify({
            query: `mutation Update($input: UpdateCollectionInput!) {
                updateCollection(input: $input) {
                    id name filters { code args { name value } }
                }
            }`,
            variables: {
                input: {
                    id: "4",
                    filters: [
                        {
                            code: "variant-id-filter",
                            arguments: [
                                {
                                    name: "variantIds",
                                    value: "[\"1\",\"4\",\"5\",\"8\",\"10\",\"13\",\"16\",\"11\"]"
                                }
                            ]
                        }
                    ]
                }
            }
        })
    });
    console.log('Update result:', JSON.stringify(await resUp.json(), null, 2));
}
testUpdate();
