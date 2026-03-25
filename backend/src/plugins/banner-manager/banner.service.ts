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

export interface HeroConfig {
    selectedTemplate: 'classic' | 'bento' | 'fullwidth';
    showSidebar: boolean;
    classic: {
        type: 'text' | 'image' | 'video';
        bgUrl?: string;
        title: string;
        subtitle: string;
        buttonText: string;
        buttonLink: string;
        mainTextColor: 'white' | 'black';
        // Sidebar card descriptions
        assistanceDesc: string;
        whatsappDesc: string;
        sellDesc: string;
        modalTextColor: 'white' | 'black';
        // Flash Ad customization
        flashTitle: string;
        flashDiscount: string;
        flashBgType: 'color' | 'image' | 'video';
        flashBgUrl?: string;
    };
    bento: {
        mainTitle: string;
        mainSubtitle: string;
        mainButtonText: string;
        mainButtonLink: string;
        mainTextColor: 'white' | 'black';
        flashTitle: string;
        flashDesc: string;
        whatsappTitle: string;
        whatsappDesc: string;
        sellTitle: string;
        sellDesc: string;
        modalTextColor: 'white' | 'black';
    };
    fullwidth: {
        type: 'image' | 'video' | 'text';
        title: string;
        subtitle: string;
        buttonText: string;
        buttonLink: string;
        bgUrl?: string;
        mainTextColor: 'white' | 'black';
        // Badge descriptions
        assistanceDesc: string;
        whatsappDesc: string;
        sellDesc: string;
        modalTextColor: 'white' | 'black';
    };
}

export interface FlashSaleVersion {
    id: string;
    name: string; // Internal admin name
    isActive: boolean;
    isSimpleMode?: boolean; // New: Simplified design toggle
    title: string;
    subtitle: string;
    startTime?: string; // New: Starting date/time
    endTime: string; // ISO Date
    // Visuals
    bgColor: string;
    textColor: string;
    accentColor: string;
    bgImageUrl?: string;
    // Content Logic
    selectionType: 'MANUAL' | 'FILTER';
    manualProductIds: string[];
    filterCriteria?: {
        minPrice?: number;
        maxPrice?: number;
        facetValueIds?: string[];
        collectionId?: string[];
        minDiscount?: number; // New: Minimum discount %
        onlyInStock?: boolean; // New: In-stock only toggle
        take?: number; // New: Limit for product fetching
    };
}

export interface PromoConfig {
    showQuickLinks: boolean;
    quickLinksStyle: 'circles' | 'cards' | 'minimal';
    facetMedia: Record<string, string>; // facetSlug -> imageUrl
    showPromoBanner: boolean;
    promoBanner: {
        type: 'text' | 'image' | 'video';
        title: string;
        subtitle: string;
        ctaText: string;
        bgType: 'color' | 'image' | 'video';
        bgUrl?: string;
        bgColor?: string;
        textColor: 'white' | 'black';
    };
}

@Injectable()
export class BannerService {
    private configPath = path.join(process.cwd(), 'static', 'banner-config.json');
    private heroConfigPath = path.join(process.cwd(), 'static', 'hero-config.json');
    private promoConfigPath = path.join(process.cwd(), 'static', 'promo-config.json');
    private flashConfigPath = path.join(process.cwd(), 'static', 'flash-versions.json');

    async getConfig(): Promise<BannerConfig> {
        try {
            const data = await fs.readFile(this.configPath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            return {
                isActive: true,
                type: 'text',
                targetUrl: '',
                desktopImageUrl: '',
                mobileImageUrl: '',
                topText: '',
                mainText: '',
                linkText: ''
            };
        }
    }

    async saveConfig(config: BannerConfig): Promise<void> {
        await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
    }

    async getHeroConfig(): Promise<HeroConfig> {
        try {
            const data = await fs.readFile(this.heroConfigPath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            return {
                selectedTemplate: 'classic',
                showSidebar: true,
                classic: {
                    type: 'text',
                    bgUrl: '',
                    title: '',
                    subtitle: '',
                    buttonText: '',
                    buttonLink: '',
                    mainTextColor: 'black',
                    assistanceDesc: '',
                    whatsappDesc: '',
                    sellDesc: '',
                    modalTextColor: 'black',
                    flashTitle: '',
                    flashDiscount: '',
                    flashBgType: 'color',
                    flashBgUrl: ''
                },
                bento: {
                    mainTitle: '',
                    mainSubtitle: '',
                    mainButtonText: '',
                    mainButtonLink: '',
                    mainTextColor: 'black',
                    flashTitle: '',
                    flashDesc: '',
                    whatsappTitle: '',
                    whatsappDesc: '',
                    sellTitle: '',
                    sellDesc: '',
                    modalTextColor: 'white'
                },
                fullwidth: {
                    type: 'text',
                    title: '',
                    subtitle: '',
                    buttonText: '',
                    buttonLink: '',
                    bgUrl: '',
                    mainTextColor: 'white',
                    assistanceDesc: '',
                    whatsappDesc: '',
                    sellDesc: '',
                    modalTextColor: 'white'
                }
            };
        }
    }

    async saveHeroConfig(config: HeroConfig): Promise<void> {
        await fs.writeFile(this.heroConfigPath, JSON.stringify(config, null, 2), 'utf-8');
    }

    async getPromoConfig(): Promise<PromoConfig> {
        try {
            const data = await fs.readFile(this.promoConfigPath, 'utf-8');
            const config = JSON.parse(data);
            return {
                ...config,
                facetMedia: config.facetMedia || {}
            };
        } catch (error) {
            return {
                showQuickLinks: true,
                quickLinksStyle: 'circles',
                facetMedia: {},
                showPromoBanner: true,
                promoBanner: {
                    type: 'text',
                    title: 'GRANDE BRADERIE AHIZAN',
                    subtitle: "Jusqu'à épuisement des stocks !",
                    ctaText: 'VITE !',
                    bgType: 'color',
                    bgColor: '#e31837',
                    textColor: 'white'
                }
            };
        }
    }

    async savePromoConfig(config: PromoConfig): Promise<void> {
        await fs.writeFile(this.promoConfigPath, JSON.stringify(config, null, 2), 'utf-8');
    }

    // --- Flash Sale Versioning ---
    async getFlashVersions(): Promise<FlashSaleVersion[]> {
        try {
            const data = await fs.readFile(this.flashConfigPath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            return [];
        }
    }

    async saveFlashVersions(versions: FlashSaleVersion[]): Promise<void> {
        await fs.writeFile(this.flashConfigPath, JSON.stringify(versions, null, 2), 'utf-8');
    }

    async getActiveFlashVersions(): Promise<FlashSaleVersion[]> {
        const versions = await this.getFlashVersions();
        return versions.filter(v => v.isActive);
    }
}
