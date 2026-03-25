const http = require('http');

const query = JSON.stringify({
    query: `query GetFlashProducts($input: SearchInput!) {
        search(input: $input) {
            items {
                productName
                price { ... on PriceRange { min max } }
            }
        }
    }`,
    variables: {
        input: {
            groupByProduct: true,
            take: 12,
            facetValueIds: ["1", "2"]
        }
    }
});

const options = {
    hostname: '127.0.0.1',
    port: 3000,
    path: '/shop-api',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': query.length
    }
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log('Response:', data);
    });
});

req.on('error', (error) => {
    console.error('Error:', error);
});

req.write(query);
req.end();
