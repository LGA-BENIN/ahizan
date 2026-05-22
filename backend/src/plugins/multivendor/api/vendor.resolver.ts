import { Allow, Ctx, Permission, RequestContext, PaginatedList, Product, ProductService, OrderService, Order, OrderStateTransitionError, AssetService, Asset, TransactionalConnection } from '@vendure/core';
import { Args, Mutation, Query, Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { VendorService } from '../service/vendor.service';
import { Vendor, VendorStatus } from '../entities/vendor.entity';
import { OrderStatusService } from '../service/order-status.service';

@Resolver()
export class VendorResolver {
    constructor(
        private vendorService: VendorService,
        private orderService: OrderService,
        private assetService: AssetService,
        private connection: TransactionalConnection,
        private orderStatusService: OrderStatusService,
    ) { }

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
    async vendors(@Ctx() ctx: RequestContext, @Args('options') options: any): Promise<PaginatedList<Vendor>> {
        return this.vendorService.findAll(ctx, options);
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

        const order = await this.orderService.findOne(ctx, orderId, ['customFields.vendor']);
        if (!order) {
            throw new Error('Order not found');
        }

        const orderVendor = (order.customFields as any).vendor;
        if (!orderVendor || orderVendor.id !== vendor.id) {
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

        const order = await this.orderService.findOne(ctx, orderId, ['customFields.vendor']);
        if (!order) {
            throw new Error('Order not found');
        }

        const orderVendor = (order.customFields as any).vendor;
        if (!orderVendor || orderVendor.id !== vendor.id) {
            throw new Error('You do not have permission to update this order');
        }

        // Must be a valid seller state
        if (!['pending', 'confirmed', 'refused'].includes(statusCode)) {
            throw new Error('Invalid seller status');
        }

        await this.connection.getRepository(ctx, Order).update(orderId, {
            customFields: { sellerStatus: statusCode },
        });
        return true;
    }

    @ResolveField()
    async products(@Parent() vendor: Vendor, @Ctx() ctx: RequestContext): Promise<Product[]> {
        const products = await this.vendorService.findAllProductsForVendor(ctx, vendor.id.toString());
        return products || [];
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
}

function isErrorResult(result: any): result is { message: string; errorCode: string } {
    return !!result.errorCode;
}

@Resolver('Vendor')
export class VendorAdminResolver {
    constructor(
        private vendorService: VendorService,
        private productService: ProductService,
        private connection: TransactionalConnection
    ) {
        console.log('VendorAdminResolver initialized with ProductService');
    }

    @Query()
    @Allow(Permission.Authenticated)
    async adminVendorProducts(@Ctx() ctx: RequestContext, @Args('options') options: any): Promise<PaginatedList<Product>> {
        return this.productService.findAll(ctx, options);
    }

    @Query()
    @Allow(Permission.Public)
    async vendors(@Ctx() ctx: RequestContext, @Args('options') options: any): Promise<PaginatedList<Vendor>> {
        return this.vendorService.findAll(ctx, options);
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
        @Args('status') status: string
    ): Promise<boolean> {
        // Validate status
        if (!['pending', 'shipped', 'in_transit', 'delivered', 'cancelled'].includes(status)) {
            throw new Error('Invalid admin status');
        }

        const order = await this.connection.getRepository(ctx, Order).findOne({ where: { id: orderId } });
        if (!order) {
            throw new Error('Order not found');
        }

        await this.connection.getRepository(ctx, Order).update(orderId, {
            customFields: { adminStatus: status },
        });

        // If admin cancels, we might also want to set sellerStatus to refused if it was pending? 
        // User said: "superadmin should also have the possibilitu to reject the commande at any level"
        // If it's cancelled by admin, it's globally cancelled.
        
        return true;
    }
}
