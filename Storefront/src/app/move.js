const fs = require('fs');
const path = require('path');
const dirs = ["account","cart","checkout","collection","forgot-password","order-confirmation","product","register","reset-password","search","sign-in","verify","verify-pending","page.tsx","not-found.tsx","layout.tsx"];

for (const d of dirs) {
    fs.renameSync(path.join(__dirname, d), path.join(__dirname, '(storefront)', d));
}
console.log('Moved files');
