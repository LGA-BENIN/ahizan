const http = require('http');

const query = `
query {
  search(input: { take: 1 }) {
    totalItems
  }
  products(options: { take: 10 }) {
    totalItems
    items {
      name
      enabled
      collections {
        name
      }
    }
  }
}
`;

const data = JSON.stringify({ query });

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/shop-api',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
};

const req = http.request(options, res => {
    let body = '';
    res.setEncoding('utf8');
    res.on('data', chunk => { body += chunk; });
    res.on('end', () => {
        try {
            const parsed = JSON.parse(body);
            console.log("Search Total:", parsed.data.search.totalItems);
            console.log("Products Total:", parsed.data.products.totalItems);
            console.log("Products:", JSON.stringify(parsed.data.products.items, null, 2));
        } catch (e) {
            console.log(body);
        }
    });
});

req.on('error', e => {
    console.error(`Problem with request: ${e.message}`);
});

req.write(data);
req.end();
