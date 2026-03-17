const http = require('http');

const start = Date.now();
console.log('Pinging backend at http://127.0.0.1:3000/health (or just root)...');

const req = http.request('http://127.0.0.1:3000/', { method: 'GET' }, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
    });
    res.on('end', () => {
        console.log(`DONE in ${Date.now() - start}ms`);
    });
});

req.on('error', (e) => {
    console.error(`ERROR: ${e.message}`);
});

req.end();
