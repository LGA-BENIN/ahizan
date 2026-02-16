
async function checkCors() {
    try {
        const response = await fetch('http://localhost:3000/shop-api', {
            method: 'OPTIONS',
            headers: {
                'Origin': 'http://localhost:5174',
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'content-type'
            }
        });

        console.log('Status:', response.status);
        console.log('Access-Control-Allow-Origin:', response.headers.get('access-control-allow-origin'));
        console.log('Access-Control-Allow-Credentials:', response.headers.get('access-control-allow-credentials'));
    } catch (error) {
        console.error('Fetch failed:', error);
    }
}

checkCors();
