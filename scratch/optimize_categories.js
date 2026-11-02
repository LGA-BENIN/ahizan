const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const dirs = [
    '/srv/ahizan/backend/static/assets/categories',
    '/srv/ahizan/backend/static/assets/preview/categories'
];

const backupDir = '/srv/ahizan/backend/static/assets/categories_original_backup';
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
}

async function run() {
    let totalBefore = 0;
    let totalAfter = 0;

    for (const dir of dirs) {
        if (!fs.existsSync(dir)) continue;
        const files = fs.readdirSync(dir);
        for (const file of files) {
            if (!file.match(/\.(jpg|jpeg|png)$/i)) continue;
            const fullPath = path.join(dir, file);
            const backupPath = path.join(backupDir, file);
            if (!fs.existsSync(backupPath)) {
                fs.copyFileSync(fullPath, backupPath);
            }

            const beforeSize = fs.statSync(fullPath).size;
            totalBefore += beforeSize;

            const tempPath = fullPath + '.tmp.jpg';
            await sharp(backupPath)
                .resize({ width: 360, height: 360, fit: 'cover' })
                .jpeg({ quality: 80, progressive: true, mozjpeg: true })
                .toFile(tempPath);

            fs.renameSync(tempPath, fullPath);
            const afterSize = fs.statSync(fullPath).size;
            totalAfter += afterSize;
            console.log(file, ':', (beforeSize / 1024).toFixed(1), 'KB ->', (afterSize / 1024).toFixed(1), 'KB');
        }
    }
    console.log('\n--- SUMMARY ---');
    console.log('Total Before:', (totalBefore / (1024 * 1024)).toFixed(2), 'MB');
    console.log('Total After:', (totalAfter / (1024 * 1024)).toFixed(2), 'MB');
    console.log('Reduction:', (((totalBefore - totalAfter) / totalBefore) * 100).toFixed(1) + '%');
}

run().catch(console.error);
