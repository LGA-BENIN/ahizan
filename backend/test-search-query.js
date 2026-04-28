const fetch = require('node-fetch');

const query = `
    query GetFlashProducts($input: SearchInput!) {
        search(input: $input) {
            totalItems
            items {
                productId
                productName
                slug
                priceWithTax {
                    ... on PriceRange { min max }
                    ... on SinglePrice { value }
                }
            }
        }
    }
`;

async function testSearch(input) {
    console.log('Testing search with input:', JSON.stringify(input, null, 2));
    const res = await fetch('http://localhost:3000/shop-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { input } })
    });
    const data = await res.json();
    if (data.errors) {
        console.error('GraphQL Errors:', JSON.stringify(data.errors, null, 2));
    } else {
        console.log('Total Items Found:', data.data.search.totalItems);
        console.log('First 3 items:', JSON.stringify(data.data.search.items.slice(0, 3), null, 2));
    }
}

async function runTests() {
    // Test 1: Empty search (just limit)
    await testSearch({ take: 3, groupByProduct: true });

    // Test 2: Price range
    await testSearch({ 
        take: 3, 
        groupByProduct: true,
        priceRange: { min: 1000, max: 1000000 } 
    });

    // Test 3: Facet values (if we had IDs)
    // await testSearch({ take: 3, groupByProduct: true, facetValueIds: ["1"] });
}

runTests().catch(console.error);
