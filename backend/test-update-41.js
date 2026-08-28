const fetch = require('node-fetch');

async function testUpdate() {
    const loginRes = await fetch('http://127.0.0.1:3000/admin-api', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `mutation { login(username: "superadmin", password: "superadmin") { ... on CurrentUser { id } } }` })
    });
    const token = loginRes.headers.get('vendure-auth-token');
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

    const mut = `mutation UpdateProd($input: UpdateProductInput!) {
        updateProduct(input: $input) {
            ... on Product { id name customFields { vendor { id name } approvalStatus } }
            ... on ErrorResult { errorCode message }
        }
    }`;
    const res = await fetch('http://127.0.0.1:3000/admin-api', {
        method: 'POST', headers,
        body: JSON.stringify({
            query: mut,
            variables: {
                input: {
                    id: "41",
                    customFields: {
                        vendorId: "8",
                        approvalStatus: "approved"
                    }
                }
            }
        })
    });
    console.log('Update result:', JSON.stringify(await res.json(), null, 2));
}
testUpdate();
