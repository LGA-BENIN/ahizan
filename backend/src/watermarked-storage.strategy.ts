import { LocalAssetStorageStrategy } from '@vendure/asset-server-plugin/lib/src/config/local-asset-storage-strategy';
import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs/promises';

async function findFileRecursively(dir: string, filename: string): Promise<string | null> {
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                const found = await findFileRecursively(fullPath, filename);
                if (found) return found;
            } else if (entry.name === filename) {
                return fullPath;
            }
        }
    } catch (e) {
        // Ignore folder read errors
    }
    return null;
}

export class WatermarkedLocalAssetStorageStrategy extends LocalAssetStorageStrategy {
    constructor(
        private uploadDir: string,
        toAbsoluteUrlFn?: (request: any, identifier: string) => string
    ) {
        super(uploadDir, toAbsoluteUrlFn);
    }

    async readFileToBuffer(identifier: string): Promise<Buffer> {
        const buffer = await super.readFileToBuffer(identifier);

        // Only watermark supported image formats
        const ext = path.extname(identifier).toLowerCase();
        const supportedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
        if (!supportedExtensions.includes(ext)) {
            return buffer;
        }

        try {
            // Dynamically import CMSPlugin to get static service instance and avoid circular dependency
            const { CMSPlugin } = require('./plugins/cms/cms.plugin');
            if (!CMSPlugin || !CMSPlugin.cmsServiceInstance) {
                return buffer;
            }

            const themeSettings = await CMSPlugin.cmsServiceInstance.getThemeSettingsDirect();
            if (!themeSettings || !themeSettings.watermarkUrl) {
                return buffer;
            }

            const watermarkUrl = themeSettings.watermarkUrl;
            let watermarkFilename = path.basename(watermarkUrl);
            const qIdx = watermarkFilename.indexOf('?');
            if (qIdx !== -1) {
                watermarkFilename = watermarkFilename.substring(0, qIdx);
            }

            // Exclude watermarking the watermark itself (and all of its previews/thumbnails)
            const idParsed = path.parse(path.basename(identifier).toLowerCase());
            const wmParsed = path.parse(watermarkFilename.toLowerCase());
            if (idParsed.name === wmParsed.name) {
                return buffer;
            }

            // Exclude watermarking favicons or tiny icon assets
            if (path.basename(identifier).toLowerCase().includes('favicon') || identifier.toLowerCase().includes('icon')) {
                return buffer;
            }

            // Get metadata of original image
            const targetMetadata = await sharp(buffer).metadata();
            const targetWidth = targetMetadata.width || 0;
            const targetHeight = targetMetadata.height || 0;

            // Skip watermarking small icons/loaders below 150px
            if (targetWidth < 150 || targetHeight < 150) {
                return buffer;
            }

            // Locate local file of watermark recursively inside uploadDir
            const watermarkPath = await findFileRecursively(this.uploadDir, watermarkFilename);
            if (!watermarkPath) {
                return buffer;
            }

            const watermarkBuffer = await fs.readFile(watermarkPath);

            // Safe parsing of opacity (support commas and fallback to 0.4 if NaN)
            const rawOpacity = themeSettings.watermarkOpacity !== undefined ? parseFloat(String(themeSettings.watermarkOpacity).replace(',', '.')) : 0.4;
            const watermarkOpacity = isNaN(rawOpacity) ? 0.4 : rawOpacity;

            // Safe parsing of size percentage
            const rawPercentage = themeSettings.watermarkSize !== undefined ? parseInt(themeSettings.watermarkSize, 10) : 25;
            const watermarkSizePercent = isNaN(rawPercentage) ? 25 : rawPercentage;
            
            const watermarkWidth = Math.round(targetWidth * (watermarkSizePercent / 100));

            // High performance, native opacity modifier using sharp linear operator
            const finalWatermarkBuffer = await sharp(watermarkBuffer)
                .resize({ width: watermarkWidth, fit: 'inside' })
                .ensureAlpha()
                .linear([1, 1, 1, watermarkOpacity], [0, 0, 0, 0])
                .png()
                .toBuffer();

            // Overlay watermark using composition gravity
            let gravity = 'centre';
            if (themeSettings.watermarkPosition === 'bottom-right') gravity = 'southeast';
            else if (themeSettings.watermarkPosition === 'bottom-left') gravity = 'southwest';
            else if (themeSettings.watermarkPosition === 'top-right') gravity = 'northeast';
            else if (themeSettings.watermarkPosition === 'top-left') gravity = 'northwest';

            return await sharp(buffer)
                .composite([{
                    input: finalWatermarkBuffer,
                    blend: 'over',
                    gravity: gravity as any,
                }])
                .toBuffer();

        } catch (err) {
            console.error('[WatermarkStrategy] Error applying watermark:', err);
        }

        return buffer;
    }
}
