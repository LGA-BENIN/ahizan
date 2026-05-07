const http = require('http');

async function loginAndReindex() {
  const loginData = JSON.stringify({
    query: `mutation { login(username: "superadmin", password: "superadmin") { ... on AuthenticatedSession { token } } }`
  });

  const loginOptions = {
    hostname: '127.0.0.1',
    port: 3000,
    path: '/admin-api',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': loginData.length
    }
  };

  const loginRes = await new Promise((resolve) => {
    const req = http.request(loginOptions, (res) => {
      let body = '';
      res.on('data', (d) => { body += d; });
      res.on('end', () => resolve({ body, headers: res.headers }));
    });
    req.write(loginData);
    req.end();
  });

  console.log('Login Response:', loginRes.body);
  const loginBody = JSON.parse(loginRes.body);
  const token = loginBody.data?.login?.token;

  if (!token) {
    console.error('Failed to get token');
    return;
  }

  const reindexData = JSON.stringify({
    query: `mutation { reindex { id } }`
  });

  const reindexOptions = {
    hostname: '127.0.0.1',
    port: 3000,
    path: '/admin-api',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': reindexData.length,
      'Authorization': `Bearer ${token}`
    }
  };

  const reindexRes = await new Promise((resolve) => {
    const req = http.request(reindexOptions, (res) => {
      let body = '';
      res.on('data', (d) => { body += d; });
      res.on('end', () => resolve(body));
    });
    req.write(reindexData);
    req.end();
  });

  console.log('Reindex Response:', reindexRes);
}

loginAndReindex();
