const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const previewDir = '/srv/ahizan/backend/static/assets/preview';

async function scanAndOptimize(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let totalSaved = 0;

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            totalSaved += await scanAndOptimize(fullPath);
        } else if (entry.isFile() && entry.name.match(/\.(png|jpg|jpeg|webp)$/i)) {
            const stat = fs.statSync(fullPath);
            if (stat.size > 400 * 1024) { // larger than 400KB
                try {
                    const meta = await sharp(fullPath).metadata();
                    const tempPath = fullPath + '.opt.tmp';

                    let pipeline = sharp(fullPath);
                    if (meta.width > 800 || meta.height > 800) {
                        pipeline = pipeline.resize({
                            width: Math.min(meta.width || 800, 800),
                            height: Math.min(meta.height || 800, 800),
                            fit: 'inside',
                            withoutEnlargement: true
                        });
                    }

                    if (meta.format === 'png') {
                        // Check if it has transparency
                        if (meta.hasAlpha) {
                            await pipeline.png({ quality: 80, compressionLevel: 9 }).toFile(tempPath);
                        } else {
                            // No transparency, convert to high-efficiency progressive JPEG with same filename or compact PNG
                            await pipeline.png({ quality: 75, compressionLevel: 9, palette: true }).toFile(tempPath);
                        }
                    } else if (meta.format === 'jpeg' || meta.format === 'jpg') {
                        await pipeline.jpeg({ quality: 78, progressive: true, mozjpeg: true }).toFile(tempPath);
                    } else if (meta.format === 'webp') {
                        await pipeline.webp({ quality: 80 }).toFile(tempPath);
                    }

                    const newSize = fs.statSync(tempPath).size;
                    if (newSize < stat.size) {
                        fs.renameSync(tempPath, fullPath);
                        const saved = stat.size - newSize;
                        totalSaved += saved;
                        console.log(`[OPTIMIZED] ${entry.name}: ${(stat.size/1024).toFixed(0)}KB -> ${(newSize/1024).toFixed(0)}KB (saved ${(saved/1024).toFixed(0)}KB)`);
                    } else {
                        fs.unlinkSync(tempPath);
                    }
                } catch (err) {
                    console.error(`[ERROR] ${fullPath}:`, err.message);
                }
            }
        }
    }
    return totalSaved;
}

async function run() {
    console.log('Scanning and optimizing oversized previews...');
    const saved = await scanAndOptimize(previewDir);
    console.log(`\nTOTAL DISK SPACE / BANDWIDTH SAVED: ${(saved / (1024 * 1024)).toFixed(2)} MB`);
}

run().catch(console.error);
