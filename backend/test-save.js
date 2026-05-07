const fetch = require('node-fetch');
async function test() {
  const q = `query { pages { items { id slug title type isActive } } }`;
  const res = await fetch('http://127.0.0.1:3000/admin-api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q }) });
  const data = await res.json();
  console.log(JSON.stringify(data.data.pages.items, null, 2));
}
test();
