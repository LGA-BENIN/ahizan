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
    
    const disco = await testFetch('/local-discovery', akpakpaCookie);
    
    // Look for product names and vendor names in the HTML or Next.js payload
    const keywords = [
        'PK3', 'Dantokpa', 'Missèbo', 'Missebo', 'Ganhi', 'Cadjèhoun', 'Cadjehoun',
        'Zogbadjè', 'Zogbadje', 'Calavi', 'Godomey', 'Arconville', 'Glo-Djigbé', 'Glo-Djigbe',
        'Ouando', 'Tokpota', 'Ahouangbo', 'Djassin', 'Attakè', 'Attake', 'Tankpè', 'Tankpe'
    ];

    console.log('--- Keywords search in SSR HTML of /local-discovery ---');
    for (const kw of keywords) {
        const count = (disco.body.match(new RegExp(kw, 'gi')) || []).length;
        if (count > 0) {
            console.log(`  - "${kw}": ${count} occurrences`);
        }
    }

    console.log('\n--- Checking Flash Deals with Akpakpa Cookie ---');
    const flash = await testFetch('/flash-deals', akpakpaCookie);
    for (const kw of keywords) {
        const count = (flash.body.match(new RegExp(kw, 'gi')) || []).length;
        if (count > 0) {
            console.log(`  - "${kw}": ${count} occurrences`);
        }
    }
}

run().catch(console.error);
