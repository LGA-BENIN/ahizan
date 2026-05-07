const http = require('http');

async function check() {
    const loginData = JSON.stringify({
        query: `
            mutation {
                login(username: "superadmin", password: "superadmin") {
                    ... on CurrentUser { id }
                }
            }
        `
    });

    const loginRes = await makeRequest(loginData, '/shop-api');
    console.log("Login:", loginRes.body);
    const token = loginRes.headers['vendure-auth-token'];

    // First, list products to get an ID
    const listData = JSON.stringify({
        query: `
            query {
                myVendorProducts {
                    items { id name }
                }
            }
        `
    });

    const listRes = await makeRequest(listData, '/shop-api', token);
    console.log("List:", listRes.body);
    
    const data = JSON.parse(listRes.body);
    const items = data.data.myVendorProducts.items;
    
    if (items && items.length > 0) {
        const id = items[0].id;
        console.log("Fetching product ID:", id);
        
        const prodData = JSON.stringify({
            query: `
                query {
                    myVendorProduct(id: "${id}") {
                        id
                        name
                        collections { id }
                    }
                }
            `
        });
        
        const prodRes = await makeRequest(prodData, '/shop-api', token);
        console.log("Product:", prodRes.body);
    }
}

function makeRequest(data, path, token = null) {
    return new Promise((resolve, reject) => {
        const headers = {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path,
            method: 'POST',
            headers
        }, res => {
            let body = '';
            res.setEncoding('utf8');
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ headers: res.headers, body }));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

check().catch(console.error);
