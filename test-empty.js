const http = require('http');

async function testEmptyQuery() {
    const data = JSON.stringify({
        query: undefined,
        variables: {}
    });

    const headers = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data) // Wait, JSON.stringify removes undefined
    };

    const req = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/admin-api',
        method: 'POST',
        headers
    }, res => {
        console.log(`STATUS: ${res.statusCode}`);
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => console.log('BODY:', body));
    });

    req.write(data); // "{"variables":{}}"
    req.end();
}

testEmptyQuery();
