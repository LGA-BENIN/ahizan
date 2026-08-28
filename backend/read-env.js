const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
try {
    const content = fs.readFileSync(envPath, 'utf8');
    console.log(content);
} catch (e) {
    console.error('Error reading .env:', e.message);
}
