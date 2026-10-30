import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as crypto from 'crypto';
import sharp from 'sharp';
import { CMSService } from './cms.service';

export interface WatermarkSettings {
    watermarkUrl?: string;
    watermarkOpacity?: number;
    watermarkSize?: number;
    watermarkPosition?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center';
    watermarkMargin?: number;
    cropProtection?: boolean;
}

@Injectable()
export class WatermarkService {
    private readonly logger = new Logger('WatermarkService');
    private readonly uploadDir: string;
    private readonly cacheDir: string;
    private cachedSettings: WatermarkSettings | null = null;
    private lastSettingsFetch: number = 0;
    private cachedLogoBuffer: Buffer | null = null;
    private cachedLogoPath: string | null = null;

    constructor(private cmsService: CMSService) {
        // static/assets is located at backend/static/assets
        this.uploadDir = path.resolve(__dirname, '../../../../static/assets');
        this.cacheDir = path.join(this.uploadDir, 'cache', 'watermarked');
        if (!fsSync.existsSync(this.cacheDir)) {
            try {
                fsSync.mkdirSync(this.cacheDir, { recursive: true });
            } catch (err: any) {
                this.logger.error(`Failed to create watermark cache directory: ${err.message}`);
            }
        }
    }

    /**
     * Clear all cached watermarked images (called when settings change in CMS)
     */
    async clearCache(): Promise<void> {
        try {
            if (fsSync.existsSync(this.cacheDir)) {
                const files = await fs.readdir(this.cacheDir);
                await Promise.all(
                    files.map(file => fs.unlink(path.join(this.cacheDir, file)).catch(() => {}))
                );
                this.logger.log(`Cleared ${files.length} watermarked images from cache.`);
            }
            this.cachedSettings = null;
            this.cachedLogoBuffer = null;
            this.cachedLogoPath = null;
        } catch (err: any) {
            this.logger.warn(`Error clearing watermark cache: ${err.message}`);
        }
    }

    /**
     * Retrieve watermark settings from CMS with a 30-second in-memory cache
     */
    async getSettings(): Promise<WatermarkSettings> {
        const now = Date.now();
        if (this.cachedSettings && now - this.lastSettingsFetch < 30000) {
            return this.cachedSettings;
        }

        let rawSettings: any = null;
        try {
            rawSettings = await this.cmsService.getThemeSettingsDirect();
        } catch (e: any) {
            this.logger.warn(`Could not load theme settings: ${e.message}`);
        }

        const opacityRaw = rawSettings?.watermarkOpacity !== undefined
            ? parseFloat(String(rawSettings.watermarkOpacity).replace(',', '.'))
            : 0.85;
        const opacity = isNaN(opacityRaw) ? 0.85 : Math.max(0.2, Math.min(1.0, opacityRaw));

        const sizeRaw = rawSettings?.watermarkSize !== undefined
            ? parseInt(String(rawSettings.watermarkSize), 10)
            : 22;
        const size = isNaN(sizeRaw) ? 22 : Math.max(10, Math.min(50, sizeRaw));

        const marginRaw = rawSettings?.watermarkMargin !== undefined
            ? parseInt(String(rawSettings.watermarkMargin), 10)
            : 3;
        const margin = isNaN(marginRaw) ? 3 : Math.max(1, Math.min(15, marginRaw));

        const position = rawSettings?.watermarkPosition || 'bottom-right';
        const cropProtection = rawSettings?.watermarkCropProtection !== undefined
            ? Boolean(rawSettings.watermarkCropProtection)
            : true;

        // Use the user's custom watermark uploaded via CMS, or fallback to the official Ahizan logo
        const watermarkUrl = (rawSettings?.watermarkUrl && String(rawSettings.watermarkUrl).trim()) 
            ? String(rawSettings.watermarkUrl).trim() 
            : 'source/official-ahizan-watermark.svg';

        this.cachedSettings = {
            watermarkUrl,
            watermarkOpacity: opacity,
            watermarkSize: size,
            watermarkPosition: position,
            watermarkMargin: margin,
            cropProtection,
        };
        this.lastSettingsFetch = now;
        return this.cachedSettings;
    }

