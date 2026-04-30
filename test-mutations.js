const http = require('http');

const query = `
query {
  __type(name: "Mutation") {
    fields {
      name
      args {
        name
        type {
          name
          kind
          ofType { name }
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
            const fields = parsed.data.__type.fields.filter(f => f.name.includes('Collection') || f.name.includes('Facet'));
            console.log(JSON.stringify(fields, null, 2));
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
