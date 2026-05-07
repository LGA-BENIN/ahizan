const http = require('http');

async function queryGraphQL(apiUrl, query, variables = {}) {
    return new Promise((resolve) => {
        try {
            const url = new URL(apiUrl);
            const body = JSON.stringify({ query, variables });
            const req = http.request({
                hostname: url.hostname, port: url.port, path: url.pathname, method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
            }, (res) => {
                let data = '';
                res.on('data', (c) => data += c);
                res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { resolve({ error: 'Parse Error', raw: data }); } });
            });
            req.on('error', (e) => resolve({ error: e.message }));
            req.write(body); req.end();
        } catch (e) { resolve({ error: 'URL Error: ' + e.message }); }
    });
}

async function run() {
    const SHOP_API = 'http://localhost:3000/shop-api';
    console.log("Checking sections from SHOP API for slug 'home'...");
    
    // We fetch the active season first usually
    const res = await queryGraphQL(SHOP_API, `
        query {
            page(slug: "home") {
                id slug title
                sections { id type title isActive order dataJson }
            }
        }
    `);
    
    if (res.data?.page) {
        console.log("SECTIONS IN SHOP API:");
        res.data.page.sections.forEach(s => {
            console.log(`- [${s.isActive ? 'ON' : 'OFF'}] ${s.type}: ${s.title} (Order: ${s.order})`);
            if (s.type === 'HEADER_CONF') {
                console.log(`  Header Data: ${s.dataJson?.substring(0, 100)}...`);
            }
        });
    } else {
        console.log("NOT FOUND OR ERROR:", JSON.stringify(res, null, 2));
    }
}
run();
