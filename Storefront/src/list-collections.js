const http = require('http');
const body = JSON.stringify({
    query: `
        query {
            collections(options: { take: 10 }) {
                items {
                    id
                    name
                    slug
                }
            }
        }
    `
});
const options = {
    hostname: '127.0.0.1',
    port: 3000,
    path: '/shop-api',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'vendure-token': '__default_channel__'
    }
};
const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const parsed = JSON.parse(data);
            console.table(parsed.data.collections.items);
        } catch (e) { console.log(data); }
    });
});
req.write(body);
req.end();
