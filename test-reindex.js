const http = require('http');

const query = `
mutation {
  reindex {
    id
    state
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
        console.log("Reindex result:", body);
    });
});

req.on('error', e => {
    console.error(`Problem with request: ${e.message}`);
});

req.write(data);
req.end();
