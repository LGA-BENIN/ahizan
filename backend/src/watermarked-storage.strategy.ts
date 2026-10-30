import { LocalAssetStorageStrategy } from '@vendure/asset-server-plugin/lib/src/config/local-asset-storage-strategy';

/**
 * Clean Local Asset Storage Strategy for AHIZAN.
 * 
 * Ensures that normal on-platform browsing (catalog, header logo, category cards,
 * product detail pages, banners) displays 100% clean images with zero watermark.
 * 
 * Watermarked images are generated on-demand and cached via the dedicated
 * asset-download endpoint when users download/save images.
 */
export class WatermarkedLocalAssetStorageStrategy extends LocalAssetStorageStrategy {
    constructor(
        uploadDir: string,
        toAbsoluteUrlFn?: (request: any, identifier: string) => string
    ) {
        super(uploadDir, toAbsoluteUrlFn);
    }

    async readFileToBuffer(identifier: string): Promise<Buffer> {
        return super.readFileToBuffer(identifier);
    }
}
