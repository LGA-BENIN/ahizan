const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
try {
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        console.log(content);
    } else {
        console.log('.env file does not exist');
    }
} catch (e) {
    console.error('Error:', e.message);
}
