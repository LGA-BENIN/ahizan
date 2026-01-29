import { Injectable } from '@nestjs/common';
import { TransactionalConnection, ListQueryBuilder, RequestContext, ListQueryOptions, PaginatedList, Product, Order, EventBus } from '@vendure/core';
import { Vendor, VendorStatus } from '../entities/vendor.entity';
import { VendorEvent } from '../events/vendor-event';

@Injectable()
export class VendorService {
    constructor(
        private connection: TransactionalConnection,
        private listQueryBuilder: ListQueryBuilder,
        private eventBus: EventBus,
    ) { }

    findAll(ctx: RequestContext, options?: ListQueryOptions<Vendor>): Promise<PaginatedList<Vendor>> {
        return this.listQueryBuilder
            .build(Vendor, options, { ctx })
            .getManyAndCount()
            .then(([items, totalItems]) => ({
                items,
                totalItems,
            }));
    }

    findOne(ctx: RequestContext, id: string): Promise<Vendor | null> {
        return this.connection.getRepository(ctx, Vendor).findOne({ where: { id } });
    }

    async create(ctx: RequestContext, input: { name: string; email: string; phoneNumber?: string; address?: string }): Promise<Vendor> {
        const vendor = new Vendor({
            name: input.name,
            email: input.email,
            phoneNumber: input.phoneNumber,
            address: input.address,
            status: VendorStatus.PENDING,
        });
        const newVendor = await this.connection.getRepository(ctx, Vendor).save(vendor);
        this.eventBus.publish(new VendorEvent(ctx, newVendor, 'created', input));
        return newVendor;
    }

    async update(ctx: RequestContext, id: string, input: Partial<Vendor>): Promise<Vendor> {
        const vendor = await this.findOne(ctx, id);
        if (!vendor) {
            throw new Error(`Vendor with id ${id} not found`);
        }
        const updated = Object.assign(vendor, input);
        const savedVendor = await this.connection.getRepository(ctx, Vendor).save(updated);
        this.eventBus.publish(new VendorEvent(ctx, savedVendor, 'updated', input));
        if (input.status && input.status !== vendor.status) {
            this.eventBus.publish(new VendorEvent(ctx, savedVendor, 'statusChanged', input));
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

    async setOrderVendor(ctx: RequestContext, orderId: string, vendorId: string) {
        await this.connection.getRepository(ctx, Order).update(orderId, {
            customFields: {
                vendor: { id: vendorId }
            }
        });
    }

    async setOrderCommission(ctx: RequestContext, orderId: string, commission: number) {
        await this.connection.getRepository(ctx, Order).update(orderId, {
            customFields: {
                commissionAmount: commission
            }
        });
    }
}
