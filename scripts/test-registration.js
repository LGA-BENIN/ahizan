
const FormData = require('form-data');
const fs = require('fs');

async function testRegistration() {
    const form = new FormData();
    form.append('emailAddress', 'test_' + Date.now() + '@example.com');
    form.append('password', 'password123');
    form.append('sellerType', 'ONLINE');
    form.append('dynamicDetails', JSON.stringify({ someField: "someValue" }));

    try {
        const response = await fetch('http://localhost:3000/shop-api', {
            method: 'POST',
            // headers: form.getHeaders(), // Native fetch in Node 18+ might perform header setting automatically with FormData? 
            // Actually native fetch with FormData sets content-type automatically.
            body: form
        });

        // Wait, Shop API expects GraphQL! 
        // We cannot just POST form data to /shop-api unless it's a REST endpoint?
        // Ah, `registerAction` in frontend calls `mutate`. 
        // Does it use a custom controller?
        // Or does it use GraphQL?

        console.log('Response status:', response.status);
        const text = await response.text();
        console.log('Response:', text.substring(0, 500));

    } catch (e) {
        console.error('Fetch failed:', e);
    }
}
// Note: This script is just a placeholder. I need to see actions.ts first.
