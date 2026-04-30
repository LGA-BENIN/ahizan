const http = require('http');

const query = `
query {
  products(options: { take: 5 }) {
    items {
      name
      facetValues {
        name
        facet {
          name
        }
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
            console.log("Products Facets:", JSON.stringify(parsed.data.products.items, null, 2));
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
