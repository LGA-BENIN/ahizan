import { Allow, Ctx, Permission, RequestContext, PaginatedList, Product, ProductService, OrderService, Order, OrderStateTransitionError, AssetService, Asset, TransactionalConnection, Transaction, ProductVariantService, SearchService, GlobalSettingsService, EventBus, ProductEvent, Collection, ProductVariant, ChannelService, ProductOptionGroupService, ProductOptionService } from '@vendure/core';
import { In, Not } from 'typeorm';
import { Args, Mutation, Query, Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { VendorService } from '../service/vendor.service';
import { Vendor, VendorStatus } from '../entities/vendor.entity';
import { SellerOffer, ProductCondition, DeliveryTimeUnit } from '../entities/seller-offer.entity';
import { SellerOfferService } from '../service/seller-offer.service';
import { OrderStatusService } from '../service/order-status.service';
import { LikeService } from '../service/like.service';
import { GeoZone } from '../../geo-engine/entities/geo-zone.entity';
import { Market } from '../../geo-engine/entities/market.entity';
import { GeoService } from '../../geo-engine/service/geo.service';
import { MultivendorPlugin } from '../multivendor.plugin';
import { NotificationsService } from '../../notifications/notifications.service';
import { BrevoSmsService } from '../../notifications/brevo-sms.service';

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
        private channelService: ChannelService,
        private productService: ProductService,
        private eventBus: EventBus,
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
            // Raw DB check
            const rawCheck = await (this.vendorService as any).connection.rawConnection.query(`
                SELECT ol.id 
                FROM "order" o
                LEFT JOIN order_line ol ON ol."orderId" = o.id
                LEFT JOIN product_variant pv ON ol."productVariantId" = pv.id
                LEFT JOIN product p ON pv."productId" = p.id
                WHERE o.id = $1::int AND (COALESCE(ol."customFieldsAssignedvendorid", p."customFieldsVendorid") = $2::int OR o."customFieldsVendorid" = $2::int)
                LIMIT 1
            `, [Number(orderId), Number(vendor.id)]);
            if (rawCheck && rawCheck.length > 0) {
                isVendorOrder = true;
            }
        }

        if (!isVendorOrder) {
            throw new Error('You do not have permission to update this order');
        }

        // Must be a valid seller state
        const validStatuses = [
            'pending',
            'confirmed',
            'approved',
            'ready_for_pickup',
            'refused',
            'rejected',
            'reassigning',
            'reassigned_to_other',
            'cancelled'
        ];
        if (!validStatuses.includes(statusCode)) {
            throw new Error('Invalid seller status');
        }

        const normalizedStatus = statusCode === 'approved' ? 'confirmed' : statusCode === 'rejected' ? 'refused' : statusCode;

        return this.vendorService.updateVendorOrderStatus(
            ctx,
            orderId,
            String(vendor.id),
            'sellerStatus',
            normalizedStatus
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
        const validStatuses = [
            'pending',
            'confirmed',
            'approved',
            'ready_for_pickup',
            'refused',
            'rejected',
            'reassigning',
            'reassigned_to_other',
            'cancelled'
        ];
        if (!validStatuses.includes(statusCode)) {
            throw new Error('Invalid seller status');
        }

        const normalizedStatus = statusCode === 'approved' ? 'confirmed' : statusCode === 'rejected' ? 'refused' : statusCode;

        return this.vendorService.updateVendorOrderLineStatus(
            ctx, 
            lineId, 
            String(vendor.id), 
            normalizedStatus
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
        private sellerOfferService: SellerOfferService,
        private notificationsService: NotificationsService,
        private smsService: BrevoSmsService,
        private assetService: AssetService,
    ) {
        console.log('VendorAdminResolver initialized with ProductService, GeoService and AssetService');
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

    @Mutation()
    @Allow(Permission.Authenticated)
    async deleteMyVendorOrder(
        @Ctx() ctx: RequestContext,
        @Args('orderId') orderId: string
    ): Promise<boolean> {
        return this.vendorService.deleteOrderAdmin(ctx, orderId);
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

            // Create SellerOffer for vendor on the newly created variant
            await this.sellerOfferService.createOrUpdateOffer(transactionalCtx, vendor, String(variant.id), {
                price: input.price,
                stock: input.stock,
                sku: variantInput.sku,
                onPromotion: input.onPromotion,
                promotionalPrice: input.promotionalPrice,
                status: 'approved',
            });

            // Ensure Product has vendor = null so it belongs to official Ahizan platform catalog
            await this.connection.rawConnection.query('UPDATE product SET "customFieldsVendorid" = NULL WHERE id = $1', [product.id]);

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

        if (name !== undefined) {
            try {
                await this.vendorService.synchronizeAllVariantNamesForProduct(ctx, id);
            } catch (syncNameErr: any) {
                console.error('[adminUpdateProduct] Error synchronizing variant names:', syncNameErr?.message || syncNameErr);
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
        @Args('optionGroups') optionGroups?: Array<{ name: string; values: string[] }>,
        @Args('variantsMatrix') variantsMatrix?: Array<{ name: string; optionValues?: string[]; isCurrentSellerVariant?: boolean; suggestedSku?: string; suggestedPriceFcfa?: number; stockOnHand?: number; colorHex?: string }>,
        @Args('selectedImages') selectedImages?: Array<{ url: string; isPrimary?: boolean; label?: string }>,
    ): Promise<Product> {
        // Ensure any active variants attached to this product are restored (un-deleted)
        await this.connection.rawConnection.query(
            `UPDATE product_variant SET "deletedAt" = NULL WHERE "productId" = $1 AND "deletedAt" IS NOT NULL`,
            [id]
        );

        const product = await this.productService.findOne(ctx, id, ['variants', 'customFields.vendor', 'translations']);
        if (!product) {
            throw new Error(`Product with id ${id} not found`);
        }
        let creatorVendor = (product.customFields as any)?.vendor;
        if (!creatorVendor) {
            // Fallback: check if there is an existing seller_offer with a vendor attached to this product's variants
            const existingOfferVendor = await this.connection.rawConnection.query(
                `SELECT v.id, v.name FROM seller_offer so
                 INNER JOIN product_variant pv ON so."productVariantId" = pv.id
                 INNER JOIN vendor v ON so."vendorId" = v.id
                 WHERE pv."productId" = $1
                 ORDER BY so.id DESC LIMIT 1`,
                [id]
            );
            if (existingOfferVendor && existingOfferVendor.length > 0) {
                creatorVendor = existingOfferVendor[0];
            }
        }

        const isOfferApproved = approveVendorOffer === true;
        const offerStatus = isOfferApproved ? 'approved' : 'pending';

        // Synchronize variants enabled state & offerStatus based on approved offers
        const allCurrentVars = await this.connection.rawConnection.query(
            `SELECT id FROM product_variant WHERE "productId" = $1 AND "deletedAt" IS NULL`,
            [id]
        );
        for (const v of allCurrentVars) {
            const approvedOffersRes = await this.connection.rawConnection.query(
                `SELECT COUNT(*) as count FROM seller_offer WHERE "productVariantId" = $1 AND status = 'approved'`,
                [v.id]
            );
            const hasApprovedOffers = isOfferApproved || parseInt(approvedOffersRes[0]?.count || '0', 10) > 0;
            const shouldEnable = status === 'approved' || status === 'published' || convertToOfficialCatalog === true;
            await this.connection.rawConnection.query(
                `UPDATE product_variant SET enabled = $1, "customFieldsOfferstatus" = $2, "updatedAt" = NOW() WHERE id = $3`,
                [shouldEnable, (hasApprovedOffers || shouldEnable) ? 'APPROVED' : (status === 'rejected' ? 'REJECTED' : 'PENDING'), v.id]
            );
        }

        // Ensure SellerOffer records exist for creatorVendor
        if (creatorVendor && (status === 'approved' || status === 'published' || convertToOfficialCatalog)) {
            const sellerOfferRepo = this.connection.getRepository(ctx, SellerOffer);
            for (const v of product.variants || []) {
                // Fetch real price & stock from database
                const priceRow = await this.connection.rawConnection.query(
                    `SELECT price FROM product_variant_price WHERE "variantId" = $1 AND "currencyCode" = 'XOF' ORDER BY id DESC LIMIT 1`,
                    [v.id]
                );
                const stockRow = await this.connection.rawConnection.query(
                    `SELECT "stockOnHand" FROM stock_level WHERE "productVariantId" = $1 LIMIT 1`,
                    [v.id]
                );
                const realPrice = priceRow[0]?.price || 0;
                const realStock = stockRow[0]?.stockOnHand || 5;

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
                        price: realPrice,
                        stock: realStock,
                        sku: v.sku || null,
                        status: offerStatus,
                        rejectionReason: null,
                        condition: ProductCondition.NEW,
                        deliveryTimeUnit: DeliveryTimeUnit.DAYS,
                        deliveryTimeValue: 2,
                    });
                    await sellerOfferRepo.save(existingOffer);
                } else {
                    existingOffer.status = offerStatus;
                    if (isOfferApproved) existingOffer.rejectionReason = null;
                    if (!existingOffer.price || existingOffer.price === 0) {
                        existingOffer.price = realPrice;
                    }
                    if (!existingOffer.stock || existingOffer.stock === 0) {
                        existingOffer.stock = realStock;
                    }
                    await sellerOfferRepo.save(existingOffer);
                }
            }

            if (status === 'approved' || convertToOfficialCatalog) {
                // Clear vendor on Product so it becomes an official central Ahizan catalog item
                await this.connection.rawConnection.query('UPDATE product SET "customFieldsVendorid" = NULL WHERE id = $1', [id]);
            }

            // Run global full search sync after a delay so we rebuild AFTER Vendure's own
            // native indexer has had a chance to run (and potentially corrupt Channel 1).
            // This ensures ALL products remain visible in the collection page.
            setTimeout(async () => {
                try {
                    await MultivendorPlugin.runFullSearchSync(this.connection);
                    console.log('[adminReviewProduct] Global Channel 1 search sync completed for product', id);
                } catch (syncErr: any) {
                    console.error('[adminReviewProduct] Global sync error:', syncErr?.message);
                }
            }, 3000);
        }

        // Only when explicitly approving vendor offers, ensure seller offers are marked approved
        if (isOfferApproved && (status === 'approved' || status === 'published' || convertToOfficialCatalog)) {
            await this.connection.rawConnection.query(
                `UPDATE seller_offer SET status = 'approved', "rejectionReason" = NULL, "updatedAt" = NOW()
                 WHERE "productVariantId" IN (SELECT id FROM product_variant WHERE "productId" = $1)
                 AND status = 'pending'`,
                [id]
            );

            // Repair any 0-price offers from product_variant_price
            await this.connection.rawConnection.query(
                `UPDATE seller_offer so
                 SET price = pvp.price, "updatedAt" = NOW()
                 FROM product_variant_price pvp
                 WHERE so."productVariantId" = pvp."variantId"
                 AND so."productVariantId" IN (SELECT id FROM product_variant WHERE "productId" = $1)
                 AND (so.price = 0 OR so.price IS NULL)
                 AND pvp.price > 0`,
                [id]
            );
        }

        // Process and persist selected images into Vendure Assets table and links
        let resolvedPrimaryAssetId: string | null = null;
        if (selectedImages && selectedImages.length > 0) {
            try {
                for (let idx = 0; idx < selectedImages.length; idx++) {
                    const imgItem = selectedImages[idx];
                    if (!imgItem || !imgItem.url) continue;
                    const targetUrl = imgItem.url.trim();
                    if (!targetUrl) continue;

                    let assetId: string | null = null;

                    // 1. Check if it's already an existing Asset ID
                    if (/^\d+$/.test(targetUrl)) {
                        const ex = await this.connection.rawConnection.query(`SELECT id FROM asset WHERE id = $1 LIMIT 1`, [parseInt(targetUrl, 10)]);
                        if (ex.length > 0) assetId = ex[0].id.toString();
                    } else if (targetUrl.startsWith('/assets/') || targetUrl.includes('/assets/preview/') || targetUrl.includes('/assets/source/')) {
                        const cleanPath = targetUrl.startsWith('http') ? targetUrl.replace(/^https?:\/\/[^/]+/, '') : targetUrl;
                        const ex = await this.connection.rawConnection.query(`SELECT id FROM asset WHERE preview = $1 OR source = $1 LIMIT 1`, [cleanPath]);
                        if (ex.length > 0) assetId = ex[0].id.toString();
                    }

                    // 2. If it's a remote URL (HTTP/HTTPS), download and create Vendure Asset
                    if (!assetId && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://'))) {
                        try {
                            console.log(`[adminReviewProduct] Ingesting official image asset from ${targetUrl}...`);
                            const fetchRes = await fetch(targetUrl, {
                                headers: { 'User-Agent': 'Mozilla/5.0 AhizanBot/1.0' },
                                signal: AbortSignal.timeout(12000),
                            });
                            if (fetchRes.ok) {
                                const arrayBuffer = await fetchRes.arrayBuffer();
                                const buffer = Buffer.from(arrayBuffer);
                                let fileName = targetUrl.split('/').pop()?.split('?')[0] || `product-${id}-${idx + 1}.jpg`;
                                if (!/\.(jpg|jpeg|png|webp|gif)$/i.test(fileName)) {
                                    fileName = `${fileName}.jpg`;
                                }
                                const contentType = fetchRes.headers.get('content-type') || 'image/jpeg';
                                const { Readable } = require('stream');
                                const file = {
                                    filename: fileName,
                                    mimetype: contentType,
                                    buffer,
                                    createReadStream: () => Readable.from(buffer),
                                } as any;

                                const createdAsset = await this.assetService.create(ctx, {
                                    file,
                                    tags: ['official-catalog', 'ai-packshot'],
                                });

                                if (createdAsset && !(createdAsset as any).errorCode && (createdAsset as any).id) {
                                    assetId = (createdAsset as any).id.toString();
                                    console.log(`[adminReviewProduct] Ingested Asset #${assetId} for Product #${id}`);
                                } else {
                                    console.error(`[adminReviewProduct] Asset creation failed:`, (createdAsset as any)?.message);
                                }
                            } else {
                                console.warn(`[adminReviewProduct] Failed to fetch image: HTTP ${fetchRes.status}`);
                            }
                        } catch (dlErr: any) {
                            console.error(`[adminReviewProduct] Error downloading image ${targetUrl}:`, dlErr?.message || dlErr);
                        }
                    }

                    if (assetId) {
                        // Link Asset to Default Channel 1
                        await this.connection.rawConnection.query(
                            `INSERT INTO asset_channels_channel ("assetId", "channelId") VALUES ($1, '1') ON CONFLICT DO NOTHING`,
                            [assetId]
                        );
                        // Link Asset to Product in product_asset
                        await this.connection.rawConnection.query(
                            `INSERT INTO product_asset ("productId", "assetId", position, "createdAt", "updatedAt")
                             VALUES ($1, $2, $3, NOW(), NOW()) ON CONFLICT DO NOTHING`,
                            [id, assetId, idx]
                        );

                        if (imgItem.isPrimary || idx === 0 || !resolvedPrimaryAssetId) {
                            resolvedPrimaryAssetId = assetId;
                        }
                    }
                }

                if (resolvedPrimaryAssetId) {
                    await this.connection.rawConnection.query(
                        `UPDATE product SET "featuredAssetId" = $1 WHERE id = $2`,
                        [resolvedPrimaryAssetId, id]
                    );
                    await this.connection.rawConnection.query(
                        `UPDATE product_variant SET "featuredAssetId" = $1 WHERE "productId" = $2 AND ("featuredAssetId" IS NULL OR "featuredAssetId" = 0)`,
                        [resolvedPrimaryAssetId, id]
                    );
                }
            } catch (imgSyncErr: any) {
                console.error('[adminReviewProduct] Error ingesting product images:', imgSyncErr?.message || imgSyncErr);
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

        // Persist Option Groups and Product Variants Matrix if provided
        if ((optionGroups && optionGroups.length > 0) || (variantsMatrix && variantsMatrix.length > 0)) {
            try {
                const optionGroupMap = new Map<string, string>(); // groupName.toLowerCase() -> groupId
                const optionValueMap = new Map<string, string>(); // `${groupName}:${valName}`.toLowerCase() -> optionId

                for (const og of optionGroups || []) {
                    if (!og.name || !og.name.trim()) continue;
                    const gName = og.name.trim();
                    const gCode = gName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

                    let groupId: string | null = null;
                    const existingG = await this.connection.rawConnection.query(
                        `SELECT id FROM product_option_group WHERE code = $1 LIMIT 1`,
                        [gCode]
                    );
                    if (existingG.length > 0) {
                        groupId = existingG[0].id.toString();
                    } else {
                        const insertedG = await this.connection.rawConnection.query(
                            `INSERT INTO product_option_group (code, "createdAt", "updatedAt") VALUES ($1, NOW(), NOW()) RETURNING id`,
                            [gCode]
                        );
                        groupId = insertedG[0].id.toString();
                        await this.connection.rawConnection.query(
                            `INSERT INTO product_option_group_translation ("baseId", "languageCode", name, "createdAt", "updatedAt") VALUES ($1, $2, $3, NOW(), NOW())`,
                            [groupId, ctx.languageCode || 'fr', gName]
                        );
                    }

                    if (groupId) {
                        optionGroupMap.set(gName.toLowerCase(), groupId);
                        // Link option group to Default Channel (Channel 1)
                        await this.connection.rawConnection.query(
                            `INSERT INTO product_option_group_channels_channel ("productOptionGroupId", "channelId") VALUES ($1, '1') ON CONFLICT DO NOTHING`,
                            [groupId]
                        );
                        // Link option group to Product
                        await this.connection.rawConnection.query(
                            `INSERT INTO product_option_groups_product_option_group ("productId", "productOptionGroupId") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                            [id, groupId]
                        );

                        // Process option values
                        for (const val of og.values || []) {
                            if (!val || !val.trim()) continue;
                            const vName = val.trim();
                            const vCode = `${gCode}-${vName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;

                            let optId: string | null = null;
                            const existingOpt = await this.connection.rawConnection.query(
                                `SELECT id FROM product_option WHERE "groupId" = $1 AND code = $2 LIMIT 1`,
                                [groupId, vCode]
                            );
                            if (existingOpt.length > 0) {
                                optId = existingOpt[0].id.toString();
                            } else {
                                const insertedOpt = await this.connection.rawConnection.query(
                                    `INSERT INTO product_option ("groupId", code, "createdAt", "updatedAt") VALUES ($1, $2, NOW(), NOW()) RETURNING id`,
                                    [groupId, vCode]
                                );
                                optId = insertedOpt[0].id.toString();
                                await this.connection.rawConnection.query(
                                    `INSERT INTO product_option_translation ("baseId", "languageCode", name, "createdAt", "updatedAt") VALUES ($1, $2, $3, NOW(), NOW())`,
                                    [optId, ctx.languageCode || 'fr', vName]
                                );
                            }

                            if (optId) {
                                optionValueMap.set(`${gName}:${vName}`.toLowerCase(), optId);
                                optionValueMap.set(vName.toLowerCase(), optId);
                                // Link option to Channel 1
                                await this.connection.rawConnection.query(
                                    `INSERT INTO product_option_channels_channel ("productOptionId", "channelId") VALUES ($1, '1') ON CONFLICT DO NOTHING`,
                                    [optId]
                                );
                            }
                        }
                    }
                }

                // Process Variants Matrix
                const existingVariants = await this.connection.rawConnection.query(
                    `SELECT id, sku, enabled FROM product_variant WHERE "productId" = $1 AND "deletedAt" IS NULL ORDER BY id ASC`,
                    [id]
                );
                const primaryVariant = existingVariants[0];

                let primaryPrice = 0;
                if (primaryVariant) {
                    const priceRes = await this.connection.rawConnection.query(
                        `SELECT price FROM product_variant_price WHERE "variantId" = $1 ORDER BY id DESC LIMIT 1`,
                        [primaryVariant.id]
                    );
                    primaryPrice = priceRes[0]?.price || 0;
                }

                for (let i = 0; i < (variantsMatrix || []).length; i++) {
                    const vMat = variantsMatrix![i];
                    const isSellerCurrent = vMat.isCurrentSellerVariant || (i === 0 && !variantsMatrix?.some(v => v.isCurrentSellerVariant));
                    const sku = vMat.suggestedSku || `AHZ-${id}-${i + 1}`;
                    const price = (vMat.suggestedPriceFcfa && vMat.suggestedPriceFcfa > 0) ? vMat.suggestedPriceFcfa : primaryPrice;
                    const stock = vMat.stockOnHand || 5;

                    // Collect option IDs for this variant with fuzzy + database fallback
                    const targetOptionIds: string[] = [];
                    for (const rawVal of vMat.optionValues || []) {
                        if (!rawVal) continue;
                        const valStr = String(rawVal).trim();
                        const cleanVal = valStr.replace(/^[^:]+:\s*/, '').trim();

                        let optId = optionValueMap.get(cleanVal.toLowerCase()) || optionValueMap.get(valStr.toLowerCase());

                        if (!optId) {
                            const dbOpt = await this.connection.rawConnection.query(
                                `SELECT po.id FROM product_option po
                                 JOIN product_option_translation pot ON pot."baseId" = po.id
                                 WHERE LOWER(pot.name) = LOWER($1) OR LOWER(po.code) = LOWER($2)
                                 LIMIT 1`,
                                [cleanVal, cleanVal.toLowerCase().replace(/[^a-z0-9]+/g, '-')]
                            );
                            if (dbOpt.length > 0 && dbOpt[0].id) {
                                const resolvedId = dbOpt[0].id.toString();
                                optId = resolvedId;
                                optionValueMap.set(cleanVal.toLowerCase(), resolvedId);
                            }
                        }

                        if (optId && !targetOptionIds.includes(optId)) {
                            targetOptionIds.push(optId);

                            // Ensure option group is linked to product and Channel 1
                            const grpRes = await this.connection.rawConnection.query(
                                `SELECT "groupId" FROM product_option WHERE id = $1`,
                                [optId]
                            );
                            if (grpRes.length > 0) {
                                const grpId = grpRes[0].groupId;
                                await this.connection.rawConnection.query(
                                    `INSERT INTO product_option_groups_product_option_group ("productId", "productOptionGroupId") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                                    [id, grpId]
                                );
                                await this.connection.rawConnection.query(
                                    `INSERT INTO product_option_group_channels_channel ("productOptionGroupId", "channelId") VALUES ($1, '1') ON CONFLICT DO NOTHING`,
                                    [grpId]
                                );
                            }
                        }
                    }

                    if (isSellerCurrent && primaryVariant) {
                        // Update primary variant
                        await this.connection.rawConnection.query(
                            `UPDATE product_variant SET sku = COALESCE($1, sku), enabled = true, "updatedAt" = NOW() WHERE id = $2`,
                            [sku, primaryVariant.id]
                        );

                        if (price && price > 0) {
                            const exPrice = await this.connection.rawConnection.query(
                                `SELECT id FROM product_variant_price WHERE "variantId" = $1 LIMIT 1`,
                                [primaryVariant.id]
                            );
                            if (exPrice.length > 0) {
                                await this.connection.rawConnection.query(
                                    `UPDATE product_variant_price SET price = $1, "currencyCode" = 'XOF', "updatedAt" = NOW() WHERE id = $2`,
                                    [price, exPrice[0].id]
                                );
                            } else {
                                await this.connection.rawConnection.query(
                                    `INSERT INTO product_variant_price ("variantId", "channelId", "currencyCode", price, "createdAt", "updatedAt")
                                     VALUES ($1, '1', 'XOF', $2, NOW(), NOW())`,
                                    [primaryVariant.id, price]
                                );
                            }

                            // Keep existing seller offers synced with non-zero price
                            await this.connection.rawConnection.query(
                                `UPDATE seller_offer SET price = $1, "updatedAt" = NOW() WHERE "productVariantId" = $2 AND (price = 0 OR price IS NULL)`,
                                [price, primaryVariant.id]
                            );
                        }

                        // Update translation
                        await this.connection.rawConnection.query(
                            `UPDATE product_variant_translation SET name = $1 WHERE "baseId" = $2 AND "languageCode" = $3`,
                            [vMat.name || `${name || 'Produit'} – Standard`, primaryVariant.id, ctx.languageCode || 'fr']
                        );
                        // Link options
                        for (const optId of targetOptionIds) {
                            await this.connection.rawConnection.query(
                                `INSERT INTO product_variant_options_product_option ("productVariantId", "productOptionId") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                                [primaryVariant.id, optId]
                            );
                        }

                        if (resolvedPrimaryAssetId) {
                            await this.connection.rawConnection.query(
                                `UPDATE product_variant SET "featuredAssetId" = $1 WHERE id = $2 AND ("featuredAssetId" IS NULL OR "featuredAssetId" = 0)`,
                                [resolvedPrimaryAssetId, primaryVariant.id]
                            );
                        }

                        if (creatorVendor) {
                            try {
                                const sellerOfferRepo = this.connection.getRepository(ctx, SellerOffer);
                                let existingOffer = await sellerOfferRepo.findOne({
                                    where: {
                                        vendor: { id: creatorVendor.id },
                                        productVariant: { id: primaryVariant.id },
                                    },
                                });
                                if (!existingOffer) {
                                    existingOffer = sellerOfferRepo.create({
                                        vendor: creatorVendor,
                                        productVariant: primaryVariant,
                                        price: price || primaryPrice || 0,
                                        stock: stock || 5,
                                        sku: sku || primaryVariant.sku || null,
                                        status: offerStatus,
                                        rejectionReason: null,
                                        condition: ProductCondition.NEW,
                                        deliveryTimeUnit: DeliveryTimeUnit.DAYS,
                                        deliveryTimeValue: 2,
                                    });
                                    await sellerOfferRepo.save(existingOffer);
                                } else {
                                    if (price && price > 0) existingOffer.price = price;
                                    if (stock && stock > 0) existingOffer.stock = stock;
                                    existingOffer.status = offerStatus;
                                    if (isOfferApproved) existingOffer.rejectionReason = null;
                                    await sellerOfferRepo.save(existingOffer);
                                }
                            } catch (soErr: any) {
                                console.error('[adminReviewProduct] Error updating seller offer for primary variant:', soErr?.message);
                            }
                        }
                    } else {
                        // Check if sister variant already exists
                        const existingSister = await this.connection.rawConnection.query(
                            `SELECT id FROM product_variant WHERE "productId" = $1 AND "deletedAt" IS NULL AND (sku = $2 OR id IN (
                                SELECT "baseId" FROM product_variant_translation WHERE name = $3
                            )) LIMIT 1`,
                            [id, sku, vMat.name]
                        );

                        let sisterVariantId: string;
                        if (existingSister.length > 0) {
                            sisterVariantId = existingSister[0].id.toString();
                            await this.connection.rawConnection.query(
                                `UPDATE product_variant SET sku = $1, enabled = true, "updatedAt" = NOW() WHERE id = $2`,
                                [sku, sisterVariantId]
                            );
                            if (price && price > 0) {
                                const exPrice = await this.connection.rawConnection.query(
                                    `SELECT id FROM product_variant_price WHERE "variantId" = $1 LIMIT 1`,
                                    [sisterVariantId]
                                );
                                if (exPrice.length > 0) {
                                    await this.connection.rawConnection.query(
                                        `UPDATE product_variant_price SET price = $1, "currencyCode" = 'XOF', "updatedAt" = NOW() WHERE id = $2`,
                                        [price, exPrice[0].id]
                                    );
                                } else {
                                    await this.connection.rawConnection.query(
                                        `INSERT INTO product_variant_price ("variantId", "channelId", "currencyCode", price, "createdAt", "updatedAt")
                                         VALUES ($1, '1', 'XOF', $2, NOW(), NOW())`,
                                        [sisterVariantId, price]
                                    );
                                }
                            }
                        } else {
                            // Resolve tax category dynamically
                            const taxCatRes = await this.connection.rawConnection.query(`SELECT id FROM tax_category LIMIT 1`);
                            const taxCatId = taxCatRes[0]?.id || 1;

                            // Create new official sister variant
                            const insertedVar = await this.connection.rawConnection.query(
                                `INSERT INTO product_variant ("productId", sku, enabled, "taxCategoryId", "customFieldsOfferstatus", "trackInventory", "createdAt", "updatedAt")
                                 VALUES ($1, $2, true, $3, 'PENDING', 'INHERIT', NOW(), NOW()) RETURNING id`,
                                [id, sku, taxCatId]
                            );
                            sisterVariantId = insertedVar[0].id.toString();

                            // Upsert translation
                            const lang = ctx.languageCode || 'fr';
                            const transName = vMat.name || `${name || 'Produit'} – Variante`;
                            const exTrans = await this.connection.rawConnection.query(
                                `SELECT id FROM product_variant_translation WHERE "baseId" = $1 AND "languageCode" = $2 LIMIT 1`,
                                [sisterVariantId, lang]
                            );
                            if (exTrans.length > 0) {
                                await this.connection.rawConnection.query(
                                    `UPDATE product_variant_translation SET name = $1, "updatedAt" = NOW() WHERE id = $2`,
                                    [transName, exTrans[0].id]
                                );
                            } else {
                                await this.connection.rawConnection.query(
                                    `INSERT INTO product_variant_translation ("baseId", "languageCode", name, "createdAt", "updatedAt")
                                     VALUES ($1, $2, $3, NOW(), NOW())`,
                                    [sisterVariantId, lang, transName]
                                );
                            }

                            // Channel 1 assignment
                            await this.connection.rawConnection.query(
                                `INSERT INTO product_variant_channels_channel ("productVariantId", "channelId") VALUES ($1, '1') ON CONFLICT DO NOTHING`,
                                [sisterVariantId]
                            );
                            if (creatorVendor?.channelId) {
                                await this.connection.rawConnection.query(
                                    `INSERT INTO product_variant_channels_channel ("productVariantId", "channelId") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                                    [sisterVariantId, creatorVendor.channelId.toString()]
                                );
                            }

                            // Price record
                            await this.connection.rawConnection.query(
                                `INSERT INTO product_variant_price ("variantId", "channelId", "currencyCode", price, "createdAt", "updatedAt")
                                 VALUES ($1, '1', 'XOF', $2, NOW(), NOW())`,
                                [sisterVariantId, price || 0]
                            );

                            // Stock level record
                            const stockLocationRes = await this.connection.rawConnection.query(`SELECT id FROM stock_location LIMIT 1`);
                            const stockLocId = stockLocationRes[0]?.id || 1;
                            await this.connection.rawConnection.query(
                                `INSERT INTO stock_level ("productVariantId", "stockLocationId", "stockOnHand", "stockAllocated", "createdAt", "updatedAt")
                                 VALUES ($1, $2, $3, 0, NOW(), NOW()) ON CONFLICT DO NOTHING`,
                                [sisterVariantId, stockLocId, stock]
                            );

                            // Inherit collections from existing primary variant
                            await this.connection.rawConnection.query(
                                `INSERT INTO collection_product_variants_product_variant ("collectionId", "productVariantId")
                                 SELECT DISTINCT "collectionId", $1 FROM collection_product_variants_product_variant WHERE "productVariantId" = $2
                                 ON CONFLICT DO NOTHING`,
                                [sisterVariantId, primaryVariant?.id || sisterVariantId]
                            );

                            console.log(`[adminReviewProduct] Created sister variant #${sisterVariantId} (${transName}) for product #${id}`);
                        }

                        // Link options to sister variant
                        for (const optId of targetOptionIds) {
                            await this.connection.rawConnection.query(
                                `INSERT INTO product_variant_options_product_option ("productVariantId", "productOptionId") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                                [sisterVariantId, optId]
                            );
                        }

                        if (resolvedPrimaryAssetId) {
                            await this.connection.rawConnection.query(
                                `UPDATE product_variant SET "featuredAssetId" = $1 WHERE id = $2 AND ("featuredAssetId" IS NULL OR "featuredAssetId" = 0)`,
                                [resolvedPrimaryAssetId, sisterVariantId]
                            );
                        }

                        if (creatorVendor && vMat.isCurrentSellerVariant) {
                            try {
                                const sellerOfferRepo = this.connection.getRepository(ctx, SellerOffer);
                                let existingOffer = await sellerOfferRepo.findOne({
                                    where: {
                                        vendor: { id: creatorVendor.id },
                                        productVariant: { id: sisterVariantId },
                                    },
                                });
                                if (!existingOffer) {
                                    existingOffer = sellerOfferRepo.create({
                                        vendor: creatorVendor,
                                        productVariant: { id: sisterVariantId } as any,
                                        price: price || primaryPrice || 0,
                                        stock: stock || 5,
                                        sku: sku || null,
                                        status: offerStatus,
                                        rejectionReason: null,
                                        condition: ProductCondition.NEW,
                                        deliveryTimeUnit: DeliveryTimeUnit.DAYS,
                                        deliveryTimeValue: 2,
                                    });
                                    await sellerOfferRepo.save(existingOffer);
                                } else {
                                    if (price && price > 0) existingOffer.price = price;
                                    if (stock && stock > 0) existingOffer.stock = stock;
                                    existingOffer.status = offerStatus;
                                    if (isOfferApproved) existingOffer.rejectionReason = null;
                                    await sellerOfferRepo.save(existingOffer);
                                }
                            } catch (soErr: any) {
                                console.error('[adminReviewProduct] Error updating seller offer for sister variant:', soErr?.message);
                            }
                        }
                    }
                }
            } catch (varMatrixErr: any) {
                console.error('[adminReviewProduct] Error persisting option groups and variants matrix:', varMatrixErr);
            }
        }

        if (collectionIds && collectionIds.length > 0) {
            const allVariants = await this.connection.rawConnection.query(`SELECT id FROM product_variant WHERE "productId" = $1`, [id]);
            const variantIds = allVariants.map((v: any) => String(v.id));
            if (variantIds.length > 0) {
                await this.addVariantsToCollections(ctx, variantIds, collectionIds).catch(() => null);
            }
        }

        if (status === 'approved' || convertToOfficialCatalog) {
            try {
                const defaultChannel = await this.channelService.getDefaultChannel(ctx);
                const defaultChannelId = defaultChannel ? defaultChannel.id.toString() : '1';

                // Raw SQL channel assignments to guarantee Default Channel (Channel 1) visibility for Storefront API
                await this.connection.rawConnection.query(
                    `INSERT INTO product_channels_channel ("productId", "channelId") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [id, defaultChannelId]
                );

                // Assign ALL variants of this product to Default Channel 1
                await this.connection.rawConnection.query(
                    `INSERT INTO product_variant_channels_channel ("productVariantId", "channelId")
                     SELECT id, $2 FROM product_variant WHERE "productId" = $1
                     ON CONFLICT DO NOTHING`,
                    [id, defaultChannelId]
                );

                if (resolvedPrimaryAssetId || product.featuredAsset?.id) {
                    const featId = resolvedPrimaryAssetId || product.featuredAsset?.id;
                    await this.connection.rawConnection.query(
                        `INSERT INTO asset_channels_channel ("assetId", "channelId") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                        [featId, defaultChannelId]
                    );
                }
            } catch (chanErr) {
                console.error('[adminReviewProduct] Default channel assignment error:', chanErr);
            }
        }

        // Direct notification to creator vendor
        if (creatorVendor?.id) {
            try {
                const vendorUserRes = await this.connection.rawConnection.query(
                    `SELECT v.id as vendor_id, v.name as vendor_name, v.email, v."phoneNumber" as phone_number, v."userId" as user_id, v."channelId" as channel_id FROM vendor v WHERE v.id = $1 LIMIT 1`,
                    [creatorVendor.id]
                );
                const vRow = vendorUserRes[0];
                if (vRow) {
                    const finalProdName = (name && name.trim()) || product.translations?.[0]?.name || (product as any).name || 'Produit';
                    const vars = {
                        productName: finalProdName,
                        businessName: vRow.vendor_name || 'Vendeur',
                        rejectionReason: rejectionReason || 'Non conforme aux critères Ahizan',
                    };

                    const settings = await this.smsService.getSettings();

                    if (status === 'approved') {
                        if (vRow.user_id) {
                            await this.notificationsService.notify(ctx, {
                                userId: vRow.user_id.toString(),
                                eventType: 'VENDOR_EVENT',
                                title: 'Produit Approuvé ✅',
                                body: `Votre produit "${finalProdName}" a été validé et publié sur la marketplace.`,
                                actionUrl: '/dashboard/products',
                                targetRole: 'VENDOR',
                                channels: ['IN_APP', 'PUSH'],
                                channelId: vRow.channel_id ? parseInt(vRow.channel_id, 10) : undefined,
                            });
                        }
                        if (settings?.channelsConfig?.ProductApproved?.enabled) {
                            const cfg = settings.channelsConfig.ProductApproved;
                            if ((cfg.channel === 'SMS' || cfg.channel === 'BOTH') && vRow.phone_number && cfg.smsTemplate) {
                                const content = this.smsService.interpolate(cfg.smsTemplate, vars);
                                await this.smsService.sendSms(vRow.phone_number, content, settings);
                            }
                            if ((cfg.channel === 'EMAIL' || cfg.channel === 'BOTH') && vRow.email && cfg.emailTemplate) {
                                const subject = this.smsService.interpolate(cfg.emailSubject || 'Votre produit a été approuvé - Ahizan', vars);
                                const content = this.smsService.interpolate(cfg.emailTemplate, vars);
                                await this.smsService.sendTransactionalEmail(vRow.email, subject, content, settings);
                            }
                        }
                    } else if (status === 'rejected') {
                        if (vRow.user_id) {
                            await this.notificationsService.notify(ctx, {
                                userId: vRow.user_id.toString(),
                                eventType: 'VENDOR_EVENT',
                                title: 'Produit Refusé ❌',
                                body: `Votre produit "${finalProdName}" n'a pas été validé. Motif : ${vars.rejectionReason}`,
                                actionUrl: '/dashboard/products',
                                targetRole: 'VENDOR',
                                channels: ['IN_APP', 'PUSH'],
                                channelId: vRow.channel_id ? parseInt(vRow.channel_id, 10) : undefined,
                            });
                        }
                        if (settings?.channelsConfig?.ProductRejected?.enabled) {
                            const cfg = settings.channelsConfig.ProductRejected;
                            if ((cfg.channel === 'SMS' || cfg.channel === 'BOTH') && vRow.phone_number && cfg.smsTemplate) {
                                const content = this.smsService.interpolate(cfg.smsTemplate, vars);
                                await this.smsService.sendSms(vRow.phone_number, content, settings);
                            }
                            if ((cfg.channel === 'EMAIL' || cfg.channel === 'BOTH') && vRow.email && cfg.emailTemplate) {
                                const subject = this.smsService.interpolate(cfg.emailSubject || 'Mise à jour concernant votre produit - Ahizan', vars);
                                const content = this.smsService.interpolate(cfg.emailTemplate, vars);
                                await this.smsService.sendTransactionalEmail(vRow.email, subject, content, settings);
                            }
                        }
                    }
                }
            } catch (notifErr: any) {
                console.error('[adminReviewProduct] Notification error:', notifErr?.message || notifErr);
            }
        }

        // Synchronize all variant names under this product to match the canonical product name + options
        try {
            await this.vendorService.synchronizeAllVariantNamesForProduct(ctx, id);
        } catch (syncNameErr: any) {
            console.error('[adminReviewProduct] Error synchronizing variant names:', syncNameErr?.message || syncNameErr);
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
        let offer = await this.connection.getRepository(ctx, SellerOffer).findOne({
            where: { id },
            relations: ['vendor', 'productVariant', 'productVariant.product'],
        });

        if (!offer) {
            // Fallback 1: Try finding by productVariantId
            offer = await this.connection.getRepository(ctx, SellerOffer).findOne({
                where: { productVariant: { id } },
                relations: ['vendor', 'productVariant', 'productVariant.product'],
            });
        }

        if (!offer) {
            // Fallback 2: Check if id is a ProductVariant directly
            const variant = await this.connection.getRepository(ctx, ProductVariant).findOne({
                where: { id },
                relations: ['product'],
            });

            if (variant) {
                const vendorId = (variant.product?.customFields as any)?.vendorId;
                let vendor: Vendor | null = null;
                if (vendorId) {
                    vendor = await this.connection.getRepository(ctx, Vendor).findOne({ where: { id: vendorId } });
                }

                const priceRecord = await this.connection.rawConnection.query(
                    `SELECT price FROM product_variant_price WHERE "variantId" = $1 LIMIT 1`,
                    [variant.id]
                );
                const price = priceRecord[0]?.price || 0;

                const repo = this.connection.getRepository(ctx, SellerOffer);
                offer = repo.create({
                    vendor: vendor || undefined,
                    productVariant: variant,
                    price: price,
                    stock: 1,
                    status: status,
                    rejectionReason: rejectionReason || null,
                });
            }
        }

        if (!offer) throw new Error('Offre vendeur ou déclinaison introuvable');
        
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
            const approvedOffersCount = await this.connection.rawConnection.query(
                `SELECT COUNT(*) as count FROM seller_offer WHERE "productVariantId" = $1 AND status = 'approved'`,
                [offer.productVariant.id]
            );
            const hasApprovedOffers = parseInt(approvedOffersCount[0]?.count || '0', 10) > 0;

            const parentProdId = offer.productVariant.product?.id || (await this.connection.rawConnection.query(`SELECT "productId" FROM product_variant WHERE id = $1`, [offer.productVariant.id]))?.[0]?.productId;
            let isOfficialOrApproved = false;
            if (parentProdId) {
                const prodInfo = await this.connection.rawConnection.query(
                    `SELECT "customFieldsVendorid", "customFieldsApprovalstatus" FROM product WHERE id = $1`,
                    [parentProdId]
                );
                isOfficialOrApproved = prodInfo[0]?.customFieldsVendorid == null || prodInfo[0]?.customFieldsApprovalstatus === 'approved';
            }
            const shouldVariantBeEnabled = hasApprovedOffers || isOfficialOrApproved;

            await this.connection.rawConnection.query(
                `UPDATE product_variant SET enabled = $1, "customFieldsOfferstatus" = $2, "customFieldsRejectionreason" = $3, "updatedAt" = NOW() WHERE id = $4`,
                [shouldVariantBeEnabled, (hasApprovedOffers || isOfficialOrApproved) ? 'APPROVED' : (status === 'rejected' ? 'REJECTED' : 'PENDING'), offer.rejectionReason, offer.productVariant.id]
            );

            // Recompute parent Product enabled state: product is enabled if and only if it has at least 1 approved variant or is official
            if (parentProdId) {
                // Inherit parent product's collection associations for this variant
                try {
                    await this.connection.rawConnection.query(
                        `-- Inherit from other variants of the same product (existing approach)
                         INSERT INTO collection_product_variants_product_variant ("collectionId", "productVariantId")
                         SELECT DISTINCT cpv."collectionId", $1
                         FROM collection_product_variants_product_variant cpv
                         INNER JOIN product_variant pv_other ON pv_other.id = cpv."productVariantId"
                         WHERE pv_other."productId" = $2
                         ON CONFLICT DO NOTHING`,
                        [offer.productVariant.id, parentProdId]
                    );
                } catch (_) {}

                // Ensure variant is in Default Channel 1
                try {
                    await this.connection.rawConnection.query(
                        `INSERT INTO product_variant_channels_channel ("productVariantId", "channelId")
                         VALUES ($1, 1) ON CONFLICT DO NOTHING`,
                        [offer.productVariant.id]
                    );
                } catch (_) {}

                const approvedCountRes = await this.connection.rawConnection.query(
                    `SELECT COUNT(*) as count FROM product_variant WHERE "productId" = $1 AND enabled = true`,
                    [parentProdId]
                );
                const hasApprovedVariants = parseInt(approvedCountRes[0]?.count || '0', 10) > 0;
                await this.connection.rawConnection.query(
                    `UPDATE product SET enabled = $1 WHERE id = $2`,
                    [hasApprovedVariants, parentProdId]
                );
            }

            // Direct notification to the vendor owning this offer
            if (offer.vendor?.id || (offer as any).vendorId) {
                try {
                    const targetVendorId = offer.vendor?.id || (offer as any).vendorId;
                    const vRowRes = await this.connection.rawConnection.query(
                        `SELECT v.id, v.name as vendor_name, v.email, v."phoneNumber" as phone_number, v."userId" as user_id, v."channelId" as channel_id 
                         FROM vendor v WHERE v.id = $1 LIMIT 1`,
                        [targetVendorId]
                    );
                    const vRow = vRowRes[0];
                    if (vRow) {
                        let offerName = '';
                        try {
                            const vRows = await this.connection.rawConnection.query(
                                `SELECT pvt.name as variant_name, pt.name as product_name
                                 FROM product_variant pv
                                 LEFT JOIN product_variant_translation pvt ON (pvt."baseId" = pv.id)
                                 LEFT JOIN product_translation pt ON (pt."baseId" = pv."productId")
                                 WHERE pv.id = $1
                                 ORDER BY 
                                    CASE WHEN pvt."languageCode" = 'fr' THEN 1 ELSE 2 END,
                                    CASE WHEN pt."languageCode" = 'fr' THEN 1 ELSE 2 END
                                 LIMIT 1`,
                                [offer.productVariant?.id]
                            );
                            if (vRows && vRows[0]) {
                                const vName = vRows[0].variant_name;
                                const pName = vRows[0].product_name;
                                if (vName && pName && !vName.toLowerCase().includes(pName.toLowerCase())) {
                                    offerName = `${pName} - ${vName}`;
                                } else {
                                    offerName = vName || pName || 'Déclinaison';
                                }
                            }
                        } catch (_) {}

                        if (!offerName) {
                            offerName = 'Déclinaison';
                        }

                        const rejReason = offer.rejectionReason || rejectionReason || 'Non conforme aux critères Ahizan';

                        const vars = {
                            productName: offerName,
                            businessName: vRow.vendor_name || 'Vendeur',
                            rejectionReason: rejReason,
                        };

                        const settings = await this.smsService.getSettings();

                        if (status === 'approved') {
                            if (vRow.user_id) {
                                await this.notificationsService.notify(ctx, {
                                    userId: vRow.user_id.toString(),
                                    eventType: 'VENDOR_EVENT',
                                    title: 'Déclinaison validée ✅',
                                    body: `Votre offre "${offerName}" est maintenant en ligne sur la marketplace.`,
                                    actionUrl: '/dashboard/products',
                                    targetRole: 'VENDOR',
                                    channels: ['IN_APP', 'PUSH'],
                                    channelId: vRow.channel_id ? parseInt(vRow.channel_id, 10) : undefined,
                                });
                            }
                            if (settings?.channelsConfig?.ProductApproved?.enabled) {
                                const cfg = settings.channelsConfig.ProductApproved;
                                if ((cfg.channel === 'SMS' || cfg.channel === 'BOTH') && vRow.phone_number && cfg.smsTemplate) {
                                    const content = this.smsService.interpolate(cfg.smsTemplate, vars);
                                    await this.smsService.sendSms(vRow.phone_number, content, settings);
                                }
                                if ((cfg.channel === 'EMAIL' || cfg.channel === 'BOTH') && vRow.email && cfg.emailTemplate) {
                                    const subject = this.smsService.interpolate(cfg.emailSubject || 'Votre offre a été validée - Ahizan', vars);
                                    const content = this.smsService.interpolate(cfg.emailTemplate, vars);
                                    await this.smsService.sendTransactionalEmail(vRow.email, subject, content, settings);
                                }
                            }
                        } else if (status === 'rejected' || status === 'correction_requested') {
                            if (vRow.user_id) {
                                await this.notificationsService.notify(ctx, {
                                    userId: vRow.user_id.toString(),
                                    eventType: 'VENDOR_EVENT',
                                    title: 'Déclinaison refusée ❌',
                                    body: `Votre offre "${offerName}" n'a pas été validée. Motif : ${rejReason}`,
                                    actionUrl: '/dashboard/products',
                                    targetRole: 'VENDOR',
                                    channels: ['IN_APP', 'PUSH'],
                                    channelId: vRow.channel_id ? parseInt(vRow.channel_id, 10) : undefined,
                                });
                            }
                            if (settings?.channelsConfig?.ProductRejected?.enabled) {
                                const cfg = settings.channelsConfig.ProductRejected;
                                if ((cfg.channel === 'SMS' || cfg.channel === 'BOTH') && vRow.phone_number && cfg.smsTemplate) {
                                    const content = this.smsService.interpolate(cfg.smsTemplate, vars);
                                    await this.smsService.sendSms(vRow.phone_number, content, settings);
                                }
                                if ((cfg.channel === 'EMAIL' || cfg.channel === 'BOTH') && vRow.email && cfg.emailTemplate) {
                                    const subject = this.smsService.interpolate(cfg.emailSubject || 'Mise à jour concernant votre offre - Ahizan', vars);
                                    const content = this.smsService.interpolate(cfg.emailTemplate, vars);
                                    await this.smsService.sendTransactionalEmail(vRow.email, subject, content, settings);
                                }
                            }
                        }
                    }
                } catch (err: any) {
                    console.error('[adminReviewSellerOffer] Notification error:', err?.message || err);
                }
            }

            // Run global full search sync after a 3s delay to ensure our Channel 1 data
            // is rebuilt AFTER any Vendure native indexer operations triggered by the offer update.
            setTimeout(async () => {
                try {
                    await MultivendorPlugin.runFullSearchSync(this.connection);
                    console.log('[adminReviewSellerOffer] Global Channel 1 search sync completed for offer', offer.id);
                } catch (_) {}
            }, 3000);
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
    async reassignOfferToTargetVariant(
        @Ctx() ctx: RequestContext,
        @Args('sourceOfferId') sourceOfferId: string,
        @Args('targetVariantId') targetVariantId: string,
        @Args('deleteSourceVariantIfEmpty') deleteSourceVariantIfEmpty?: boolean,
    ): Promise<SellerOffer> {
        return this.vendorService.reassignOfferToTargetVariant(ctx, sourceOfferId, targetVariantId, deleteSourceVariantIfEmpty);
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async mergeVariantIntoTargetVariant(
        @Ctx() ctx: RequestContext,
        @Args('sourceVariantId') sourceVariantId: string,
        @Args('targetVariantId') targetVariantId: string,
    ): Promise<ProductVariant> {
        return this.vendorService.mergeVariantIntoTargetVariant(ctx, sourceVariantId, targetVariantId);
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async adminUpdateVariantOptions(
        @Ctx() ctx: RequestContext,
        @Args('variantId') variantId: string,
        @Args('optionIds') optionIds: string[],
    ): Promise<ProductVariant> {
        return this.vendorService.adminUpdateVariantOptions(ctx, variantId, optionIds);
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async adminConfigureVariantOptions(
        @Ctx() ctx: RequestContext,
        @Args('variantId') variantId: string,
        @Args('options') options: Array<{ groupName: string; valueName: string }>,
    ): Promise<ProductVariant> {
        return this.vendorService.adminConfigureVariantOptions(ctx, variantId, options);
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async adminSyncProductVariantNames(
        @Ctx() ctx: RequestContext,
        @Args('productId') productId: string,
    ): Promise<boolean> {
        await this.vendorService.synchronizeAllVariantNamesForProduct(ctx, productId);
        return true;
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async createOfficialVariant(
        @Ctx() ctx: RequestContext,
        @Args('input') input: {
            productId: string;
            name?: string;
            sku?: string;
            price?: number;
            options?: Array<{ groupName: string; valueName: string }>;
            featuredAssetId?: string;
        },
    ): Promise<ProductVariant> {
        return this.vendorService.createOfficialVariant(ctx, input);
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
