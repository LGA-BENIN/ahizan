// Native fetch is available in Node.js 18+

async function verifyPlugin() {
    console.log('Verifying PageInscriptionPlugin API...');
    const API_URL = 'http://localhost:3000/admin-api';

    // 1. Authenticate
    console.log('Logging in as superadmin...');
    let token = '';
    try {
        const loginResponse = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: `
                    mutation Login($username: String!, $password: String!) {
                        login(username: $username, password: $password) {
                            ... on CurrentUser {
                                id
                                identifier
                            }
                            ... on InvalidCredentialsError {
                                errorCode
                                message
                            }
                        }
                    }
                `,
                variables: {
                    username: 'superadmin',
                    password: 'superadmin'
                }
            })
        });

        const loginJson = await loginResponse.json();
        if (loginJson.errors) {
            console.error('❌ Login Error (GraphQL):', loginJson.errors[0].message);
            return;
        }
        if (loginJson.data?.login?.errorCode) {
            console.error('❌ Login Failed:', loginJson.data.login.message);
            return;
        }

        // Get auth token from headers
        const authHeader = loginResponse.headers.get('vendure-auth-token');
        if (authHeader) {
            token = authHeader;
            console.log('✅ Logged in successfully. Token received.');
        } else {
            console.warn('⚠️ No auth token header received, checking if cookie-based auth is used.');
            // In some configs, only cookies are sent. Fetch handles cookies automatically if we use a cookie jar or just pass 'Cookie' header if we had one.
            // But simple fetch doesn't persist cookies across requests unless we manually handle them.
            // Vendure usually sends 'vendure-auth-token' header on login response if configured for it.
        }
    } catch (error) {
        console.error('❌ Failed to connect to Admin API for login:', error.message);
        return;
    }

    // 2. Query Protected Resource
    console.log('Querying protected resource...');
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                query: `
                    query {
                        registrationFieldsAdmin {
                            id
                            name
                            label
                        }
                    }
                `
            })
        });

        const json = await response.json();

        if (json.errors) {
            console.error('❌ Plugin API Error:', json.errors[0].message);
            console.log('This confirms the "Unauthorized" error persists even with superadmin login?');
        } else if (json.data && json.data.registrationFieldsAdmin) {
            console.log('✅ Plugin API is working with SuperAdmin credentials!');
            console.log(`Found ${json.data.registrationFieldsAdmin.length} fields configured.`);
        } else {
            console.error('❌ Unexpected response structure:', json);
        }
    } catch (error) {
        console.error('❌ Failed to connect to Admin API:', error.message);
    }
}

verifyPlugin();
