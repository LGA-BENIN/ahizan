const fetch = require('node-fetch');

async function test() {
  const adminRes = await fetch('http://localhost:3000/admin-api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query { products(options: { filter: { name: { contains: "a" } }, take: 5 }) { totalItems items { id name slug } } }`
    })
  });
  const adminData = await adminRes.json();
  console.log("ADMIN API PRODUCTS:", JSON.stringify(adminData, null, 2));

  const shopRes = await fetch('http://localhost:3000/shop-api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query { products(options: { filter: { name: { contains: "a" } }, take: 5 }) { totalItems items { id name slug } } }`
    })
  });
  const shopData = await shopRes.json();
  console.log("SHOP API PRODUCTS:", JSON.stringify(shopData, null, 2));
}

test();
