
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
            translations: [{ languageCode: en, name: "Tax Test Product", slug: "tax-test-fetch", description: "test" }]
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

async function fetchGraphQL(query: string, variables?: any, token?: string) {
    const headers: any = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
        const response = await fetch('http://localhost:3000/admin-api', {
            method: 'POST',
            headers,
            body: JSON.stringify({ query, variables }),
        });

        const json = await response.json();
        if (json.errors) {
            throw new Error(json.errors[0].message);
        }
        return { data: json.data, headers: response.headers };
    } catch (e: any) {
        console.error('Fetch Error:', e.message);
        throw e;
    }
}

async function verify() {
    console.log('Logging in...');
    try {
        // Login to get token
        // Note: Vendure uses cookie or bearer. Let's try to get the auth token from login response if vendure returns it, 
        // or just rely on the session cookie if fetch handles it (node fetch doesn't handle cookies automatically without agent).
        // Vendure 2+ usually returns a specific auth token in some configs or uses cookies.
        // Let's assume bearer token based workflow or handle cookie manually. 
        // Actually, for admin-api, standard login mutation sets a cookie. 
        // We might need to handle 'set-cookie' header.

        const loginRes = await fetch('http://localhost:3000/admin-api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: LOGIN,
                variables: { username: 'superadmin', password: 'superadmin' }
            }),
        });

        const loginJson = await loginRes.json();
        if (loginJson.errors) throw new Error(loginJson.errors[0].message);

        // Get the Auth-Token header or cookie
        const authToken = loginRes.headers.get('vendure-auth-token');
        const setCookie = loginRes.headers.get('set-cookie');

        const headers: any = { 'Content-Type': 'application/json' };
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        } else if (setCookie) {
            headers['Cookie'] = setCookie;
        }

        console.log('Logged in. Token/Cookie obtained.');

        // Helper for subsequent requests
        const query = async (q: string, v?: any) => {
            const res = await fetch('http://localhost:3000/admin-api', {
                method: 'POST',
                headers,
                body: JSON.stringify({ query: q, variables: v }),
            });
            const j = await res.json();
            if (j.errors) throw new Error(j.errors[0].message);
            return j.data;
        };

        console.log('Checking Tax Setup...');
        const setup = await query(CHECK_TAX_SETUP);

        const standardTax = setup.taxCategories.items.find((tc: any) => tc.name === 'Standard Tax');
        console.log('Standard Tax Category:', standardTax ? 'FOUND' : 'MISSING');

        const zeroRate = setup.taxRates.items.find((tr: any) => tr.value === 0 && tr.category.name === 'Standard Tax');
        console.log('0% Tax Rate linked to Standard Tax:', zeroRate ? 'FOUND' : 'MISSING');

        if (!standardTax || !zeroRate) {
            console.error('FAILED: Tax setup incomplete.');
            // Don't return, try to create product anyway to see what happens
        }

        console.log('Creating Test Product...');
        const prod = await query(CREATE_PRODUCT);
        const variant = prod.createProduct.variants[0];

        console.log('Product Created. Tax Category:', variant.taxCategory?.name);

        if (variant.taxCategory?.name === 'Standard Tax') {
            console.log('SUCCESS: Product automatically assigned to Standard Tax.');
        } else {
            console.error('FAILED: Product assigned to ' + variant.taxCategory?.name);
        }

    } catch (e: any) {
        console.error('Error:', e.message);
    }
}

verify();
