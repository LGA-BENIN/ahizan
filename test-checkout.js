// Standalone script to test checkout flow outside of Next.js

const API_URL = 'http://127.0.0.1:3000/shop-api';
const TOKEN = '8aafb4aab980e00e3a19f9d6e793075648bbc1q582fmw8rj0evrsd4d0046dlc9gshffqp5kgm2y';

async function run() {
    console.log('Testing checkout for token:', TOKEN);

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
        'vendure-token': '8aafb4aab980e00e3a19f9d6e793075648bbc1q582fmw8rj0evrsd4d0046dlc9gshffqp5kgm2y' // Also include as header if needed
    };

    // 1. Check active order
    console.log('\n--- 1. Checking Active Order ---');
    const q1 = `query { activeOrder { id code state totalWithTax } }`;
    const r1 = await fetch(API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: q1 })
    });
    const d1 = await r1.json();
    console.log('Result:', JSON.stringify(d1, null, 2));

    if (!d1.data?.activeOrder) {
        console.log('No active order found. Cannot proceed.');
        return;
    }

    const orderState = d1.data.activeOrder.state;
    if (orderState !== 'ArrangingPayment') {
        console.log('\n--- 2. Transitioning to ArrangingPayment ---');
        const m1 = `mutation { transitionOrderToState(state: "ArrangingPayment") { ... on Order { state } ... on ErrorResult { errorCode message } } }`;
        const r2 = await fetch(API_URL, {
            method: 'POST',
            headers,
            body: JSON.stringify({ query: m1 })
        });
        const d2 = await r2.json();
        console.log('Result:', JSON.stringify(d2, null, 2));
    }

    // 3. Add Payment
    console.log('\n--- 3. Adding Payment ---');
    const m2 = `mutation { addPaymentToOrder(input: { method: "cash-on-delivery", metadata: {} }) { ... on Order { id code state } ... on ErrorResult { errorCode message } } }`;
    const r3 = await fetch(API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: m2 })
    });
    const d3 = await r3.json();
    console.log('Result:', JSON.stringify(d3, null, 2));
}

run().catch(console.error);
