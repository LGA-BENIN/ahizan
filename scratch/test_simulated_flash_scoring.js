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

function scoreOffer(offer, userLat, userLon) {
    const vendor = offer.vendor;
    let tierBase = 500;
    let geoBonus = 0;
    let distKm = null;
    if (userLat && userLon && vendor?.latitude && vendor?.longitude) {
        distKm = Math.round(calculateDistanceKm(userLat, userLon, Number(vendor.latitude), Number(vendor.longitude)) * 10) / 10;
        offer.distanceKm = distKm;
        if (distKm <= 2.5) {
            tierBase = 10000;
            geoBonus = 500;
        } else if (distKm <= 6.0) {
            tierBase = 10000;
            geoBonus = 300 - Math.round((distKm - 2.5) * 40);
        } else if (distKm <= 18.0) {
            tierBase = 5000;
            geoBonus = 250 - Math.round((distKm - 6.0) * 15);
        } else {
            tierBase = 1000;
            geoBonus = 0;
        }
    }
    const promoBonus = offer.onPromotion ? 50 : 0;
    return tierBase + geoBonus + promoBonus;
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

    for (const off of offers) {
        off.score = scoreOffer(off, userLat, userLon);
    }

    offers.sort((a, b) => b.score - a.score);

    console.log('Total scored offers:', offers.length);
    console.log('\nTop 25 offers:');
    console.table(offers.slice(0, 25).map(o => ({
        vendor: o.vendor?.name,
        product: o.productVariant?.product?.name,
        variant: o.productVariant?.name,
        distKm: o.distanceKm,
        score: o.score,
        onPromo: o.onPromotion,
        price: o.price,
        promoPrice: o.promotionalPrice
    })));
}

run().catch(console.error);
