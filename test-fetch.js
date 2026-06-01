const fetch = require('node-fetch'); // If not available, we will use http

async function test() {
    const collectionQuery = `
        query GetCollectionProducts($id: ID!, $take: Int!) {
            collection(id: $id) {
                productVariants(options: { take: $take }) {
                    items {
                        priceWithTax
                        product {
                            id
                            name
                            slug
                            assets {
                                id
                                preview
                            }
                        }
                    }
                }
            }
        }
    `;

    const res = await fetch('http://localhost:32846/shop-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            query: collectionQuery, 
            variables: { id: "16", take: 50 } 
        })
    });

    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));

    if (data.errors || !data.data?.collection?.productVariants?.items) {
        console.log("Empty or errors!");
        return;
    }
    const items = data.data.collection.productVariants.items;
    const seen = new Set();
    const processed = items.reduce((acc, item) => {
        if (!seen.has(item.product.id)) {
            seen.add(item.product.id);
            acc.push({
                productId: item.product.id,
                productName: item.product.name,
                slug: item.product.slug,
                productAsset: item.product.assets?.[0],
                priceWithTax: { value: item.priceWithTax }
            });
        }
        return acc;
    }, []);

    console.log(processed);
}

test();
