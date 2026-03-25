const fetch = require('node-fetch'); // Assuming node-fetch is available? No, node 18/20 includes global fetch.
// Actually, in ts-node context inside src, it uses project tsconfig?
// Let's create a plain .js file that runs with 'node' and uses http standard lib to have zero deps.

const http = require('http');

console.log('Using http request...');

function graphql(query, variables, token) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({ query, variables });
        const options = {
            hostname: '127.0.0.1',
            port: 3000,
            path: '/admin-api',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.errors) reject(new Error(json.errors[0].message));
                    else resolve({ data: json.data, headers: res.headers });
                } catch (e) {
                    reject(new Error(`Failed to parse response: ${data.substring(0, 100)}...`));
                }
            });
        });

        req.on('error', e => reject(e));
        req.write(body);
        req.end();
    });
}

const LOGIN = `
    mutation Login($username: String!, $password: String!) {
        login(username: $username, password: $password) {
            ... on CurrentUser { id }
        }
    }
`;

const CHECK_TAX_SETUP = `
    query {
        taxCategories { items { id name isDefault } }
        taxRates { items { id name value category { name } } }
    }
`;

const CREATE_PRODUCT = `
    mutation CreateProduct {
        createProduct(input: {
            translations: [{ languageCode: en, name: "Tax Enforcement Test Product", slug: "tax-test-js-v2", description: "test" }]
        }) {
            ... on Product {
                id
                variants {
                    id
                    taxCategory { name }
                }
            }
        }
    }
`;

async function main() {
    try {
        console.log('Logging in as superadmin...');
        const loginRes = await graphql(LOGIN, { username: 'superadmin', password: 'superadmin' });
        console.log('Logged in successfully.');

        // Extract auth token if header exists
        let authToken = loginRes.headers['vendure-auth-token'];
        if (!authToken) {
            // Try cookie from set-cookie
            const cookies = loginRes.headers['set-cookie'];
            if (cookies) {
                console.log('Auth using Cookie based session.');
                // For now, simpler test just proceeds. Usually admin-api needs token unless session cookie is sent back manually.
                // But wait, the previous error was "fetch failed", meaning connection error.
                // If we got here, connection works.
            } else {
                console.log('Warning: No Auth Token or Cookie found. Might fail next request.');
            }
        } else {
            console.log('Auth Token obtained.');
        }

        console.log('Checking Tax Setup...');
        const setupInfo = await graphql(CHECK_TAX_SETUP, {}, authToken);
        console.log('Tax Categories:', setupInfo.data.taxCategories.items.map(i => i.name));
        console.log('Tax Rates:', setupInfo.data.taxRates.items.map(i => `${i.name} (${i.value}%) -> ${i.category.name}`));

        const stdTax = setupInfo.data.taxCategories.items.find(t => t.name === 'Standard Tax');
        const zeroRate = setupInfo.data.taxRates.items.find(r => r.value === 0 && r.category.name === 'Standard Tax');

        if (stdTax && zeroRate) {
            console.log('SUCCESS: Tax Configuration is correct.');
        } else {
            console.error('FAILURE: Tax Configuration is missing required items.');
        }

    } catch (error) {
        console.error('Verification Failed:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error('Is the server running on port 3000? Check standard output.');
        }
    }
}

main();
