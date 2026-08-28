const fetch = require('node-fetch');

async function testStorefrontFiltering(slug, zoneId) {
    console.log(`--- Test du filtrage Storefront (slug="${slug}", zoneId="${zoneId}") ---`);
    const res = await fetch('http://127.0.0.1:3000/shop-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            query: `query GetProducts($options: ProductListOptions) {
                products(options: $options) {
                    items {
                        id name slug collections { id name }
                        variants { id priceWithTax }
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
    const allProducts = json.data?.products?.items || [];

    // 1. Filter by collection "pc" (ID 4)
    let collectionProducts = allProducts.filter(p => (p.collections || []).some(c => c.id === "4" || c.name.toLowerCase() === slug.toLowerCase()));
    console.log(`Produits trouvés pour la collection "${slug}": ${collectionProducts.length}`);

    // 2. Filter by zoneId
    let filteredByZone = collectionProducts.filter(p => {
        const vendor = p.customFields?.vendor;
        if (!vendor) return false;
        const belongsToMarket = String(vendor.physicalMarket?.id) === String(zoneId) ||
            (vendor.markets || []).some(m => String(m.id) === String(zoneId));
        const belongsToNeighborhood = String(vendor.location?.id) === String(zoneId);
        return belongsToMarket || belongsToNeighborhood;
    });

    console.log(`Produits après filtrage par zoneId="${zoneId}": ${filteredByZone.length}`);
    if (filteredByZone.length > 0) {
        console.log(`Exemples de produits dans la zone "${zoneId}":`);
        filteredByZone.slice(0, 3).forEach(p => {
            console.log(` - [ID ${p.id}] ${p.name} (Vendeur: ${p.customFields.vendor.name} | Marché: ${p.customFields.vendor.physicalMarket?.name} | Quartier: ${p.customFields.vendor.location?.name})`);
        });
    }
}

async function runTests() {
    await testStorefrontFiltering("pc", "1"); // Marché Dantokpa
    await testStorefrontFiltering("pc", "3"); // Marché Moderne de Ganhi
    await testStorefrontFiltering("pc", "11"); // Haie Vive
    await testStorefrontFiltering("pc", "7"); // Cadjèhoun
}
runTests();
