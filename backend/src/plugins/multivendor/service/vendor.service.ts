import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import {
    TransactionalConnection,
    ListQueryBuilder,
    RequestContext,
    ListQueryOptions,
    PaginatedList,
    Product,
    Order,
    EventBus,
    Asset,
    User,
    RoleService,
    PasswordCipher,
    Permission,
    NativeAuthenticationMethod,
    AssetService,
    Role,
    Channel,
    Seller,
    Administrator,
    Customer,
    UserInputError,
    EntityHydrator,
    ProductService,
    ProductVariantService,
    ProductVariant,
    ProductEvent,
    OrderService,
    ChannelService,
    SellerService,
    AdministratorService,
    StockLocationService,
    Fulfillment,
    FulfillmentStateTransitionEvent,
} from '@vendure/core';
import { Vendor, VendorStatus } from '../entities/vendor.entity';
import { WithdrawalRequest, WithdrawalStatus } from '../entities/withdrawal-request.entity';
import { PlatformSettings } from '../entities/platform-settings.entity';
import { VendorEvent } from '../events/vendor-event';
import { RegistrationField } from '../../page-inscription/entities/registration-field.entity';
import { IsNull, In } from 'typeorm';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class VendorService implements OnApplicationBootstrap {
    constructor(
        private connection: TransactionalConnection,
        private listQueryBuilder: ListQueryBuilder,
        private eventBus: EventBus,
        private roleService: RoleService,
        private passwordCipher: PasswordCipher,
        private assetService: AssetService,
        private entityHydrator: EntityHydrator,
        private productService: ProductService,
        private productVariantService: ProductVariantService,
        private orderService: OrderService,
        private notificationsService: NotificationsService,
        private channelService: ChannelService,
        private sellerService: SellerService,
        private administratorService: AdministratorService,
        private stockLocationService: StockLocationService,
    ) { }

    async findAll(
        ctx: RequestContext,
        options?: ListQueryOptions<Vendor>,
        latitude?: number,
        longitude?: number,
        marketId?: string,
        locationId?: string
    ): Promise<PaginatedList<Vendor>> {
        const useSpatialSorting = latitude !== undefined || longitude !== undefined || marketId !== undefined || locationId !== undefined;

        const qbOptions = { ...options };
        if (useSpatialSorting) {
            delete qbOptions.skip;
            delete qbOptions.take;
        }

        const qb = this.listQueryBuilder.build(Vendor, qbOptions, {
            ctx,
            relations: ['logo', 'coverImage', 'rccmFile', 'ifuFile', 'idCardFile'],
        });

        const [items, totalItems] = await qb.getManyAndCount();

        if (!useSpatialSorting) {
            return { items, totalItems };
        }

        const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
            const R = 6371e3; // meters
            const phi1 = (lat1 * Math.PI) / 180;
            const phi2 = (lat2 * Math.PI) / 180;
            const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
            const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

            const a =
                Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

            return R * c;
        };

        let filteredItems = [...items];
        if (locationId) {
            filteredItems = filteredItems.filter(v => v.locationId?.toString() === locationId.toString());
        }
        if (marketId) {
            filteredItems = filteredItems.filter(v => 
                v.physicalMarketId?.toString() === marketId.toString() ||
                (v.marketIds && Array.isArray(v.marketIds) && v.marketIds.some(id => id?.toString() === marketId.toString()))
            );
        }

        const sortedItems = filteredItems.sort((a, b) => {
            if (marketId) {
                const aIsResident = a.physicalMarketId?.toString() === marketId.toString();
                const bIsResident = b.physicalMarketId?.toString() === marketId.toString();
                if (aIsResident && !bIsResident) return -1;
                if (!aIsResident && bIsResident) return 1;
            }

            if (latitude !== undefined && longitude !== undefined) {
                const aHasCoords = a.latitude !== null && a.longitude !== null && a.latitude !== undefined && a.longitude !== undefined;
                const bHasCoords = b.latitude !== null && b.longitude !== null && b.latitude !== undefined && b.longitude !== undefined;

                if (aHasCoords && !bHasCoords) return -1;
                if (!aHasCoords && bHasCoords) return 1;

                if (aHasCoords && bHasCoords) {
                    const distA = getDistance(latitude, longitude, a.latitude!, a.longitude!);
                    const distB = getDistance(latitude, longitude, b.latitude!, b.longitude!);
                    if (distA !== distB) {
                        return distA - distB;
                    }
                }
            }

            if (marketId) {
                const aHasSecondary = a.marketIds?.some(id => id?.toString() === marketId.toString());
                const bHasSecondary = b.marketIds?.some(id => id?.toString() === marketId.toString());
                if (aHasSecondary && !bHasSecondary) return -1;
                if (!aHasSecondary && bHasSecondary) return 1;
            }

            return 0;
        });

        const skip = options?.skip || 0;
        const take = options?.take || 10;
        const paginatedItems = sortedItems.slice(skip, skip + take);

        return {
            items: paginatedItems,
            totalItems: sortedItems.length,
        };
    }

    findOne(ctx: RequestContext, id: string): Promise<Vendor | null> {
        return this.connection.getRepository(ctx, Vendor).findOne({
            where: { id },
            relations: ['logo', 'coverImage', 'user', 'rccmFile', 'ifuFile', 'idCardFile']
        });
    }

    async findByUserId(ctx: RequestContext, userId: string): Promise<Vendor | null> {
        const vendors = await this.connection.getRepository(ctx, Vendor).find({
            where: { user: { id: userId } },
            relations: ['logo', 'coverImage', 'user', 'rccmFile', 'ifuFile', 'idCardFile'],
            order: { createdAt: 'ASC' }
        });
        if (!vendors || vendors.length === 0) return null;
        // Prioritize APPROVED vendor profile if multiple exist
        const approved = vendors.find(v => v.status === VendorStatus.APPROVED);
        return approved || vendors[0];
    }

    /**
     * Creates a minimal "shell" Vendor record linked to an existing user account.
     * Used when a Client wants to add the Vendor role without creating a new account.
     * The vendor will be in PENDING status and must complete onboarding.
     */
    async createVendorShellForExistingUser(ctx: RequestContext, userId: string): Promise<Vendor> {
        const existing = await this.findByUserId(ctx, userId);
        if (existing) {
            console.log(`createVendorShellForExistingUser: Vendor profile already exists for user ${userId} (Vendor ID: ${existing.id})`);
            return existing;
        }

        const adminCtx = await this.getSuperAdminContext(ctx);
        const user = await this.connection.getRepository(adminCtx, User).findOne({
            where: { id: userId },
        });
        if (!user) {
            throw new Error(`User ${userId} not found`);
        }

        const timestamp = Date.now();
        const vendor = new Vendor();
        vendor.name = `Boutique ${timestamp}`;
        vendor.email = user.identifier;
        vendor.status = VendorStatus.PENDING;
        (vendor as any).user = { id: userId };

        const saved = await this.connection.getRepository(adminCtx, Vendor).save(vendor);
        return saved;
    }

    async findOrdersForVendor(ctx: RequestContext, vendorId: string, options?: any): Promise<PaginatedList<Order>> {
        const skip = options?.skip || 0;
        const take = options?.take || 10;
        const numericVendorId = Number(vendorId);

        let orderIds: string[] = [];
        let totalItems = 0;

        const vendor = await this.findOne(ctx, vendorId);
        const vendorChannelId = vendor?.channelId || 0;

        try {
            const rawResults = await this.connection.rawConnection.query(
                `SELECT DISTINCT o.id 
                 FROM "order" o
                 LEFT JOIN order_line ol ON ol."orderId" = o.id
                 LEFT JOIN product_variant pv ON ol."productVariantId" = pv.id
                 LEFT JOIN product p ON pv."productId" = p.id
                 LEFT JOIN order_channels_channel occ ON occ."orderId" = o.id
                 WHERE o."customFieldsVendorid" = $1
                    OR p."customFieldsVendorid" = $1
                    OR ol."sellerChannelId" = $2
                    OR occ."channelId" = $2
                    OR o."customFieldsVendorstatuses" LIKE $3
                 ORDER BY o.id DESC`,
                [numericVendorId, vendorChannelId, `%"${vendorId}"%`]
            );
            const allIds = rawResults.map((r: any) => String(r.id));
            totalItems = allIds.length;
            orderIds = allIds.slice(skip, skip + take);
        } catch (err) {
            console.error('[findOrdersForVendor] Raw SQL query error:', err);
        }

        if (orderIds.length === 0) {
            return { items: [], totalItems: 0 };
        }

        const orders = await this.connection.getRepository(ctx, Order).find({
            where: { id: In(orderIds) },
            relations: [
                'lines', 
                'lines.productVariant', 
                'lines.productVariant.product', 
                'lines.productVariant.product.customFields.vendor',
                'customer',
                'surcharges',
                'promotions',
                'channels'
            ],
            order: { createdAt: 'DESC' }
        });

        // Ensure surcharges array is initialized for Order tax and total getters
        for (const order of orders as any[]) {
            order.surcharges = order.surcharges || [];
        }

        // Map sellerStatus, adminStatus and isVendorPaid specifically for this vendor if recorded in vendorStatuses JSON
        const mappedOrders = orders.map((order: any) => {
            let vMap: Record<string, any> = {};
            try {
                if (order.customFields?.vendorStatuses) {
                    vMap = JSON.parse(order.customFields.vendorStatuses);
                }
            } catch (e) {}

            const vendorSpecific = vMap[String(vendorId)];

            // Filter lines for this vendor
            const vendorLines = order.lines ? order.lines.filter((l: any) => {
                const pv = l.productVariant as any;
                const v = pv?.product?.customFields?.vendor;
                return v && String(v.id) === String(vendorId);
            }) : [];

            // Recalculate totals for this vendor's lines only
            const vendorSubTotal = vendorLines.reduce((sum: number, l: any) => sum + l.linePrice, 0);
            const vendorTotalWithTax = vendorLines.reduce((sum: number, l: any) => sum + l.linePriceWithTax, 0);

            if (vendorSpecific) {
                return {
                    ...order,
                    subTotal: vendorSubTotal,
                    totalWithTax: vendorTotalWithTax,
                    total: vendorTotalWithTax,
                    lines: vendorLines,
                    customFields: {
                        ...order.customFields,
                        sellerStatus: vendorSpecific.sellerStatus || 'pending',
                        adminStatus: vendorSpecific.adminStatus || 'pending',
                        isVendorPaid: vendorSpecific.isPaid !== undefined ? Boolean(vendorSpecific.isPaid) : Boolean(order.customFields?.isVendorPaid),
                        paymentStatus: vendorSpecific.paymentStatus || order.customFields?.paymentStatus || 'PENDING',
                        commissionAmount: order.customFields?.commissionAmount || 0,
                        commissionRate: order.customFields?.commissionRate || 0,
                    }
                };
            }
            return {
                ...order,
                subTotal: vendorSubTotal,
                totalWithTax: vendorTotalWithTax,
                total: vendorTotalWithTax,
                lines: vendorLines,
                customFields: {
                    ...order.customFields,
                    sellerStatus: 'pending',
                    adminStatus: 'pending',
                    paymentStatus: order.customFields?.paymentStatus || 'PENDING',
                    commissionAmount: order.customFields?.commissionAmount || 0,
                    commissionRate: order.customFields?.commissionRate || 0,
                }
            };
        });

        return {
            items: mappedOrders,
            totalItems
        };
    }

    async findOrderForVendor(ctx: RequestContext, vendorId: string, orderId: string): Promise<Order | null> {
        const numericVendorId = Number(vendorId);
        const vendor = await this.findOne(ctx, vendorId);
        const vendorChannelId = vendor?.channelId || 0;

        const order = await this.connection.getRepository(ctx, Order).findOne({
            where: { id: orderId },
            relations: [
                'lines',
                'lines.productVariant',
                'lines.productVariant.product',
                'lines.productVariant.product.featuredAsset',
                'lines.productVariant.featuredAsset',
                'lines.productVariant.product.customFields.vendor',
                'customer',
                'customer.user',
                'shippingLines',
                'fulfillments',
                'fulfillments.lines',
                'fulfillments.lines.fulfillmentLine',
                'payments',
                'surcharges',
                'promotions',
                'channels'
            ]
        });

        if (!order) return null;

        (order as any).surcharges = order.surcharges || [];

        // Filter lines that belong to this vendor
        const vendorLines = (order.lines || []).filter((l: any) => {
            const p = l.productVariant?.product;
            const cfVendorId = p?.customFields?.vendor?.id || (p as any)?.customFieldsVendorid;
            return (
                (cfVendorId && String(cfVendorId) === String(vendorId)) ||
                (l.sellerChannelId && Number(l.sellerChannelId) === Number(vendorChannelId))
            );
        });

        const isOverallVendor = String((order.customFields as any)?.vendor?.id || (order as any).customFieldsVendorid) === String(vendorId);
        if (!isOverallVendor && vendorLines.length === 0) {
            return null;
        }

        let vMap: Record<string, any> = {};
        try {
            if ((order.customFields as any)?.vendorStatuses) {
                vMap = JSON.parse((order.customFields as any).vendorStatuses);
            }
        } catch (e) {}

        const vendorSpecific = vMap[String(vendorId)];
        const linesToUse = vendorLines.length > 0 ? vendorLines : order.lines;
        const vendorSubTotal = linesToUse.reduce((sum: number, l: any) => sum + (l.linePrice || 0), 0);
        const vendorTotalWithTax = linesToUse.reduce((sum: number, l: any) => sum + (l.linePriceWithTax || 0), 0);

        return {
            ...order,
            subTotal: vendorSubTotal,
            totalWithTax: vendorTotalWithTax,
            total: vendorTotalWithTax,
            lines: linesToUse,
            customFields: {
                ...order.customFields,
                sellerStatus: vendorSpecific?.sellerStatus || (order.customFields as any)?.sellerStatus || 'pending',
                adminStatus: vendorSpecific?.adminStatus || (order.customFields as any)?.adminStatus || 'pending',
                paymentStatus: (order.customFields as any)?.paymentStatus || 'PENDING',
                commissionAmount: (order.customFields as any)?.commissionAmount || 0,
                commissionRate: (order.customFields as any)?.commissionRate || 0,
            }
        } as any;
    }

    async fulfillOrderForVendor(
        ctx: RequestContext,
        vendorId: string,
        orderId: string,
        trackingCode?: string,
        carrier?: string
    ): Promise<{ id: string; state: string; trackingCode?: string; method?: string }> {
        const order = await this.findOrderForVendor(ctx, vendorId, orderId);
        if (!order) {
            throw new Error('Commande introuvable pour ce vendeur.');
        }

        const lines = order.lines || [];
        if (lines.length === 0) {
            throw new Error('Aucune ligne de commande à expédier.');
        }

        // 1. Create fulfillment record
        const fulfillmentRepo = this.connection.getRepository(ctx, Fulfillment);
        const fulfillment = fulfillmentRepo.create({
            state: 'Shipped',
            method: carrier || 'Standard',
            trackingCode: trackingCode || '',
            orders: [order as any],
        });
        const savedFulfillment = await fulfillmentRepo.save(fulfillment);

        // 2. Update vendor status in order JSON
        await this.updateVendorOrderStatus(ctx, orderId, vendorId, 'sellerStatus', 'shipped', true);

        // 3. Update order state to Shipped if appropriate
        try {
            if (order.state === 'PaymentSettled' || order.state === 'PaymentAuthorized') {
                await this.orderService.transitionToState(ctx, orderId, 'Shipped');
            }
        } catch (e) {
            await this.connection.rawConnection.query(
                `UPDATE "order" SET state = 'Shipped', "updatedAt" = NOW() WHERE id = $1`,
                [orderId]
            );
        }

        // 4. Trigger event on EventBus so notification subscriber fires
        this.eventBus.publish(new FulfillmentStateTransitionEvent(
            'Created' as any,
            'Shipped' as any,
            ctx,
            savedFulfillment
        ));

        return {
            id: String(savedFulfillment.id),
            state: 'Shipped',
            trackingCode: trackingCode || '',
            method: carrier || 'Standard',
        };
    }

    async getVendorWalletStats(ctx: RequestContext, vendorId: string): Promise<any> {
        const numericVendorId = Number(vendorId);
        const vendor = await this.findOne(ctx, vendorId);
        const vendorChannelId = vendor?.channelId || 0;

        // Fetch sales and commissions aggregated
        const salesRows: { total_sales: string; commission_sum: string; retirable_sum: string; pending_sum: string }[] = await this.connection.rawConnection.query(`
            SELECT 
                COALESCE(SUM(ol."proratedLinePriceWithTax"), 0) as total_sales,
                COALESCE(SUM(CASE WHEN o."customFieldsCommissionamount" > 0 THEN o."customFieldsCommissionamount" ELSE 0 END), 0) as commission_sum,
                COALESCE(SUM(CASE WHEN o."customFieldsPaymentstatus" = 'RETIRABLE' THEN ol."proratedLinePriceWithTax" ELSE 0 END), 0) as retirable_sum,
                COALESCE(SUM(CASE WHEN o."customFieldsPaymentstatus" = 'PENDING' OR o."customFieldsPaymentstatus" IS NULL THEN ol."proratedLinePriceWithTax" ELSE 0 END), 0) as pending_sum
            FROM order_line ol
            INNER JOIN "order" o ON ol."orderId" = o.id
            INNER JOIN product_variant pv ON ol."productVariantId" = pv.id
            INNER JOIN product p ON pv."productId" = p.id
            WHERE (p."customFieldsVendorid" = $1 OR ol."sellerChannelId" = $2)
              AND o.state NOT IN ('AddingItems', 'ArrangingPayment', 'Cancelled')
        `, [numericVendorId, vendorChannelId]);

        const rawSales = salesRows[0] || { total_sales: '0', commission_sum: '0', retirable_sum: '0', pending_sum: '0' };
        const totalSales = parseInt(rawSales.total_sales, 10);
        const platformCommission = parseInt(rawSales.commission_sum, 10);
        const netEarnings = Math.max(0, totalSales - platformCommission);

        // Fetch withdrawals
        const withdrawalRows: { total_approved: string; total_pending: string }[] = await this.connection.rawConnection.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN amount ELSE 0 END), 0) as total_approved,
                COALESCE(SUM(CASE WHEN status = 'PENDING' THEN amount ELSE 0 END), 0) as total_pending
            FROM withdrawal_request
            WHERE "vendorId" = $1
        `, [numericVendorId]);

        const rawWithdrawals = withdrawalRows[0] || { total_approved: '0', total_pending: '0' };
        const totalWithdrawn = parseInt(rawWithdrawals.total_approved, 10);
        const pendingWithdrawalAmount = parseInt(rawWithdrawals.total_pending, 10);

        const retirableSum = parseInt(rawSales.retirable_sum, 10);
        const availableBalance = Math.max(0, retirableSum - totalWithdrawn - pendingWithdrawalAmount);
        const pendingBalance = parseInt(rawSales.pending_sum, 10);

        return {
            totalSales,
            platformCommission,
            netEarnings,
            availableBalance,
            pendingBalance,
            totalWithdrawn,
            pendingWithdrawalAmount,
            currencyCode: 'XOF',
        };
    }

    async updateVendorOrderStatus(
        ctx: RequestContext,
        orderId: string,
        vendorId: string | undefined,
        statusType: 'sellerStatus' | 'adminStatus',
        newStatus: string,
        cascade: boolean = true
    ): Promise<boolean> {
        const order = await this.connection.getRepository(ctx, Order).findOne({ 
            where: { id: orderId },
            relations: ['lines', 'lines.productVariant', 'lines.productVariant.product', 'lines.productVariant.product.customFields.vendor']
        });
        if (!order) {
            throw new Error('Order not found');
        }

        let vMap: Record<string, any> = {};
        try {
            if ((order.customFields as any)?.vendorStatuses) {
                vMap = JSON.parse((order.customFields as any).vendorStatuses);
            }
        } catch (e) {}

        // Collect all vendor IDs present in this order
        const vendorIds = new Set<string>();
        const defaultVendor = (order.customFields as any)?.vendor;
        if (defaultVendor?.id) {
            vendorIds.add(String(defaultVendor.id));
        }
        if (order.lines) {
            for (const line of order.lines) {
                const assignedVendor = (line.customFields as any)?.assignedVendor;
                if (assignedVendor?.id) {
                    vendorIds.add(String(assignedVendor.id));
                } else {
                    const lineVendor = (line as any).productVariant?.product?.customFields?.vendor;
                    if (lineVendor?.id) {
                        vendorIds.add(String(lineVendor.id));
                    }
                }
            }
        }

        if (statusType === 'sellerStatus' && newStatus === 'refused') {
            newStatus = 'reassigning';
        }

        if (vendorId) {
            vMap[String(vendorId)] = {
                ...(vMap[String(vendorId)] || {}),
                [statusType]: newStatus,
            };
        } else {
            const vIdList = Array.from(vendorIds);
            for (const vId of vIdList) {
                vMap[vId] = {
                    ...(vMap[vId] || {}),
                    [statusType]: newStatus,
                };
            }
        }

        const vIdList = Array.from(vendorIds);
        
        let aggregateSellerStatus = (order.customFields as any)?.sellerStatus || 'pending';
        let aggregateAdminStatus = (order.customFields as any)?.adminStatus || 'pending';

        if (vIdList.length > 0) {
            const sellerStatuses = vIdList.map(id => vMap[id]?.sellerStatus || 'pending');
            if (sellerStatuses.every(s => s === 'confirmed')) {
                aggregateSellerStatus = 'confirmed';
            } else if (sellerStatuses.some(s => s === 'reassigning' || s === 'refused')) {
                aggregateSellerStatus = 'reassigning';
            } else {
                aggregateSellerStatus = 'pending';
            }

            const adminStatuses = vIdList.map(id => vMap[id]?.adminStatus || 'pending');
            if (adminStatuses.every(s => s === 'delivered')) {
                aggregateAdminStatus = 'delivered';
            } else if (adminStatuses.every(s => s === 'cancelled')) {
                aggregateAdminStatus = 'cancelled';
            } else if (adminStatuses.some(s => s === 'in_transit')) {
                aggregateAdminStatus = 'in_transit';
            } else if (adminStatuses.some(s => s === 'shipped')) {
                aggregateAdminStatus = 'shipped';
            } else {
                aggregateAdminStatus = 'pending';
            }
        } else {
            if (statusType === 'sellerStatus') aggregateSellerStatus = newStatus;
            if (statusType === 'adminStatus') aggregateAdminStatus = newStatus;
        }

        // Direct SQL update to ensure customFields columns in PostgreSQL are persisted
        try {
            await this.connection.rawConnection.query(
                `UPDATE "order" 
                 SET "customFieldsSellerstatus" = $1,
                     "customFieldsAdminstatus" = $2,
                     "customFieldsVendorstatuses" = $3
                 WHERE id = $4`,
                [aggregateSellerStatus, aggregateAdminStatus, JSON.stringify(vMap), orderId]
            );
        } catch (e) {
            try {
                await this.connection.rawConnection.query(
                    `UPDATE "order" 
                     SET "customFieldsSellerStatus" = $1,
                         "customFieldsAdminStatus" = $2,
                         "customFieldsVendorStatuses" = $3
                     WHERE id = $4`,
                    [aggregateSellerStatus, aggregateAdminStatus, JSON.stringify(vMap), orderId]
                );
            } catch (err2) {
                console.error('[updateVendorOrderStatus] Failed to update order customFields:', err2);
            }
        }

        // Cascade the status down to the vendor's lines if requested
        if (statusType === 'sellerStatus' && cascade) {
            try {
                if (vendorId) {
                    await this.connection.rawConnection.query(
                        `UPDATE order_line ol
                         SET "customFieldsSellerstatus" = $1
                         FROM product_variant pv, product p
                         WHERE ol."orderId" = $2 
                         AND ol."productVariantId" = pv.id 
                         AND pv."productId" = p.id 
                         AND COALESCE(ol."customFieldsAssignedvendorid", p."customFieldsVendorid") = $3
                         AND COALESCE(ol."customFieldsSellerstatus", '') NOT IN ('refused', 'reassigned_to_other', 'reassigning')`,
                        [newStatus, orderId, vendorId]
                    );
                } else {
                    await this.connection.rawConnection.query(
                        `UPDATE order_line SET "customFieldsSellerstatus" = $1 
                         WHERE "orderId" = $2 
                         AND COALESCE("customFieldsSellerstatus", '') NOT IN ('refused', 'reassigned_to_other', 'reassigning')`,
                        [newStatus, orderId]
                    );
                }
            } catch (err3) {
                console.error('[updateVendorOrderStatus] Failed to cascade sellerStatus to lines:', err3);
            }
        }

        // Trigger native Vendure order transitions if appropriate
        try {
            if (aggregateAdminStatus === 'shipped' || newStatus === 'shipped') {
                await this.orderService.transitionToState(ctx, orderId, 'Shipped').catch(() => null);
            } else if (aggregateAdminStatus === 'delivered' || newStatus === 'delivered') {
                await this.orderService.transitionToState(ctx, orderId, 'Delivered').catch(() => null);
            } else if (aggregateAdminStatus === 'cancelled' || newStatus === 'cancelled') {
                await this.orderService.transitionToState(ctx, orderId, 'Cancelled').catch(() => null);
            }
        } catch (stateErr) {
            console.error('[updateVendorOrderStatus] Native transition error:', stateErr);
        }

        return true;
    }

    async updateVendorOrderLineStatus(
        ctx: RequestContext,
        lineId: string,
        vendorId: string,
        newStatus: string
    ): Promise<boolean> {
        // 1. Fetch the OrderLine
        const rawLines = await this.connection.rawConnection.query(
            `SELECT ol.id, ol."orderId", COALESCE(ol."customFieldsAssignedvendorid", p."customFieldsVendorid") as vendor_id
             FROM order_line ol
             JOIN product_variant pv ON ol."productVariantId" = pv.id
             JOIN product p ON pv."productId" = p.id
             WHERE ol.id = $1 LIMIT 1`,
            [lineId]
        );

        if (!rawLines || rawLines.length === 0) {
            throw new Error('Order line not found');
        }

        const line = rawLines[0];

        // 2. Verify ownership
        if (String(line.vendor_id) !== String(vendorId)) {
            throw new Error('You do not have permission to update this order line');
        }

        if (newStatus === 'refused') {
            newStatus = 'reassigning';
        }

        // 3. Update the OrderLine custom field — column is 'customFieldsSellerstatus' (lowercase s)
        await this.connection.rawConnection.query(
            `UPDATE order_line SET "customFieldsSellerstatus" = $1 WHERE id = $2`,
            [newStatus, lineId]
        );

        // 4. Check all lines for this vendor in the order to aggregate the vendor suborder status
        const allVendorLines = await this.connection.rawConnection.query(
            `SELECT ol.id, ol."customFieldsSellerstatus"
             FROM order_line ol
             JOIN product_variant pv ON ol."productVariantId" = pv.id
             JOIN product p ON pv."productId" = p.id
             WHERE ol."orderId" = $1 AND COALESCE(ol."customFieldsAssignedvendorid", p."customFieldsVendorid") = $2`,
            [line.orderId, vendorId]
        );

        let allConfirmed = true;
        let allReassigning = true;

        for (const l of allVendorLines) {
            const status = l.customFieldsSellerstatus || 'pending';
            if (status !== 'confirmed') allConfirmed = false;
            if (status !== 'reassigning' && status !== 'refused') allReassigning = false;
        }

        let newVendorStatus = 'pending';
        if (allConfirmed) newVendorStatus = 'confirmed';
        else if (allReassigning) newVendorStatus = 'reassigning';

        // 5. Update the vendor suborder status by calling existing method (without cascading)
        await this.updateVendorOrderStatus(ctx, line.orderId, vendorId, 'sellerStatus', newVendorStatus, false);

        return true;
    }

    /**
     * Client accepts order after a vendor cancellation: Removes cancelled vendor's items from order,
     * updates vendorStatuses, and recalculates order total & shipping.
     */
    async acceptOrderWithoutCancelledVendor(ctx: RequestContext, orderId: string, cancelledVendorId: string): Promise<boolean> {
        try {
            const rawOrder = await this.connection.rawConnection.query(
                `SELECT * FROM "order" WHERE id = $1 LIMIT 1`,
                [orderId]
            );
            if (!rawOrder || !rawOrder[0]) throw new Error('Order not found');

            const order = rawOrder[0];

            // 1. Remove order lines belonging to cancelledVendorId
            const rawLines = await this.connection.rawConnection.query(
                `SELECT ol.id, p."customFieldsVendorid" as vendor_id
                 FROM order_line ol
                 JOIN product_variant pv ON ol."productVariantId" = pv.id
                 JOIN product p ON pv."productId" = p.id
                 WHERE ol."orderId" = $1`,
                [orderId]
            );

            const linesToRemove = rawLines.filter((l: any) => String(l.vendor_id) === String(cancelledVendorId));
            for (const line of linesToRemove) {
                await this.connection.rawConnection.query(`DELETE FROM order_line WHERE id = $1`, [line.id]);
            }

            // 2. Update vendorStatuses JSON
            let vMap: Record<string, any> = {};
            try {
                const vsStr = order.customFieldsVendorstatuses || order.customFieldsVendorStatuses || order.customFields?.vendorStatuses;
                if (vsStr) {
                    vMap = typeof vsStr === 'string' ? JSON.parse(vsStr) : vsStr;
                }
            } catch (e) {}

            delete vMap[String(cancelledVendorId)];

            // Recalculate aggregate statuses
            const vIdList = Object.keys(vMap);
            let aggregateSellerStatus = 'confirmed';
            let aggregateAdminStatus = 'pending';
            if (vIdList.length > 0) {
                const sellerStatuses = vIdList.map(id => vMap[id]?.sellerStatus || 'pending');
                if (sellerStatuses.every(s => s === 'confirmed')) aggregateSellerStatus = 'confirmed';
                else if (sellerStatuses.every(s => s === 'refused')) aggregateSellerStatus = 'refused';
                else aggregateSellerStatus = 'pending';
            }

            // 3. Recalculate order total from remaining lines
            const remainingLines = await this.connection.rawConnection.query(
                `SELECT SUM("listPrice" * "quantity") as subtotal FROM order_line WHERE "orderId" = $1`,
                [orderId]
            );
            const newSubtotal = Number(remainingLines[0]?.subtotal || 0);
            const shippingFee = Number(order.shippingWithTax || order.shipping || 500);
            const newTotal = newSubtotal + shippingFee;

            try {
                await this.connection.rawConnection.query(
                    `UPDATE "order" 
                     SET "subTotalWithTax" = $1,
                         "subTotal" = $1,
                         "shippingWithTax" = $2,
                         "shipping" = $2,
                         "customFieldsSellerstatus" = $3,
                         "customFieldsAdminstatus" = $4,
                         "customFieldsVendorstatuses" = $5
                     WHERE id = $6`,
                    [newSubtotal, shippingFee, aggregateSellerStatus, aggregateAdminStatus, JSON.stringify(vMap), orderId]
                );
            } catch (err2) {
                console.error('[acceptOrderWithoutCancelledVendor] Error updating order:', err2);
            }

            return true;
        } catch (e) {
            console.error('[acceptOrderWithoutCancelledVendor] Error:', e);
            throw e;
        }
    }

    /**
     * Client accepts order after rejecting items: Removes all items in 'reassigning' state,
     * updates vendorStatuses, and recalculates order total & shipping using geo-engine.
     */
    async continueOrderWithoutReassignedItems(ctx: RequestContext, orderId: string, targetLineId?: string): Promise<boolean> {
        try {
            const rawOrder = await this.connection.rawConnection.query(
                `SELECT * FROM "order" WHERE id = $1 LIMIT 1`,
                [orderId]
            );
            if (!rawOrder || !rawOrder[0]) throw new Error('Order not found');

            const order = rawOrder[0];

            // 1. Fetch vendorStatuses JSON map to identify refused vendors
            let vMap: Record<string, any> = {};
            try {
                const vsStr = order.customFieldsVendorstatuses || order.customFieldsVendorStatuses || order.customFields?.vendorStatuses;
                if (vsStr) {
                    vMap = typeof vsStr === 'string' ? JSON.parse(vsStr) : vsStr;
                }
            } catch (e) {}

            const refusedVendorIds = Object.keys(vMap).filter(id => vMap[id]?.sellerStatus === 'refused' || vMap[id]?.sellerStatus === 'reassigning');

            // 2. Remove order lines that are in 'reassigning'/'refused' status or belong to a refused vendor
            const rawLines = await this.connection.rawConnection.query(
                `SELECT ol.id, COALESCE(ol."customFieldsAssignedvendorid", p."customFieldsVendorid") as vendor_id, ol."customFieldsSellerstatus"
                 FROM order_line ol
                 JOIN product_variant pv ON ol."productVariantId" = pv.id
                 JOIN product p ON pv."productId" = p.id
                 WHERE ol."orderId" = $1`,
                [orderId]
            );

            const linesToDelete = rawLines.filter((l: any) => {
                if (targetLineId) {
                    return String(l.id) === String(targetLineId);
                }
                return (
                    l.customFieldsSellerstatus === 'reassigning' || 
                    l.customFieldsSellerstatus === 'refused'
                );
            });

            for (const line of linesToDelete) {
                try {
                    await this.connection.rawConnection.query(`UPDATE stock_movement SET "orderLineId" = NULL WHERE "orderLineId" = $1`, [line.id]);
                } catch (se) {}
                await this.connection.rawConnection.query(
                    `UPDATE order_line SET "customFieldsSellerstatus" = 'cancelled', "listPrice" = 0 WHERE id = $1`, 
                    [line.id]
                );
            }

            // 3. Fetch remaining lines to update order totals and vendor map
            const remainingLines = await this.connection.rawConnection.query(
                `SELECT ol.id, COALESCE(ol."customFieldsAssignedvendorid", p."customFieldsVendorid") as vendor_id,
                        ol."customFieldsSellerstatus" as seller_status,
                        (ol."listPrice" * ol."quantity") as line_total
                 FROM order_line ol
                 JOIN product_variant pv ON ol."productVariantId" = pv.id
                 JOIN product p ON pv."productId" = p.id
                 WHERE ol."orderId" = $1 AND COALESCE(ol."customFieldsSellerstatus", '') != 'cancelled'`,
                [orderId]
            );

            // If 0 lines remain, cancel the entire order via native transition
            if (!remainingLines || remainingLines.length === 0) {
                await this.orderService.transitionToState(ctx, orderId, 'Cancelled').catch(err => {
                    console.warn('[continueOrderWithoutReassignedItems] Cancel transition warning:', err?.message || err);
                });
                await this.connection.rawConnection.query(
                    `UPDATE "order" SET "customFieldsSellerstatus" = 'refused', "customFieldsAdminstatus" = 'cancelled' WHERE id = $1`,
                    [orderId]
                );
                return true;
            }

            const remainingVendorMap: Record<string, string[]> = {};
            let newSubtotal = 0;
            for (const line of remainingLines) {
                const vId = String(line.vendor_id);
                if (!remainingVendorMap[vId]) remainingVendorMap[vId] = [];
                remainingVendorMap[vId].push(line.seller_status || 'pending');
                newSubtotal += Number(line.line_total || 0);
            }

            // 4. Update vendorStatuses JSON map: update status per remaining vendor, delete dropped vendors
            for (const key of Object.keys(vMap)) {
                if (!remainingVendorMap[key] || remainingVendorMap[key].length === 0) {
                    delete vMap[key];
                } else {
                    const lineStatuses = remainingVendorMap[key];
                    if (lineStatuses.every(s => s === 'confirmed')) {
                        vMap[key].sellerStatus = 'confirmed';
                    } else if (lineStatuses.some(s => s === 'refused' || s === 'reassigning')) {
                        vMap[key].sellerStatus = 'reassigning';
                    } else {
                        vMap[key].sellerStatus = 'pending';
                    }
                }
            }

            // Recalculate aggregate statuses
            const vIdList = Object.keys(vMap);
            let aggregateSellerStatus = 'confirmed';
            let aggregateAdminStatus = 'pending';
            if (vIdList.length > 0) {
                const sellerStatuses = vIdList.map(id => vMap[id]?.sellerStatus || 'pending');
                if (sellerStatuses.every(s => s === 'confirmed')) aggregateSellerStatus = 'confirmed';
                else if (sellerStatuses.some(s => s === 'refused' || s === 'reassigning')) aggregateSellerStatus = 'reassigning';
                else aggregateSellerStatus = 'pending';
            }

            // 4. Recalculate Shipping Fee
            // We need a hydrated Order object to pass to calculate()
            const fullOrder = await this.connection.getRepository(ctx, Order).findOne({
                where: { id: orderId as any },
                relations: ['lines', 'lines.productVariant', 'lines.productVariant.product']
            });
            
            let shippingFee = 500;
            if (fullOrder) {
                // Ensure shippingAddress is loaded via raw if not in relations
                if (!fullOrder.shippingAddress) {
                    try {
                        const addrDataStr = order.shippingAddress;
                        fullOrder.shippingAddress = typeof addrDataStr === 'string' ? JSON.parse(addrDataStr) : addrDataStr;
                    } catch (e) {}
                }
                const geoEngineShippingCalculator = require('../../geo-engine/shipping/geo-engine-shipping.calculator').geoEngineShippingCalculator;
                try {
                    const result = await geoEngineShippingCalculator.calculate(ctx, fullOrder, []);
                    if (result && typeof result.priceWithTax === 'number') {
                        shippingFee = result.priceWithTax;
                    }
                } catch (calcErr) {
                    console.error('[continueOrderWithoutReassignedItems] Geo shipping calc failed, fallback to 500:', calcErr);
                }
            }

            const newTotal = newSubtotal + shippingFee;

            // 5. Update the Order
            try {
                await this.connection.rawConnection.query(
                    `UPDATE "order" 
                     SET "subTotalWithTax" = $1,
                         "subTotal" = $1,
                         "shippingWithTax" = $2,
                         "shipping" = $2,
                         "customFieldsSellerstatus" = $3,
                         "customFieldsAdminstatus" = $4,
                         "customFieldsVendorstatuses" = $5
                     WHERE id = $6`,
                    [newSubtotal, shippingFee, aggregateSellerStatus, aggregateAdminStatus, JSON.stringify(vMap), orderId]
                );
            } catch (err2) {
                console.error('[continueOrderWithoutReassignedItems] Error updating order:', err2);
            }

            return true;
        } catch (e) {
            console.error('[continueOrderWithoutReassignedItems] Error:', e);
            throw e;
        }
    }
    async reassignVendorSubOrder(ctx: RequestContext, orderId: string, oldVendorId: string, newVendorId: string): Promise<boolean> {
        try {
            // 1. Find all order lines belonging to oldVendorId
            const rawLines = await this.connection.rawConnection.query(
                `SELECT ol.id, pv.id as variant_id, ol.quantity, ol.unit_price_with_tax as unit_price, p."customFieldsVendorid" as vendor_id
                 FROM order_line ol
                 JOIN product_variant pv ON ol."productVariantId" = pv.id
                 JOIN product p ON pv."productId" = p.id
                 WHERE ol."orderId" = $1 AND ol.quantity > 0`,
                [orderId]
            );

            const targetLines = rawLines.filter((l: any) => String(l.vendor_id) === String(oldVendorId));

            // 2. Reassign each line individually (this clones the product to the new vendor)
            for (const line of targetLines) {
                // Pass unit price (not line total) to preserve per-unit pricing after reassignment
                await this.reassignOrderLineToProduct(ctx, orderId, line.id, Number(line.unit_price), newVendorId);
            }

            // 3. Fetch the updated order to manipulate statuses and totals
            const rawOrder = await this.connection.rawConnection.query(
                `SELECT * FROM "order" WHERE id = $1 LIMIT 1`,
                [orderId]
            );
            if (!rawOrder || !rawOrder[0]) throw new Error('Order not found after reassignment');
            const order = rawOrder[0];

            let vMap: Record<string, any> = {};
            try {
                const vsStr = order.customFieldsVendorstatuses || order.customFieldsVendorStatuses || order.customFields?.vendorStatuses;
                if (vsStr) {
                    vMap = typeof vsStr === 'string' ? JSON.parse(vsStr) : vsStr;
                }
            } catch (e) {}

            // Update vendor specific statuses
            if (vMap[String(oldVendorId)]) {
                vMap[String(oldVendorId)].sellerStatus = 'reassigned_to_other';
            } else {
                vMap[String(oldVendorId)] = { sellerStatus: 'reassigned_to_other', adminStatus: 'cancelled' };
            }

            vMap[String(newVendorId)] = {
                sellerStatus: 'pending',
                adminStatus: 'pending',
                isPaid: false,
                paymentStatus: 'PENDING'
            };

            // Aggregate status logic
            const vIdList = Object.keys(vMap).filter(id => vMap[id].sellerStatus !== 'reassigned_to_other');
            let aggregateSellerStatus = 'pending';
            if (vIdList.length > 0) {
                const sellerStatuses = vIdList.map(id => vMap[id]?.sellerStatus || 'pending');
                if (sellerStatuses.every(s => s === 'confirmed')) aggregateSellerStatus = 'confirmed';
            }

            // 4. Recalculate Shipping Fee
            const fullOrder = await this.connection.getRepository(ctx, Order).findOne({
                where: { id: orderId as any },
                relations: ['lines', 'lines.productVariant', 'lines.productVariant.product']
            });
            
            let shippingFee = 500;
            if (fullOrder) {
                if (!fullOrder.shippingAddress) {
                    try {
                        const addrDataStr = order.shippingAddress;
                        fullOrder.shippingAddress = typeof addrDataStr === 'string' ? JSON.parse(addrDataStr) : addrDataStr;
                    } catch (e) {}
                }
                const geoEngineShippingCalculator = require('../../geo-engine/shipping/geo-engine-shipping.calculator').geoEngineShippingCalculator;
                try {
                    const result = await geoEngineShippingCalculator.calculate(ctx, fullOrder, {});
                    if (result && typeof result.priceWithTax === 'number') {
                        shippingFee = result.priceWithTax;
                    }
                } catch (calcErr) {
                    console.error('[reassignVendorSubOrder] Geo shipping calc failed:', calcErr);
                }
            }

            const newSubtotal = Number(order.subTotalWithTax || order.subTotal || 0);
            const newTotal = newSubtotal + shippingFee;

            // 5. Update Order in DB
            try {
                await this.connection.rawConnection.query(
                    `UPDATE "order" 
                     SET "shippingWithTax" = $1,
                         "shipping" = $1,
                         "customFieldsSellerstatus" = $2,
                         "customFieldsVendorstatuses" = $3
                     WHERE id = $4`,
                    [shippingFee, aggregateSellerStatus, JSON.stringify(vMap), orderId]
                );
            } catch (err2) {
                console.error('[reassignVendorSubOrder] Error updating order:', err2);
            }

            // 6. Notify the new vendor
            try {
                const newVendorRows = await this.connection.rawConnection.query(
                    `SELECT id, "userId", email, name FROM vendor WHERE id = $1 LIMIT 1`,
                    [newVendorId]
                );
                if (newVendorRows && newVendorRows[0] && newVendorRows[0].userId) {
                    await this.notificationsService.notify(ctx, {
                        userId: newVendorRows[0].userId.toString(),
                        eventType: 'VENDOR_EVENT',
                        title: 'Nouvelle Vente (Réassignation) !',
                        body: `Félicitations ! Une commande #${order.code} vous a été réassignée.`,
                        actionUrl: `/dashboard/orders`,
                        channels: ['IN_APP', 'PUSH']
                    });
                }
            } catch (notifErr: any) {
                console.error('[reassignVendorSubOrder] Failed to send notification to new vendor:', notifErr?.message || notifErr);
            }

            return true;
        } catch (e) {
            console.error('[reassignVendorSubOrder] Error:', e);
            throw e;
        }
    }

    /**
     * Superadmin reassigns a specific line to a new product & new vendor with custom price.
     */
    async reassignOrderLineToProduct(
        ctx: RequestContext, 
        orderId: string, 
        lineId: string, 
        newPrice: number, 
        newVendorId: string,
        newProductId?: string,
        newProductName?: string
    ): Promise<boolean> {
        try {
            let variantId: string;
            const priceInCents = Math.round(newPrice);

            const originalVariants = await this.connection.rawConnection.query(
                `SELECT pv.id as "variantId", pv."taxCategoryId", p.id as "productId", p."featuredAssetId", p."customFieldsVendorid" as "originalVendorId", ol."customFieldsAssignedvendorid", ol.quantity
                 FROM order_line ol
                 JOIN product_variant pv ON ol."productVariantId" = pv.id
                 JOIN product p ON pv."productId" = p.id
                 WHERE ol.id = $1 LIMIT 1`,
                [lineId]
            );
            if (!originalVariants || !originalVariants[0]) throw new Error('Original product not found');
            const orig = originalVariants[0];

            if (newProductId) {
                const targetProduct = await this.productService.findOne(ctx, newProductId, ['variants']);
                if (!targetProduct || !targetProduct.variants || targetProduct.variants.length === 0) {
                    throw new Error('Target product variant not found');
                }
                variantId = String(targetProduct.variants[0].id);
            } else {
                let targetVendor = await this.findOne(ctx, newVendorId);
                if (!targetVendor) throw new Error('Target vendor not found');

                if (!targetVendor.channelId || !targetVendor.sellerId) {
                    targetVendor = await this.ensureNativeSellerAndChannel(ctx, targetVendor);
                }

                const origProduct = await this.productService.findOne(ctx, orig.productId, ['translations']);
                const origTranslation = origProduct?.translations.find(t => t.languageCode === ctx.languageCode) || origProduct?.translations[0];
                const finalName = newProductName || origTranslation?.name || 'Reassigned Product';
                const finalSlug = (newProductName ? newProductName.toLowerCase().replace(/[^a-z0-9]+/g, '-') : (origTranslation?.slug || 'product')) + '-' + Date.now();

                const createdProduct = await this.productService.create(ctx, {
                    translations: [{
                        languageCode: ctx.languageCode,
                        name: finalName,
                        slug: finalSlug,
                        description: origTranslation?.description || '',
                    }],
                    enabled: true,
                    featuredAssetId: orig.featuredAssetId || undefined,
                    customFields: {
                        vendor: { id: targetVendor.id },
                        approvalStatus: 'approved',
                    }
                });

                const vendorPrefix = (targetVendor.name || 'VND').substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'V');
                const createdVariants = await this.productVariantService.create(ctx, [{
                    productId: createdProduct.id,
                    sku: `${vendorPrefix}-${Date.now()}`,
                    price: priceInCents,
                    stockOnHand: 100,
                    translations: [{
                        languageCode: ctx.languageCode,
                        name: finalName,
                    }]
                }]);
                const createdVariant = createdVariants[0];
                variantId = String(createdVariant.id);

                if (targetVendor.channelId) {
                    try {
                        await this.channelService.assignToChannels(ctx, Product, createdProduct.id, [targetVendor.channelId]);
                        await this.channelService.assignToChannels(ctx, ProductVariant, createdVariant.id, [targetVendor.channelId]);
                    } catch (chanErr) {
                        console.error('[reassignOrderLineToProduct] Channel assignment error:', chanErr);
                    }
                }

                this.eventBus.publish(new ProductEvent(ctx, createdProduct, 'created', { id: createdProduct.id }));
            }

            const originalVendorId = orig.customFieldsAssignedvendorid || orig.originalVendorId;
            const origQuantity = orig.quantity || 1;

            // 1. Keep the original line, set status to reassigned_to_other, quantity to 0
            await this.connection.rawConnection.query(
                `UPDATE order_line 
                 SET "customFieldsSellerstatus" = 'reassigned_to_other', 
                     "quantity" = 0,
                     "orderPlacedQuantity" = 0,
                     "customFieldsAssignedvendorid" = $1
                 WHERE id = $2`,
                [originalVendorId, lineId]
            );

            // 2. Insert a cloned line for the new vendor with the original quantity and status pending
            await this.connection.rawConnection.query(
                `INSERT INTO order_line (
                    "createdAt", "updatedAt", "quantity", "orderPlacedQuantity", 
                    "listPriceIncludesTax", "adjustments", "taxLines", 
                    "sellerChannelId", "shippingLineId", "productVariantId", 
                    "taxCategoryId", "initialListPrice", "listPrice", 
                    "featuredAssetId", "orderId", 
                    "customFieldsSellerstatus", "customFieldsAssignedvendorid"
                )
                SELECT 
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $1, $1, 
                    "listPriceIncludesTax", adjustments, "taxLines", 
                    "sellerChannelId", "shippingLineId", $2, 
                    "taxCategoryId", $3, $3, 
                    "featuredAssetId", "orderId", 
                    'pending', $4
                FROM order_line
                WHERE id = $5`,
                [origQuantity, variantId, priceInCents, newVendorId, lineId]
            );

            const rawOrder = await this.connection.rawConnection.query(
                `SELECT * FROM "order" WHERE id = $1 LIMIT 1`,
                [orderId]
            );
            if (rawOrder && rawOrder[0]) {
                const order = rawOrder[0];
                let vMap: Record<string, any> = {};
                try {
                    const vsStr = order.customFieldsVendorstatuses || order.customFieldsVendorStatuses || order.customFields?.vendorStatuses;
                    if (vsStr) {
                        vMap = typeof vsStr === 'string' ? JSON.parse(vsStr) : vsStr;
                    }
                } catch (e) {}

                vMap[String(newVendorId)] = {
                    sellerStatus: 'pending',
                    adminStatus: 'pending',
                    isPaid: false,
                    paymentStatus: 'PENDING'
                };

                const remainingLines = await this.connection.rawConnection.query(
                    `SELECT SUM("listPrice" * "quantity") as subtotal FROM order_line WHERE "orderId" = $1`,
                    [orderId]
                );
                const newSubtotal = Number(remainingLines[0]?.subtotal || 0);
                const shippingFee = Number(order.shippingWithTax || order.shipping || 500);
                const newTotal = newSubtotal + shippingFee;

                try {
                    await this.connection.rawConnection.query(
                        `UPDATE "order" 
                         SET "subTotalWithTax" = $1,
                             "subTotal" = $1,
                             "customFieldsSellerstatus" = 'pending',
                             "customFieldsVendorstatuses" = $2
                         WHERE id = $3`,
                        [newSubtotal, JSON.stringify(vMap), orderId]
                    );
                } catch (err2) {
                    console.error('[reassignOrderLineToProduct] Error updating order:', err2);
                }

                // Notify new vendor
                try {
                    const newVendorRows = await this.connection.rawConnection.query(
                        `SELECT id, "userId", email, name FROM vendor WHERE id = $1 LIMIT 1`,
                        [newVendorId]
                    );
                    if (newVendorRows && newVendorRows[0] && newVendorRows[0].userId) {
                        await this.notificationsService.notify(ctx, {
                            userId: newVendorRows[0].userId.toString(),
                            eventType: 'VENDOR_EVENT',
                            title: 'Nouvelle Vente (Réassignation) !',
                            body: `Félicitations ! Une commande #${order.code} vous a été réassignée.`,
                            actionUrl: `/dashboard/orders`,
                            channels: ['IN_APP', 'PUSH']
                        });
                    }
                } catch (notifErr: any) {
                    console.error('[reassignOrderLineToProduct] Failed to send notification to new vendor:', notifErr?.message || notifErr);
                }
            }

            return true;
        } catch (e) {
            console.error('[reassignOrderLineToProduct] Error:', e);
            throw e;
        }
    }

    async deleteVendorOrder(ctx: RequestContext, orderId: string): Promise<boolean> {
        try {
            await this.connection.rawConnection.query(`DELETE FROM refund WHERE "paymentId" IN (SELECT id FROM payment WHERE "orderId" = $1)`, [orderId]);
            await this.connection.rawConnection.query(`DELETE FROM order_modification WHERE "paymentId" IN (SELECT id FROM payment WHERE "orderId" = $1) OR "orderId" = $1`, [orderId]);
            await this.connection.rawConnection.query(`DELETE FROM payment WHERE "orderId" = $1`, [orderId]);
            
            await this.connection.rawConnection.query(`DELETE FROM stock_movement WHERE "orderLineId" IN (SELECT id FROM order_line WHERE "orderId" = $1)`, [orderId]);
            await this.connection.rawConnection.query(`DELETE FROM order_line_reference WHERE "orderLineId" IN (SELECT id FROM order_line WHERE "orderId" = $1)`, [orderId]);
            await this.connection.rawConnection.query(`DELETE FROM order_line WHERE "orderId" = $1`, [orderId]);
            
            await this.connection.rawConnection.query(`DELETE FROM shipping_line WHERE "orderId" = $1`, [orderId]);
            await this.connection.rawConnection.query(`DELETE FROM surcharge WHERE "orderId" = $1`, [orderId]);
            await this.connection.rawConnection.query(`DELETE FROM history_entry WHERE "orderId" = $1`, [orderId]);
            await this.connection.rawConnection.query(`DELETE FROM order_promotions_promotion WHERE "orderId" = $1`, [orderId]);
            await this.connection.rawConnection.query(`DELETE FROM order_channels_channel WHERE "orderId" = $1`, [orderId]);
            await this.connection.rawConnection.query(`DELETE FROM order_fulfillments_fulfillment WHERE "orderId" = $1`, [orderId]);
            
            await this.connection.rawConnection.query(`UPDATE session SET "activeOrderId" = NULL WHERE "activeOrderId" = $1`, [orderId]);
            await this.connection.rawConnection.query(`DELETE FROM "order" WHERE id = $1`, [orderId]);
            return true;
        } catch (e) {
            console.error('[deleteVendorOrder] Error deleting order:', e);
            throw e;
        }
    }

    async findAllProductsForVendor(ctx: RequestContext, vendorId: string): Promise<Product[]> {
        return this.connection.getRepository(ctx, Product)
            .createQueryBuilder('product')
            .leftJoinAndSelect('product.translations', 'translations')
            .leftJoinAndSelect('product.featuredAsset', 'featuredAsset')
            .leftJoinAndSelect('product.assets', 'assets')
            .leftJoinAndSelect('product.variants', 'variants')
            .leftJoinAndSelect('variants.translations', 'variantTranslations')
            .leftJoinAndSelect('variants.options', 'options')
            .leftJoinAndSelect('options.group', 'group')
            .leftJoinAndSelect('product.customFields.vendor', 'vendor')
            .where('vendor.id = :vendorId', { vendorId })
            .andWhere('product.deletedAt IS NULL')
            .getMany();
    }

    async create(ctx: RequestContext, input: {
        name?: string;
        firstName?: string;
        lastName?: string;
        email?: string;
        phoneNumber?: string;
        address?: string;
        description?: string;
        logoId?: string;
        logo?: any; // Upload
        coverImageId?: string;
        coverImage?: any; // Upload
        zone?: string;
        deliveryInfo?: string;
        returnPolicy?: string;
        rating?: number;
        ratingCount?: number;
        type?: string;
        commissionRate?: number;

        rccmNumber?: string;
        rccmFile?: any; // Upload
        ifuNumber?: string;
        ifuFile?: any; // Upload
        idCardNumber?: string;
        idCardFile?: any; // Upload
        website?: string;
        facebook?: string;
        instagram?: string;

        dynamicDetails?: any;

        userId?: string;
        password?: string;

        // Geolocation Inputs
        latitude?: number;
        longitude?: number;
        locationId?: string | number;
        physicalMarketId?: string | number;
        marketIds?: string[] | number[];
    }): Promise<Vendor> {
        // Generate defaults if missing
        const timestamp = new Date().getTime();
        const finalName = input.name || `Vendor ${timestamp}`;
        const finalEmail = input.email || `no-email-${timestamp}@ahizan.com`; // Placeholder email

        // Create SuperAdmin Context for the entire operation
        const adminCtx = await this.getSuperAdminContext(ctx);
        console.log('VendorService.create: Starting with SuperAdmin context');

        // --- EMAIL & PASSWORD VALIDATIONS ---
        if (!input.email || input.email.trim() === '') {
            throw new UserInputError("L'adresse email est obligatoire.");
        }

        if (!input.userId) {
            if (!input.password || input.password.trim() === '') {
                throw new UserInputError("Le mot de passe est obligatoire.");
            }
            
            // Check if user with same identifier already exists
            const existingUser = await this.connection.getRepository(ctx, User).findOne({
                where: { identifier: input.email }
            });
            if (existingUser) {
                throw new UserInputError(`L'adresse email "${input.email}" est déjà utilisée par un autre compte.`);
            }
        }

        // Check if vendor profile already exists for userId or email before creating
        if (input.userId) {
            const existingByUserId = await this.findByUserId(ctx, input.userId);
            if (existingByUserId) {
                console.log(`VendorService.create: Vendor profile already exists for user ${input.userId} (ID: ${existingByUserId.id}). Updating.`);
                return this.update(ctx, existingByUserId.id.toString(), input as any);
            }
        } else if (input.email && !input.email.startsWith('no-email-')) {
            const existingByEmail = await this.connection.getRepository(ctx, Vendor).findOne({
                where: { email: input.email },
                relations: ['logo', 'coverImage', 'user']
            });
            if (existingByEmail) {
                console.log(`VendorService.create: Vendor profile already exists for email ${input.email} (ID: ${existingByEmail.id}). Updating.`);
                return this.update(ctx, existingByEmail.id.toString(), input as any);
            }
        }

        // Ensure dynamicDetails is initialized
        if (!input.dynamicDetails) {
            input.dynamicDetails = {};
        }

        // Map firstName and lastName to dynamicDetails if present (so they are saved)
        if (input.firstName) input.dynamicDetails['firstName'] = input.firstName;
        if (input.lastName) input.dynamicDetails['lastName'] = input.lastName;
        // Also map implicitly if they are passed as top-level args but validation expects them
        // (This step handles the mapping before validation loop)

        // --- VALIDATION OF DYNAMIC FIELDS (Server-Side - Shop API Only) ---
        if (ctx.apiType === 'shop') {
            const registrationFields = await this.connection.getRepository(ctx, RegistrationField).find({
                where: { enabled: true }
            });

            for (const field of registrationFields) {
                if (field.required) {
                    let isPresent = false;
                    const fieldName = field.name;

                    // Check standard fields mapped in input
                    if (fieldName === 'name') isPresent = !!input.name;
                    else if (fieldName === 'firstName') isPresent = !!input.firstName || !!input.dynamicDetails['firstName'];
                    else if (fieldName === 'lastName') isPresent = !!input.lastName || !!input.dynamicDetails['lastName'];
                    else if (fieldName === 'email') isPresent = !!input.email;
                    else if (fieldName === 'phoneNumber') isPresent = !!input.phoneNumber;
                    else if (fieldName === 'address') isPresent = !!input.address;
                    else if (fieldName === 'description') isPresent = !!input.description;
                    else if (fieldName === 'zone') isPresent = !!input.zone;
                    else if (fieldName === 'deliveryInfo') isPresent = !!input.deliveryInfo;
                    else if (fieldName === 'returnPolicy') isPresent = !!input.returnPolicy;
                    else if (fieldName === 'type') isPresent = !!input.type;
                    else if (fieldName === 'website') isPresent = !!input.website;
                    else if (fieldName === 'facebook') isPresent = !!input.facebook;
                    else if (fieldName === 'instagram') isPresent = !!input.instagram;
                    else if (fieldName === 'rccmNumber') isPresent = !!input.rccmNumber;
                    else if (fieldName === 'ifuNumber') isPresent = !!input.ifuNumber;
                    else if (fieldName === 'idCardNumber') isPresent = !!input.idCardNumber;
                    else if (fieldName === 'locationId') isPresent = !!input.locationId;

                    // Check file fields
                    else if (fieldName === 'rccmFile') isPresent = !!input.rccmFile && input.rccmFile.size > 0;
                    else if (fieldName === 'ifuFile') isPresent = !!input.ifuFile && input.ifuFile.size > 0;
                    else if (fieldName === 'idCardFile') isPresent = !!input.idCardFile && input.idCardFile.size > 0;
                    else if (fieldName === 'logo') isPresent = !!input.logoId; // Or check input.logo if handled differently
                    else if (fieldName === 'coverImage') isPresent = !!input.coverImageId;

                    // Check dynamicDetails for other fields
                    else {
                        isPresent = input.dynamicDetails && input.dynamicDetails[fieldName] !== undefined && input.dynamicDetails[fieldName] !== null && input.dynamicDetails[fieldName] !== '';
                    }

                    if (!isPresent) {
                        throw new UserInputError(`Le champ "${field.label}" est obligatoire.`);
                    }
                }
            }
        }
        // --------------------------------------------------

        const vendor = new Vendor({
            name: finalName,
            email: finalEmail,
            phoneNumber: input.phoneNumber,
            address: input.address,
            description: input.description,
            zone: input.zone,
            deliveryInfo: input.deliveryInfo,
            returnPolicy: input.returnPolicy,
            rating: input.rating || 0,
            ratingCount: input.ratingCount || 0,
            type: input.type as any || 'INDIVIDUAL',
            status: VendorStatus.PENDING,
            commissionRate: input.commissionRate !== undefined ? Number(input.commissionRate) : 10,

            rccmNumber: input.rccmNumber,
            ifuNumber: input.ifuNumber,
            idCardNumber: input.idCardNumber,
            website: input.website,
            facebook: input.facebook,
            instagram: input.instagram,

            paymentMethod: (input as any).paymentMethod,
            mobileMoneyProvider: (input as any).mobileMoneyProvider,
            mobileMoneyNumber: (input as any).mobileMoneyNumber,
            bankName: (input as any).bankName,
            bankAccountNumber: (input as any).bankAccountNumber,
            latitude: input.latitude,
            longitude: input.longitude,
            locationId: input.locationId ? Number(input.locationId) : undefined,
            physicalMarketId: input.physicalMarketId ? Number(input.physicalMarketId) : undefined,
            marketIds: input.marketIds ? input.marketIds.map(id => Number(id)) : [],

            dynamicDetails: input.dynamicDetails,
        });

        if (input.logoId) {
            vendor.logo = await this.connection.getEntityOrThrow(adminCtx, Asset, input.logoId);
        }

        if (input.coverImageId) {
            vendor.coverImage = await this.connection.getEntityOrThrow(adminCtx, Asset, input.coverImageId);
        }

        // Handle File Uploads
        if (input.logo) {
            // Check if file is a GIF - if so, skip Sharp processing to preserve animation
            const isGif = input.logo.mimetype === 'image/gif' || input.logo.filename?.toLowerCase().endsWith('.gif');

            if (isGif) {
                // For GIFs, we need to save the file directly without processing
                const fs = require('fs');
                const path = require('path');
                const assetsDir = path.join(__dirname, '../../../static/assets');
                const uniqueName = `${Date.now()}-${input.logo.filename}`;
                const filePath = path.join(assetsDir, uniqueName);

                // Ensure directory exists
                if (!fs.existsSync(assetsDir)) {
                    fs.mkdirSync(assetsDir, { recursive: true });
                }

                // Write file directly
                const buffer = await input.logo.buffer;
                fs.writeFileSync(filePath, buffer);

                // Create asset record manually
                const asset = new Asset();
                asset.name = input.logo.filename;
                asset.type = 'IMAGE' as any;
                asset.mimeType = 'image/gif';
                asset.source = `/assets/${uniqueName}`;
                asset.preview = `/assets/${uniqueName}`;
                asset.fileSize = buffer.length;
                asset.width = 0;
                asset.height = 0;
                asset.focalPoint = { x: 0.5, y: 0.5 };

                const savedAsset = await this.connection.getRepository(adminCtx, Asset).save(asset);
                if (!(savedAsset as any).errorCode) {
                    vendor.logo = savedAsset as Asset;
                }
            } else {
                const asset = await this.assetService.create(adminCtx, { file: input.logo, tags: ['vendor-logo'] });
                if (!(asset as any).errorCode) {
                    vendor.logo = asset as Asset;
                }
            }
        }
        if (input.coverImage) {
            // Check if file is a GIF - if so, skip Sharp processing to preserve animation
            const isGif = input.coverImage.mimetype === 'image/gif' || input.coverImage.filename?.toLowerCase().endsWith('.gif');

            if (isGif) {
                // For GIFs, we need to save the file directly without processing
                const fs = require('fs');
                const path = require('path');
                const assetsDir = path.join(__dirname, '../../../static/assets');
                const uniqueName = `${Date.now()}-${input.coverImage.filename}`;
                const filePath = path.join(assetsDir, uniqueName);

                // Ensure directory exists
                if (!fs.existsSync(assetsDir)) {
                    fs.mkdirSync(assetsDir, { recursive: true });
                }

                // Write file directly
                const buffer = await input.coverImage.buffer;
                fs.writeFileSync(filePath, buffer);

                // Create asset record manually
                const asset = new Asset();
                asset.name = input.coverImage.filename;
                asset.type = 'IMAGE' as any;
                asset.mimeType = 'image/gif';
                asset.source = `/assets/${uniqueName}`;
                asset.preview = `/assets/${uniqueName}`;
                asset.fileSize = buffer.length;
                asset.width = 0;
                asset.height = 0;
                asset.focalPoint = { x: 0.5, y: 0.5 };

                const savedAsset = await this.connection.getRepository(adminCtx, Asset).save(asset);
                if (!(savedAsset as any).errorCode) {
                    vendor.coverImage = savedAsset as Asset;
                }
            } else {
                const asset = await this.assetService.create(adminCtx, { file: input.coverImage, tags: ['vendor-cover'] });
                if (!(asset as any).errorCode) {
                    vendor.coverImage = asset as Asset;
                }
            }
        }
        if (input.rccmFile) {
            const asset = await this.assetService.create(adminCtx, { file: input.rccmFile, tags: ['vendor-doc', 'rccm'] });
            if (!(asset as any).errorCode) {
                vendor.rccmFile = asset as Asset;
            }
        }
        if (input.ifuFile) {
            const asset = await this.assetService.create(adminCtx, { file: input.ifuFile, tags: ['vendor-doc', 'ifu'] });
            if (!(asset as any).errorCode) {
                vendor.ifuFile = asset as Asset;
            }
        }
        if (input.idCardFile) {
            const asset = await this.assetService.create(adminCtx, { file: input.idCardFile, tags: ['vendor-doc', 'id-card'] });
            if (!(asset as any).errorCode) {
                vendor.idCardFile = asset as Asset;
            }
        }

        // Link to user if userId provided (for authenticated users)
        if (input.userId) {
            vendor.user = await this.connection.getEntityOrThrow(adminCtx, User, input.userId);
        } else if (input.password) {
            // Create a new user account for the vendor
            const passwordHash = await this.passwordCipher.hash(input.password);

            const newUser = await this.connection.getRepository(adminCtx, User).save(
                new User({
                    identifier: finalEmail,
                    verified: true,
                })
            );

            await this.connection.getRepository(adminCtx, NativeAuthenticationMethod).save(
                new NativeAuthenticationMethod({
                    identifier: finalEmail,
                    passwordHash,
                    user: newUser
                })
            );

            // Assign Vendor Role (this also creates an Administrator if not present)
            await this.assignVendorRole(adminCtx, newUser.id.toString());



            // Create Customer for Shop Access (if not already exists)
            const existingCustomer = await this.connection.getRepository(adminCtx, Customer).findOne({
                where: { user: { id: newUser.id } }
            });
            if (!existingCustomer) {
                console.log('VendorService.create: Creating Customer entity for user...');
                await this.connection.getRepository(adminCtx, Customer).save(
                    new Customer({
                        emailAddress: finalEmail,
                        firstName: finalName.split(' ')[0] || 'Vendor',
                        lastName: finalName.split(' ')[1] || 'Customer',
                        user: newUser,
                    })
                );
                console.log('VendorService.create: Customer entity created.');
            }


            vendor.user = newUser;
        }

        // Save Geolocation & Markets
        if (input.latitude !== undefined) {
            vendor.latitude = input.latitude;
        }
        if (input.longitude !== undefined) {
            vendor.longitude = input.longitude;
        }
        if (input.locationId) {
            vendor.locationId = Number(input.locationId);
        }
        if (input.physicalMarketId) {
            vendor.physicalMarketId = Number(input.physicalMarketId);
        }
        if (input.marketIds && input.marketIds.length > 0) {
            vendor.marketIds = input.marketIds.map(id => Number(id));
        }

        const newVendor = await this.connection.getRepository(adminCtx, Vendor).save(vendor);
        this.eventBus.publish(new VendorEvent(adminCtx, newVendor, 'created', input));
        console.log('VendorService.create: Registration completed successfully');
        return newVendor;
    }

    async update(ctx: RequestContext, id: string, input: Partial<Vendor> & { 
        logoId?: string; 
        logo?: any; 
        coverImageId?: string; 
        coverImage?: any; 
        rejectionReason?: string; 
        dynamicDetails?: any; 
        latitude?: number; 
        longitude?: number; 
        locationId?: string | number; 
        physicalMarketId?: string | number; 
        marketIds?: string[] | number[];
        rccmFile?: any;
        ifuFile?: any;
        idCardFile?: any;
        rccmFileId?: string;
        ifuFileId?: string;
        idCardFileId?: string;
    }): Promise<Vendor> {
        const vendor = await this.findOne(ctx, id);
        if (!vendor) {
            throw new Error(`Vendor with id ${id} not found`);
        }

        const oldStatus = vendor.status;

        // Logic for Rejection / Suspension Reason
        if (input.status === VendorStatus.REJECTED && input.rejectionReason) {
            vendor.rejectionReason = input.rejectionReason;
        } else if (input.status === VendorStatus.SUSPENDED) {
            if ((input as any).suspensionReason || (input as any).reason) {
                vendor.suspensionReason = (input as any).suspensionReason || (input as any).reason;
            }
        } else if (input.status === VendorStatus.APPROVED) {
            vendor.rejectionReason = ''; // Clear reason on approval
            vendor.suspensionReason = '';
        }

        // Logic for Re-submission (if REJECTED and updating details)
        if (vendor.status === VendorStatus.REJECTED && !input.status && Object.keys(input).length > 0) {
            // Vendor is updating profile, reset to PENDING
            vendor.status = VendorStatus.PENDING;
            vendor.rejectionReason = '';
        }

        const updated = Object.assign(vendor, input);

        if (input.logoId) {
            updated.logo = await this.connection.getEntityOrThrow(ctx, Asset, input.logoId);
        }
        if (input.rccmFileId) {
            updated.rccmFile = await this.connection.getEntityOrThrow(ctx, Asset, input.rccmFileId);
        }
        if (input.rccmFile) {
            const asset = await this.assetService.create(ctx, { file: input.rccmFile, tags: ['vendor-doc', 'rccm'] });
            if (!(asset as any).errorCode) {
                updated.rccmFile = asset as Asset;
            }
        }
        if (input.ifuFileId) {
            updated.ifuFile = await this.connection.getEntityOrThrow(ctx, Asset, input.ifuFileId);
        }
        if (input.ifuFile) {
            const asset = await this.assetService.create(ctx, { file: input.ifuFile, tags: ['vendor-doc', 'ifu'] });
            if (!(asset as any).errorCode) {
                updated.ifuFile = asset as Asset;
            }
        }
        if (input.idCardFileId) {
            updated.idCardFile = await this.connection.getEntityOrThrow(ctx, Asset, input.idCardFileId);
        }
        if (input.idCardFile) {
            const asset = await this.assetService.create(ctx, { file: input.idCardFile, tags: ['vendor-doc', 'idcard'] });
            if (!(asset as any).errorCode) {
                updated.idCardFile = asset as Asset;
            }
        }
        if (input.logo) {
            // Check if file is a GIF - if so, skip Sharp processing to preserve animation
            const isGif = input.logo.mimetype === 'image/gif' || input.logo.filename?.toLowerCase().endsWith('.gif');

            if (isGif) {
                // For GIFs, we need to save the file directly without processing
                const fs = require('fs');
                const path = require('path');
                const assetsDir = path.join(__dirname, '../../../static/assets');
                const uniqueName = `${Date.now()}-${input.logo.filename}`;
                const filePath = path.join(assetsDir, uniqueName);

                // Ensure directory exists
                if (!fs.existsSync(assetsDir)) {
                    fs.mkdirSync(assetsDir, { recursive: true });
                }

                // Write file directly
                const buffer = await input.logo.buffer;
                fs.writeFileSync(filePath, buffer);

                // Create asset record manually
                const asset = new Asset();
                asset.name = input.logo.filename;
                asset.type = 'IMAGE' as any;
                asset.mimeType = 'image/gif';
                asset.source = `/assets/${uniqueName}`;
                asset.preview = `/assets/${uniqueName}`;
                asset.fileSize = buffer.length;
                asset.width = 0;
                asset.height = 0;
                asset.focalPoint = { x: 0.5, y: 0.5 };

                const savedAsset = await this.connection.getRepository(ctx, Asset).save(asset);
                if (!(savedAsset as any).errorCode) {
                    updated.logo = savedAsset as Asset;
                }
            } else {
                const asset = await this.assetService.create(ctx, { file: input.logo, tags: ['vendor-logo'] });
                if (!(asset as any).errorCode) {
                    updated.logo = asset as Asset;
                }
            }
        }
        if (input.coverImageId) {
            updated.coverImage = await this.connection.getEntityOrThrow(ctx, Asset, input.coverImageId);
        }
        if (input.coverImage) {
            // Check if file is a GIF - if so, skip Sharp processing to preserve animation
            const isGif = input.coverImage.mimetype === 'image/gif' || input.coverImage.filename?.toLowerCase().endsWith('.gif');

            if (isGif) {
                // For GIFs, we need to save the file directly without processing
                const fs = require('fs');
                const path = require('path');
                const assetsDir = path.join(__dirname, '../../../static/assets');
                const uniqueName = `${Date.now()}-${input.coverImage.filename}`;
                const filePath = path.join(assetsDir, uniqueName);

                // Ensure directory exists
                if (!fs.existsSync(assetsDir)) {
                    fs.mkdirSync(assetsDir, { recursive: true });
                }

                // Write file directly
                const buffer = await input.coverImage.buffer;
                fs.writeFileSync(filePath, buffer);

                // Create asset record manually
                const asset = new Asset();
                asset.name = input.coverImage.filename;
                asset.type = 'IMAGE' as any;
                asset.mimeType = 'image/gif';
                asset.source = `/assets/${uniqueName}`;
                asset.preview = `/assets/${uniqueName}`;
                asset.fileSize = buffer.length;
                asset.width = 0;
                asset.height = 0;
                asset.focalPoint = { x: 0.5, y: 0.5 };

                const savedAsset = await this.connection.getRepository(ctx, Asset).save(asset);
                if (!(savedAsset as any).errorCode) {
                    updated.coverImage = savedAsset as Asset;
                }
            } else {
                const asset = await this.assetService.create(ctx, { file: input.coverImage, tags: ['vendor-cover'] });
                if (!(asset as any).errorCode) {
                    updated.coverImage = asset as Asset;
                }
            }
        }

        // Save Geolocation & Markets
        if (input.latitude !== undefined) {
            updated.latitude = input.latitude;
        }
        if (input.longitude !== undefined) {
            updated.longitude = input.longitude;
        }
        if (input.locationId !== undefined) {
            updated.locationId = input.locationId ? Number(input.locationId) : null as any;
        }
        if (input.physicalMarketId !== undefined) {
            updated.physicalMarketId = input.physicalMarketId ? Number(input.physicalMarketId) : null as any;
        }
        if (input.marketIds !== undefined) {
            updated.marketIds = input.marketIds ? input.marketIds.map(id => Number(id)) : [];
        }

        const savedVendor = await this.connection.getRepository(ctx, Vendor).save(updated);
        this.eventBus.publish(new VendorEvent(ctx, savedVendor, 'updated', input));

        // Handle status change
        if (input.status && input.status !== oldStatus) {
            this.eventBus.publish(new VendorEvent(ctx, savedVendor, 'statusChanged', input));

            // Automatically create Seller, Channel, and channel-scoped Role & Admin when approved
            if (input.status === VendorStatus.APPROVED) {
                try {
                    const syncedVendor = await this.ensureNativeSellerAndChannel(ctx, savedVendor);
                    return syncedVendor;
                } catch (syncErr) {
                    console.error('[VendorService] Error ensuring native Seller/Channel on approval:', syncErr);
                }
            }
        }

        return savedVendor;
    }

    async getVendorByProductId(ctx: RequestContext, productId: string): Promise<Vendor | undefined> {
        const product = await this.connection.getEntityOrThrow(ctx, Product, productId, {
            relations: ['customFields.vendor'],
        });
        return (product.customFields as any).vendor;
    }

    async validateOrderForVendor(ctx: RequestContext, orderId: string, newVendorId: string): Promise<boolean> {
        const order = await this.connection.getEntityOrThrow(ctx, Order, orderId, {
            relations: ['lines', 'lines.productVariant', 'lines.productVariant.product', 'lines.productVariant.product.customFields.vendor'],
        });

        if (order.lines.length === 0) {
            return true;
        }

        const existingVendorId = (order.customFields as any).vendor?.id;

        if (existingVendorId && existingVendorId.toString() !== newVendorId) {
            return false;
        }

        for (const line of order.lines) {
            const lineVendor = (line.productVariant.product.customFields as any).vendor;
            if (lineVendor && lineVendor.id.toString() !== newVendorId) {
                return false;
            }
        }

        return true;
    }

    // -----------------------------------------------
    // WALLET MANAGEMENT
    // -----------------------------------------------

    /**
     * Credit (add funds) to a vendor's wallet.
     * Called by Super-Admin after receiving real payment (Mobile Money, bank transfer, etc.)
     */
    async creditWallet(ctx: RequestContext, vendorId: string, amount: number): Promise<Vendor> {
        const vendor = await this.findOne(ctx, vendorId);
        if (!vendor) throw new Error(`Vendor ${vendorId} not found`);
        vendor.walletBalance = (vendor.walletBalance || 0) + amount;
        return this.connection.getRepository(ctx, Vendor).save(vendor);
    }

    /**
     * Debit (remove funds) from a vendor's wallet.
     * Called internally when a commission is due, or manually by Super-Admin.
     */
    async debitWallet(ctx: RequestContext, vendorId: string, amount: number): Promise<Vendor> {
        const vendor = await this.findOne(ctx, vendorId);
        if (!vendor) throw new Error(`Vendor ${vendorId} not found`);
        vendor.walletBalance = (vendor.walletBalance || 0) - amount;
        return this.connection.getRepository(ctx, Vendor).save(vendor);
    }

    /**
     * Toggle whether a vendor is allowed to have a negative wallet balance (i.e. still accept orders).
     */
    async setAllowNegativeBalance(ctx: RequestContext, vendorId: string, allow: boolean): Promise<Vendor> {
        const vendor = await this.findOne(ctx, vendorId);
        if (!vendor) throw new Error(`Vendor ${vendorId} not found`);
        vendor.allowNegativeBalance = allow;
        return this.connection.getRepository(ctx, Vendor).save(vendor);
    }

    /**
     * Check if a vendor can accept a new order given a commission amount.
     * Returns true if:
     *   - allowNegativeBalance is enabled (no restriction), OR
     *   - walletBalance >= commission amount
     */
    canAcceptOrder(vendor: Vendor, commissionAmount: number): boolean {
        if (vendor.allowNegativeBalance) return true;
        return (vendor.walletBalance || 0) >= commissionAmount;
    }

    async setOrderVendor(ctx: RequestContext, orderId: string, vendorId: string) {
        await this.connection.getRepository(ctx, Order).update(orderId, {
            customFields: {
                vendor: { id: vendorId }
            }
        });
    }

    async setOrderCommission(ctx: RequestContext, orderId: string, commission: number, rate: number) {
        try {
            await this.connection.rawConnection.query(
                `UPDATE "order" 
                 SET "customFieldsCommissionamount" = $1,
                     "customFieldsCommissionrate" = $2
                 WHERE id = $3`,
                [commission, rate, orderId]
            );
        } catch (e) {
            console.error('[setOrderCommission] Direct SQL failed, trying alternative casing...', e);
            try {
                await this.connection.rawConnection.query(
                    `UPDATE "order" 
                     SET "customFieldsCommissionAmount" = $1,
                         "customFieldsCommissionRate" = $2
                     WHERE id = $3`,
                    [commission, rate, orderId]
                );
            } catch (err2) {
                console.error('[setOrderCommission] All direct SQL updates failed:', err2);
            }
        }
    }

    /**
     * Get or create the Vendor role with appropriate permissions
     */
    /**
     * Get or create the Vendor role with appropriate permissions
     */
    private async getOrCreateVendorRole(ctx: RequestContext) {
        console.log('getOrCreateVendorRole: Checking for existing role...');
        let role = await this.connection.getRepository(ctx, Role).findOne({
            where: { code: 'vendor' }
        });

        const permissions = [
            Permission.Authenticated,
            Permission.ReadCatalog,
            Permission.CreateCatalog,
            Permission.UpdateCatalog,
            Permission.DeleteCatalog,
            // NOTE: ReadOrder and UpdateOrder are intentionally excluded here.
            // Including them causes Vendure's shop API auth guard to set
            // authorizedAsOwnerOnly=false for vendor users, which breaks
            // shop mutations like addPaymentToOrder (returns NoActiveOrderError).
            // Vendor order management uses custom resolvers instead.
            Permission.ReadAsset,
            Permission.CreateAsset,
            Permission.ReadCountry,
            Permission.ReadZone,
            Permission.ReadTaxCategory,
            Permission.ReadTaxRate,
            Permission.ReadPaymentMethod,
            Permission.ReadShippingMethod,
            Permission.ReadCustomer,
            Permission.ReadFacet,
            Permission.ReadAdministrator,
            Permission.ReadChannel,

            'Vendor' as Permission, // Custom permission defined in MultivendorPlugin
        ];

        if (role) {
            console.log('getOrCreateVendorRole: Role found. Updating permissions to ensure correctness...');
            role.permissions = permissions;
            role.description = 'Vendor role for managing own products and orders';
            role = await this.connection.getRepository(ctx, Role).save(role);
            console.log('getOrCreateVendorRole: Role permissions updated.');
            return role;
        }

        console.log('getOrCreateVendorRole: Role not found, creating new one...');
        role = await this.roleService.create(ctx, {
            code: 'vendor',
            description: 'Vendor role for managing own products and orders',
            permissions: permissions,
        });
        console.log('getOrCreateVendorRole: Role created.');
        return role;
    }

    /**
     * Ensure that an approved Vendor has a native Vendure Seller, dedicated Channel,
     * Channel-scoped Role, and Administrator account.
     */
    async ensureNativeSellerAndChannel(ctx: RequestContext, vendor: Vendor): Promise<Vendor> {
        const adminCtx = await this.getSuperAdminContext(ctx);
        const hydratedVendor = await this.connection.getEntityOrThrow(adminCtx, Vendor, vendor.id, {
            relations: ['user', 'seller', 'channel', 'logo'],
        });

        if (hydratedVendor.seller && hydratedVendor.channel && hydratedVendor.channelToken) {
            console.log(`[VendorService] Vendor ${vendor.id} already has Seller and Channel.`);
            return hydratedVendor;
        }

        console.log(`[VendorService] Ensuring native Seller & Channel for Vendor "${hydratedVendor.name}" (ID: ${hydratedVendor.id})`);

        // 1. Create or retrieve native Seller
        let seller: Seller | undefined = hydratedVendor.seller;
        if (!seller && hydratedVendor.sellerId) {
            seller = (await this.connection.getRepository(adminCtx, Seller).findOne({
                where: { id: hydratedVendor.sellerId }
            })) || undefined;
        }
        if (seller) {
            const otherVendor = await this.connection.getRepository(adminCtx, Vendor).findOne({
                where: { sellerId: Number(seller.id) }
            });
            if (otherVendor && String(otherVendor.id) !== String(hydratedVendor.id)) {
                seller = undefined;
            }
        }
        if (!seller) {
            seller = await this.sellerService.create(adminCtx, {
                name: `${hydratedVendor.name} (${hydratedVendor.id})`,
                customFields: {},
            });
            console.log(`[VendorService] Created native Seller with ID: ${seller.id}`);
        }

        const validSeller: Seller = seller;

        // 2. Fetch default channel properties
        const defaultChannel = await this.channelService.getDefaultChannel(adminCtx);

        // 3. Generate clean slug and token
        const cleanSlug = (hydratedVendor.name || 'vendor')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        const channelCode = `${cleanSlug}-${hydratedVendor.id}`;
        const channelToken = `vt_${cleanSlug}_${hydratedVendor.id}_${Math.random().toString(36).substring(2, 8)}`;

        // 4. Create or retrieve Channel
        let channel: Channel | undefined = hydratedVendor.channel;
        if (!channel && hydratedVendor.channelId) {
            channel = (await this.connection.getRepository(adminCtx, Channel).findOne({
                where: { id: hydratedVendor.channelId },
                relations: ['seller', 'defaultShippingZone', 'defaultTaxZone'],
            })) || undefined;
        }
        if (channel) {
            const otherVendor = await this.connection.getRepository(adminCtx, Vendor).findOne({
                where: { channelId: Number(channel.id) }
            });
            if (otherVendor && String(otherVendor.id) !== String(hydratedVendor.id)) {
                channel = undefined;
            }
        }
        if (!channel) {
            channel = (await this.connection.getRepository(adminCtx, Channel).findOne({
                where: { code: channelCode },
                relations: ['seller', 'defaultShippingZone', 'defaultTaxZone'],
            })) || undefined;
            if (channel) {
                const otherVendor = await this.connection.getRepository(adminCtx, Vendor).findOne({
                    where: { channelId: Number(channel.id) }
                });
                if (otherVendor && String(otherVendor.id) !== String(hydratedVendor.id)) {
                    channel = undefined;
                }
            }
        }
        if (!channel) {
            channel = (await this.channelService.create(adminCtx, {
                code: channelCode,
                token: channelToken,
                sellerId: validSeller.id,
                defaultLanguageCode: defaultChannel.defaultLanguageCode,
                currencyCode: defaultChannel.defaultCurrencyCode,
                pricesIncludeTax: defaultChannel.pricesIncludeTax,
                defaultShippingZoneId: defaultChannel.defaultShippingZone?.id,
                defaultTaxZoneId: defaultChannel.defaultTaxZone?.id,
            })) as Channel;
            console.log(`[VendorService] Created Channel "${channelCode}" (ID: ${channel.id}, Token: ${channelToken})`);
        }

        const validChannel: Channel = channel;

        // 5. Create Channel-scoped Role for this Vendor
        let role = await this.connection.getRepository(adminCtx, Role).findOne({
            where: { code: `vendor-${hydratedVendor.id}-role` },
            relations: ['channels'],
        });

        const permissions = [
            Permission.Authenticated,
            Permission.CreateCatalog,
            Permission.ReadCatalog,
            Permission.UpdateCatalog,
            Permission.DeleteCatalog,
            Permission.CreateAsset,
            Permission.ReadAsset,
            Permission.UpdateAsset,
            Permission.DeleteAsset,
            Permission.ReadOrder,
            Permission.UpdateOrder,
            Permission.ReadCustomer,
            Permission.ReadShippingMethod,
            Permission.ReadPaymentMethod,
            Permission.ReadTaxCategory,
            Permission.ReadTaxRate,
            Permission.ReadZone,
            Permission.ReadCountry,
        ];

        try {
            if (!role) {
                role = await this.roleService.create(adminCtx, {
                    code: `vendor-${hydratedVendor.id}-role`,
                    description: `Vendor role for ${hydratedVendor.name}`,
                    channelIds: [channel.id],
                    permissions: permissions,
                });
                console.log(`[VendorService] Created channel-scoped Role: ${role.code}`);
            }
        } catch (roleErr: any) {
            console.warn('[VendorService] Role creation note:', roleErr.message);
        }

        // 6. Create or assign Administrator for the vendor user
        if (hydratedVendor.user && role) {
            try {
                const user = await this.connection.getEntityOrThrow(adminCtx, User, hydratedVendor.user.id);
                let admin = await this.administratorService.findOneByUserId(adminCtx, user.id);
                if (!admin) {
                    const nameParts = (hydratedVendor.name || 'Vendeur Ahizan').trim().split(/\s+/);
                    admin = await this.administratorService.create(adminCtx, {
                        firstName: nameParts[0] || 'Vendeur',
                        lastName: nameParts.slice(1).join(' ') || 'Ahizan',
                        emailAddress: hydratedVendor.email,
                        roleIds: [role.id],
                    } as any);
                    console.log(`[VendorService] Created Administrator for Vendor user ID: ${user.id}`);
                } else {
                    const existingRoleIds = ((admin as any).user?.roles || (admin as any).roles || []).map((r: any) => r.id);
                    if (!existingRoleIds.includes(role.id)) {
                        await this.administratorService.update(adminCtx, {
                            id: admin.id,
                            roleIds: [...existingRoleIds, role.id],
                        });
                        console.log(`[VendorService] Assigned channel-scoped role to Administrator ID: ${admin.id}`);
                    }
                }
            } catch (adminErr: any) {
                console.warn('[VendorService] Administrator creation note:', adminErr.message);
            }
        }

        // 7. Create default StockLocation for this Vendor's Channel
        try {
            const stockLocations = await this.stockLocationService.findAll(adminCtx);
            const vendorStockLocation = stockLocations.items.find((sl: any) => sl.name === `${hydratedVendor.name} Stock`);
            if (!vendorStockLocation) {
                await this.stockLocationService.create(adminCtx, {
                    name: `${hydratedVendor.name} Stock`,
                    description: `Stock location for ${hydratedVendor.name}`,
                });
            }
        } catch (stockErr: any) {
            console.warn('[VendorService] StockLocation note:', stockErr.message);
        }

        // 8. Update Vendor entity with Seller, Channel, and Token
        hydratedVendor.seller = validSeller;
        hydratedVendor.sellerId = Number(validSeller.id);
        hydratedVendor.channel = validChannel;
        hydratedVendor.channelId = Number(validChannel.id);
        hydratedVendor.channelToken = (validChannel as any).token || channelToken;

        return await this.connection.getRepository(adminCtx, Vendor).save(hydratedVendor);
    }

    /**
     * Assign Vendor role to a user
     */
    async assignVendorRole(ctx: RequestContext, userId: string) {
        console.log(`assignVendorRole: Assigning role to user ${userId}`);
        const user = await this.connection.getEntityOrThrow(ctx, User, userId, {
            relations: ['roles']
        });

        const vendorRole = await this.getOrCreateVendorRole(ctx);

        // Check if user already has the role
        const hasRole = user.roles.some(role => role.id === vendorRole.id);
        if (!hasRole) {
            console.log('assignVendorRole: User does not have role, adding it now.');
            user.roles.push(vendorRole as any);
            await this.connection.getRepository(ctx, User).save(user);
            console.log('assignVendorRole: Role assigned successfully.');
        } else {
            console.log('assignVendorRole: User already has role.');
        }


    }

    public async getSuperAdminContext(ctx?: RequestContext): Promise<RequestContext> {
        const defaultChannel = await this.channelService.getDefaultChannel();
        const superAdminUser = await this.connection.rawConnection.getRepository(User).findOne({
            where: {
                identifier: process.env.SUPERADMIN_USERNAME || 'superadmin',
            },
            relations: ['roles', 'roles.channels']
        });

        if (!superAdminUser) {
            console.error('getSuperAdminContext: SUPER ADMIN USER NOT FOUND! Permissions will likely fail.');
        } else {
            console.log('getSuperAdminContext: Found SuperAdmin user:', superAdminUser.identifier);
        }

        // Session configured on default channel with superadmin user
        const session = {
            id: 'superadmin-session',
            expires: new Date(Date.now() + 1000 * 60 * 60 * 24),
            activeOrder: null,
            activeChannelId: defaultChannel.id,
            user: superAdminUser || undefined,
            isAuthenticated: true,
        } as any;

        return new RequestContext({
            apiType: 'admin',
            isAuthorized: true,
            authorizedAsOwnerOnly: false,
            channel: defaultChannel,
            languageCode: ctx?.languageCode,
            session: session,
        });
    }

    async removeVendorAdministrators(ctx: RequestContext): Promise<void> {
        try {
            console.log('[VendorService] Checking for existing vendor Administrator records to remove...');
            const administrators = await this.connection.getRepository(ctx, Administrator).find({
                relations: ['user', 'user.roles']
            });

            const adminsToRemove = administrators.filter(admin => {
                if (!admin.user) return false;
                const roles = admin.user.roles || [];
                const hasVendorRole = roles.some(role => role.code === 'vendor');
                const hasSuperadminRole = roles.some(role => role.code === 'superadmin' || role.code === 'administrator');
                return hasVendorRole && !hasSuperadminRole;
            });

            if (adminsToRemove.length > 0) {
                console.log(`[VendorService] Found ${adminsToRemove.length} vendor Administrator records to delete.`);
                for (const admin of adminsToRemove) {
                    try {
                        await this.connection.rawConnection.query(
                            `UPDATE "history_entry" SET "administratorId" = NULL WHERE "administratorId" = $1`,
                            [admin.id]
                        );
                    } catch (err: any) {
                        console.warn(`[VendorService] Could not nullify history_entry administratorId for admin ${admin.id}:`, err.message);
                    }

                    try {
                        await this.connection.getRepository(ctx, Administrator).remove(admin);
                        console.log(`[VendorService] Removed Administrator record for user ${admin.emailAddress}`);
                    } catch (err: any) {
                        console.error(`[VendorService] Failed to remove Administrator record for admin ${admin.id}:`, err.message);
                    }
                }
            } else {
                console.log('[VendorService] No vendor Administrator records found for removal.');
            }
        } catch (e: any) {
            console.error('[VendorService] Error removing vendor Administrator records:', e.message);
        }
    }

    async onApplicationBootstrap() {
        console.log('VendorService: Bootstrapping... Checking for Vendor role to ensure it exists.');
        try {
            await this.connection.rawConnection.query(
                `UPDATE channel SET token = '__default_channel__' WHERE code = '__default_channel__'`
            ).catch(() => null);
            await this.fixCorruptedJsonColumns();
            await this.deduplicateVendorRecords();
            const ctx = await this.createBootstrapContext();
            await this.getOrCreateVendorRole(ctx);
            await this.syncExistingApprovedVendors(ctx);
            console.log('VendorService: Bootstrapping complete. Vendor role ready.');
        } catch (e) {
            console.error('VendorService: Failed to bootstrap vendor role:', e);
        }
    }

    /**
     * Automatically sync existing approved Vendor records with native Vendure Seller & Channel entities
     * and assign all their historical products & variants to their dedicated channel.
     */
    async syncExistingApprovedVendors(ctx: RequestContext): Promise<void> {
        try {
            console.log('[VendorService] Checking for approved vendors needing native Channel/Seller sync...');
            const approvedVendors = await this.connection.getRepository(ctx, Vendor).find({
                where: { status: VendorStatus.APPROVED },
                relations: ['seller', 'channel', 'user'],
            });

            const defaultChannel = await this.channelService.getDefaultChannel(ctx);

            for (const v of approvedVendors) {
                let currentVendor = v;
                if (!v.seller || !v.channel || !v.channelToken) {
                    console.log(`[VendorService] Syncing native Seller/Channel for approved vendor: ${v.name} (ID: ${v.id})`);
                    currentVendor = await this.ensureNativeSellerAndChannel(ctx, v);
                }

                if (currentVendor.channel?.id) {
                    const vendorChannelId = currentVendor.channel.id;
                    const vendorProducts = await this.connection.rawConnection.query(`
                        SELECT id FROM product WHERE "customFieldsVendorid" = $1
                    `, [currentVendor.id]);

                    for (const p of vendorProducts) {
                        try {
                            await this.channelService.assignToChannels(ctx, Product, p.id, [vendorChannelId, defaultChannel.id]);
                            const variants = await this.connection.rawConnection.query(`
                                SELECT id FROM product_variant WHERE "productId" = $1
                            `, [p.id]);
                            for (const vRow of variants) {
                                await this.channelService.assignToChannels(ctx, ProductVariant, vRow.id, [vendorChannelId, defaultChannel.id]);
                            }
                        } catch (prodSyncErr: any) {}
                    }
                }
            }
            console.log(`[VendorService] Successfully verified and synchronized ${approvedVendors.length} approved vendors and their catalog.`);
        } catch (err) {
            console.warn('[VendorService] Note during syncExistingApprovedVendors:', err);
        }
    }

    /**
     * Deduplicates Vendor records in the database where multiple Vendor entities share the same userId.
     * Merges product links to the primary (APPROVED) vendor and removes duplicate shells.
     */
    async deduplicateVendorRecords(): Promise<void> {
        try {
            console.log('[VendorService] Checking for duplicate vendor records...');
            const duplicates: { user_id: string; count: string }[] = await this.connection.rawConnection.query(`
                SELECT "userId" as user_id, COUNT(*) as count 
                FROM vendor 
                WHERE "userId" IS NOT NULL 
                GROUP BY "userId" 
                HAVING COUNT(*) > 1
            `);

            if (!duplicates || duplicates.length === 0) {
                console.log('[VendorService] No duplicate vendor records found.');
                return;
            }

            console.log(`[VendorService] Found ${duplicates.length} duplicate vendor user account(s). Cleaning up...`);

            for (const dup of duplicates) {
                const userId = dup.user_id;
                const vendors = await this.connection.rawConnection.query(`
                    SELECT id, status, "createdAt" 
                    FROM vendor 
                    WHERE "userId" = $1 
                    ORDER BY CASE WHEN status = 'APPROVED' THEN 0 ELSE 1 END, id ASC
                `, [userId]);

                if (vendors.length <= 1) continue;

                const primaryVendor = vendors[0]; // Primary vendor (APPROVED or first created)
                const duplicateVendors = vendors.slice(1);

                for (const dupVendor of duplicateVendors) {
                    console.log(`[VendorService] Merging duplicate Vendor ID ${dupVendor.id} into primary Vendor ID ${primaryVendor.id}`);

                    // Re-link products
                    await this.connection.rawConnection.query(
                        `UPDATE product SET "customFieldsVendorid" = $1 WHERE "customFieldsVendorid" = $2`,
                        [primaryVendor.id, dupVendor.id]
                    );

                    // Re-link orders
                    await this.connection.rawConnection.query(
                        `UPDATE "order" SET "customFieldsVendorid" = $1 WHERE "customFieldsVendorid" = $2`,
                        [primaryVendor.id, dupVendor.id]
                    );

                    // Re-link order lines assigned vendor
                    await this.connection.rawConnection.query(
                        `UPDATE order_line SET "customFieldsAssignedvendorid" = $1 WHERE "customFieldsAssignedvendorid" = $2`,
                        [primaryVendor.id, dupVendor.id]
                    );

                    // Delete duplicate vendor row
                    await this.connection.rawConnection.query(
                        `DELETE FROM vendor WHERE id = $1`,
                        [dupVendor.id]
                    );
                }
            }

            console.log('[VendorService] Vendor deduplication completed successfully.');
        } catch (err: any) {
            console.error('[VendorService] Error during vendor deduplication:', err?.message || err);
        }
    }

    private async fixCorruptedJsonColumns() {
        try {
            const repo = this.connection.getRepository(Vendor);
            const vendors = await repo.find();
            let fixed = 0;
            
            for (const vendor of vendors) {
                let needsSave = false;
                
                // Fix dynamicDetails if it's an empty string or invalid
                if (typeof vendor.dynamicDetails === 'string' && vendor.dynamicDetails.trim() === '') {
                    vendor.dynamicDetails = null;
                    needsSave = true;
                }
                
                if (needsSave) {
                    await repo.save(vendor);
                    fixed++;
                }
            }
            
            if (fixed > 0) {
                console.log(`[VendorService] Fixed ${fixed} corrupted JSON columns in vendor table`);
            }
        } catch (err) {
            console.error('[VendorService] Error fixing JSON columns:', err);
        }
    }

    private async createBootstrapContext(): Promise<RequestContext> {
        const channel = await this.connection.rawConnection.getRepository(Channel).findOne({
            where: { code: '__default_channel__' },
            relations: ['defaultTaxZone', 'defaultShippingZone']
        });

        if (!channel) {
            throw new Error('Default channel not found during bootstrap');
        }

        const superAdminUser = await this.connection.rawConnection.getRepository(User).findOne({
            where: {
                identifier: process.env.SUPERADMIN_USERNAME || 'superadmin',
            },
            relations: ['roles', 'roles.channels']
        });

        if (!superAdminUser) {
            console.error('createBootstrapContext: SuperAdmin user not found');
        }

        // Mock a session
        const session = {
            id: 'bootstrap-session',
            expires: new Date(Date.now() + 1000 * 60 * 60),
            activeOrder: null,
            activeChannelId: channel.id,
            user: superAdminUser,
            isAuthenticated: true,
        } as any;

        return new RequestContext({
            apiType: 'admin',
            isAuthorized: true,
            authorizedAsOwnerOnly: false,
            channel,
            languageCode: channel.defaultLanguageCode,
            session,
        });
    }

    async deleteVendor(ctx: RequestContext, id: string, deleteProducts: boolean, deleteOrders: boolean): Promise<boolean> {
        const adminCtx = await this.getSuperAdminContext(ctx);
        const vendor = await this.findOne(adminCtx, id);
        if (!vendor) {
            throw new Error(`Vendor with id ${id} not found`);
        }

        const userId = vendor.user?.id;
        const vendorId = vendor.id;

        // 1. Handle Products
        if (deleteProducts) {
            // Soft delete product variants
            await this.connection.rawConnection.query(
                `UPDATE product_variant SET "deletedAt" = NOW() WHERE "productId" IN (SELECT id FROM product WHERE "customFieldsVendorid" = $1)`,
                [vendorId]
            );
            // Soft delete products
            await this.connection.rawConnection.query(
                `UPDATE product SET "deletedAt" = NOW() WHERE "customFieldsVendorid" = $1`,
                [vendorId]
            );
        } else {
            // Unlink products from this vendor
            await this.connection.rawConnection.query(
                `UPDATE product SET "customFieldsVendorid" = NULL WHERE "customFieldsVendorid" = $1`,
                [vendorId]
            );
        }

        // 2. Handle Orders
        if (deleteOrders) {
            // Delete order lines of vendor's orders
            await this.connection.rawConnection.query(
                `DELETE FROM order_line WHERE "orderId" IN (SELECT id FROM "order" WHERE "customFieldsVendorid" = $1)`,
                [vendorId]
            );
            // Delete payment records for vendor's orders
            try {
                await this.connection.rawConnection.query(
                    `DELETE FROM payment WHERE "orderId" IN (SELECT id FROM "order" WHERE "customFieldsVendorid" = $1)`,
                    [vendorId]
                );
            } catch (e) {
                console.log('Skipping payment delete:', (e as any).message);
            }
            // Delete history entries for vendor's orders
            try {
                await this.connection.rawConnection.query(
                    `DELETE FROM history_entry WHERE "orderId" IN (SELECT id FROM "order" WHERE "customFieldsVendorid" = $1)`,
                    [vendorId]
                );
            } catch (e) {
                console.log('Skipping history_entry delete:', (e as any).message);
            }
            // Delete the orders
            await this.connection.rawConnection.query(
                `DELETE FROM "order" WHERE "customFieldsVendorid" = $1`,
                [vendorId]
            );
        } else {
            // Unlink orders from this vendor
            await this.connection.rawConnection.query(
                `UPDATE "order" SET "customFieldsVendorid" = NULL WHERE "customFieldsVendorid" = $1`,
                [vendorId]
            );
        }

        // 3. Delete user account and associated customer, administrator
        if (userId) {
            // Delete customer
            try {
                await this.connection.rawConnection.query(
                    `DELETE FROM customer WHERE "userId" = $1`,
                    [userId]
                );
            } catch (e) {
                console.log('Failed to delete customer:', (e as any).message);
            }

            // Delete administrator
            try {
                await this.connection.rawConnection.query(
                    `DELETE FROM administrator WHERE "userId" = $1`,
                    [userId]
                );
            } catch (e) {
                console.log('Failed to delete administrator:', (e as any).message);
            }

            // Delete authentication method
            try {
                await this.connection.rawConnection.query(
                    `DELETE FROM native_authentication_method WHERE "userId" = $1`,
                    [userId]
                );
            } catch (e) {
                console.log('Failed to delete auth method:', (e as any).message);
            }

            // Delete role mappings
            try {
                await this.connection.rawConnection.query(
                    `DELETE FROM user_roles_role WHERE "userId" = $1`,
                    [userId]
                );
            } catch (e) {
                console.log('Failed to delete user_roles_role:', (e as any).message);
            }

            // Delete user
            try {
                await this.connection.rawConnection.query(
                    `DELETE FROM "user" WHERE id = $1`,
                    [userId]
                );
            } catch (e) {
                console.log('Failed to delete user:', (e as any).message);
            }
        }

        // 4. Finally delete the Vendor record itself
        await this.connection.rawConnection.query(
            `DELETE FROM vendor WHERE id = $1`,
            [vendorId]
        );

        return true;
    }

    async updateOrderVendorPaymentStatus(
        ctx: RequestContext,
        orderId: string,
        isPaid: boolean,
        vendorId?: string
    ): Promise<boolean> {
        const order = await this.connection.getRepository(ctx, Order).findOne({
            where: { id: orderId },
            relations: ['lines', 'lines.productVariant', 'lines.productVariant.product', 'lines.productVariant.product.customFields.vendor']
        });
        if (!order) {
            throw new Error('Order not found');
        }

        // Force commission recalculation with latest settings before releasing/payout action
        await this.calculateAndSaveOrderCommission(ctx, orderId);

        let vMap: Record<string, any> = {};
        try {
            if ((order.customFields as any)?.vendorStatuses) {
                vMap = JSON.parse((order.customFields as any).vendorStatuses);
            }
        } catch (e) {}

        const vendorIds = new Set<string>();
        const defaultVendor = (order.customFields as any)?.vendor;
        if (defaultVendor?.id) vendorIds.add(String(defaultVendor.id));
        if (order.lines) {
            for (const line of order.lines) {
                const lineVendor = (line as any).productVariant?.product?.customFields?.vendor;
                if (lineVendor?.id) vendorIds.add(String(lineVendor.id));
            }
        }

        const paymentStatus = isPaid ? 'RETIRABLE' : 'PENDING';
        if (vendorId) {
            vMap[String(vendorId)] = {
                ...(vMap[String(vendorId)] || {}),
                isPaid,
                paidAt: isPaid ? new Date().toISOString() : null,
                paymentStatus,
            };
        } else {
            for (const vId of Array.from(vendorIds)) {
                vMap[vId] = {
                    ...(vMap[vId] || {}),
                    isPaid,
                    paidAt: isPaid ? new Date().toISOString() : null,
                    paymentStatus,
                };
            }
        }

        try {
            await this.connection.rawConnection.query(
                `UPDATE "order" 
                 SET "customFieldsIsvendorpaid" = $1,
                     "customFieldsVendorstatuses" = $2,
                     "customFieldsPaymentstatus" = $3
                 WHERE id = $4`,
                [isPaid, JSON.stringify(vMap), paymentStatus, orderId]
            );
        } catch (e) {
            try {
                await this.connection.rawConnection.query(
                    `UPDATE "order" 
                     SET "customFieldsIsVendorPaid" = $1,
                         "customFieldsVendorStatuses" = $2,
                         "customFieldsPaymentStatus" = $3
                     WHERE id = $4`,
                    [isPaid, JSON.stringify(vMap), paymentStatus, orderId]
                );
            } catch (err2) {
                console.error('[updateOrderVendorPaymentStatus] Failed to update order customFields:', err2);
            }
        }

        return true;
    }

    async getWithdrawals(ctx: RequestContext, vendorId?: string): Promise<WithdrawalRequest[]> {
        const repo = this.connection.getRepository(ctx, WithdrawalRequest);
        if (vendorId) {
            return repo.find({
                where: { vendor: { id: vendorId } as any },
                order: { createdAt: 'DESC' },
                relations: ['vendor']
            });
        }
        return repo.find({
            order: { createdAt: 'DESC' },
            relations: ['vendor']
        });
    }

    async requestWithdrawal(ctx: RequestContext, amount: number): Promise<boolean> {
        if (!ctx.activeUserId) throw new Error('Not authenticated');
        const vendor = await this.findByUserId(ctx, ctx.activeUserId.toString());
        if (!vendor) throw new Error('No vendor profile found');

        // Calculate available balance for this vendor
        const orders = await this.connection.getRepository(ctx, Order).find({
            where: {
                customFields: {
                    vendor: { id: vendor.id } as any
                } as any
            }
        });
        
        let totalRetirable = 0;
        for (const order of orders) {
            let vMap: Record<string, any> = {};
            try {
                if ((order.customFields as any)?.vendorStatuses) {
                    vMap = JSON.parse((order.customFields as any).vendorStatuses);
                }
            } catch (e) {}
            const vendorSpecific = vMap[String(vendor.id)];
            const status = vendorSpecific?.paymentStatus || (order.customFields as any)?.paymentStatus || 'PENDING';
            if (status === 'RETIRABLE') {
                const commission = (order.customFields as any)?.commissionAmount || 0;
                totalRetirable += (order.totalWithTax - commission);
            }
        }

        const pendingWithdrawals = await this.connection.getRepository(ctx, WithdrawalRequest).find({
            where: {
                vendor: { id: vendor.id } as any,
                status: WithdrawalStatus.PENDING
            }
        });
        const totalPending = pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0);

        const realAvailable = totalRetirable - totalPending;
        if (amount > realAvailable) {
            throw new Error('Le montant demandé dépasse le solde disponible.');
        }

        const withdrawal = this.connection.getRepository(ctx, WithdrawalRequest).create({
            vendor,
            amount,
            status: WithdrawalStatus.PENDING,
            mobileMoneyNumber: vendor.mobileMoneyNumber || vendor.phoneNumber
        });
        await this.connection.getRepository(ctx, WithdrawalRequest).save(withdrawal);

        // Notify SuperAdmins of new withdrawal request
        try {
            const formattedAmount = Number(amount).toLocaleString('fr-FR');
            const vName = vendor.name || (vendor as any).businessName || 'Vendeur';
            await this.connection.rawConnection.query(`
                INSERT INTO notification_log ("createdAt", "updatedAt", "userId", "eventType", title, body, "actionUrl", channel, "targetRole", "isRead", "sendSuccess")
                SELECT NOW(), NOW(), u.id, 'WITHDRAWAL_REQUEST', 'Demande de Retrait 💰', $1, '/admin/finance', 'IN_APP,PUSH', 'ADMIN', false, true
                FROM "user" u
                INNER JOIN user_roles_role urr ON urr."userId" = u.id
                INNER JOIN role r ON r.id = urr."roleId"
                WHERE r.code = '__super_admin_role__' OR r.code = 'superadmin' OR u.identifier = 'superadmin'
            `, [`La boutique "${vName}" a demandé un retrait de ${formattedAmount} FCFA.`]);
        } catch (err) {}

        return true;
    }

    async approveWithdrawal(ctx: RequestContext, id: string): Promise<boolean> {
        const repo = this.connection.getRepository(ctx, WithdrawalRequest);
        const withdrawal = await repo.findOne({ where: { id }, relations: ['vendor', 'vendor.user'] });
        if (!withdrawal) throw new Error('Demande de retrait introuvable');
        if (withdrawal.status !== WithdrawalStatus.PENDING) {
            throw new Error('La demande de retrait n\'est pas en attente');
        }

        withdrawal.status = WithdrawalStatus.APPROVED;
        await repo.save(withdrawal);

        // Notify Vendor that withdrawal was approved
        const vendorUserId = withdrawal.vendor?.user?.id || (withdrawal.vendor as any)?.userId;
        if (vendorUserId) {
            try {
                const formattedAmount = Number(withdrawal.amount).toLocaleString('fr-FR');
                await this.connection.rawConnection.query(`
                    INSERT INTO notification_log ("createdAt", "updatedAt", "userId", "eventType", title, body, "actionUrl", channel, "targetRole", "isRead", "sendSuccess")
                    VALUES (NOW(), NOW(), $1, 'WITHDRAWAL_APPROVED', 'Retrait Approuvé ✅', $2, '/dashboard/wallet', 'IN_APP,PUSH', 'VENDOR', false, true)
                `, [vendorUserId.toString(), `Votre demande de retrait de ${formattedAmount} FCFA a été validée et transférée.`]);
            } catch (err) {}
        }

        const orders = await this.connection.getRepository(ctx, Order).find({
            where: {
                customFields: {
                    vendor: { id: withdrawal.vendor.id } as any
                } as any
            },
            order: { createdAt: 'ASC' }
        });

        let remainingAmountToPay = withdrawal.amount;
        for (const order of orders) {
            if (remainingAmountToPay <= 0) break;

            let vMap: Record<string, any> = {};
            try {
                if ((order.customFields as any)?.vendorStatuses) {
                    vMap = JSON.parse((order.customFields as any).vendorStatuses);
                }
            } catch (e) {}

            const vendorSpecific = vMap[String(withdrawal.vendor.id)];
            const status = vendorSpecific?.paymentStatus || (order.customFields as any)?.paymentStatus || 'PENDING';
            if (status === 'RETIRABLE') {
                const commission = (order.customFields as any)?.commissionAmount || 0;
                const net = order.totalWithTax - commission;

                if (vendorSpecific) {
                    vendorSpecific.paymentStatus = 'PAID';
                    vendorSpecific.isPaid = true;
                    vendorSpecific.paidAt = new Date().toISOString();
                } else {
                    vMap[String(withdrawal.vendor.id)] = {
                        isPaid: true,
                        paidAt: new Date().toISOString(),
                        paymentStatus: 'PAID'
                    };
                }

                try {
                    await this.connection.rawConnection.query(
                        `UPDATE "order" 
                         SET "customFieldsIsvendorpaid" = $1,
                             "customFieldsVendorstatuses" = $2,
                             "customFieldsPaymentstatus" = $3
                         WHERE id = $4`,
                        [true, JSON.stringify(vMap), 'PAID', order.id]
                    );
                } catch (e) {
                    try {
                        await this.connection.rawConnection.query(
                            `UPDATE "order" 
                             SET "customFieldsIsVendorPaid" = $1,
                                 "customFieldsVendorStatuses" = $2,
                                 "customFieldsPaymentStatus" = $3
                             WHERE id = $4`,
                            [true, JSON.stringify(vMap), 'PAID', order.id]
                        );
                    } catch (err2) {
                        console.error('[approveWithdrawal] Failed to update order:', err2);
                    }
                }

                remainingAmountToPay -= net;
            }
        }

        return true;
    }

    async rejectWithdrawal(ctx: RequestContext, id: string, reason?: string): Promise<boolean> {
        const repo = this.connection.getRepository(ctx, WithdrawalRequest);
        const withdrawal = await repo.findOne({ where: { id } });
        if (!withdrawal) throw new Error('Demande de retrait introuvable');
        if (withdrawal.status !== WithdrawalStatus.PENDING) {
            throw new Error('La demande de retrait n\'est pas en attente');
        }

        withdrawal.status = WithdrawalStatus.REJECTED;
        if (reason) {
            withdrawal.rejectionReason = reason;
        }
        await repo.save(withdrawal);
        return true;
    }

    async calculateAndSaveOrderCommission(ctx: RequestContext, orderId: string): Promise<number> {
        const order = await this.connection.getRepository(ctx, Order).findOne({
            where: { id: orderId },
            relations: [
                'lines',
                'lines.productVariant',
                'lines.productVariant.product',
                'lines.productVariant.collections',
                'lines.productVariant.product.customFields.vendor'
            ]
        });
        if (!order) return 0;

        const settings = await this.connection.getRepository(ctx, PlatformSettings).findOne({ where: { id: 'platform_settings' } });
        const commissionMode = settings?.commissionMode || 'GENERAL';
        const generalRate = settings?.defaultCommissionRate || 0;
        
        let collectionRates: Record<string, number> = {};
        try {
            if (settings?.collectionCommissionRates) {
                collectionRates = typeof settings.collectionCommissionRates === 'string'
                    ? JSON.parse(settings.collectionCommissionRates)
                    : settings.collectionCommissionRates;
            }
        } catch (e) {}

        let totalCommission = 0;

        for (const line of order.lines) {
            const product = line.productVariant?.product as any;
            const collections = line.productVariant?.collections || [];
            let rate = 0;

            if (commissionMode === 'GENERAL') {
                rate = generalRate;
            } else if (commissionMode === 'COLLECTION') {
                for (const col of collections) {
                    if (collectionRates[col.id.toString()] !== undefined) {
                        rate = collectionRates[col.id.toString()];
                        break;
                    }
                }
            } else if (commissionMode === 'BOTH') {
                let foundColRate = false;
                for (const col of collections) {
                    if (collectionRates[col.id.toString()] !== undefined) {
                        rate = collectionRates[col.id.toString()];
                        foundColRate = true;
                        break;
                    }
                }
                if (!foundColRate) {
                    rate = generalRate;
                }
            }

            const linePrice = line.linePriceWithTax;
            const lineCommission = Math.round((linePrice * rate) / 100);
            totalCommission += lineCommission;
        }

        const orderTotal = order.totalWithTax;
        const effectiveRate = orderTotal > 0 ? Math.round((totalCommission / orderTotal) * 100) : 0;

        await this.setOrderCommission(ctx, orderId, totalCommission, effectiveRate);
        return totalCommission;
    }

    async deleteOrderAdmin(ctx: RequestContext, orderId: string): Promise<boolean> {
        console.log(`[deleteOrderAdmin] Starting deletion of order ${orderId}...`);
        const queryRunner = this.connection.rawConnection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            await queryRunner.query(`DELETE FROM order_channels_channel WHERE "orderId" = $1`, [orderId]);
            await queryRunner.query(`DELETE FROM order_fulfillments_fulfillment WHERE "orderId" = $1`, [orderId]);
            await queryRunner.query(`DELETE FROM order_promotions_promotion WHERE "orderId" = $1`, [orderId]);
            await queryRunner.query(`DELETE FROM history_entry WHERE "orderId" = $1`, [orderId]);
            await queryRunner.query(`UPDATE session SET "activeOrderId" = NULL WHERE "activeOrderId" = $1`, [orderId]);
            await queryRunner.query(`DELETE FROM order_line_reference WHERE "orderLineId" IN (SELECT id FROM order_line WHERE "orderId" = $1)`, [orderId]);
            await queryRunner.query(`DELETE FROM stock_movement WHERE "orderLineId" IN (SELECT id FROM order_line WHERE "orderId" = $1)`, [orderId]);
            await queryRunner.query(`DELETE FROM order_line WHERE "orderId" = $1`, [orderId]);
            await queryRunner.query(`UPDATE "order" SET "aggregateOrderId" = NULL WHERE "aggregateOrderId" = $1`, [orderId]);
            await queryRunner.query(`DELETE FROM shipping_line WHERE "orderId" = $1`, [orderId]);
            await queryRunner.query(`DELETE FROM order_modification WHERE "orderId" = $1`, [orderId]);
            await queryRunner.query(`DELETE FROM surcharge WHERE "orderId" = $1`, [orderId]);
            await queryRunner.query(`DELETE FROM refund WHERE "paymentId" IN (SELECT id FROM payment WHERE "orderId" = $1)`, [orderId]);
            await queryRunner.query(`DELETE FROM payment WHERE "orderId" = $1`, [orderId]);
            await queryRunner.query(`DELETE FROM "order" WHERE id = $1`, [orderId]);
            await queryRunner.commitTransaction();
            console.log(`[deleteOrderAdmin] Order ${orderId} successfully deleted.`);
            return true;
        } catch (err) {
            console.error(`[deleteOrderAdmin] Failed to delete order ${orderId}. Rolling back...`, err);
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async getPublicStats(ctx: RequestContext) {
        try {
            const approvedVendorsCount = await this.connection.getRepository(ctx, Vendor).count({
                where: { status: VendorStatus.APPROVED }
            });
            const totalVendorsCount = await this.connection.getRepository(ctx, Vendor).count();
            const vendorsCount = Math.max(approvedVendorsCount, totalVendorsCount);

            const productsCount = await this.connection.getRepository(ctx, Product).count({
                where: { deletedAt: IsNull() }
            });
            const ordersCount = await this.connection.getRepository(ctx, Order).count();
            const customersCount = await this.connection.getRepository(ctx, Customer).count({
                where: { deletedAt: IsNull() }
            });

            const visitorsCount = customersCount > 0 ? customersCount * 15 + ordersCount * 4 + 150 : 150;

            return {
                visitorsCount: Math.max(visitorsCount, 150),
                ordersCount: ordersCount,
                vendorsCount: vendorsCount,
                productsCount: productsCount,
            };
        } catch (error) {
            console.error('[VendorService.getPublicStats] Error fetching stats:', error);
            return {
                visitorsCount: 150,
                ordersCount: 0,
                vendorsCount: 0,
                productsCount: 0,
            };
        }
    }

    async getMyVendorDashboardStats(ctx: RequestContext, vendorId: string): Promise<any> {
        const numericVendorId = Number(vendorId);
        const vendor = await this.findOne(ctx, vendorId);
        const vendorChannelId = vendor?.channelId || 0;

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);
        const startOfPrevMonth = new Date(currentMonth === 0 ? currentYear - 1 : currentYear, currentMonth === 0 ? 11 : currentMonth - 1, 1);
        const endOfPrevMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

        // 1. Query settled orders for this vendor
        const settledOrdersRaw = await this.connection.rawConnection.query(
            `SELECT DISTINCT o.id, o."createdAt", o."subTotalWithTax", o."state", o."customFieldsSellerStatus"
             FROM "order" o
             LEFT JOIN order_line ol ON ol."orderId" = o.id
             LEFT JOIN product_variant pv ON ol."productVariantId" = pv.id
             LEFT JOIN product p ON pv."productId" = p.id
             LEFT JOIN order_channels_channel occ ON occ."orderId" = o.id
             WHERE (o."customFieldsVendorid" = $1
                OR p."customFieldsVendorid" = $1
                OR ol."sellerChannelId" = $2
                OR occ."channelId" = $2
                OR o."customFieldsVendorstatuses" LIKE $3)
               AND o.state NOT IN ('AddingItems', 'ArrangingPayment', 'Cancelled')
             ORDER BY o."createdAt" DESC`,
            [numericVendorId, vendorChannelId, `%"${vendorId}"%`]
        );

        let totalRevenue = 0;
        let monthlyRevenue = 0;
        let prevMonthlyRevenue = 0;
        let monthlyOrdersCount = 0;
        let prevMonthlyOrdersCount = 0;
        let pendingShipmentCount = 0;

        const last30DaysMap: Record<string, { revenue: number; count: number }> = {};
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const key = d.toISOString().split('T')[0];
            last30DaysMap[key] = { revenue: 0, count: 0 };
        }

        const settledStates = ['PaymentAuthorized', 'PaymentSettled', 'Shipped', 'Delivered'];

        for (const o of settledOrdersRaw) {
            const d = new Date(o.createdAt);
            const isSettled = settledStates.includes(o.state);
            const total = Number(o.subTotalWithTax || o.totalWithTax || 0);

            if (isSettled) {
                totalRevenue += total;

                if (d >= startOfCurrentMonth) {
                    monthlyRevenue += total;
                    monthlyOrdersCount++;
                } else if (d >= startOfPrevMonth && d <= endOfPrevMonth) {
                    prevMonthlyRevenue += total;
                    prevMonthlyOrdersCount++;
                }

                const dayKey = d.toISOString().split('T')[0];
                if (last30DaysMap[dayKey]) {
                    last30DaysMap[dayKey].revenue += total;
                    last30DaysMap[dayKey].count++;
                }
            }

            if (o.customFieldsSellerStatus !== 'confirmed' && o.customFieldsSellerStatus !== 'refused') {
                pendingShipmentCount++;
            }
        }

        const totalOrdersCount = settledOrdersRaw.length;
        const revenueGrowth = prevMonthlyRevenue > 0
            ? Math.round(((monthlyRevenue - prevMonthlyRevenue) / prevMonthlyRevenue) * 100)
            : (monthlyRevenue > 0 ? 100 : 0);

        const ordersGrowth = prevMonthlyOrdersCount > 0
            ? Math.round(((monthlyOrdersCount - prevMonthlyOrdersCount) / prevMonthlyOrdersCount) * 100)
            : (monthlyOrdersCount > 0 ? 100 : 0);

        // 2. Count products & low stock
        const productsRaw = await this.connection.rawConnection.query(
            `SELECT p.id, MIN(pv."stockOnHand") as min_stock
             FROM product p
             LEFT JOIN product_variant pv ON pv."productId" = p.id
             LEFT JOIN product_channels_channel pcc ON pcc."productId" = p.id
             WHERE p."customFieldsVendorid" = $1 OR (pcc."channelId" = $2 AND $2 > 0)
             GROUP BY p.id`,
            [numericVendorId, vendorChannelId]
        );
        const totalProductsCount = productsRaw.length;
        const lowStockCount = productsRaw.filter((p: any) => p.min_stock !== null && Number(p.min_stock) >= 0 && Number(p.min_stock) <= 5).length;

        // 3. Count likes
        const likesRaw = await this.connection.rawConnection.query(
            `SELECT COUNT(*) as count FROM product_like pl
             JOIN product p ON pl."productId" = p.id
             WHERE p."customFieldsVendorid" = $1`,
            [numericVendorId]
        ).catch(() => [{ count: 0 }]);
        const totalLikesCount = Number(likesRaw[0]?.count || 0);

        const chartData = Object.entries(last30DaysMap).map(([rawDate, data]) => ({
            rawDate,
            date: new Date(rawDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
            revenue: Math.round(data.revenue),
            ordersCount: data.count,
        }));

        const currencyCode = ctx.channel?.defaultCurrencyCode || 'XOF';

        return {
            totalRevenue,
            monthlyRevenue,
            revenueGrowth,
            totalOrdersCount,
            monthlyOrdersCount,
            ordersGrowth,
            totalProductsCount,
            pendingShipmentCount,
            lowStockCount,
            totalLikesCount,
            currencyCode,
            chartData,
        };
    }
}