    /**
     * Resolve the absolute path to a file inside uploadDir
     */
    private resolveFilePath(identifier: string): string | null {
        if (!identifier) return null;
        let clean = identifier.replace(/\\/g, '/').trim();

        // 1. Strip absolute URL domain or /assets/ prefix
        const assetsIdx = clean.indexOf('/assets/');
        if (assetsIdx !== -1) {
            clean = clean.substring(assetsIdx + 8);
        } else if (clean.startsWith('http://') || clean.startsWith('https://')) {
            try {
                const u = new URL(clean);
                clean = u.pathname.replace(/^\/assets\/?/, '').replace(/^\//, '');
            } catch {
                clean = clean.replace(/^https?:\/\/[^\/]+\/(assets\/)?/, '');
            }
        } else {
            clean = clean.replace(/^\/?(assets\/)?/, '');
        }

        // Remove query params (e.g. ?w=300)
        const qIdx = clean.indexOf('?');
        if (qIdx !== -1) {
            clean = clean.substring(0, qIdx);
        }

        // Direct candidate
        const candidateDirect = path.join(this.uploadDir, clean);
        if (fsSync.existsSync(candidateDirect) && fsSync.statSync(candidateDirect).isFile()) {
            return candidateDirect;
        }

        // Inside preview/
        const candidatePreview = path.join(this.uploadDir, 'preview', clean);
        if (fsSync.existsSync(candidatePreview) && fsSync.statSync(candidatePreview).isFile()) {
            return candidatePreview;
        }

        // Inside source/
        const candidateSource = path.join(this.uploadDir, 'source', clean);
        if (fsSync.existsSync(candidateSource) && fsSync.statSync(candidateSource).isFile()) {
            return candidateSource;
        }

        // Subdirectory check by basename prefix (e.g. preview/4c/filename.jpg)
        const baseName = path.basename(clean);
        if (baseName && baseName.length > 2) {
            const subDir = baseName.substring(0, 2).toLowerCase();
            const candSub1 = path.join(this.uploadDir, 'preview', subDir, baseName);
            if (fsSync.existsSync(candSub1) && fsSync.statSync(candSub1).isFile()) return candSub1;

            const candSub2 = path.join(this.uploadDir, 'source', subDir, baseName);
            if (fsSync.existsSync(candSub2) && fsSync.statSync(candSub2).isFile()) return candSub2;
        }

        return null;
    }

    /**
     * Load the watermark logo buffer, caching it in memory
     */
    private async getLogoBuffer(logoUrlOrPath: string): Promise<Buffer | null> {
        let logoFilename = path.basename(logoUrlOrPath);
        const qIdx = logoFilename.indexOf('?');
        if (qIdx !== -1) {
            logoFilename = logoFilename.substring(0, qIdx);
        }

        // Check if cached buffer is valid
        if (this.cachedLogoBuffer && this.cachedLogoPath === logoFilename) {
            return this.cachedLogoBuffer;
        }

        let resolvedPath = this.resolveFilePath(logoUrlOrPath);
        if (!resolvedPath) {
            resolvedPath = this.resolveFilePath(`source/a6/${logoFilename}`);
        }
        if (!resolvedPath) {
            resolvedPath = this.resolveFilePath(`preview/78/${logoFilename}`);
        }
        // Fallback default official logo
        if (!resolvedPath) {
            resolvedPath = this.resolveFilePath('source/official-ahizan-watermark.svg');
        }
        if (!resolvedPath) {
            resolvedPath = this.resolveFilePath('source/a6/logo-temp-01.png');
        }

        if (resolvedPath && fsSync.existsSync(resolvedPath)) {
            try {
                let fileBuffer = await fs.readFile(resolvedPath);
                if (resolvedPath.toLowerCase().endsWith('.svg')) {
                    fileBuffer = await sharp(fileBuffer, { density: 300 }).png().toBuffer();
                }
                this.cachedLogoBuffer = fileBuffer;
                this.cachedLogoPath = logoFilename;
                return this.cachedLogoBuffer;
            } catch (err: any) {
                this.logger.error(`Error reading logo buffer from ${resolvedPath}: ${err.message}`);
            }
        }

        return null;
    }

    /**
     * Safely prepare watermark with exact dimensions and opacity.
     * Uses dest-in composite alpha blending to prevent 'Band expansion using linear is unsupported'
     * errors on non-alpha JPEGs.
     */
    private async prepareWatermarkBuffer(logoBuffer: Buffer, targetWidth: number, opacity: number): Promise<Buffer> {
        const resized = await sharp(logoBuffer)
            .resize({ width: targetWidth, fit: 'inside' })
            .png()
            .toBuffer();

        const alphaVal = Math.round(Math.max(0.05, Math.min(1.0, opacity)) * 255);

        return await sharp(resized)
            .composite([{
                input: Buffer.from([255, 255, 255, alphaVal]),
                raw: { width: 1, height: 1, channels: 4 },
                tile: true,
                blend: 'dest-in'
            }])
            .png()
            .toBuffer();
    }

    private readonly inflight = new Map<string, Promise<{ buffer: Buffer; mimeType: string; filename: string } | null>>();

    /**
     * Public entry point. Concurrent requests for the same image (e.g. a crawler burst)
     * share one single generation, avoiding duplicate Sharp work on the VPS.
     */
    getWatermarkedImage(identifier: string): Promise<{
        buffer: Buffer;
        mimeType: string;
        filename: string;
    } | null> {
        const key = (identifier || '').split('?')[0];
        const existing = this.inflight.get(key);
        if (existing) return existing;
        const p = this.buildWatermarkedImage(identifier).finally(() => this.inflight.delete(key));
        this.inflight.set(key, p);
        return p;
    }

    /**
     * Core method: Process and retrieve a watermarked image for download
     * Incorporates disk-caching to guarantee minimal CPU/memory usage on VPS
     */
    private async buildWatermarkedImage(identifier: string): Promise<{
        buffer: Buffer;
        mimeType: string;
        filename: string;
    } | null> {
        const targetPath = this.resolveFilePath(identifier);
        if (!targetPath) {
            return null;
        }

        const ext = path.extname(targetPath).toLowerCase();
        const supportedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
        const baseFilename = path.basename(targetPath);

        // MIME type determination
        let mimeType = 'image/jpeg';
        if (ext === '.png') mimeType = 'image/png';
        else if (ext === '.webp') mimeType = 'image/webp';

        const outputFilename = `ahizan-${baseFilename}`;

        // If not a supported image format (e.g. svg, pdf, gif), serve file as-is
        if (!supportedExtensions.includes(ext)) {
            const rawBuffer = await fs.readFile(targetPath);
            return {
                buffer: rawBuffer,
                mimeType: ext === '.gif' ? 'image/gif' : 'application/octet-stream',
                filename: outputFilename,
            };
        }

        const settings = await this.getSettings();
        const logoBuffer = await this.getLogoBuffer(settings.watermarkUrl || '');
        if (!logoBuffer) {
            const rawBuffer = await fs.readFile(targetPath);
            return { buffer: rawBuffer, mimeType, filename: outputFilename };
        }

        // Cache Key generation
        const cacheHash = crypto.createHash('sha256')
            .update(`${identifier}_${settings.watermarkUrl}_${settings.watermarkOpacity}_${settings.watermarkSize}_${settings.watermarkPosition}_${settings.watermarkMargin}_${settings.cropProtection}`)
            .digest('hex')
            .substring(0, 16);

        const cachedFilePath = path.join(this.cacheDir, `${cacheHash}-${baseFilename}`);

        // 1. FAST PATH: Return from disk cache if already generated
        if (fsSync.existsSync(cachedFilePath)) {
            try {
                const cachedBuffer = await fs.readFile(cachedFilePath);
                return {
                    buffer: cachedBuffer,
                    mimeType,
                    filename: outputFilename,
                };
            } catch (e) {
                // If read fails, proceed to generate below
            }
        }

        // 2. GENERATION PATH: Apply professional watermark with Sharp
        try {
            const targetBuffer = await fs.readFile(targetPath);
            const targetMetadata = await sharp(targetBuffer).metadata();
            const targetWidth = targetMetadata.width || 800;
            const targetHeight = targetMetadata.height || 800;

            // Skip tiny icons/loaders below 120px
            if (targetWidth < 120 || targetHeight < 120) {
                return { buffer: targetBuffer, mimeType, filename: outputFilename };
            }

            // Watermark size from CMS (default 22%)
            const sizePercent = settings.watermarkSize || 22;
            const watermarkWidth = Math.max(80, Math.round(targetWidth * (sizePercent / 100)));
            const marginPx = Math.max(12, Math.round(Math.min(targetWidth, targetHeight) * ((settings.watermarkMargin || 3) / 100)));
            const opacity = settings.watermarkOpacity !== undefined ? settings.watermarkOpacity : 0.85;

            // Render primary watermark buffer with exact opacity and alpha channel
            const primaryWatermarkBuffer = await this.prepareWatermarkBuffer(logoBuffer, watermarkWidth, opacity);

            const primaryMeta = await sharp(primaryWatermarkBuffer).metadata();
            const primaryW = primaryMeta.width || watermarkWidth;
            const primaryH = primaryMeta.height || Math.round(watermarkWidth * 0.3);

            // Compute primary coordinates
            let left = targetWidth - primaryW - marginPx;
            let top = targetHeight - primaryH - marginPx;

            if (settings.watermarkPosition === 'bottom-left') {
                left = marginPx;
                top = targetHeight - primaryH - marginPx;
            } else if (settings.watermarkPosition === 'top-right') {
                left = targetWidth - primaryW - marginPx;
                top = marginPx;
            } else if (settings.watermarkPosition === 'top-left') {
                left = marginPx;
                top = marginPx;
            } else if (settings.watermarkPosition === 'center') {
                left = Math.round((targetWidth - primaryW) / 2);
                top = Math.round((targetHeight - primaryH) / 2);
            }

            // Ensure coordinates are within image bounds
            left = Math.max(0, Math.min(targetWidth - primaryW, left));
            top = Math.max(0, Math.min(targetHeight - primaryH, top));

            const compositeList: sharp.OverlayOptions[] = [
                {
                    input: primaryWatermarkBuffer,
                    top,
                    left,
                    blend: 'over',
                }
            ];

            // 3. CROP PROTECTION: Discreet secondary micro-signature in opposite area
            if (settings.cropProtection) {
                const secondaryWidth = Math.max(40, Math.round(targetWidth * 0.08));
                const secondaryOpacity = Math.max(0.20, Math.min(0.40, opacity * 0.4));

                const secondaryWatermarkBuffer = await this.prepareWatermarkBuffer(logoBuffer, secondaryWidth, secondaryOpacity);

                const secMeta = await sharp(secondaryWatermarkBuffer).metadata();
                const secW = secMeta.width || secondaryWidth;
                const secH = secMeta.height || Math.round(secondaryWidth * 0.3);

                // Place in opposite diagonal (e.g. top-left if primary is bottom-right)
                let secLeft = marginPx;
                let secTop = marginPx;
                if (settings.watermarkPosition === 'bottom-left') {
                    secLeft = targetWidth - secW - marginPx;
                    secTop = marginPx;
                }

                secLeft = Math.max(0, Math.min(targetWidth - secW, secLeft));
                secTop = Math.max(0, Math.min(targetHeight - secH, secTop));

                compositeList.push({
                    input: secondaryWatermarkBuffer,
                    top: secTop,
                    left: secLeft,
                    blend: 'over',
                });
            }

            const resultBuffer = await sharp(targetBuffer)
                .composite(compositeList)
                .toBuffer();

            // Persist to cache asynchronously without blocking response
            fs.writeFile(cachedFilePath, resultBuffer).catch(err => {
                this.logger.warn(`Failed to write watermark cache: ${err.message}`);
            });

            return {
                buffer: resultBuffer,
                mimeType,
                filename: outputFilename,
            };
        } catch (err: any) {
            this.logger.error(`Error applying watermark to ${identifier}: ${err.message}`);
            // Fallback: Return original clean image if processing encounters any error
            const rawBuffer = await fs.readFile(targetPath);
            return { buffer: rawBuffer, mimeType, filename: outputFilename };
        }
    }
}
