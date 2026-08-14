async function test() {
    const query = `
        query {
            collections(options: { take: 1 }) {
                items {
                    id
                    name
                }
            }
        }
    `;
    const res = await fetch('http://localhost:3000/shop-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
    });
    const data = await res.json();
    console.log("COLLECTIONS:", JSON.stringify(data, null, 2));

    if (data.data && data.data.collections.items.length > 0) {
        const id = data.data.collections.items[0].id;
        console.log("Testing collection with ID:", id);
        const query2 = `
            query GetCollectionProducts($id: ID!) {
                collection(id: $id) {
                    name
                    productVariants(options: { take: 5 }) {
                        items {
                            product {
                                name
                            }
                        }
                    }
                }
            }
        `;
        const res2 = await fetch('http://localhost:3000/shop-api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: query2, variables: { id } })
        });
        const data2 = await res2.json();
        console.log("VARIANTS:", JSON.stringify(data2, null, 2));
    }
}

test();
