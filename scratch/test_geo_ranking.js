const { Client } = require('pg');

async function testGeoRanking() {
    const client = new Client({
        host: '127.0.0.1',
        port: 5432,
        user: 'postgres',
        password: 'Fernand0@91820805',
        database: 'postgres',
    });

    await client.connect();

    // 1. Récupérer toutes les offres avec les infos vendeur
    const query = `
        SELECT 
            so.id as offer_id,
            so.price,
            so."promotionalPrice",
            so."onPromotion",
            so.stock,
            so."deliveryTimeValue",
            so."deliveryTimeUnit",
            pv.id as variant_id,
            pv.name as variant_name,
            p.id as product_id,
            p.name as product_name,
            v.id as vendor_id,
            v.name as vendor_name,
            v.email as vendor_email,
            v.latitude as vendor_lat,
            v.longitude as vendor_lon,
            v."locationId" as vendor_location_id,
            v."physicalMarketId" as vendor_market_id,
            v.rating as vendor_rating,
            gz.name as zone_name,
            pm.name as market_name
        FROM seller_offer so
        JOIN product_variant pv ON pv.id = so."productVariantId"
        JOIN product p ON p.id = pv."productId"
        JOIN vendor v ON v.id = so."vendorId"
        LEFT JOIN geo_zone gz ON gz.id = v."locationId"
        LEFT JOIN market pm ON pm.id = v."physicalMarketId"
        WHERE v.email LIKE 'vendeurtestahizan%'
    `;

    const res = await client.query(query);
    const offers = res.rows;
    console.log(`\n📦 Total offres de test récupérées: ${offers.length}\n`);

    // Haversine distance
    function calculateDistanceKm(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // Algorithme ACTUEL de scoring (display-engine.ts)
    function currentScoring(offer, context) {
        let score = 100;
        const stock = Number(offer.stock || 1);
        if (stock > 0) score += 25;

        // Promo
        if (offer.onPromotion && offer.promotionalPrice && offer.promotionalPrice < offer.price) {
            const discountPct = Math.round(((offer.price - offer.promotionalPrice) / offer.price) * 100);
            score += 50 + Math.min(30, discountPct);
        }

        // Distance GPS
        if (context.userLat && context.userLon && offer.vendor_lat && offer.vendor_lon) {
            const dist = calculateDistanceKm(context.userLat, context.userLon, Number(offer.vendor_lat), Number(offer.vendor_lon));
            offer.distanceKm = Math.round(dist * 10) / 10;
            if (dist <= 3) score += 60;
            else if (dist <= 8) score += 45;
            else if (dist <= 18) score += 30;
            else if (dist <= 35) score += 15;
            else score -= 10;
        }

        // Vendor rating
        if (offer.vendor_rating && Number(offer.vendor_rating) >= 4.5) score += 15;

        return score;
    }

    // Tester 3 positions clients
    const testClients = [
        { name: 'Client à Cotonou (Dantokpa / Ganhi)', lat: 6.3654, lon: 2.4183, commune: 'Cotonou' },
        { name: 'Client à Abomey-Calavi (Calavi Kpota)', lat: 6.4520, lon: 2.3550, commune: 'Abomey-Calavi' },
        { name: 'Client à Porto-Novo (Ouando)', lat: 6.5120, lon: 2.6150, commune: 'Porto-Novo' },
    ];

    for (const user of testClients) {
        console.log(`========================================================================`);
        console.log(`📍 SIMULATION : ${user.name} (lat: ${user.lat}, lon: ${user.lon})`);
        console.log(`========================================================================`);

        const scored = offers.map(o => {
            const sc = currentScoring({ ...o }, { userLat: user.lat, userLon: user.lon, communeName: user.commune });
            return {
                ...o,
                score: sc,
                distance: calculateDistanceKm(user.lat, user.lon, Number(o.vendor_lat), Number(o.vendor_lon))
            };
        });

        // Tri actuel par score décroissant
        scored.sort((a, b) => b.score - a.score);

        // Répartition des 20 premiers produits
        const top20 = scored.slice(0, 20);
        console.log(`\n🏆 TOP 20 PRODUITS AFFICHÉS EN PAGE 1 (Moteur actuel) :`);
        console.table(top20.map((item, idx) => ({
            Rank: idx + 1,
            Produit: item.product_name.substring(0, 25),
            Vendeur: item.vendor_name.substring(0, 25),
            Zone_Vendeur: item.zone_name || 'N/A',
            Distance_KM: item.distance.toFixed(1) + ' km',
            Score: item.score,
            En_Promo: item.onPromotion ? 'OUI' : 'NON',
            Prix: item.price + ' FCFA'
        })));

        // Analyse par ville / zone dans le TOP 20
        const zoneDistribution = top20.reduce((acc, curr) => {
            const z = curr.zone_name || 'Autre';
            acc[z] = (acc[z] || 0) + 1;
            return acc;
        }, {});
        console.log(`📊 Répartition géographique du Top 20 :`, zoneDistribution);
    }

    await client.end();
}

testGeoRanking().catch(console.error);
