const http = require('http');

const query = `
query {
  search(input: { take: 10 }) {
    totalItems
    items {
      productName
      productVariantName
    }
    facetValues {
      count
      facetValue {
        name
      }
    }
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
            console.log(JSON.stringify(parsed, null, 2));
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
