const http = require('http');

const loc = encodeURIComponent(JSON.stringify({
    name: "Akpakpa Dodomè",
    latitude: 6.387298,
    longitude: 2.457211,
    type: "GPS",
    commune: "Cotonou"
}));

function testPath(pathName) {
    return new Promise((resolve) => {
        const options = {
            hostname: '127.0.0.1',
            port: 3001,
            path: pathName,
            method: 'GET',
            headers: {
                'Cookie': `ahizan_client_location=${loc}`
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                console.log(`\n========================================`);
                console.log(`📄 Page : ${pathName} (Status: ${res.statusCode})`);
                console.log(`========================================`);
                const matches = data.match(/PK3 Mode & Wax|Dantokpa|Ganhi|Missèbo|Cadjèhoun|Ouando|Ahouangbo|Attakè|Djassin|Tokpota|Calavi|Arconville|Godomey|Zogbadjè|Tankpè/g);
                console.log('Total Vendor Matches:', matches ? matches.length : 0);
                if (matches) {
                    console.log('Vendors in order (First 20):');
                    console.log(matches.slice(0, 20));
                }
                resolve();
            });
        });

        req.on('error', (e) => {
            console.error('Error on', pathName, ':', e.message);
            resolve();
        });

        req.end();
    });
}

async function run() {
    await testPath('/local-discovery');
    await testPath('/flash-deals');
    await testPath('/');
}

run();
