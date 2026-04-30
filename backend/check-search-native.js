const http = require('http');

const data = JSON.stringify({
  query: `{ search(input: { groupByProduct: true, take: 10 }) { totalItems items { productId productName } } }`
});

const options = {
  hostname: '127.0.0.1',
  port: 3000,
  path: '/shop-api',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (d) => { body += d; });
  res.on('end', () => {
    console.log('Response:', body);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(data);
req.end();
