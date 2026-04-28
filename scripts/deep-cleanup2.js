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
    const res = await gql(API, `query { page(id: "1") { sections { id type title isActive order dataJson } } }`);
    const sections = res.data.page.sections;
    
    // Find sections with no title and data <= 2 chars OR data is just "{}"
    const toDelete = sections.filter(s => {
        const hasTitle = s.title && s.title.trim().length > 0;
        const dataStr = s.dataJson || '{}';
        const isEmpty = dataStr === '{}' || dataStr === '' || dataStr.length <= 2;
        return !hasTitle && isEmpty;
    });
    
    console.log(`Found ${toDelete.length} more empty sections to remove:`);
    for (const s of toDelete) {
        console.log(`  ${s.type} ID ${s.id} (Order: ${s.order})`);
        await gql(API, `mutation($id: ID!) { deleteSection(id: $id) { result } }`, { id: s.id });
    }
    
    // Final state
    const after = await gql(API, `query { page(id: "1") { sections { id type title isActive order dataJson } } }`);
    console.log(`\nFinal sections (${after.data.page.sections.length}):`);
    after.data.page.sections.sort((a,b) => a.order - b.order).forEach(s => {
        const dataLen = (s.dataJson || '').length;
        console.log(`  [${s.isActive ? 'ON' : 'OFF'}] Order ${s.order}: ${s.type} "${s.title}" (${dataLen} bytes of data)`);
    });
}
run();
