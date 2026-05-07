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
    const ADMIN_API = 'http://localhost:3000/admin-api';
    console.log("Checking sections for Page ID 1 (home)...");
    const res = await queryGraphQL(ADMIN_API, `
        query {
            page(id: "1") {
                id slug title
                sections { id type title isActive order dataJson }
            }
        }
    `);
    
    if (res.data?.page) {
        console.log("PAGE 1 SECTIONS:");
        res.data.page.sections.forEach(s => {
            console.log(`- [${s.isActive ? 'ON' : 'OFF'}] ${s.type}: ${s.title} (Order: ${s.order})`);
            // Check if Header has a siteName
            if (s.type === 'HEADER_CONF') {
                console.log(`  Header Data: ${s.dataJson?.substring(0, 100)}...`);
            }
        });
    } else {
        console.log("PAGE 1 NOT FOUND OR ERROR:", JSON.stringify(res, null, 2));
    }
}
run();
