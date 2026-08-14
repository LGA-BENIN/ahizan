const http = require('http');

function adminGraphQl(query, variables = {}, token = null) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({ query, variables });
        const headers = {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const req = http.request('http://127.0.0.1:3000/admin-api', {
            method: 'POST',
            headers,
        }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, token: res.headers['vendure-auth-token'], data: parsed });
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function main() {
    console.log('--- Step 1: Login as Superadmin ---');
    const loginRes = await adminGraphQl(`
        mutation Login($username: String!, $password: String!) {
            login(username: $username, password: $password) {
                ... on CurrentUser { id identifier }
                ... on ErrorResult { errorCode message }
            }
        }
    `, { username: 'superadmin', password: 'superadminpassword' });

    console.log('Login Response:', JSON.stringify(loginRes.data, null, 2));
    const token = loginRes.token;

    if (!token) {
        console.log('Trying with Fernand0@91820805 or superadmin password...');
        const loginRes2 = await adminGraphQl(`
            mutation Login($username: String!, $password: String!) {
                login(username: $username, password: $password) {
                    ... on CurrentUser { id identifier }
                    ... on ErrorResult { errorCode message }
                }
            }
        `, { username: 'superadmin', password: 'Fernand0@91820805' });
        console.log('Login 2 Response:', JSON.stringify(loginRes2.data, null, 2));
    }
}

main().catch(console.error);
