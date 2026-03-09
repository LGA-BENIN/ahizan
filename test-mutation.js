const http = require('http');

async function run() {
    const loginData = JSON.stringify({
        query: `
            mutation {
                login(username: "superadmin", password: "superadmin") {
                    ... on CurrentUser { id }
                }
            }
        `
    });

    const loginRes = await makeRequest(loginData);
    const token = loginRes.headers['vendure-auth-token'];
    console.log('Got token:', token);

    const mutateData = JSON.stringify({
        query: `
            mutation Update($input: UpdateBrevoSettingsInput!) {
                updateBrevoSettings(input: $input) {
                    id
                    channelsConfig
                }
            }
        `,
        variables: {
            input: {
                brevoApiKey: "test",
                defaultPhonePrefix: "+229",
                channelsConfig: { "OrderConfirmed": { "enabled": true } }
            }
        }
    });

    const mutRes = await makeRequest(mutateData, token);
    console.log('Mutation Response:', mutRes.body);
}

function makeRequest(data, token = null) {
    return new Promise((resolve, reject) => {
        const headers = {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path: '/admin-api',
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

run().catch(console.error);
