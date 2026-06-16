

async function run() {
    try {
        const query = `
        query SearchProductsAdmin($term: String!) {
          search(input: { term: $term, take: 10, groupByProduct: true }) {
            items {
              productId
              productName
              slug
              productAsset {
                preview
              }
            }
          }
        }
        `;
        const res = await fetch('http://localhost:3000/shop-api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables: { term: "a" } })
        });
        const json = await res.json();
        console.log(JSON.stringify(json, null, 2));
    } catch (e) {
        console.error(e);
    }
}
run();
