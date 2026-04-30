import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { TransactionalConnection, RequestContext, Channel, User } from '@vendure/core';
import { PlatformSettings } from '../entities/platform-settings.entity';

@Injectable()
export class PlatformSettingsService implements OnApplicationBootstrap {
    constructor(
        private connection: TransactionalConnection,
    ) { }

    async getSettings(ctx?: RequestContext): Promise<PlatformSettings | null> {
        const repo = ctx
            ? this.connection.getRepository(ctx, PlatformSettings)
            : this.connection.rawConnection.getRepository(PlatformSettings);
        let settings = await repo.findOne({ where: { id: 'platform_settings' } });
        return settings || null;
    }

    async getOrCreateSettings(ctx?: RequestContext): Promise<PlatformSettings> {
        let settings = await this.getSettings(ctx);
        if (!settings) {
            const repo = ctx
                ? this.connection.getRepository(ctx, PlatformSettings)
                : this.connection.rawConnection.getRepository(PlatformSettings);
            const newSettings = repo.create({
                id: 'platform_settings',
                platformName: 'Ahizan',
                defaultCommissionRate: 10,
                showVendorContact: false,
                vendorContactFields: { phone: true, email: false, whatsapp: true, facebook: false, instagram: false, website: false },
                defaultCurrencyCode: 'XOF',
                defaultPhonePrefix: '+229',
                emailVerificationRequired: false,
                vendorAutoApproval: false,
                placeholderEmailDomain: 'ahizan.com',
            });
            return repo.save(newSettings) as Promise<PlatformSettings>;
        }
        return settings;
    }

    async updateSettings(ctx: RequestContext, input: Partial<PlatformSettings>): Promise<PlatformSettings> {
        const settings = await this.getOrCreateSettings(ctx);
        Object.assign(settings, input);
        return this.connection.getRepository(ctx, PlatformSettings).save(settings);
    }

    async onApplicationBootstrap() {
        try {
            await this.getOrCreateSettings();
            console.log('PlatformSettingsService: Settings initialized.');
        } catch (e) {
            console.error('PlatformSettingsService: Failed to initialize settings:', e);
        }
    }
}
