const VENDURE_URL = 'http://localhost:3000/shop-api';
const TOKEN = '2fe0f5c406399047395bdab4328fd822fbdf2ab6bd3a4ab1c8beafaba763a8be';

async function run() {
    console.log('--- Checking Customer Permissions ---');
    const q1 = await fetch(VENDURE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TOKEN}`
        },
        body: JSON.stringify({
            query: `query { activeCustomer { emailAddress user { identifier } } }`
        })
    });
    const r1 = await q1.json();
    console.log('Active Customer:', JSON.stringify(r1, null, 2));

    const q3 = await fetch(VENDURE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TOKEN}`
        },
        body: JSON.stringify({
            query: `query { me { identifier permissions } }`
        })
    });
    const r3 = await q3.json();
    console.log('Me (Permissions):', JSON.stringify(r3, null, 2));
}

run().catch(console.error);
