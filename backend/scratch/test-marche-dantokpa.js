const fetch = require('node-fetch') || global.fetch;

async function testQuery() {
    const query = `
        query {
            page(slug: "marche-dantokpa") {
                id
                title
                slug
                sections {
                    id
                    type
                    title
                    dataJson
                }
            }
        }
    `;

    try {
        const res = await fetch('http://localhost:3000/shop-api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });
        const json = await res.json();
        console.log(JSON.stringify(json, null, 2));
    } catch (e) {
        console.error(e);
    }
}

testQuery();
