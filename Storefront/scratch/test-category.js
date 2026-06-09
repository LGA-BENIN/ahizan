async function test() {
    const query = `
        query GetPage($slug: String!) {
            page(slug: $slug) {
                id
                slug
                title
                type
                isActive
                sections {
                    id
                    type
                    title
                    isActive
                    order
                    dataJson
                }
            }
        }
    `;
    try {
        const res = await fetch('http://127.0.0.1:3000/shop-api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables: { slug: 'category' } })
        });
        const data = await res.json();
        console.log("CATEGORY PAGE DETAILS:", JSON.stringify(data, null, 2));

        const resProd = await fetch('http://127.0.0.1:3000/shop-api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables: { slug: 'product' } })
        });
        const dataProd = await resProd.json();
        console.log("PRODUCT PAGE DETAILS:", JSON.stringify(dataProd, null, 2));
    } catch(e) {
        console.error(e);
    }
}
test();
