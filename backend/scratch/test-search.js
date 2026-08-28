const fetch = require('node-fetch');

async function test() {
  const shopRes = await fetch('http://localhost:3000/shop-api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query { search(input: { term: "a", groupByProduct: true, take: 5 }) { totalItems items { productId productName } } }`
    })
  });
  const shopData = await shopRes.json();
  console.log("SHOP API SEARCH:", JSON.stringify(shopData, null, 2));

  const adminRes = await fetch('http://localhost:3000/admin-api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query { search(input: { term: "a", groupByProduct: true, take: 5 }) { totalItems items { productId productName } } }`
    })
  });
  const adminData = await adminRes.json();
  console.log("ADMIN API SEARCH:", JSON.stringify(adminData, null, 2));
}

test();
