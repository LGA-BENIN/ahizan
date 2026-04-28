import { Controller, Get, Post, Body, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BannerService, BannerConfig } from './banner.service';
import * as fs from 'fs/promises';
import * as path from 'path';

// This controller will handles our "Flat-file" banner settings
@Controller('banner')
export class BannerAdminController {
    constructor(private bannerService: BannerService) {}

    @Get('config')
    async getConfig() {
        return this.bannerService.getConfig();
    }

    @Post('config')
    async saveConfig(@Body() config: BannerConfig) {
        await this.bannerService.saveConfig(config);
        return { success: true };
    }

    @Get('hero-config')
    async getHeroConfig() {
        return this.bannerService.getHeroConfig();
    }

    @Post('hero-config')
    async saveHeroConfig(@Body() config: any) {
        await this.bannerService.saveHeroConfig(config);
        return { success: true };
    }

    @Get('promo-config')
    async getPromoConfig() {
        return this.bannerService.getPromoConfig();
    }

    @Post('promo-config')
    async savePromoConfig(@Body() config: any) {
        await this.bannerService.savePromoConfig(config);
        return { success: true };
    }

    // --- Flash Sale Versioning ---
    @Get('flash-versions')
    async getFlashVersions() {
        return this.bannerService.getFlashVersions();
    }

    @Post('flash-versions')
    async saveFlashVersions(@Body() versions: any[]) {
        await this.bannerService.saveFlashVersions(versions);
        return { success: true };
    }

    @Get('flash-active')
    async getActiveFlashSale() {
        return this.bannerService.getActiveFlashVersions();
    }

    @Get('general-config')
    async getGeneralConfig() {
        console.log('[BannerAdminController] Fetching general-config...');
        return this.bannerService.getGeneralConfig();
    }

    @Post('general-config')
    async saveGeneralConfig(@Body() config: any) {
        await this.bannerService.saveGeneralConfig(config);
        return { success: true };
    }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    async uploadImage(@UploadedFile() file: any) {
        if (!file) {
            throw new Error('No file uploaded');
        }

        const uploadDir = path.join(process.cwd(), 'static', 'assets', 'banners');
        
        // Ensure directory exists
        await fs.mkdir(uploadDir, { recursive: true });

        const fileName = `${Date.now()}-${file.originalname}`;
        const filePath = path.join(uploadDir, fileName);

        await fs.writeFile(filePath, file.buffer);

        // Return the public URL
        return { 
            url: `/assets/banners/${fileName}` 
        };
    }
}
