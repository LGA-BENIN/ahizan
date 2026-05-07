const http = require('http');

async function queryGraphQL(apiUrl, query, variables = {}) {
    return new Promise((resolve) => {
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
    });
}

async function run() {
    const ADMIN_API = 'http://localhost:3000/admin-api';
    const HOME_PAGE_ID = "1";
    console.log(`Cleaning up duplicates for Page ${HOME_PAGE_ID}...`);
    
    // 1. Fetch current sections
    const res = await queryGraphQL(ADMIN_API, `
        query {
            page(id: "${HOME_PAGE_ID}") {
                sections { id type isActive order dataJson }
            }
        }
    `);
    
    if (!res.data?.page) {
        console.error("PAGE NOT FOUND:", res);
        return;
    }
    
    const singletons = ['THEME_SETTINGS', 'HEADER_CONF', 'FOOTER_CONF', 'HERO', 'MODALS'];
    const sections = res.data.page.sections;
    const toDelete = [];
    
    for (const type of singletons) {
        const matches = sections.filter(s => s.type === type);
        if (matches.length > 1) {
            console.log(`Found ${matches.length} instances of ${type}.`);
            // Keep the one with the most data or the lowest order
            const sorted = matches.sort((a, b) => {
                const dataLenA = (a.dataJson || '').length;
                const dataLenB = (b.dataJson || '').length;
                if (dataLenA !== dataLenB) return dataLenB - dataLenA; // Most data first
                return a.order - b.order; // Then lowest order first
            });
            
            const [keep, ...rest] = sorted;
            console.log(`  Keeping ID ${keep.id} (Order: ${keep.order}, Data Len: ${keep.dataJson?.length || 0})`);
            rest.forEach(r => {
                console.log(`  Flagged for deletion: ID ${r.id} (Order: ${r.order})`);
                toDelete.push(r.id);
            });
        }
    }
    
    if (toDelete.length === 0) {
        console.log("No duplicates found to delete.");
        return;
    }
    
    console.log(`Deleting ${toDelete.length} duplicate sections...`);
    for (const id of toDelete) {
        const delRes = await queryGraphQL(ADMIN_API, `
            mutation Delete($id: ID!) {
                deleteSection(id: $id) { result }
            }
        `, { id });
        console.log(`  Deleted ${id}: ${JSON.stringify(delRes.data?.deleteSection?.result || 'FAIL')}`);
    }
    
    console.log("Cleanup complete!");
}

run();
