async function run() {
    try {
        const query = `
        query {
            markets {
                id
                name
                slug
                centerLatitude
                centerLongitude
                radiusMeters
            }
            geographicLocations(type: "NEIGHBORHOOD") {
                id
                name
            }
        }
        `;
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
run();
