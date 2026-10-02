const http = require('http');

async function gql(query, variables = {}) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({ query, variables });
        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path: '/shop-api',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function run() {
    const searchRes = await gql(`
        query {
            search(input: { take: 120, skip: 0, groupByProduct: false }) {
                totalItems
                items {
                    productId
                    productVariantId
                    productName
                    productVariantName
                    slug
                }
            }
        }
    `);
    
    console.log('Total search items:', searchRes.data?.search?.totalItems);
    const items = searchRes.data?.search?.items || [];
    console.log('Items returned count:', items.length);

    const variantIds = items.map(i => i.productVariantId).filter(Boolean);
    console.log('Variant IDs count:', variantIds.length);

    const offersRes = await gql(`
        query GetOffers($variantIds: [ID!]!) {
            sellerOffersForVariants(variantIds: $variantIds) {
                id
                price
                stock
                vendor {
                    id
                    name
                    latitude
                    longitude
                }
                productVariant {
                    id
                    name
                }
            }
        }
    `, { variantIds });

    const offers = offersRes.data?.sellerOffersForVariants || [];
    console.log('Offers returned count:', offers.length);
    console.log('\nVendors with offers:');
    const vendorMap = {};
    for (const off of offers) {
        const vName = off.vendor?.name || 'Unknown';
        vendorMap[vName] = (vendorMap[vName] || 0) + 1;
    }
    console.table(vendorMap);
}

run().catch(console.error);
