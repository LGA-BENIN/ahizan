import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface BannerConfig {
    isActive: boolean;
    type: 'image' | 'text';
    targetUrl: string;
    desktopImageUrl: string;
    mobileImageUrl: string;
    topText: string;
    mainText: string;
    linkText: string;
}

@Injectable()
export class BannerService {
    private configPath = path.join(process.cwd(), 'static', 'banner-config.json');

    async getConfig(): Promise<BannerConfig> {
        try {
            const data = await fs.readFile(this.configPath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            // Default config if file doesn't exist
            return {
                isActive: false,
                type: 'image',
                targetUrl: '',
                desktopImageUrl: '',
                mobileImageUrl: '',
                topText: 'Flash Ad',
                mainText: 'Profitez de -50% sur toutes les nouvelles collections Ahizan !',
                linkText: 'En savoir plus',
            };
        }
    }

    async saveConfig(config: BannerConfig): Promise<void> {
        await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
    }
}
