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

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function run() {
    const searchRes = await gql(`
        query {
            search(input: { take: 500, skip: 0, groupByProduct: false }) {
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
    
    const items = searchRes.data?.search?.items || [];
    const variantIds = items.map(i => i.productVariantId).filter(Boolean);

    const offersRes = await gql(`
        query GetOffers($variantIds: [ID!]!) {
            sellerOffersForVariants(variantIds: $variantIds) {
                id
                price
                stock
                onPromotion
                promotionalPrice
                vendor {
                    id
                    name
                    latitude
                    longitude
                    rating
                    physicalMarket { id name }
                    location { id name }
                }
                productVariant {
                    id
                    name
                    product { id name slug }
                }
            }
        }
    `, { variantIds });

    const offers = offersRes.data?.sellerOffersForVariants || [];
    const userLat = 6.387298;
    const userLon = 2.457211;

    console.log(`Total raw offers: ${offers.length}`);

    // Map vendor locations
    const vendorOffers = {};
    for (const off of offers) {
        if (!off.vendor) continue;
        const vName = off.vendor.name;
        if (!vendorOffers[vName]) {
            const vLat = Number(off.vendor.latitude);
            const vLon = Number(off.vendor.longitude);
            const dist = (vLat && vLon) ? Math.round(calculateDistanceKm(userLat, userLon, vLat, vLon) * 10) / 10 : null;
            vendorOffers[vName] = { count: 0, promoCount: 0, distKm: dist };
        }
        vendorOffers[vName].count++;
        if (off.onPromotion) vendorOffers[vName].promoCount++;
    }

    console.table(vendorOffers);
}

run().catch(console.error);
