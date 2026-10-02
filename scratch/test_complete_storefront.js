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
    console.log('--- 1. Testing GET / ---');
    const home = await testFetch('/');
    console.log('Status /:', home.status);
    console.log('Has Preloader in HTML?', home.body.includes('ahizan-preloader') || home.body.includes('preloader'));

    console.log('\n--- 2. Testing GET /local-discovery (without cookie) ---');
    const discoNoCookie = await testFetch('/local-discovery');
    console.log('Status /local-discovery:', discoNoCookie.status);
    
    // Extract vendor names and products from HTML
    const vendors = [
        'PK3 Mode & Wax Bénin',
        'Dantokpa Épicerie & Vivres',
        'Missèbo Chaussures & Cuir',
        'Ganhi Tech & Électro',
        'Cadjèhoun Bio Cosmétique',
        'Zogbadjè Campus Store',
        'Calavi Kpota Bazar',
        'Godomey Mode & Déco',
        'Arconville High Tech',
        'Glo-Djigbé Agro & Bio',
        'Ouando Primeurs & Épices',
        'Tokpota Mode & Tissus',
        'Ahouangbo Électro',
        'Djassin Artisanat & Cuir',
        'Grand Marché Porto-Novo Déco'
    ];

    console.log('\nVendors found in /local-discovery (SSR HTML without cookie):');
    for (const v of vendors) {
        if (discoNoCookie.body.includes(v)) {
            console.log('  [FOUND]:', v);
        }
    }

    console.log('\n--- 3. Testing GET /local-discovery (WITH Akpakpa GPS cookie) ---');
    const akpakpaCookie = `ahizan_client_location=${encodeURIComponent(JSON.stringify({
        id: "gps_raw",
        name: "Akpakpa Dodomè",
        latitude: 6.387298,
        longitude: 2.457211,
        type: "GPS",
        commune: "Cotonou"
    }))}`;
    
    const discoWithCookie = await testFetch('/local-discovery', akpakpaCookie);
    console.log('Status /local-discovery with cookie:', discoWithCookie.status);
    console.log('Vendors found in /local-discovery (SSR HTML WITH Akpakpa cookie):');
    for (const v of vendors) {
        if (discoWithCookie.body.includes(v)) {
            console.log('  [FOUND]:', v);
        }
    }

    console.log('\n--- 4. Testing GET /flash-deals ---');
    const flash = await testFetch('/flash-deals', akpakpaCookie);
    console.log('Status /flash-deals:', flash.status);
    console.log('Vendors found in /flash-deals (SSR HTML):');
    for (const v of vendors) {
        if (flash.body.includes(v)) {
            console.log('  [FOUND]:', v);
        }
    }
}

run().catch(console.error);
