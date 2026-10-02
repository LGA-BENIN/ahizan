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
    
    console.log('--- Checking /flash-deals output with Akpakpa cookie ---');
    const flash = await testFetch('/flash-deals', akpakpaCookie);
    
    const vendorRegex = /(PK3 Mode & Wax Bénin|Dantokpa Épicerie & Vivres|Missèbo Chaussures & Cuir|Ganhi Tech & Électro|Cadjèhoun Bio Cosmétique|Zogbadjè Campus Gadgets|Calavi Kpota High-Tech|Godomey Frais & Terroir|Arconville Karité & Soins|Ouando Saveurs & Épices|Tokpota Beauté Naturelle|Ahouangbo Électronique|Djassin Maison & Confort|Grand Marché Attakè Tissus|Tankpè Maison & Déco)/gi;
    
    let match;
    const seenOrder = [];
    while ((match = vendorRegex.exec(flash.body)) !== null) {
        seenOrder.push(match[1]);
    }
    
    console.log(`Total vendor badges rendered in HTML: ${seenOrder.length}`);
    console.log('First 20 vendors in order of appearance on /flash-deals:');
    console.log(seenOrder.slice(0, 20));
}

run().catch(console.error);
