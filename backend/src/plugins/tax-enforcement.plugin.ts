import {
    VendurePlugin,
    PluginCommonModule,
    EventBus,
    ProductVariantEvent,
    TaxCategoryService,
    TaxRateService,
    RequestContext,
    TransactionalConnection,
    TaxCategory,
    TaxRate,
    ZoneService,
    ChannelService
} from '@vendure/core';
import { OnApplicationBootstrap } from '@nestjs/common';

@VendurePlugin({
    imports: [PluginCommonModule],
})
export class TaxEnforcementPlugin implements OnApplicationBootstrap {
    constructor(
        private eventBus: EventBus,
        private connection: TransactionalConnection,
        private taxCategoryService: TaxCategoryService,
        private taxRateService: TaxRateService,
        private zoneService: ZoneService,
        private channelService: ChannelService,
    ) { }

    async onApplicationBootstrap() {
        // Ensure standard tax category and rate exist on startup
        // We use a superadmin context for these operations
        const ctx = await this.createSuperAdminContext();
        await this.ensureTaxConfiguration(ctx);

        // Subscribe to product variant events to enforce tax category
        this.eventBus.ofType(ProductVariantEvent).subscribe(async (event) => {
            if (event.type === 'created' || event.type === 'updated') {
                await this.enforceTaxCategory(event.ctx, event.entity);
            }
        });
    }

    private async createSuperAdminContext(): Promise<RequestContext> {
        const channel = await this.channelService.getDefaultChannel();
        return new RequestContext({
            channel,
            apiType: 'admin',
            isAuthorized: true,
            authorizedAsOwnerOnly: false,
        });
    }

    private async ensureTaxConfiguration(ctx: RequestContext) {
        console.log('[TaxEnforcementPlugin] Checking Tax Configuration...');

        // 1. Ensure "Standard Tax" Category
        let taxCategory = await this.connection.getRepository(ctx, TaxCategory).findOne({
            where: { name: 'Standard Tax' }
        });

        if (!taxCategory) {
            console.log('[TaxEnforcementPlugin] Creating "Standard Tax" Category...');
            taxCategory = await this.taxCategoryService.create(ctx, {
                name: 'Standard Tax',
                isDefault: true,
            });
        }

        // 2. Ensure "Global" Zone (or use default)
        const zones = await this.zoneService.findAll(ctx);
        let zone = zones.items.find(z => z.name === 'Global') || zones.items[0];

        if (!zone) {
            console.log('[TaxEnforcementPlugin] Creating "Global" Zone...');
            zone = await this.zoneService.create(ctx, { name: 'Global' });
        }

        // 3. Ensure 0% Tax Rate
        const taxRates = await this.taxRateService.findAll(ctx);
        let zeroRate = taxRates.items.find(r => r.name === 'No Tax Check' || r.value === 0);

        if (!zeroRate) {
            console.log('[TaxEnforcementPlugin] Creating 0% Tax Rate...');
            await this.taxRateService.create(ctx, {
                name: 'No Tax Check',
                enabled: true,
                value: 0,
                categoryId: taxCategory.id,
                zoneId: zone.id,
            });
        } else {
            // Ensure existing zero rate is linked to our standard category
            if (!zeroRate.category || zeroRate.category.id !== taxCategory.id) {
                await this.taxRateService.update(ctx, {
                    id: zeroRate.id,
                    categoryId: taxCategory.id
                });
            }
        }
        console.log('[TaxEnforcementPlugin] Tax Configuration Ensured.');
    }

    private async enforceTaxCategory(ctx: RequestContext, variants: any | any[]) {
        const variantsArray = Array.isArray(variants) ? variants : [variants];

        // Find our enforced tax category
        const taxCategory = await this.connection.getRepository(ctx, TaxCategory).findOne({
            where: { name: 'Standard Tax' }
        });

        if (!taxCategory) return;

        const variantsToFix = variantsArray.filter(v => v.taxCategoryId !== taxCategory.id);

        if (variantsToFix.length > 0) {
            console.log(`[TaxEnforcementPlugin] Enforcing 0% Tax on ${variantsToFix.length} variants...`);
            // We use direct DB update to avoid infinite loops with event listeners if we used the service
            await this.connection.getRepository(ctx, 'ProductVariant')
                .update(
                    variantsToFix.map((v: any) => v.id),
                    { taxCategory: taxCategory }
                );
        }
    }
}
