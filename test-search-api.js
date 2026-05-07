async function testSearch() {
  const query = `
    query SearchProducts($input: SearchInput!) {
      search(input: $input) {
        items {
          productId
          productName
          slug
          collectionIds
          facetValueIds
        }
        totalItems
        facetValues {
          count
          facetValue {
            id
            name
            facet {
              id
              name
            }
          }
        }
      }
    }
  `;

  const variables = {
    input: {
      collectionSlug: "collection1",
      groupByProduct: true,
      take: 10,
      skip: 0
    }
  };

  try {
    const response = await fetch('http://127.0.0.1:3000/shop-api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables })
    });
    
    const json = await response.json();
    console.log(JSON.stringify(json, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testSearch();
