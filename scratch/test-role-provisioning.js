async function testRoleProvisioning() {
    const adminApiUrl = 'http://localhost:3000/admin-api';
    const shopApiUrl = 'http://localhost:3000/shop-api';
    console.log(`Admin API URL: ${adminApiUrl}`);
    console.log(`Shop API URL: ${shopApiUrl}`);

    try {
        // 1. Log in as paulgera75@gmail.com via the ADMIN API (simulating Seller Dashboard login)
        console.log('\n1. Logging in as paulgera75@gmail.com via Admin API...');
        const loginMutation = `
            mutation {
                login(username: "paulgera75@gmail.com", password: "superadmin") {
                    __typename
                    ... on CurrentUser {
                        id
                        identifier
                    }
                }
            }
        `;

        const loginRes = await fetch(adminApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: loginMutation })
        });

        const loginJson = await loginRes.json();
        if (loginJson.errors) {
            console.error('Login failed with GraphQL errors:', loginJson.errors);
            return;
        }

        console.log('Login response:', JSON.stringify(loginJson.data));

        // Get authentication token from headers
        const authToken = loginRes.headers.get('vendure-auth-token');
        console.log('Acquired auth token:', authToken);

        if (!authToken) {
            console.error('Error: Did not receive vendure-auth-token in headers!');
            return;
        }

        const authHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        };

        // 2. Query active customer via the SHOP API (should be null initially)
        console.log('\n2. Querying active customer via Shop API...');
        const activeCustomerQuery = `
            query {
                activeCustomer {
                    id
                    emailAddress
                    firstName
                    lastName
                }
            }
        `;

        const customerRes = await fetch(shopApiUrl, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ query: activeCustomerQuery })
        });

        const customerJson = await customerRes.json();
        console.log('Active customer initially:', JSON.stringify(customerJson.data));

        // 3. Trigger automatic role provisioning (add client role to existing vendor)
        console.log('\n3. Triggering addClientRoleToExistingVendor mutation via Shop API...');
        const addClientRoleMutation = `
            mutation {
                addClientRoleToExistingVendor
            }
        `;

        const addClientRoleRes = await fetch(shopApiUrl, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ query: addClientRoleMutation })
        });

        const addClientRoleJson = await addClientRoleRes.json();
        if (addClientRoleJson.errors) {
            console.error('Mutation failed with errors:', addClientRoleJson.errors);
            return;
        }
        console.log('Mutation response:', JSON.stringify(addClientRoleJson.data));

        // 4. Query active customer again via the SHOP API (should be successfully created now!)
        console.log('\n4. Querying active customer again...');
        const customerRes2 = await fetch(shopApiUrl, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ query: activeCustomerQuery })
        });

        const customerJson2 = await customerRes2.json();
        console.log('Active customer after provisioning:', JSON.stringify(customerJson2.data));

        if (customerJson2.data?.activeCustomer?.emailAddress === 'paulgera75@gmail.com') {
            console.log('\nSUCCESS: Role provisioning verified successfully! Client profile was automatically created and associated.');
        } else {
            console.log('\nFAILURE: Client profile was not created or retrieved correctly.');
        }

    } catch (e) {
        console.error('Exception occurred during test:', e);
    }
}

testRoleProvisioning();
