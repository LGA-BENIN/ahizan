
const fetch = globalThis.fetch;

async function testAdminApi() {
    try {
        console.log('Testing connection to http://127.0.0.1:3000/admin-api...');
        const response = await fetch('http://127.0.0.1:3000/admin-api', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: `query {
                    admin {
                        id
                    }
                }`
            })
        });

        console.log('Response Status:', response.status);
        if (response.ok) {
            const data = await response.json();
            console.log('Success! Data:', JSON.stringify(data, null, 2));
        } else {
            const text = await response.text();
            console.error('Failed. Response Body:', text);
        }
    } catch (error) {
        console.error('Fetch Failed:', error.message);
        if (error.cause) console.error('Cause:', error.cause);
    }
}

testAdminApi();
