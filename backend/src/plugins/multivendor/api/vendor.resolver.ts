import { Allow, Ctx, Permission, RequestContext, PaginatedList, Product, ProductService, OrderService, Order, OrderStateTransitionError, AssetService, Asset, TransactionalConnection, Transaction, ProductVariantService, SearchService, GlobalSettingsService, EventBus, ProductEvent, Collection, ProductVariant, ChannelService, ProductOptionGroupService, ProductOptionService } from '@vendure/core';
import { In, Not } from 'typeorm';
import { Args, Mutation, Query, Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { VendorService } from '../service/vendor.service';
import { Vendor, VendorStatus } from '../entities/vendor.entity';
import { SellerOffer, ProductCondition, DeliveryTimeUnit } from '../entities/seller-offer.entity';
import { OrderStatusService } from '../service/order-status.service';
import { LikeService } from '../service/like.service';
import { GeoZone } from '../../geo-engine/entities/geo-zone.entity';
import { Market } from '../../geo-engine/entities/market.entity';
import { GeoService } from '../../geo-engine/service/geo.service';

@Resolver('Vendor')
export class VendorResolver {
    constructor(
        private vendorService: VendorService,
        private orderService: OrderService,
        private assetService: AssetService,
        private connection: TransactionalConnection,
        private orderStatusService: OrderStatusService,
        private likeService: LikeService,
        private geoService: GeoService,
    ) { }

    @ResolveField()
    async products(@Parent() vendor: Vendor, @Ctx() ctx: RequestContext): Promise<Product[]> {
        const products = await this.vendorService.findAllProductsForVendor(ctx, vendor.id.toString());
        return products || [];
    }

    @ResolveField()
    async orders(@Parent() vendor: Vendor, @Ctx() ctx: RequestContext): Promise<Order[]> {
        const ordersResult = await this.vendorService.findOrdersForVendor(ctx, vendor.id.toString(), { take: 100 });
        return ordersResult.items || [];
    }

    @ResolveField()
    async followersCount(@Parent() vendor: Vendor, @Ctx() ctx: RequestContext): Promise<number> {
        return this.likeService.getVendorLikesCount(ctx, vendor.id);
    }

    @Mutation()
    @Allow(Permission.Public)
    async applyToBecomeVendor(
        @Ctx() ctx: RequestContext,
        @Args('input') input: any
    ): Promise<Vendor> {
        console.log('VendorResolver.applyToBecomeVendor called!');

        try {
            // If user is authenticated, link vendor to their account
            const userId = ctx.activeUserId;

            if (userId) {
                return await this.vendorService.create(ctx, { ...input, userId: userId.toString() });
            } else if (input.password) {
                // Create new user account with vendor application
                return await this.vendorService.create(ctx, input);
            } else {
                throw new Error('Either authenticate or provide a password to create vendor account');
            }
        } catch (error: any) {
            console.error('Error in VendorResolver.applyToBecomeVendor:', error);
            throw error; // Re-throw to GraphQL
        }
    }

    @Query()
    @Allow(Permission.Public)
    async vendor(@Ctx() ctx: RequestContext, @Args('id') id: string): Promise<Vendor | null> {
        return this.vendorService.findOne(ctx, id);
    }

    @Query()
    @Allow(Permission.Public)
    async vendors(
        @Ctx() ctx: RequestContext,
        @Args('options') options: any,
        @Args('latitude') latitude?: number,
        @Args('longitude') longitude?: number,
        @Args('marketId') marketId?: string,
        @Args('locationId') locationId?: string,
    ): Promise<PaginatedList<Vendor>> {
        return this.vendorService.findAll(ctx, options, latitude, longitude, marketId, locationId);
    }

    @Query()
    @Allow(Permission.Authenticated)
    async myVendorProfile(@Ctx() ctx: RequestContext): Promise<Vendor | null> {
        if (!ctx.activeUserId) {
            throw new Error('Not authenticated');
        }
        return this.vendorService.findByUserId(ctx, ctx.activeUserId.toString());
    }

    @Query()
    @Allow(Permission.Authenticated)
    async myVendorOrders(@Ctx() ctx: RequestContext, @Args('options') options: any): Promise<any> {
        const vendor = await this.myVendorProfile(ctx);
        if (!vendor) {
            throw new Error('No vendor profile found for this user');
        }
        return this.vendorService.findOrdersForVendor(ctx, vendor.id.toString(), options);
    }

    @Query()
    @Allow(Permission.Authenticated)
    async myVendorOrder(@Ctx() ctx: RequestContext, @Args('id') id: string): Promise<any> {
        const vendor = await this.myVendorProfile(ctx);
        if (!vendor) {
            throw new Error('No vendor profile found for this user');
        }
        return this.vendorService.findOrderForVendor(ctx, vendor.id.toString(), id);
    }

    @Query()
    @Allow(Permission.Authenticated)
    async myVendorWalletStats(@Ctx() ctx: RequestContext): Promise<any> {
        const vendor = await this.myVendorProfile(ctx);
        if (!vendor) {
            throw new Error('No vendor profile found for this user');
        }
        return this.vendorService.getVendorWalletStats(ctx, vendor.id.toString());
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async fulfillMyVendorOrder(
        @Ctx() ctx: RequestContext,
        @Args('orderId') orderId: string,
        @Args('trackingCode') trackingCode?: string,
        @Args('carrier') carrier?: string
    ): Promise<any> {
        const vendor = await this.myVendorProfile(ctx);
        if (!vendor) {
            throw new Error('No vendor profile found for this user');
        }
        return this.vendorService.fulfillOrderForVendor(ctx, vendor.id.toString(), orderId, trackingCode, carrier);
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async updateMyVendorProfile(@Ctx() ctx: RequestContext, @Args('input') input: any): Promise<Vendor> {
        const vendor = await this.myVendorProfile(ctx);
        if (!vendor) {
            throw new Error('No vendor profile found for this user');
        }
        return this.vendorService.update(ctx, vendor.id.toString(), input);
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async updateMyOrderStatus(
        @Ctx() ctx: RequestContext,
        @Args('orderId') orderId: string,
        @Args('status') status: string
    ): Promise<Order | OrderStateTransitionError> {
        const vendor = await this.myVendorProfile(ctx);
        if (!vendor) {
            throw new Error('No vendor profile found for this user');
        }

        const order = await this.orderService.findOne(ctx, orderId, [
            'lines.productVariant.product.customFields.vendor',
            'customFields.vendor'
        ]);
        if (!order) {
            throw new Error('Order not found');
        }

        const orderVendor = (order.customFields as any)?.vendor;
        let isVendorOrder = orderVendor && String(orderVendor.id) === String(vendor.id);
        if (!isVendorOrder && order.lines) {
            isVendorOrder = order.lines.some(
                (l: any) => l.productVariant?.product?.customFields?.vendor?.id && String(l.productVariant.product.customFields.vendor.id) === String(vendor.id)
            );
        }

        if (!isVendorOrder) {
            throw new Error('You do not have permission to update this order');
        }

        return this.orderService.transitionToState(ctx, orderId, status as any);
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async updateMyOrderSellerStatus(
        @Ctx() ctx: RequestContext,
        @Args('orderId') orderId: string,
        @Args('statusCode') statusCode: string
    ): Promise<boolean> {
        const vendor = await this.myVendorProfile(ctx);
        if (!vendor) {
            throw new Error('No vendor profile found for this user');
        }

        const order = await this.orderService.findOne(ctx, orderId, [
            'lines.productVariant.product.customFields.vendor',
            'lines.customFields.assignedVendor',
            'customFields.vendor'
        ]);
        if (!order) {
            throw new Error('Order not found');
        }

        const orderVendor = (order.customFields as any)?.vendor;
        let isVendorOrder = orderVendor?.id && String(orderVendor.id) === String(vendor.id);
        if (!isVendorOrder && order.lines) {
            isVendorOrder = order.lines.some(
                (l: any) => (
                    (l.productVariant?.product?.customFields?.vendor?.id && String(l.productVariant.product.customFields.vendor.id) === String(vendor.id)) ||
                    (l.customFields?.assignedVendor?.id && String(l.customFields.assignedVendor.id) === String(vendor.id))
                )
            );
        }

        if (!isVendorOrder) {
            throw new Error('You do not have permission to update this order');
        }

        // Must be a valid seller state
        if (!['pending', 'confirmed', 'refused'].includes(statusCode)) {
            throw new Error('Invalid seller status');
        }

        return this.vendorService.updateVendorOrderStatus(
            ctx,
            orderId,
            String(vendor.id),
            'sellerStatus',
            statusCode
        );
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async updateMyOrderLineSellerStatus(
        @Ctx() ctx: RequestContext,
        @Args('lineId') lineId: string,
        @Args('statusCode') statusCode: string
    ): Promise<boolean> {
        const vendor = await this.myVendorProfile(ctx);
        if (!vendor) {
            throw new Error('No vendor profile found for this user');
        }
        
        // Must be a valid seller state
        if (!['pending', 'confirmed', 'refused'].includes(statusCode)) {
            throw new Error('Invalid seller status');
        }

        return this.vendorService.updateVendorOrderLineStatus(
            ctx, 
            lineId, 
            String(vendor.id), 
            statusCode
        );
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async uploadVendorFile(
        @Ctx() ctx: RequestContext,
        @Args('file') file: any
    ): Promise<Asset | undefined> {
        // Check if file is a GIF - if so, skip Sharp processing to preserve animation
        const isGif = file.mimetype === 'image/gif' || file.filename?.toLowerCase().endsWith('.gif');

        if (isGif) {
            // For GIFs, we need to save the file directly without processing
            const fs = require('fs');
            const path = require('path');
            const assetsDir = path.join(__dirname, '../../../../static/assets');
            const uniqueName = `${Date.now()}-${file.filename}`;
            const filePath = path.join(assetsDir, uniqueName);

            // Ensure directory exists
            if (!fs.existsSync(assetsDir)) {
                fs.mkdirSync(assetsDir, { recursive: true });
            }

            // Write file directly
            const buffer = await file.buffer;
            fs.writeFileSync(filePath, buffer);

            // Create asset record manually
            const asset = new Asset();
            asset.name = file.filename;
            asset.type = 'IMAGE' as any;
            asset.mimeType = 'image/gif';
            asset.source = `/assets/${uniqueName}`;
            asset.preview = `/assets/${uniqueName}`;
            asset.fileSize = buffer.length;
            asset.width = 0;
            asset.height = 0;
            asset.focalPoint = { x: 0.5, y: 0.5 };

            const savedAsset = await this.connection.getRepository(ctx, Asset).save(asset);
            return savedAsset as any;
        }

        const asset = await this.assetService.create(ctx, {
            file,
            tags: ['vendor-docs'],
        });
        if (isErrorResult(asset)) {
            throw new Error(asset.message);
        }
        return asset as any;
    }

    @ResolveField()
    async location(@Parent() vendor: Vendor, @Ctx() ctx: RequestContext): Promise<GeoZone | null> {
        if (!vendor.locationId) {
            return null;
        }
        return this.geoService.getLocation(ctx, vendor.locationId);
    }

    @ResolveField()
    async physicalMarket(@Parent() vendor: Vendor, @Ctx() ctx: RequestContext): Promise<Market | null> {
        if (!vendor.physicalMarketId) {
            return null;
        }
        return this.geoService.getMarket(ctx, vendor.physicalMarketId);
    }

    @ResolveField()
    async markets(@Parent() vendor: Vendor, @Ctx() ctx: RequestContext): Promise<Market[]> {
        if (!vendor.marketIds || vendor.marketIds.length === 0) {
            return [];
        }
        return this.geoService.getMarketsByIds(ctx, vendor.marketIds);
    }

    @Query()
    @Allow(Permission.Authenticated)
    async myWithdrawals(@Ctx() ctx: RequestContext): Promise<any[]> {
        const vendor = await this.myVendorProfile(ctx);
        if (!vendor) throw new Error('No vendor profile found');
        return this.vendorService.getWithdrawals(ctx, vendor.id.toString());
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async requestVendorWithdrawal(
        @Ctx() ctx: RequestContext,
        @Args('amount') amount: number
    ): Promise<boolean> {
        return this.vendorService.requestWithdrawal(ctx, amount);
    }
}

@Resolver('WithdrawalRequest')
export class WithdrawalRequestEntityResolver {
    @ResolveField('reason')
    reason(@Parent() withdrawal: any): string | null {
        return withdrawal.rejectionReason;
    }
}

function isErrorResult(result: any): result is { message: string; errorCode: string } {
    return !!result.errorCode;
}

@Resolver('Vendor')
export class VendorAdminResolver {
    constructor(
        private vendorService: VendorService,
        private productService: ProductService,
        private productVariantService: ProductVariantService,
        private searchService: SearchService,
        private globalSettingsService: GlobalSettingsService,
        private eventBus: EventBus,
        private connection: TransactionalConnection,
        private likeService: LikeService,
        private geoService: GeoService,
        private channelService: ChannelService,
        private productOptionGroupService: ProductOptionGroupService,
        private productOptionService: ProductOptionService,
    ) {
        console.log('VendorAdminResolver initialized with ProductService and GeoService');
    }

    @ResolveField()
    async products(@Parent() vendor: Vendor, @Ctx() ctx: RequestContext): Promise<Product[]> {
        const products = await this.vendorService.findAllProductsForVendor(ctx, vendor.id.toString());
        return products || [];
    }

    @ResolveField()
    async orders(@Parent() vendor: Vendor, @Ctx() ctx: RequestContext): Promise<Order[]> {
        const ordersResult = await this.vendorService.findOrdersForVendor(ctx, vendor.id.toString(), { take: 100 });
        return ordersResult.items || [];
    }

    @ResolveField()
    async followersCount(@Parent() vendor: Vendor, @Ctx() ctx: RequestContext): Promise<number> {
        return this.likeService.getVendorLikesCount(ctx, vendor.id);
    }

    @Query()
    @Allow(Permission.Authenticated)
    async adminVendorProducts(@Ctx() ctx: RequestContext, @Args('options') options: any): Promise<PaginatedList<Product>> {
        return this.productService.findAll(ctx, options);
    }

    @Query()
    @Allow(Permission.Public)
    async vendors(
        @Ctx() ctx: RequestContext,
        @Args('options') options: any,
        @Args('latitude') latitude?: number,
        @Args('longitude') longitude?: number,
        @Args('marketId') marketId?: string,
        @Args('locationId') locationId?: string,
    ): Promise<PaginatedList<Vendor>> {
        return this.vendorService.findAll(ctx, options, latitude, longitude, marketId, locationId);
    }

    @Query()
    @Allow(Permission.Public)
    async vendor(@Ctx() ctx: RequestContext, @Args('id') id: string): Promise<Vendor | null> {
        return this.vendorService.findOne(ctx, id);
    }

    @Mutation()
    @Allow(Permission.Public)
    async createVendor(
        @Ctx() ctx: RequestContext,
        @Args('input') input: any
    ): Promise<Vendor> {
        return this.vendorService.create(ctx, input);
    }

    @Mutation()
    @Allow(Permission.Public)
    async updateVendorStatus(
        @Ctx() ctx: RequestContext,
        @Args('id') id: string,
        @Args('status') status: VendorStatus,
        @Args('reason') reason?: string
    ): Promise<Vendor> {
        return this.vendorService.update(ctx, id, { status, rejectionReason: reason });
    }

    @Mutation()
    @Allow(Permission.Public)
    async updateVendor(
        @Ctx() ctx: RequestContext,
        @Args('id') id: string,
        @Args('input') input: any
    ): Promise<Vendor> {
        return this.vendorService.update(ctx, id, input);
    }

    @Mutation()
    @Allow(Permission.Public)
    async deleteVendor(
        @Ctx() ctx: RequestContext,
        @Args('id') id: string,
        @Args('deleteProducts') deleteProducts: boolean,
        @Args('deleteOrders') deleteOrders: boolean
    ): Promise<boolean> {
        return this.vendorService.deleteVendor(ctx, id, deleteProducts, deleteOrders);
    }

    // ---- Wallet Mutations ----

    @Mutation()
    @Allow(Permission.Public)
    async creditVendorWallet(
        @Ctx() ctx: RequestContext,
        @Args('vendorId') vendorId: string,
        @Args('amount') amount: number,
        @Args('note') _note?: string
    ): Promise<Vendor> {
        return this.vendorService.creditWallet(ctx, vendorId, amount);
    }

    @Mutation()
    @Allow(Permission.Public)
    async debitVendorWallet(
        @Ctx() ctx: RequestContext,
        @Args('vendorId') vendorId: string,
        @Args('amount') amount: number,
        @Args('note') _note?: string
    ): Promise<Vendor> {
        return this.vendorService.debitWallet(ctx, vendorId, amount);
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async setVendorAllowNegativeBalance(
        @Ctx() ctx: RequestContext,
        @Args('vendorId') vendorId: string,
        @Args('allow') allow: boolean
    ): Promise<Vendor> {
        return this.vendorService.setAllowNegativeBalance(ctx, vendorId, allow);
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async updateOrderAdminStatus(
        @Ctx() ctx: RequestContext,
        @Args('orderId') orderId: string,
        @Args('status') status: string,
        @Args('vendorId') vendorId?: string
    ): Promise<boolean> {
        if (!['pending', 'shipped', 'in_transit', 'delivered', 'cancelled'].includes(status)) {
            throw new Error('Invalid admin status');
        }
        return this.vendorService.updateVendorOrderStatus(ctx, orderId, vendorId, 'adminStatus', status);
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async updateOrderSellerStatus(
        @Ctx() ctx: RequestContext,
        @Args('orderId') orderId: string,
        @Args('status') status: string,
        @Args('vendorId') vendorId?: string
    ): Promise<boolean> {
        if (!['pending', 'confirmed', 'refused'].includes(status)) {
            throw new Error('Invalid seller status');
        }
        return this.vendorService.updateVendorOrderStatus(ctx, orderId, vendorId, 'sellerStatus', status);
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async updateOrderVendorPaymentStatus(
        @Ctx() ctx: RequestContext,
        @Args('orderId') orderId: string,
        @Args('isPaid') isPaid: boolean,
        @Args('vendorId') vendorId?: string
    ): Promise<boolean> {
        return this.vendorService.updateOrderVendorPaymentStatus(ctx, orderId, isPaid, vendorId);
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async acceptOrderWithoutCancelledVendor(
        @Ctx() ctx: RequestContext,
        @Args('orderId') orderId: string,
        @Args('vendorId') vendorId: string
    ): Promise<boolean> {
        return this.vendorService.acceptOrderWithoutCancelledVendor(ctx, orderId, vendorId);
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async reassignVendorSubOrder(
        @Ctx() ctx: RequestContext,
        @Args('orderId') orderId: string,
        @Args('oldVendorId') oldVendorId: string,
        @Args('newVendorId') newVendorId: string
    ): Promise<boolean> {
        return this.vendorService.reassignVendorSubOrder(ctx, orderId, oldVendorId, newVendorId);
    }

    @Transaction()
    @Mutation()
    async reassignOrderLineToProduct(
        @Ctx() ctx: RequestContext,
        @Args('orderId') orderId: string,
        @Args('lineId') lineId: string,
        @Args('newPrice') newPrice: number,
        @Args('newVendorId') newVendorId: string,
        @Args('newProductId') newProductId?: string,
        @Args('newProductName') newProductName?: string
    ): Promise<boolean> {
        return this.vendorService.reassignOrderLineToProduct(ctx, orderId, lineId, newPrice, newVendorId, newProductId, newProductName);
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async deleteVendorOrder(
        @Ctx() ctx: RequestContext,
        @Args('orderId') orderId: string
    ): Promise<boolean> {
        return this.vendorService.deleteVendorOrder(ctx, orderId);
    }

    @ResolveField()
    async location(@Parent() vendor: Vendor, @Ctx() ctx: RequestContext): Promise<GeoZone | null> {
        if (!vendor.locationId) {
            return null;
        }
        return this.geoService.getLocation(ctx, vendor.locationId);
    }

    @ResolveField()
    async physicalMarket(@Parent() vendor: Vendor, @Ctx() ctx: RequestContext): Promise<Market | null> {
        if (!vendor.physicalMarketId) {
            return null;
        }
        return this.geoService.getMarket(ctx, vendor.physicalMarketId);
    }

    @ResolveField()
    async markets(@Parent() vendor: Vendor, @Ctx() ctx: RequestContext): Promise<Market[]> {
        if (!vendor.marketIds || vendor.marketIds.length === 0) {
            return [];
        }
        return this.geoService.getMarketsByIds(ctx, vendor.marketIds);
    }

    @Query()
    @Allow(Permission.Authenticated)
    async withdrawalRequests(@Ctx() ctx: RequestContext): Promise<any[]> {
        return this.vendorService.getWithdrawals(ctx);
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async approveWithdrawalRequest(
        @Ctx() ctx: RequestContext,
        @Args('id') id: string
    ): Promise<boolean> {
        return this.vendorService.approveWithdrawal(ctx, id);
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async secondApproveWithdrawalRequest(
        @Ctx() ctx: RequestContext,
        @Args('id') id: string
    ): Promise<boolean> {
        return this.vendorService.secondApproveWithdrawal(ctx, id);
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async rejectWithdrawalRequest(
        @Ctx() ctx: RequestContext,
        @Args('id') id: string,
        @Args('reason') reason?: string
    ): Promise<boolean> {
        return this.vendorService.rejectWithdrawal(ctx, id, reason);
    }

    @Mutation()
    @Allow(Permission.SuperAdmin)
    async deleteOrderAdmin(
        @Ctx() ctx: RequestContext,
        @Args('id') id: string
    ): Promise<boolean> {
        return this.vendorService.deleteOrderAdmin(ctx, id);
    }

    // Helpers copied from shop resolver for collection & search reindexing
    private async addVariantsToCollections(ctx: RequestContext, variantIds: string[], collectionIds: string[]): Promise<void> {
        if (!collectionIds || collectionIds.length === 0 || !variantIds || variantIds.length === 0) return;

        for (const collectionId of collectionIds) {
            try {
                const collection = await this.connection.getRepository(ctx, Collection).findOne({
                    where: { id: collectionId as any },
                });
                if (!collection) continue;

                const existingFilters = (collection as any).filters || [];
                let variantFilter = existingFilters.find((f: any) => f.code === 'variant-id-filter');

                let currentVariantIds: string[] = [];
                if (variantFilter) {
                    const arg = variantFilter.args.find((a: any) => a.name === 'variantIds');
                    if (arg && arg.value) {
                        try { currentVariantIds = JSON.parse(arg.value); } catch { currentVariantIds = []; }
                    }
                }

                const mergedIds = Array.from(new Set([...currentVariantIds, ...variantIds.map(String)]));

                const updatedFilters = existingFilters.filter((f: any) => f.code !== 'variant-id-filter');
                updatedFilters.push({
                    code: 'variant-id-filter',
                    args: [{ name: 'variantIds', value: JSON.stringify(mergedIds) }],
                });

                await this.connection.getRepository(ctx, Collection).update(
                    { id: collectionId as any },
                    { filters: updatedFilters }
                );

                for (const variantId of variantIds) {
                    try {
                        const existing = await this.connection.rawConnection.query(
                            `SELECT 1 FROM collection_product_variants_product_variant WHERE "collectionId" = $1 AND "productVariantId" = $2`,
                            [collectionId, variantId]
                        );
                        if (existing.length === 0) {
                            await this.connection.rawConnection.query(
                                `INSERT INTO collection_product_variants_product_variant ("collectionId", "productVariantId") VALUES ($1, $2)`,
                                [collectionId, variantId]
                            );
                        }
                    } catch (joinErr) {}
                }
            } catch (err) {}
        }

        try {
            await this.searchService.reindex(ctx);
        } catch (reindexErr) {}
    }

    private async removeVariantsFromAllCollections(ctx: RequestContext, variantIds: string[]): Promise<void> {
        if (!variantIds || variantIds.length === 0) return;

        for (const variantId of variantIds) {
            try {
                await this.connection.rawConnection.query(
                    `DELETE FROM collection_product_variants_product_variant WHERE "productVariantId" = $1`,
                    [variantId]
                );
            } catch (joinErr) {}
        }

        const collections = await this.connection.getRepository(ctx, Collection).find();

        for (const coll of collections) {
            const filters = (coll as any).filters || [];
            const variantFilter = filters.find((f: any) => f.code === 'variant-id-filter');
            if (!variantFilter) continue;

            const arg = variantFilter.args.find((a: any) => a.name === 'variantIds');
            if (!arg || !arg.value) continue;

            let currentIds: string[];
            try { currentIds = JSON.parse(arg.value); } catch { continue; }

            const strVariantIds = variantIds.map(String);
            const filteredIds = currentIds.filter((id: string) => !strVariantIds.includes(id));

            if (filteredIds.length === currentIds.length) continue;

            const updatedFilters = filters.filter((f: any) => f.code !== 'variant-id-filter');
            if (filteredIds.length > 0) {
                updatedFilters.push({
                    code: 'variant-id-filter',
                    args: [{ name: 'variantIds', value: JSON.stringify(filteredIds) }],
                });
            }

            try {
                await this.connection.getRepository(ctx, Collection).update(
                    { id: coll.id as any },
                    { filters: updatedFilters }
                );
            } catch (err) {}
        }
    }

    private async extractFacetValuesFromCollections(ctx: RequestContext, collectionIds: string[]): Promise<string[]> {
        if (!collectionIds || collectionIds.length === 0) return [];
        
        const facetValueIds = new Set<string>();
        const processedCollectionIds = new Set<string>();
        let currentIds = [...collectionIds];

        while (currentIds.length > 0) {
            const collections = await this.connection.getRepository(ctx, Collection).find({
                where: { id: In(currentIds) },
                relations: ['parent']
            });

            currentIds = [];
            for (const coll of collections) {
                if (processedCollectionIds.has(coll.id.toString())) continue;
                processedCollectionIds.add(coll.id.toString());
                
                const filters = coll.filters || [];
                for (const filter of filters) {
                    if (filter.code === 'facet-value-filter') {
                        const arg = filter.args.find(a => a.name === 'facetValueIds');
                        if (arg && arg.value) {
                            try {
                                const ids = JSON.parse(arg.value);
                                if (Array.isArray(ids)) {
                                    ids.forEach(id => facetValueIds.add(id));
                                }
                            } catch (e) {}
                        }
                    }
                }

                if (coll.parent && coll.parent.id && coll.parent.name !== '__root_collection__') {
                    const parentId = coll.parent.id.toString();
                    if (!processedCollectionIds.has(parentId)) {
                        currentIds.push(parentId);
                    }
                }
            }
        }
        
        return Array.from(facetValueIds);
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async adminCreateProduct(
        @Ctx() ctx: RequestContext,
        @Args('input') input: any,
        @Args('vendorId') vendorId: string,
    ): Promise<Product> {
        let vendor = await this.vendorService.findOne(ctx, vendorId);
        if (!vendor) throw new Error('Vendor not found');

        // Ensure native Seller & Channel exist for this vendor
        if (!vendor.channelId || !vendor.sellerId) {
            vendor = await this.vendorService.ensureNativeSellerAndChannel(ctx, vendor);
        }

        const extractedFacetIds = await this.extractFacetValuesFromCollections(ctx, input.collectionIds || []);
        const finalFacetValueIds = Array.from(new Set([...(input.facetValueIds || []), ...extractedFacetIds]));

        // 1. Pre-validation checks
        await this.validateMinimumPrice(ctx, input.price);

        return this.connection.withTransaction(ctx, async (transactionalCtx: RequestContext) => {
            // 2. Create Product
            const product = await this.productService.create(transactionalCtx, {
                translations: [{
                    languageCode: ctx.languageCode,
                    name: input.name,
                    slug: input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
                    description: input.description,
                    customFields: {
                        shortDescription: input.shortDescription || '',
                    },
                }],
                enabled: true,
                assetIds: input.assetIds,
                facetValueIds: finalFacetValueIds,
                featuredAssetId: input.featuredAssetId,
                customFields: {
                    vendor: { id: vendor.id },
                    shortDescription: input.shortDescription || '',
                    approvalStatus: 'approved',
                }
            });

            const vendorPrefix = (vendor.name || 'VND').substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'V');
            const variantInput: any = {
                productId: product.id,
                sku: `${vendorPrefix}-${Date.now()}`,
                price: input.price,
                stockOnHand: input.stock,
                translations: [{
                    languageCode: ctx.languageCode,
                    name: input.name,
                }]
            };

            if (input.onPromotion !== undefined) {
                variantInput.customFields = { onPromotion: input.onPromotion };
            }
            if (input.promotionalPrice !== undefined) {
                variantInput.customFields = { ...variantInput.customFields, promotionalPrice: input.promotionalPrice };
            }

            const variants = await this.productVariantService.create(transactionalCtx, [variantInput]);
            const variant = variants[0];

            // 3. Assign Product, Variant and Assets to Vendor's native Channel
            if (vendor.channelId) {
                try {
                    await this.channelService.assignToChannels(transactionalCtx, Product, product.id, [vendor.channelId]);
                    await this.channelService.assignToChannels(transactionalCtx, ProductVariant, variant.id, [vendor.channelId]);
                    if (input.assetIds && input.assetIds.length > 0) {
                        for (const assetId of input.assetIds) {
                            await this.channelService.assignToChannels(transactionalCtx, Asset, assetId, [vendor.channelId]).catch(() => null);
                        }
                    }
                } catch (chanErr) {
                    console.error(`adminCreateProduct: Channel assignment error:`, chanErr);
                }
            }

            await this.productService.update(transactionalCtx, {
                id: product.id,
                facetValueIds: finalFacetValueIds,
                customFields: {
                    shortDescription: input.shortDescription || '',
                    approvalStatus: 'approved',
                }
            });

            if (input.collectionIds && input.collectionIds.length > 0) {
                await this.addVariantsToCollections(transactionalCtx, [String(variant.id)], input.collectionIds);
            }

            const finalProduct = await this.productService.findOne(transactionalCtx, product.id) as Product;
            this.eventBus.publish(new ProductEvent(transactionalCtx, finalProduct, 'created', { id: product.id }));
            return finalProduct;
        });
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async adminUpdateProduct(
        @Ctx() ctx: RequestContext,
        @Args('id') id: string,
        @Args('input') input: any,
        @Args('vendorId') vendorId?: string,
    ): Promise<Product> {
        const { collectionIds, facetValueIds, name, description, shortDescription, slug, ...productInput } = input;

        const extractedFacetIds = await this.extractFacetValuesFromCollections(ctx, collectionIds || []);
        const finalFacetValueIds = Array.from(new Set([...(facetValueIds || []), ...extractedFacetIds]));

        const updateData: any = {
            id,
            ...productInput,
            facetValueIds: finalFacetValueIds,
            customFields: {
                ...(shortDescription !== undefined ? { shortDescription } : {}),
            }
        };

        let targetVendor: Vendor | null = null;
        if (vendorId) {
            targetVendor = await this.vendorService.findOne(ctx, vendorId);
            if (targetVendor) {
                updateData.customFields.vendor = { id: targetVendor.id };
                if (!targetVendor.channelId || !targetVendor.sellerId) {
                    targetVendor = await this.vendorService.ensureNativeSellerAndChannel(ctx, targetVendor);
                }
            }
        }

        if (name !== undefined || description !== undefined || shortDescription !== undefined || slug !== undefined) {
            const existingProduct = await this.productService.findOne(ctx, id, ['translations']);
            const existingTranslation = existingProduct?.translations.find(t => t.languageCode === ctx.languageCode);
            
            updateData.translations = [{
                languageCode: ctx.languageCode,
                ...(existingTranslation ? { id: existingTranslation.id as string } : {}),
                ...(name !== undefined ? { name } : {}),
                ...(slug !== undefined ? { slug } : (name !== undefined ? { slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') } : {})),
                ...(description !== undefined ? { description } : {}),
                customFields: {
                    ...(existingTranslation?.customFields || {}),
                    ...(shortDescription !== undefined ? { shortDescription } : {}),
                }
            }];
        }

        const updated = await this.productService.update(ctx, updateData);

        if (targetVendor?.channelId) {
            await this.channelService.assignToChannels(ctx, Product, id, [targetVendor.channelId]).catch(() => null);
        }

        if (collectionIds !== undefined) {
            const product = await this.productService.findOne(ctx, id, ['variants']);
            if (product && product.variants) {
                const variantIds = product.variants.map(v => String(v.id));

                if (targetVendor?.channelId) {
                    for (const variantId of variantIds) {
                        await this.channelService.assignToChannels(ctx, ProductVariant, variantId, [targetVendor.channelId]).catch(() => null);
                    }
                }

                await this.removeVariantsFromAllCollections(ctx, variantIds);
                if (collectionIds.length > 0) {
                    await this.addVariantsToCollections(ctx, variantIds, collectionIds);
                }
            }
        }

        const finalProduct = await this.productService.findOne(ctx, id) as Product;
        this.eventBus.publish(new ProductEvent(ctx, finalProduct, 'updated', { id }));
        return finalProduct;
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async adminUpdateProductVariant(
        @Ctx() ctx: RequestContext,
        @Args('input') input: any,
    ): Promise<any> {
        const variant = await this.productVariantService.findOne(ctx, input.id);
        if (!variant) throw new Error('Product variant not found');

        // 1. Pre-validation checks (Price and SKU uniqueness)
        if (input.price !== undefined) {
            await this.validateMinimumPrice(ctx, input.price);
        }
        if (input.sku !== undefined) {
            await this.validateSkuUniqueness(ctx, input.sku, input.id);
        }

        const updateInput: any = {
            id: input.id,
        };
        
        if (input.price !== undefined) updateInput.price = input.price;
        if (input.stock !== undefined) updateInput.stockOnHand = input.stock;
        if (input.sku !== undefined) updateInput.sku = input.sku;

        if (input.onPromotion !== undefined || input.promotionalPrice !== undefined) {
            updateInput.customFields = {};
            if (input.onPromotion !== undefined) updateInput.customFields.onPromotion = input.onPromotion;
            if (input.promotionalPrice !== undefined) updateInput.customFields.promotionalPrice = input.promotionalPrice;
        }

        return this.connection.withTransaction(ctx, async (transactionalCtx: RequestContext) => {
            return this.productVariantService.update(transactionalCtx, [updateInput]).then(result => result[0]);
        });
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async adminReviewProduct(
        @Ctx() ctx: RequestContext,
        @Args('id') id: string,
        @Args('status') status: string,
        @Args('rejectionReason') rejectionReason?: string,
        @Args('convertToOfficialCatalog') convertToOfficialCatalog?: boolean,
        @Args('name') name?: string,
        @Args('slug') slug?: string,
        @Args('shortDescription') shortDescription?: string,
        @Args('description') description?: string,
        @Args('officialSku') officialSku?: string,
        @Args('ean') ean?: string,
        @Args('collectionIds') collectionIds?: string[],
        @Args('facetValueIds') facetValueIds?: string[],
        @Args('approveVendorOffer') approveVendorOffer?: boolean,
    ): Promise<Product> {
        const product = await this.productService.findOne(ctx, id, ['variants', 'customFields.vendor', 'translations']);
        if (!product) throw new Error('Product not found');

        const creatorVendor = (product.customFields as any)?.vendor;
        const isOfferApproved = approveVendorOffer !== false;
        const offerStatus = isOfferApproved ? 'approved' : 'pending';

        // Synchronize variants enabled state & offerStatus
        for (const v of product.variants || []) {
            await this.connection.rawConnection.query(
                `UPDATE product_variant SET enabled = $1, "customFieldsOfferstatus" = $2, "updatedAt" = NOW() WHERE id = $3`,
                [isOfferApproved, isOfferApproved ? 'APPROVED' : 'PENDING', v.id]
            );
        }

        // If converting to Official Ahizan Catalog:
        if (convertToOfficialCatalog) {
            if (creatorVendor) {
                const sellerOfferRepo = this.connection.getRepository(ctx, SellerOffer);
                for (const v of product.variants || []) {
                    let existingOffer = await sellerOfferRepo.findOne({
                        where: {
                            vendor: { id: creatorVendor.id },
                            productVariant: { id: v.id },
                        },
                    });
                    if (!existingOffer) {
                        existingOffer = sellerOfferRepo.create({
                            vendor: creatorVendor,
                            productVariant: v,
                            price: v.price || 0,
                            stock: ((v as any).stockOnHand || (v as any).stockLevel || 5),
                            sku: v.sku || null,
                            status: offerStatus,
                            condition: ProductCondition.NEW,
                            deliveryTimeUnit: DeliveryTimeUnit.DAYS,
                            deliveryTimeValue: 2,
                        });
                        await sellerOfferRepo.save(existingOffer);
                    } else {
                        existingOffer.status = offerStatus;
                        await sellerOfferRepo.save(existingOffer);
                    }
                }

                // Clear vendor on Product so it becomes an official central Ahizan catalog item
                await this.connection.rawConnection.query('UPDATE product SET "customFieldsVendorid" = NULL WHERE id = $1', [id]);
            }
        }

        const updateData: any = {
            id,
            enabled: status === 'approved',
            customFields: {
                approvalStatus: status,
                rejectionReason: status === 'rejected' ? (rejectionReason || 'Non conforme aux critères Ahizan') : null,
                ...(shortDescription !== undefined ? { shortDescription } : {}),
            }
        };

        if (facetValueIds && facetValueIds.length > 0) {
            updateData.facetValueIds = facetValueIds;
        }

        if ((name && name.trim()) || (description && description.trim()) || (slug && slug.trim()) || (shortDescription && shortDescription.trim())) {
            const existingTranslation = product.translations?.find(t => t.languageCode === ctx.languageCode);
            const targetName = (name && name.trim()) || existingTranslation?.name || (product as any).name || 'Produit';
            const targetSlug = (slug && slug.trim()) || (name && name.trim() ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : (existingTranslation?.slug || (product as any).slug || 'produit'));
            const targetDescription = (description !== undefined && description !== null && description.trim() !== '') ? description : (existingTranslation?.description || (product as any).description || '');

            updateData.translations = [{
                languageCode: ctx.languageCode,
                ...(existingTranslation ? { id: existingTranslation.id as string } : {}),
                name: targetName,
                slug: targetSlug,
                description: targetDescription,
                customFields: {
                    ...(shortDescription !== undefined ? { shortDescription } : {}),
                }
            }];
        }

        const updated = await this.productService.update(ctx, updateData);

        if (officialSku) {
            await this.connection.rawConnection.query('UPDATE product_variant SET sku = $1 WHERE "productId" = $2', [officialSku, id]);
        }
        if (ean) {
            await this.connection.rawConnection.query('UPDATE product_variant SET "customFieldsEan" = $1 WHERE "productId" = $2', [ean, id]);
        }

        if (collectionIds && collectionIds.length > 0 && product.variants && product.variants.length > 0) {
            const variantIds = product.variants.map(v => String(v.id));
            await this.addVariantsToCollections(ctx, variantIds, collectionIds).catch(() => null);
        }

        const finalProduct = await this.productService.findOne(ctx, id) as Product;
        this.eventBus.publish(new ProductEvent(ctx, finalProduct, 'updated', { id }));
        return finalProduct;
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async adminReviewSellerOffer(
        @Ctx() ctx: RequestContext,
        @Args('id') id: string,
        @Args('status') status: string,
        @Args('rejectionReason') rejectionReason?: string,
    ): Promise<SellerOffer> {
        const offer = await this.connection.getRepository(ctx, SellerOffer).findOne({
            where: { id },
            relations: ['vendor', 'productVariant'],
        });
        if (!offer) throw new Error('Offre vendeur introuvable');
        
        offer.status = status;
        if (status === 'rejected' || status === 'correction_requested') {
            offer.rejectionReason = rejectionReason || 'Correction demandée par l\'administrateur';
        } else if (rejectionReason) {
            offer.rejectionReason = rejectionReason;
        } else {
            offer.rejectionReason = null;
        }

        const savedOffer = await this.connection.getRepository(ctx, SellerOffer).save(offer);

        // Synchronize underlying ProductVariant enabled state and offerStatus
        if (offer.productVariant?.id) {
            const isApproved = status === 'approved';
            await this.connection.rawConnection.query(
                `UPDATE product_variant SET enabled = $1, "customFieldsOfferstatus" = $2, "updatedAt" = NOW() WHERE id = $3`,
                [isApproved, isApproved ? 'APPROVED' : (status === 'rejected' ? 'REJECTED' : 'PENDING'), offer.productVariant.id]
            );
        }

        return savedOffer;
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async reassignVariantToProduct(
        @Ctx() ctx: RequestContext,
        @Args('variantId') variantId: string,
        @Args('targetProductId') targetProductId: string,
        @Args('approveOffer') approveOffer?: boolean,
    ): Promise<ProductVariant> {
        return this.vendorService.reassignVariantToProduct(ctx, variantId, targetProductId, approveOffer);
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async createOfficialProductFromVariant(
        @Ctx() ctx: RequestContext,
        @Args('variantId') variantId: string,
        @Args('name') name: string,
        @Args('slug') slug?: string,
        @Args('shortDescription') shortDescription?: string,
        @Args('description') description?: string,
        @Args('officialSku') officialSku?: string,
        @Args('ean') ean?: string,
        @Args('collectionIds') collectionIds?: string[],
        @Args('facetValueIds') facetValueIds?: string[],
        @Args('approveOffer') approveOffer?: boolean,
    ): Promise<Product> {
        return this.vendorService.createOfficialProductFromVariant(ctx, {
            variantId,
            name,
            slug,
            shortDescription,
            description,
            officialSku,
            ean,
            collectionIds,
            facetValueIds,
            approveOffer,
        });
    }

    /**
     * Enforce SKU uniqueness before database write
     */
    private async validateSkuUniqueness(ctx: RequestContext, sku?: string, excludeVariantId?: any): Promise<void> {
        if (!sku) return;
        const qb = this.connection.getRepository(ctx, ProductVariant)
            .createQueryBuilder('pv')
            .where('pv.sku = :sku', { sku });
        if (excludeVariantId) {
            qb.andWhere('pv.id != :id', { id: excludeVariantId });
        }
        const existing = await qb.getOne();
        if (existing) {
            throw new Error(`Le SKU "${sku}" est déjà utilisé par un autre produit.`);
        }
    }

    /**
     * Enforce minimum marketplace price on a price value
     */
    private async validateMinimumPrice(ctx: RequestContext, price?: number): Promise<void> {
        const globalSettings = await this.globalSettingsService.getSettings(ctx);
        const minPrice = (globalSettings.customFields as any)?.minimumMarketplacePrice || 0;
        if (price !== undefined && price !== null && price < minPrice) {
            throw new Error(`Le prix du produit doit être au minimum de ${minPrice}`);
        }
    }
}
