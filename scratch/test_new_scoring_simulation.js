const { scoreOffer, processAndResolveDisplayItems } = require('../Storefront/src/lib/vendure/display-engine');

// Test simulation
const userCotonouAkpakpa = {
    latitude: 6.387298,
    longitude: 2.457211,
    name: 'Akpakpa Dodomè',
    commune: 'Cotonou',
};

const userCotonouFidjrosse = {
    latitude: 6.3690,
    longitude: 2.3610,
    name: 'Fidjrossè',
    commune: 'Cotonou',
};

const userPortoNovo = {
    latitude: 6.4935,
    longitude: 2.6247,
    name: 'Porto-Novo',
    commune: 'Porto-Novo',
};

// Generate 50 items in Cotonou (Dantokpa, Akpakpa, Ganhi, Fidjrosse)
const mockItems = [];

// 1. Akpakpa & Ganhi & Dantokpa vendors (Cotonou East)
for (let i = 1; i <= 25; i++) {
    mockItems.push({
        productId: `prod-cot-east-${i}`,
        productName: `Produit Cotonou Est ${i}`,
        productVariantId: `var-cot-east-${i}`,
        productVariantName: `Option ${i}`,
        slug: `prod-cot-east-${i}`,
        price: 5000 + i * 100,
        inStock: true,
        vendor: {
            id: `v-akpakpa-${i % 5}`,
            name: `Boutique Akpakpa ${i % 5}`,
            latitude: 6.3870 + (i * 0.001),
            longitude: 2.4570 + (i * 0.001),
            location: { id: '107', name: 'Akpakpa' },
            physicalMarket: { id: '2', name: 'Marché PK3' }
        }
    });
}

// 2. Fidjrosse & Cadjehoun vendors (Cotonou West)
for (let i = 1; i <= 25; i++) {
    mockItems.push({
        productId: `prod-cot-west-${i}`,
        productName: `Produit Cotonou Ouest ${i}`,
        productVariantId: `var-cot-west-${i}`,
        productVariantName: `Option ${i}`,
        slug: `prod-cot-west-${i}`,
        price: 5000 + i * 100,
        inStock: true,
        vendor: {
            id: `v-fidjrosse-${i % 5}`,
            name: `Boutique Fidjrossè ${i % 5}`,
            latitude: 6.3690 + (i * 0.001),
            longitude: 2.3610 + (i * 0.001),
            location: { id: '104', name: 'Fidjrossè' },
            physicalMarket: { id: '4', name: 'Marché Cadjèhoun' }
        }
    });
}

// 3. Porto-Novo vendors (~30 km away from Cotonou) - 100 products!
for (let i = 1; i <= 100; i++) {
    mockItems.push({
        productId: `prod-pn-${i}`,
        productName: `Produit Porto-Novo ${i}`,
        productVariantId: `var-pn-${i}`,
        productVariantName: `Option ${i}`,
        slug: `prod-pn-${i}`,
        price: 4500, // even with lower price / discount!
        onPromotion: true,
        promotionalPrice: 4000,
        inStock: true,
        vendor: {
            id: `v-portonovo-${i % 10}`,
            name: `Boutique Ouando ${i % 10}`,
            latitude: 6.4935 + (i * 0.001),
            longitude: 2.6247 + (i * 0.001),
            location: { id: '12', name: 'Ouando' },
            physicalMarket: { id: '14', name: 'Marché de Ouando' }
        }
    });
}

console.log('Total mock candidates created:', mockItems.length);

// Run display engine for Akpakpa user
const resultAkpakpa = processAndResolveDisplayItems(mockItems, {
    userLat: userCotonouAkpakpa.latitude,
    userLon: userCotonouAkpakpa.longitude,
    communeName: userCotonouAkpakpa.commune,
    maxVariantsPerCentralProduct: 2,
    maxItemsPerVendor: 4,
});

console.log('\n--- RESULT FOR AKPAKPA USER ---');
console.log('Total resolved items displayed:', resultAkpakpa.length);
console.log('First 5 items:');
resultAkpakpa.slice(0, 5).forEach((item, idx) => {
    console.log(`  #${idx + 1}: ${item.name} | Vendor: ${item.vendorName} | Dist: ${item.distanceKm} km | Score: ${item.score} | Fallback: ${item.fallbackLabel}`);
});

console.log('\nLast 5 items:');
resultAkpakpa.slice(-5).forEach((item, idx) => {
    console.log(`  #${resultAkpakpa.length - 5 + idx + 1}: ${item.name} | Vendor: ${item.vendorName} | Dist: ${item.distanceKm} km | Score: ${item.score} | Fallback: ${item.fallbackLabel}`);
});

const pnInAkpakpa = resultAkpakpa.filter(r => r.vendorName.includes('Ouando'));
const cotInAkpakpa = resultAkpakpa.filter(r => !r.vendorName.includes('Ouando'));
console.log(`\nSummary for Akpakpa: Local Cotonou products: ${cotInAkpakpa.length}, Distant Porto-Novo products: ${pnInAkpakpa.length}`);
