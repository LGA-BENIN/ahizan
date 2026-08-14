import { Allow, Ctx, Permission, RequestContext, PaginatedList, Product, ProductService, OrderService, Order, OrderStateTransitionError, AssetService, Asset, TransactionalConnection, Transaction } from '@vendure/core';
import { Args, Mutation, Query, Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { VendorService } from '../service/vendor.service';
import { Vendor, VendorStatus } from '../entities/vendor.entity';
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

function isErrorResult(result: any): result is { message: string; errorCode: string } {
    return !!result.errorCode;
}

@Resolver('Vendor')
export class VendorAdminResolver {
    constructor(
        private vendorService: VendorService,
        private productService: ProductService,
        private connection: TransactionalConnection,
        private likeService: LikeService,
        private geoService: GeoService,
    ) {
        console.log('VendorAdminResolver initialized with ProductService and GeoService');
    }

    @ResolveField()
    async products(@Parent() vendor: Vendor, @Ctx() ctx: RequestContext): Promise<Product[]> {
        const products = await this.vendorService.findAllProductsForVendor(ctx, vendor.id.toString());
        return products || [];
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
}
