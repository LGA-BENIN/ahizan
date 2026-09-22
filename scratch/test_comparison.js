const localQuery = `
    query GetLocalProducts($marketId: ID, $locationId: ID, $latitude: Float, $longitude: Float, $radiusKm: Float) {
        vendors(
            marketId: $marketId, 
            locationId: $locationId, 
            latitude: $latitude,
            longitude: $longitude,
            radiusKm: $radiusKm,
            options: { filter: { status: { eq: "APPROVED" } }, take: 100 }
        ) {
            items {
                id
                name
                latitude
                longitude
                physicalMarket { id name }
                location { id name }
                products {
                    id
                    name
                    slug
                    customFields { approvalStatus }
                    variants {
                        id
                        name
                        priceWithTax
                    }
                }
            }
        }
    }
`;

async function getClientProducts(cityName, variables) {
    const res = await fetch("http://127.0.0.1:3000/shop-api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: localQuery, variables })
    });
    const json = await res.json();
    const vendors = json?.data?.vendors?.items || [];
    
    const productList = [];
    vendors.forEach(v => {
        const approved = (v.products || []).filter(p => !p.customFields?.approvalStatus || p.customFields.approvalStatus === "approved");
        approved.forEach(p => {
            const price = p.variants?.[0]?.priceWithTax ? `${p.variants[0].priceWithTax} FCFA` : "N/A";
            productList.push({
                productId: p.id,
                productName: p.name,
                vendorName: v.name,
                vendorMarket: v.physicalMarket?.name || "Boutique en ligne / Quartier",
                vendorCoords: v.latitude && v.longitude ? `${Number(v.latitude).toFixed(3)}, ${Number(v.longitude).toFixed(3)}` : "N/A",
                price
            });
        });
    });
    return productList;
}

async function runComparison() {
    console.log("==========================================================================================");
    console.log("🛒 SIMULATION CLIENT STOREFRONT : COMPARAISON COTONOU vs PORTO-NOVO vs ABOMEY-CALAVI");
    console.log("==========================================================================================\n");

    // 1. Client à Cotonou (Rayon 10 km)
    const cotonouProducts = await getClientProducts("Cotonou", {
        locationId: "18",
        latitude: 6.3654,
        longitude: 2.4183,
        radiusKm: 10
    });

    // 2. Client à Porto-Novo (Rayon 10 km)
    const portoNovoProducts = await getClientProducts("Porto-Novo", {
        locationId: "2",
        latitude: 6.4935,
        longitude: 2.6247,
        radiusKm: 10
    });

    // 3. Client à Abomey-Calavi (Rayon 10 km)
    const calaviProducts = await getClientProducts("Abomey-Calavi", {
        locationId: "3",
        latitude: 6.5109,
        longitude: 2.3303,
        radiusKm: 10
    });

    console.log("📍 [1] CLIENT POSITIONNÉ SUR : COTONOU (Rayon 10 km)");
    console.log(`Nombre total d'articles affichés : ${cotonouProducts.length}`);
    cotonouProducts.forEach((item, i) => {
        console.log(`  ${i+1}. [${item.productName}] | Prix: ${item.price} | Vendeur: ${item.vendorName} (${item.vendorMarket})`);
    });

    console.log("\n------------------------------------------------------------------------------------------\n");

    console.log("📍 [2] CLIENT POSITIONNÉ SUR : PORTO-NOVO (Rayon 10 km)");
    console.log(`Nombre total d'articles affichés : ${portoNovoProducts.length}`);
    portoNovoProducts.forEach((item, i) => {
        console.log(`  ${i+1}. [${item.productName}] | Prix: ${item.price} | Vendeur: ${item.vendorName} (${item.vendorMarket})`);
    });

    console.log("\n------------------------------------------------------------------------------------------\n");

    console.log("📍 [3] CLIENT POSITIONNÉ SUR : ABOMEY-CALAVI (Rayon 10 km)");
    console.log(`Nombre total d'articles affichés : ${calaviProducts.length}`);
    calaviProducts.forEach((item, i) => {
        console.log(`  ${i+1}. [${item.productName}] | Prix: ${item.price} | Vendeur: ${item.vendorName} (${item.vendorMarket})`);
    });

    console.log("\n==========================================================================================");
}

runComparison();
