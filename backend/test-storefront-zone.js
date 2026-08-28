const fetch = require('node-fetch');

async function testShopApi() {
    const res = await fetch('http://127.0.0.1:3000/shop-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            query: `query GetProducts($options: ProductListOptions) {
                products(options: $options) {
                    totalItems
                    items {
                        id name slug collections { id name }
                        customFields {
                            vendor { id name zone location { id name } physicalMarket { id name } markets { id name } }
                        }
                    }
                }
            }`,
            variables: { options: { take: 100 } }
        })
    });
    const json = await res.json();
    if (json.errors) {
        console.error('GraphQL Error:', JSON.stringify(json.errors, null, 2));
    }
    const items = json.data?.products?.items || [];
    console.log(`Total shop-api products returned: ${items.length}`);
    const vendorMap = {};
    items.forEach(p => {
        const v = p.customFields?.vendor;
        if (!v) return;
        if (!vendorMap[v.id]) {
            vendorMap[v.id] = {
                name: v.name,
                location: v.location ? `${v.location.id} (${v.location.name})` : 'null',
                physicalMarket: v.physicalMarket ? `${v.physicalMarket.id} (${v.physicalMarket.name})` : 'null',
                markets: (v.markets || []).map(m => `${m.id} (${m.name})`),
                productsCount: 0
            };
        }
        vendorMap[v.id].productsCount++;
    });
    console.log('Vendors in shop-api products:', JSON.stringify(vendorMap, null, 2));
}
testShopApi();
