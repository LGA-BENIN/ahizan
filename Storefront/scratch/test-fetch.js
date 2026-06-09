async function test() {
    try {
        const query = `
          query {
            search(input: { take: 20, groupByProduct: true }) {
              items {
                productId
                productName
                slug
              }
            }
          }
        `;
        const res = await fetch('http://127.0.0.1:3000/shop-api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });
        const body = await res.json();
        console.log("PRODUCTS:", JSON.stringify(body, null, 2));
    } catch(e) {
        console.error("ERROR:", e);
    }
}
test();
