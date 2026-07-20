const http = require('http');

const url = new URL('http://127.0.0.1:3000/shop-api');

console.log('Testing connection to:', url.href);

const body = JSON.stringify({
    query: `
        query GetProductDetail($slug: String!) {
            product(slug: $slug) {
                id
                name
                description
                slug
                assets {
                    id
                    preview
                    source
                }
                variants {
                    id
                    name
                    sku
                    priceWithTax
                    stockLevel
                }
            }
        }
    `,
    variables: {
        slug: "hahahaproductokay"
    }
});

const options = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'vendure-token': '__default_channel__'
    }
};

const req = http.request(options, (res) => {
    console.log('Status:', res.statusCode);
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const parsed = JSON.parse(data);
            console.log('Data:', JSON.stringify(parsed, null, 2));
        } catch (e) {
            console.log('RAW Response:', data);
        }
    });
});

req.on('error', (err) => {
    console.error('ERROR:', err.message);
});

req.write(body);
req.end();
