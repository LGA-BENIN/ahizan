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
