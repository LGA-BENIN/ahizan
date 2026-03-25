
async function verifyShopApi() {
    const query = `
        query {
            registrationFields {
                name
                label
                type
            }
        }
    `;

    try {
        const response = await fetch('http://localhost:3000/shop-api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
        });

        const json = await response.json();
        console.log('Status:', response.status);
        if (json.errors) {
            console.error('Errors:', JSON.stringify(json.errors, null, 2));
        } else {
            console.log('Data:', JSON.stringify(json.data, null, 2));
        }
    } catch (error) {
        console.error('Fetch failed:', error);
    }
}

verifyShopApi();
