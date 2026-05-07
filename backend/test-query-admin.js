const http = require('http');

async function check() {
    const loginData = JSON.stringify({
        query: `
            mutation {
                login(username: "superadmin", password: "superadmin") {
                    ... on CurrentUser { id }
                }
            }
        `
    });

    const loginRes = await makeRequest(loginData, '/admin-api');
    const token = loginRes.headers['vendure-auth-token'];

    const prodData = JSON.stringify({
        query: `
            query {
                products(options: { take: 5, sort: { updatedAt: DESC } }) {
                    items {
                        id
                        name
                        channels { id code }
                    }
                }
            }
        `
    });
    
    const prodRes = await makeRequest(prodData, '/admin-api', token);
    console.log(JSON.stringify(JSON.parse(prodRes.body), null, 2));
}

function makeRequest(data, path, token = null) {
    return new Promise((resolve, reject) => {
        const headers = {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path,
            method: 'POST',
            headers
        }, res => {
            let body = '';
            res.setEncoding('utf8');
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ headers: res.headers, body }));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

check().catch(console.error);
