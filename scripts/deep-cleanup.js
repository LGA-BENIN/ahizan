const http = require('http');

async function gql(apiUrl, query, variables = {}) {
    return new Promise((resolve) => {
        const url = new URL(apiUrl);
        const body = JSON.stringify({ query, variables });
        const req = http.request({
            hostname: url.hostname, port: url.port, path: url.pathname, method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        }, (res) => {
            let data = '';
            res.on('data', (c) => data += c);
            res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { resolve({ error: data }); } });
        });
        req.on('error', (e) => resolve({ error: e.message }));
        req.write(body); req.end();
    });
}

async function run() {
    const API = 'http://localhost:3000/admin-api';
    console.log("=== DEEP CMS CLEANUP ===\n");
    
    const res = await gql(API, `query { page(id: "1") { sections { id type title isActive order dataJson } } }`);
    if (!res.data?.page) { console.error("Page not found!", res); return; }
    
    const sections = res.data.page.sections;
    console.log(`Total sections in DB: ${sections.length}\n`);

    // --- SINGLETON DEDUP: keep only the one with most data ---
    const SINGLETONS = ['THEME_SETTINGS', 'HEADER_CONF', 'FOOTER_CONF', 'TOP_BAR', 'MODALS'];
    const toDelete = [];

    for (const type of SINGLETONS) {
        const matches = sections.filter(s => s.type === type);
        if (matches.length > 1) {
            const sorted = matches.sort((a, b) => (b.dataJson || '').length - (a.dataJson || '').length);
            const [keep, ...dupes] = sorted;
            console.log(`[SINGLETON] ${type}: Keeping ID ${keep.id} (${(keep.dataJson||'').length} bytes), removing ${dupes.length} duplicates`);
            dupes.forEach(d => toDelete.push(d.id));
        }
    }

    // --- GHOST SECTIONS: find empty sections with no title and no data ---
    for (const s of sections) {
        if (toDelete.includes(s.id)) continue; // already flagged
        const dataLen = (s.dataJson || '{}').length;
        const hasTitle = s.title && s.title.trim().length > 0;
        // Empty ghost: no title AND data is just "{}" or empty
        if (!hasTitle && dataLen <= 2) {
            console.log(`[GHOST] ${s.type} ID ${s.id} (Order: ${s.order}) - empty data, no title`);
            toDelete.push(s.id);
        }
    }

    if (toDelete.length === 0) {
        console.log("\n✅ Database is clean! No duplicates or ghosts found.");
        return;
    }

    console.log(`\n🗑️ Deleting ${toDelete.length} sections...`);
    for (const id of toDelete) {
        const del = await gql(API, `mutation($id: ID!) { deleteSection(id: $id) { result } }`, { id });
        console.log(`  Deleted ${id}: ${del.data?.deleteSection?.result || JSON.stringify(del.errors?.[0]?.message || 'FAIL')}`);
    }

    // --- Verify ---
    const after = await gql(API, `query { page(id: "1") { sections { id type title isActive order } } }`);
    const remaining = after.data.page.sections;
    console.log(`\n✅ Cleanup complete! ${remaining.length} sections remaining:`);
    remaining.sort((a, b) => a.order - b.order).forEach(s => {
        console.log(`  [${s.isActive ? 'ON' : 'OFF'}] ${s.type}: ${s.title || '(no title)'} (Order: ${s.order})`);
    });
}

run();
