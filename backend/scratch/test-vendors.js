const fetch = require('node-fetch') || global.fetch;

async function testVendors() {
    const query = `
        query GetLocalProducts($marketId: ID, $locationId: ID) {
            vendors(
                marketId: $marketId, 
                locationId: $locationId, 
                options: { filter: { status: { eq: "APPROVED" } } }
            ) {
                items {
                    id
                    name
                    physicalMarket { id name }
                    location { id name }
                    products {
                        id
                        name
                        slug
                    }
                }
            }
        }
    `;

    try {
        const res = await fetch('http://localhost:3000/shop-api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables: { marketId: "1" } })
        });
        const json = await res.json();
        console.log("With marketId 1:", JSON.stringify(json, null, 2));

        const res2 = await fetch('http://localhost:3000/shop-api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables: {} })
        });
        const json2 = await res2.json();
        console.log("With NO marketId:", JSON.stringify(json2, null, 2));
    } catch (e) {
        console.error(e);
    }
}

testVendors();
