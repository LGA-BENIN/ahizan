const http = require('http');

// We need an admin token. Usually 'superadmin'/'superadmin' gives a cookie or we can use basic auth if enabled.
// But we can also use the session token if we have one.
// However, Vendure allows basic auth for admin if configured.
// Let's try to use the superadmin credentials.

const auth = Buffer.from('superadmin:superadmin').toString('base64');

const data = JSON.stringify({
  query: `mutation { reindex { id } }`
});

const options = {
  hostname: '127.0.0.1',
  port: 3000,
  path: '/admin-api',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'Authorization': `Basic ${auth}`
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
