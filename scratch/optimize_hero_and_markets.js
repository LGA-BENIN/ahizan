const sharp = require('/srv/ahizan/Storefront/node_modules/sharp');
const fs = require('fs');
const path = require('path');

const previewRoot = '/srv/ahizan/backend/static/assets/preview';

async function optimizeFile(filePath, maxWidth, quality, isPng = false) {
    if (!fs.existsSync(filePath)) return 0;
    const stat = fs.statSync(filePath);
    const beforeSize = stat.size;

    const tmpPath = filePath + '.tmp';
    try {
        let pipeline = sharp(filePath);
        const meta = await pipeline.metadata();

        if (meta.width && meta.width > maxWidth) {
            pipeline = pipeline.resize({ width: maxWidth, withoutEnlargement: true });
        }

        if (isPng || meta.format === 'png') {
            await pipeline.png({ quality: quality || 80, compressionLevel: 9, palette: true }).toFile(tmpPath);
        } else {
            await pipeline.jpeg({ quality: quality || 75, progressive: true, mozjpeg: true }).toFile(tmpPath);
        }

        const afterStat = fs.statSync(tmpPath);
        if (afterStat.size < beforeSize) {
            fs.renameSync(tmpPath, filePath);
            console.log(`[OK] ${path.basename(filePath)}: ${(beforeSize/1024).toFixed(1)}KB -> ${(afterStat.size/1024).toFixed(1)}KB (-${(((beforeSize-afterStat.size)/beforeSize)*100).toFixed(1)}%)`);
            return beforeSize - afterStat.size;
        } else {
            fs.unlinkSync(tmpPath);
            console.log(`[KEEP] ${path.basename(filePath)} already optimal`);
            return 0;
        }
    } catch (err) {
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
        console.error(`[ERR] ${filePath}:`, err.message);
        return 0;
    }
}

async function run() {
    let savedBytes = 0;

    // 1. Specific hero and story images
    const targetImages = [
        // Story scroller images
        '/srv/ahizan/backend/static/assets/preview/fa/woman_walking_in_street_20261022132650__preview.jpg',
        '/srv/ahizan/backend/static/assets/preview/b8/woman_walking_in_street_20261022132650__preview__preview.jpg',
        '/srv/ahizan/backend/static/assets/preview/e0/man_interacting_with_smartphone_20261022132913__preview.jpg',
        '/srv/ahizan/backend/static/assets/preview/2c/woman_standing_in_modern_living_20261022132921__preview.jpg',
        '/srv/ahizan/backend/static/assets/preview/d6/pineapple_chilies_and_juice_on…_20261022160116__preview.jpg',
        '/srv/ahizan/backend/static/assets/preview/54/businesswoman_interacting_with_c…_20261022160215__preview.jpg',
        // Hero slim banner PNGs
        '/srv/ahizan/backend/static/assets/preview/13/image-removebg-preview__preview.png',
        '/srv/ahizan/backend/static/assets/preview/42/hand_holding_smartphone_payment___20261022131057-removebg-preview__preview.png',
        '/srv/ahizan/backend/static/assets/preview/93/market_stall_icon_with_produce_20261022132140-removebg-preview__preview.png',
        '/srv/ahizan/backend/static/assets/preview/9a/maison-bureau__preview.jpg',
    ];

    console.log('--- Optimizing Hero & Story Images ---');
    for (const img of targetImages) {
        const isPng = img.endsWith('.png');
        savedBytes += await optimizeFile(img, 450, 75, isPng);
    }

    // 2. All images-*.jpg (market cards) in preview subdirectories
    console.log('\n--- Optimizing Market Preview Images ---');
    function scanDir(dir) {
        let results = [];
        for (const item of fs.readdirSync(dir)) {
            const full = path.join(dir, item);
            if (fs.statSync(full).isDirectory()) {
                results = results.concat(scanDir(full));
            } else if (item.startsWith('images-') && item.endsWith('.jpg')) {
                results.push(full);
            }
        }
        return results;
    }

    const marketImages = scanDir(previewRoot);
    console.log(`Found ${marketImages.length} market images.`);
    for (const mImg of marketImages) {
        savedBytes += await optimizeFile(mImg, 400, 75, false);
    }

    console.log(`\n========================================`);
    console.log(`TOTAL SAVINGS: ${(savedBytes / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`========================================`);
}

run().catch(console.error);
