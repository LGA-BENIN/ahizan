const http = require('http');

async function main() {
  const loginPayload = JSON.stringify({
    query: `mutation { authenticate(input: { native: { username: "superadmin", password: "superadmin" } }) { ... on CurrentUser { id identifier } } }`
  });

  const loginRes = await fetch('http://ahizan_backend:3000/admin-api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: loginPayload
  });

  const cookie = loginRes.headers.get('set-cookie') || '';
  const token = loginRes.headers.get('vendure-auth-token') || '';
  console.log('Login successful. Token exists:', !!token);

  console.time('analyzeExecution');
  const analyzeRes = await fetch('http://127.0.0.1:3005/api/products/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie,
      'vendure-auth-token': token,
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({ productId: '4' })
  });
  console.timeEnd('analyzeExecution');

  const d = await analyzeRes.json();
  console.log('Full response json:', JSON.stringify(d, null, 2));
}

main().catch(console.error);
