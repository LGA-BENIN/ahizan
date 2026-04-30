const http = require('http');

const query = `
query Search($input: SearchInput!) {
  search(input: $input) {
    items {
      productName
      productVariantId
    }
    totalItems
    facetValues {
      facetValue {
        name
      }
      count
    }
  }
}
`;

const data = JSON.stringify({
  query,
  variables: {
    input: {
      collectionSlug: 'collection1',
      groupByProduct: true
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
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    console.log('--- SEARCH RESULTS FOR collection1 ---');
    try {
      const result = JSON.parse(body);
      console.log(JSON.stringify(result.data.search, null, 2));
    } catch (e) {
      console.log(body);
    }
  });
});

req.on('error', console.error);
req.write(data);
req.end();
