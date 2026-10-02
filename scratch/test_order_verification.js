const http = require('http');

async function testFetch(path, cookie = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, 'http://localhost:3001');
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: url.pathname + url.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                ...(cookie ? { 'Cookie': cookie } : {})
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({ status: res.statusCode, body: data, headers: res.headers });
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function run() {
    const akpakpaCookie = `ahizan_client_location=${encodeURIComponent(JSON.stringify({
        id: "gps_raw",
        name: "Akpakpa Dodomè",
        latitude: 6.387298,
        longitude: 2.457211,
        type: "GPS",
        commune: "Cotonou"
    }))}`;
    
    console.log('--- Checking /local-discovery exact product list order ---');
    const disco = await testFetch('/local-discovery', akpakpaCookie);
    
    // Extract JSON payload embedded by Next.js in script tags or __NEXT_DATA__
    const matches = disco.body.match(/(\{"id":"[0-9]+-[0-9]+-[0-9]+".*?\})/g) || [];
    console.log(`Found ${matches.length} resolved offer candidate JSONs in page.`);

    // Also parse vendor mentions order in HTML
    const vendorRegex = /(PK3 Mode & Wax Bénin|Dantokpa Épicerie & Vivres|Missèbo Chaussures & Cuir|Ganhi Tech & Électro|Cadjèhoun Bio Cosmétique|Zogbadjè Campus Gadgets|Calavi Kpota High-Tech|Godomey Frais & Terroir|Arconville Karité & Soins|Ouando Saveurs & Épices|Tokpota Beauté Naturelle|Ahouangbo Électronique|Djassin Maison & Confort|Grand Marché Attakè Tissus|Tankpè Maison & Déco)/gi;
    
    let match;
    const seenOrder = [];
    while ((match = vendorRegex.exec(disco.body)) !== null) {
        seenOrder.push(match[1]);
    }
    
    console.log('\nTop 20 Vendor occurrences in order of appearance in HTML:');
    console.log(seenOrder.slice(0, 20));
}

run().catch(console.error);
