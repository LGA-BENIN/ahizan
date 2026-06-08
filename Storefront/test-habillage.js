
async function test() {
    const query = `
        query {
            activeHabillage {
                sectionsJson
            }
        }
    `;
    const res = await fetch('http://localhost:3000/shop-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
    });
    const data = await res.json();
    console.log("Response:", Object.keys(data));
    if (data.data && data.data.activeHabillage) {
        const sections = JSON.parse(data.data.activeHabillage.sectionsJson);
        const flashDeals = sections.filter(s => s.type === 'FLASH_DEALS');
        console.log(JSON.stringify(flashDeals, null, 2));
    } else {
        console.log("Full data:", JSON.stringify(data, null, 2));
    }
}

test();
