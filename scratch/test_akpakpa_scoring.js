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
                    priceWithTax {
                        __typename
                        ... on SinglePrice { value }
                        ... on PriceRange { min max }
                    }
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
    console.log('Offers count:', offers.length);

    const userLat = 6.387298;
    const userLon = 2.457211;

    // Build rawItemsWithOffers
    const rawOffers = [];
    for (const off of offers) {
        if (!off.vendor) continue;
        const vLat = Number(off.vendor.latitude);
        const vLon = Number(off.vendor.longitude);
        const dist = Math.round(calculateDistanceKm(userLat, userLon, vLat, vLon) * 10) / 10;
        
        let tierBase = 1000;
        let geoBonus = 0;
        if (dist <= 2.5) {
            tierBase = 10000;
            geoBonus = 500;
        } else if (dist <= 6.0) {
            tierBase = 10000;
            geoBonus = 300 - Math.round((dist - 2.5) * 40);
        } else if (dist <= 18.0) {
            tierBase = 5000;
            geoBonus = 250 - Math.round((dist - 6.0) * 15);
        }

        const score = tierBase + geoBonus;
        rawOffers.push({
            vendorName: off.vendor.name,
            productName: off.productVariant?.product?.name,
            variantName: off.productVariant?.name,
            price: off.price,
            dist,
            score
        });
    }

    rawOffers.sort((a, b) => b.score - a.score);

    console.log('\nTop 25 scored offers for Akpakpa (6.387298, 2.457211):');
    console.table(rawOffers.slice(0, 25).map(o => ({
        vendor: o.vendorName,
        product: o.productName,
        variant: o.variantName,
        distKm: o.dist,
        score: o.score
    })));
}

run().catch(console.error);
