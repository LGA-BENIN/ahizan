const http = require('http');

const query = `
query {
  __type(name: "Product") {
    fields {
      name
      type {
        name
        kind
      }
    }
  }
}
`;

const data = JSON.stringify({ query });

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/admin-api',
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
            const fields = parsed.data.__type.fields.map(f => f.name);
            console.log("Product fields:", fields.join(', '));
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
