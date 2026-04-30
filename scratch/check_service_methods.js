const fs = require('fs');
const path = require('path');

// This is a hacky way to check the .d.ts files without full grep
const dtsPath = path.join(__dirname, '../backend/node_modules/@vendure/core/dist/service/services/collection.service.d.ts');

if (fs.existsSync(dtsPath)) {
    const content = fs.readFileSync(dtsPath, 'utf8');
    console.log('--- CollectionService Methods ---');
    const methods = content.match(/[a-zA-Z0-9]+\(ctx: RequestContext/g);
    if (methods) {
        methods.forEach(m => console.log(m));
    } else {
        console.log('No methods found with ctx: RequestContext');
        console.log(content.substring(0, 1000));
    }
} else {
    console.log('File not found: ' + dtsPath);
}
