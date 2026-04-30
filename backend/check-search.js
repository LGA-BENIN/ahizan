const fetch = require('node-fetch');

async function checkSearch() {
    const shopApiUrl = 'http://127.0.0.1:3000/shop-api';
    const query = `
        query {
            search(input: { groupByProduct: true, take: 50 }) {
                totalItems
                items {
                    productId
                    productName
                    facetValueIds
                    collectionIds
                }
            }
        }
    `;

    try {
        const res = await fetch(shopApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });
        const data = await res.json();
        console.log('Total Search Items:', data.data?.search?.totalItems);
        console.log('Items:', JSON.stringify(data.data?.search?.items, null, 2));
    } catch (err) {
        console.error('Error:', err);
    }
}

checkSearch();
