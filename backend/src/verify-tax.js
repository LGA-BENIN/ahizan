const http = require('http');

function post(query, variables, token) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({ query, variables });
        const options = {
            hostname: 'localhost',
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

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.errors) reject(new Error(json.errors[0].message));
                    else resolve({ data: json.data, headers: res.headers });
                } catch (e) {
                    reject(new Error('Invalid JSON: ' + data));
                }
            });
        });

        req.on('error', (e) => reject(e));
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
            translations: [{ languageCode: en, name: "Tax Test Product JS", slug: "tax-test-js", description: "test" }]
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

async function verify() {
    console.log('Logging in...');
    try {
        const loginRes = await post(LOGIN, { username: 'superadmin', password: 'superadmin' });
        console.log('Logged in.');

        // Extract token/cookie
        let token = loginRes.headers['vendure-auth-token'];
        if (!token) {
            const cookie = loginRes.headers['set-cookie'];
            if (cookie) {
                // Simple cookie handling if needed, but 'vendure-auth-token' header is standard
                console.log('Got cookie, but using no auth header for next requests (relying on cookie if agent handled it, but http.request is not an agent).');
                // manual cookie handling is a pain. 
            }
        }

        // Actually, without token passed in header, subsequent requests effectively are unauthenticated unless we pass Cookie header.
        // Let's assume we need to pass the token.
        // If 'vendure-auth-token' is not returned, we might be in cookie mode.
        // Let's try to pass 'Cookie' header if token is missing.

        const headers = { 'Content-Type': 'application/json' };
        let cookieHeader = loginRes.headers['set-cookie'];

        // Wrapper for authorized request
        const query = (q, v) => {
            return new Promise((resolve, reject) => {
                const body = JSON.stringify({ query: q, variables: v });
                const opts = {
                    hostname: 'localhost',
                    port: 3000,
                    path: '/admin-api',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(body),
                    }
                };
                if (token) opts.headers['Authorization'] = `Bearer ${token}`;
                if (cookieHeader) opts.headers['Cookie'] = cookieHeader;

                const req = http.request(opts, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        try {
                            const j = JSON.parse(data);
                            if (j.errors) reject(new Error(j.errors[0].message));
                            else resolve(j.data);
                        } catch (e) { reject(e); }
                    });
                });
                req.on('error', reject);
                req.write(body);
                req.end();
            });
        };

        console.log('Checking Tax Setup...');
        const setup = await query(CHECK_TAX_SETUP);

        const standardTax = setup.taxCategories.items.find(tc => tc.name === 'Standard Tax');
        console.log('Standard Tax Category:', standardTax ? 'FOUND' : 'MISSING');

        const zeroRate = setup.taxRates.items.find(tr => tr.value === 0 && tr.category.name === 'Standard Tax');
        console.log('0% Tax Rate linked to Standard Tax:', zeroRate ? 'FOUND' : 'MISSING');

        console.log('Creating Test Product...');
        const prod = await query(CREATE_PRODUCT);
        const variant = prod.createProduct.variants[0];

        console.log('Product Created. Tax Category:', variant.taxCategory?.name);

        if (variant.taxCategory?.name === 'Standard Tax') {
            console.log('SUCCESS: Product automatically assigned to Standard Tax.');
        } else {
            console.error('FAILED: Product assigned to ' + variant.taxCategory?.name);
        }

    } catch (e) {
        console.error('Error:', e.message);
    }
}

verify();
